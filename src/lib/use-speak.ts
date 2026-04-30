import { useCallback, useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/characters";

interface SpeakOptions {
  preferBrowser?: boolean;
}

interface UseSpeakResult {
  speak: (text: string, options?: SpeakOptions) => Promise<boolean>;
  stop: () => void;
  loading: boolean;
  playing: boolean;
}

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
  const profile = character.browserVoice;
  const japaneseVoices = voices.filter((v) => /^ja[-_]?JP/i.test(v.lang) || /japanese|日本語/i.test(v.name));
  return (
    (profile && japaneseVoices.find((v) => profile.preferredNames.test(v.name))) ||
    japaneseVoices[0] ||
    voices.find((v) => /^en/i.test(v.lang) && /japan|japanese/i.test(v.name)) ||
    voices.find((v) => /^en/i.test(v.lang)) ||
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
    const synth = window.speechSynthesis;
    if (synth.speaking || synth.pending) synth.cancel();

    // This must stay synchronous when called from a tap/click. Awaiting voice
    // loading or network work first breaks the browser's media gesture chain.
    const voices = synth.getVoices();
    const utter = new SpeechSynthesisUtterance(text);
    const chosen = pickVoiceFor(character, voices);
    if (chosen) {
      utter.voice = chosen;
      utter.lang = chosen.lang;
    } else {
      utter.lang = character.browserVoice?.lang || "ja-JP";
    }

    utter.pitch = character.browserVoice?.pitch ?? 1;
    utter.rate = character.browserVoice?.rate ?? 0.95;
    utter.volume = 1;

    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      onEnd();
    };
    utter.onend = finish;
    utter.onerror = finish;

    synth.resume();
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
    async (text: string, _options: SpeakOptions = {}) => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setPlaying(true);
      const ok = speakWithBrowser(text, character, () => setPlaying(false));
      if (!ok) setPlaying(false);
      return ok;
    },
    [character]
  );

  return { speak, stop, loading, playing };
}
