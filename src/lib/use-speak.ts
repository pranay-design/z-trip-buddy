import { useCallback, useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/characters";
import { supabase } from "@/integrations/supabase/client";

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
let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeKeepAlive: ReturnType<typeof setInterval> | null = null;
let sharedAudioContext: AudioContext | null = null;

function clearActiveSpeech() {
  if (activeKeepAlive) {
    clearInterval(activeKeepAlive);
    activeKeepAlive = null;
  }
  activeUtterance = null;
}

function unlockAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!sharedAudioContext) sharedAudioContext = new AC();
    if (sharedAudioContext.state === "suspended") sharedAudioContext.resume().catch(() => {});
    return sharedAudioContext;
  } catch {
    return null;
  }
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

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
  const englishVoices = voices.filter((v) => /^en[-_]/i.test(v.lang));
  return (
    (profile && englishVoices.find((v) => profile.preferredNames.test(v.name))) ||
    englishVoices.find((v) => /google|microsoft|apple/i.test(v.name)) ||
    englishVoices[0] ||
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
    clearActiveSpeech();

    // This must stay synchronous when called from a tap/click. Awaiting voice
    // loading or network work first breaks the browser's media gesture chain.
    const voices = synth.getVoices();
    const utter = new SpeechSynthesisUtterance(text.trim());
    const chosen = pickVoiceFor(character, voices);
    if (chosen) {
      utter.voice = chosen;
      utter.lang = chosen.lang;
    } else {
      utter.lang = character.browserVoice?.lang || "en-US";
    }

    utter.pitch = character.browserVoice?.pitch ?? 1;
    utter.rate = character.browserVoice?.rate ?? 0.95;
    utter.volume = 1;
    activeUtterance = utter;

    let ended = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      if (activeUtterance === utter) clearActiveSpeech();
      onEnd();
    };
    utter.onend = finish;
    utter.onerror = finish;

    synth.resume();
    synth.speak(utter);

    // Chrome bug: speechSynthesis pauses after ~15s. Keep it alive.
    activeKeepAlive = setInterval(() => {
      if (ended || !synth.speaking) {
        clearActiveSpeech();
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
