import { useCallback, useEffect, useRef, useState } from "react";
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

// --- Browser voice loading -------------------------------------------------
// Many browsers (Chrome especially) populate getVoices() asynchronously.
// We resolve a promise once voices are ready so playback isn't silent.
let voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve([]);
  }
  if (voicesReadyPromise) return voicesReadyPromise;

  voicesReadyPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing && existing.length) {
      resolve(existing);
      return;
    }
    let resolved = false;
    const finish = () => {
      if (resolved) return;
      const v = synth.getVoices();
      if (v && v.length) {
        resolved = true;
        resolve(v);
      }
    };
    synth.addEventListener?.("voiceschanged", finish);
    // Safety: poll briefly in case the event never fires.
    let tries = 0;
    const poll = setInterval(() => {
      tries += 1;
      finish();
      if (resolved || tries > 20) clearInterval(poll);
    }, 100);
    // Last-resort: resolve empty after 2.5s so we don't hang.
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(synth.getVoices() || []);
      }
    }, 2500);
  });
  return voicesReadyPromise;
}

function pickVoiceFor(
  character: Character,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  let chosen: SpeechSynthesisVoice | undefined;
  if (character.id === "tanuki") {
    chosen =
      voices.find((v) => /en/i.test(v.lang) && /(daniel|fred|alex|google uk english male|male)/i.test(v.name)) ||
      voices.find((v) => /en-GB/i.test(v.lang));
  } else if (character.id === "maneki") {
    chosen =
      voices.find((v) => /en/i.test(v.lang) && /(samantha|karen|tessa|google us english|female)/i.test(v.name)) ||
      voices.find((v) => /en-US/i.test(v.lang));
  } else {
    chosen =
      voices.find((v) => /en/i.test(v.lang) && /(moira|fiona|serena|google uk english female)/i.test(v.name)) ||
      voices.find((v) => /en-AU|en-IE|en-GB/i.test(v.lang));
  }
  return chosen || voices.find((v) => v.lang?.toLowerCase().startsWith("en")) || voices[0];
}

async function speakWithBrowser(
  text: string,
  character: Character,
  onEnd: () => void
): Promise<boolean> {
  if (typeof window === "undefined" || !window.speechSynthesis) return false;
  try {
    const synth = window.speechSynthesis;
    // Cancel anything queued, then wait a tick — Chrome can swallow the next
    // utterance if speak() is called synchronously after cancel().
    synth.cancel();
    await new Promise((r) => setTimeout(r, 60));

    const voices = await loadVoices();
    const utter = new SpeechSynthesisUtterance(text);
    const chosen = pickVoiceFor(character, voices);
    if (chosen) {
      utter.voice = chosen;
      utter.lang = chosen.lang;
    } else {
      utter.lang = "en-US";
    }

    if (character.id === "tanuki") {
      utter.pitch = 0.8;
      utter.rate = 1.05;
    } else if (character.id === "maneki") {
      utter.pitch = 1.6;
      utter.rate = 1.1;
    } else {
      utter.pitch = 1.15;
      utter.rate = 0.9;
    }
    utter.volume = 1;

    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      onEnd();
    };
    utter.onend = finish;
    utter.onerror = finish;

    synth.speak(utter);

    // Chrome bug: speechSynthesis pauses after ~15s. Keep it alive.
    const keepAlive = setInterval(() => {
      if (ended || !synth.speaking) {
        clearInterval(keepAlive);
        return;
      }
      synth.pause();
      synth.resume();
    }, 10000);

    return true;
  } catch (e) {
    console.warn("speakWithBrowser failed", e);
    return false;
  }
}

export function useSpeak(character: Character): UseSpeakResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Warm up the voice list as soon as the hook mounts.
  useEffect(() => {
    loadVoices();
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      // Don't call stop() unconditionally — on some browsers the immediate
      // cancel() right before speak() drops the new utterance.
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      // Fast path: ElevenLabs already known to be unavailable this session.
      if (elevenLabsDisabled) {
        setPlaying(true);
        const ok = await speakWithBrowser(text, character, () => setPlaying(false));
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
            const ok = await speakWithBrowser(text, character, () => setPlaying(false));
            if (!ok) setPlaying(false);
            return;
          }

          if (!data?.audioContent) throw new Error("No audio returned");
          dataUrl = `data:${data.mimeType || "audio/mpeg"};base64,${data.audioContent}`;
          cache.set(key, dataUrl);
        } catch (e) {
          console.error("TTS error", e);
          setLoading(false);
          elevenLabsDisabled = true;
          setPlaying(true);
          const ok = await speakWithBrowser(text, character, () => setPlaying(false));
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
        setPlaying(false);
      }
    },
    [character]
  );

  return { speak, stop, loading, playing };
}
