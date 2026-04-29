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

export function useSpeak(character: Character): UseSpeakResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stop();
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
          if (!data?.audioContent) throw new Error("No audio returned");
          dataUrl = `data:${data.mimeType || "audio/mpeg"};base64,${data.audioContent}`;
          cache.set(key, dataUrl);
        } catch (e) {
          console.error("TTS error", e);
          setLoading(false);
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
