import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Character } from "@/lib/characters";

interface UseSpeakResult {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  loading: boolean;
  playing: boolean;
}

// In-memory cache so re-clicking the intro doesn't re-fetch.
const cache = new Map<string, string>(); // key -> data url

// Once ElevenLabs has signaled unavailable, skip the network round-trip
// for the rest of the session and use the browser fallback directly.
let elevenLabsDisabled = false;

function pickBrowserVoice(character: Character): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Try Japanese-accented English first, then any English voice.
  return (
    voices.find((v) => /ja[-_]/i.test(v.lang) && /en/i.test(v.name)) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith("en")) ||
    voices[0]
  );
}

function speakWithBrowser(
  text: string,
  character: Character,
  onEnd: () => void
): boolean {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickBrowserVoice(character);
    if (voice) utter.voice = voice;
    // Slightly higher pitch for a "cute" mascot feel.
    utter.pitch = character.id === "kitsune" ? 1.2 : character.id === "maneki" ? 1.4 : 1.1;
    utter.rate = character.voiceSettings?.speed ?? 1.0;
    utter.onend = onEnd;
    utter.onerror = onEnd;
    window.speechSynthesis.speak(utter);
    return true;
  } catch {
    return false;
  }
}

export function useSpeak(character: Character): UseSpeakResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stop();

      // Fast path: ElevenLabs already known to be unavailable this session.
      if (elevenLabsDisabled) {
        setPlaying(true);
        const ok = speakWithBrowser(text, character, () => setPlaying(false));
        if (!ok) setPlaying(false);
        return;
      }

      const key = `${character.voiceId}::${text}`;
      let dataUrl = cache.get(key);

      if (!dataUrl) {
        setLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke("elevenlabs-tts", {
            body: {
              text,
              voiceId: character.voiceId,
              voiceSettings: character.voiceSettings,
            },
          });
          if (error) throw error;

          if (data?.fallback) {
            elevenLabsDisabled = true;
            setLoading(false);
            setPlaying(true);
            const ok = speakWithBrowser(text, character, () => setPlaying(false));
            if (!ok) setPlaying(false);
            return;
          }

          if (!data?.audioContent) throw new Error("No audio returned");
          dataUrl = `data:${data.mimeType || "audio/mpeg"};base64,${data.audioContent}`;
          cache.set(key, dataUrl);
        } catch (e) {
          console.error("TTS error", e);
          setLoading(false);
          // Last-ditch fallback to browser speech.
          elevenLabsDisabled = true;
          setPlaying(true);
          const ok = speakWithBrowser(text, character, () => setPlaying(false));
          if (!ok) setPlaying(false);
          return;
        }
        setLoading(false);
      }

      const audio = new Audio(dataUrl);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      setPlaying(true);
      try {
        await audio.play();
      } catch {
        // Autoplay blocked — user will need to tap.
        setPlaying(false);
      }
    },
    [character, stop]
  );

  return { speak, stop, loading, playing };
}
