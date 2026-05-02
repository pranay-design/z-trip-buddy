import { useCallback, useEffect, useMemo, useState } from "react";
import type { Character } from "@/lib/characters";
import meSpeak from "mespeak";
import meSpeakConfig from "mespeak/src/mespeak_config.json";
import englishVoice from "mespeak/voices/en/en-us.json";

type VoiceLogLevel = "info" | "success" | "warn" | "error";

export interface VoiceLogEntry {
  id: number;
  time: string;
  level: VoiceLogLevel;
  message: string;
  detail?: string;
}

interface SpeakOptions {
  source?: "auto" | "button" | "gesture" | "diagnostic";
}

interface VoiceDiagnostics {
  supported: boolean;
  utteranceSupported: boolean;
  voiceCount: number;
  selectedVoice?: string;
  lastError?: string;
}

interface UseSpeakResult {
  speak: (text: string, options?: SpeakOptions) => Promise<boolean>;
  stop: () => void;
  runVoiceChecks: () => Promise<boolean>;
  logs: VoiceLogEntry[];
  diagnostics: VoiceDiagnostics;
  loading: boolean;
  playing: boolean;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let activeKeepAlive: ReturnType<typeof setInterval> | null = null;
let activeStartTimer: ReturnType<typeof setTimeout> | null = null;
let activeMaxTimer: ReturnType<typeof setTimeout> | null = null;
let activeFallbackAudio: HTMLAudioElement | null = null;
let meSpeakReady = false;
let logId = 0;

function detailToString(detail: unknown): string | undefined {
  if (detail == null) return undefined;
  if (typeof detail === "string") return detail;
  if (detail instanceof Error) return `${detail.name}: ${detail.message}`;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function getUserActivationState() {
  const activation = typeof navigator !== "undefined" ? navigator.userActivation : undefined;
  return activation
    ? { isActive: activation.isActive, hasBeenActive: activation.hasBeenActive }
    : "navigator.userActivation unavailable";
}

function clearActiveSpeech() {
  if (activeKeepAlive) clearInterval(activeKeepAlive);
  if (activeStartTimer) clearTimeout(activeStartTimer);
  if (activeMaxTimer) clearTimeout(activeMaxTimer);
  activeKeepAlive = null;
  activeStartTimer = null;
  activeMaxTimer = null;
  activeUtterance = null;
}

function speechState() {
  if (typeof window === "undefined" || !window.speechSynthesis) return "speechSynthesis unavailable";
  const synth = window.speechSynthesis;
  return { speaking: synth.speaking, pending: synth.pending, paused: synth.paused };
}

function getFallbackOptions(character: Character) {
  if (character.id === "tanuki") return { pitch: 34, speed: 142, wordgap: 2, amplitude: 112, variant: "m3" };
  if (character.id === "maneki") return { pitch: 72, speed: 174, wordgap: 1, amplitude: 105, variant: "f5" };
  return { pitch: 52, speed: 128, wordgap: 3, amplitude: 98, variant: "f2" };
}

function ensureMeSpeakReady(addLog: (level: VoiceLogLevel, message: string, detail?: unknown) => void) {
  if (meSpeakReady) return true;
  try {
    meSpeak.loadConfig(meSpeakConfig);
    meSpeak.loadVoice(englishVoice);
    meSpeakReady = true;
    addLog("success", "Bundled fallback voice engine loaded");
    return true;
  } catch (error) {
    addLog("error", "Bundled fallback voice engine failed to load", error);
    return false;
  }
}

function pickVoiceFor(character: Character, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined;
  const profile = character.browserVoice;

  // Strictly English voices only — never let the browser pick a Japanese/other voice
  // that mangles English pronunciation (e.g. saying "konnichiwa" as "koniKKiwwa").
  const enUS = voices.filter((v) => /^en[-_]US/i.test(v.lang));
  const enGB = voices.filter((v) => /^en[-_]GB/i.test(v.lang));
  const anyEn = voices.filter((v) => /^en[-_]/i.test(v.lang));

  const wantsGB = profile?.lang === "en-GB";
  const primary = wantsGB ? enGB : enUS;
  const secondary = wantsGB ? enUS : enGB;

  const byName = (pool: SpeechSynthesisVoice[]) =>
    profile ? pool.find((v) => profile.preferredNames.test(v.name)) : undefined;

  // Common neutral/American voices across platforms
  const NEUTRAL_US = /(samantha|alex|google\s*us\s*english|microsoft\s*(aria|jenny|guy|davis|david|zira))/i;
  const byNeutral = (pool: SpeechSynthesisVoice[]) => pool.find((v) => NEUTRAL_US.test(v.name));

  return (
    byName(primary) ||
    byName(secondary) ||
    byNeutral(primary) ||
    byNeutral(anyEn) ||
    primary[0] ||
    secondary[0] ||
    anyEn[0]
  );
}

function waitForVoices(
  addLog: (level: VoiceLogLevel, message: string, detail?: unknown) => void,
  timeoutMs = 1800
): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !window.speechSynthesis) return Promise.resolve([]);

  const synth = window.speechSynthesis;
  const immediate = synth.getVoices();
  if (immediate.length) return Promise.resolve(immediate);

  addLog("warn", "No voices available yet; waiting for voiceschanged", { timeoutMs });

  return new Promise((resolve) => {
    let settled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const finish = (reason: string) => {
      if (settled) return;
      const voices = synth.getVoices();
      if (!voices.length && reason !== "timeout") return;
      settled = true;
      if (poll) clearInterval(poll);
      if (timeout) clearTimeout(timeout);
      synth.removeEventListener?.("voiceschanged", onVoicesChanged);
      addLog(voices.length ? "success" : "error", `Voice loading finished: ${reason}`, {
        voiceCount: voices.length,
        voices: voices.slice(0, 8).map((v) => `${v.name} (${v.lang})`),
      });
      resolve(voices);
    };

    const onVoicesChanged = () => finish("voiceschanged");
    synth.addEventListener?.("voiceschanged", onVoicesChanged);
    poll = setInterval(() => finish("poll"), 150);
    timeout = setTimeout(() => finish("timeout"), timeoutMs);
  });
}

function speakWithBundledFallback(
  text: string,
  character: Character,
  addLog: (level: VoiceLogLevel, message: string, detail?: unknown) => void,
  onEnd: () => void
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Audio === "undefined") {
      addLog("error", "Bundled fallback cannot play because HTMLAudioElement is unavailable");
      resolve(false);
      return;
    }
    if (!ensureMeSpeakReady(addLog)) {
      resolve(false);
      return;
    }

    try {
      const options = { ...getFallbackOptions(character), rawdata: "mime" as const };
      const dataUrl = meSpeak.speak(text, options) as string | null;
      if (!dataUrl || typeof dataUrl !== "string") {
        addLog("error", "Bundled fallback generated no audio", options);
        resolve(false);
        return;
      }

      if (activeFallbackAudio) {
        activeFallbackAudio.pause();
        activeFallbackAudio = null;
      }

      const audio = new Audio(dataUrl);
      activeFallbackAudio = audio;
      let started = false;
      const finish = (level: VoiceLogLevel, message: string, detail?: unknown) => {
        if (activeFallbackAudio === audio) activeFallbackAudio = null;
        addLog(level, message, detail);
        onEnd();
      };

      audio.onplaying = () => {
        started = true;
        addLog("success", "Bundled fallback audio started", { options });
        resolve(true);
      };
      audio.onended = () => finish("success", "Bundled fallback audio ended normally");
      audio.onerror = () => {
        const error = audio.error ? { code: audio.error.code, message: audio.error.message } : "unknown audio error";
        finish("error", "Bundled fallback audio playback failed", error);
        if (!started) resolve(false);
      };

      const playResult = audio.play();
      playResult
        .then(() => {
          if (!started) {
            addLog("success", "Bundled fallback audio play promise resolved");
            resolve(true);
          }
        })
        .catch((error) => {
          finish("error", "Bundled fallback audio.play was blocked or failed", error);
          resolve(false);
        });
    } catch (error) {
      addLog("error", "Bundled fallback threw an exception", error);
      onEnd();
      resolve(false);
    }
  });
}

export function useSpeak(character: Character): UseSpeakResult {
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [logs, setLogs] = useState<VoiceLogEntry[]>([]);
  const [diagnostics, setDiagnostics] = useState<VoiceDiagnostics>({
    supported: typeof window !== "undefined" && "speechSynthesis" in window,
    utteranceSupported: typeof window !== "undefined" && "SpeechSynthesisUtterance" in window,
    voiceCount: 0,
  });

  const addLog = useCallback((level: VoiceLogLevel, message: string, detail?: unknown) => {
    const entry: VoiceLogEntry = {
      id: ++logId,
      time: new Date().toLocaleTimeString(),
      level,
      message,
      detail: detailToString(detail),
    };
    const method = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
    method(`[intro-voice:${level}] ${message}`, detail ?? "");
    setLogs((current) => [entry, ...current].slice(0, 80));
  }, []);

  const runVoiceChecks = useCallback(async () => {
    setLoading(true);
    addLog("info", "Running voice diagnostics", {
      character: character.name,
      support: speechState(),
      userActivation: getUserActivationState(),
      visibility: typeof document !== "undefined" ? document.visibilityState : "no document",
    });

    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    const utteranceSupported = typeof window !== "undefined" && "SpeechSynthesisUtterance" in window;
    if (!supported || !utteranceSupported) {
      const lastError = "This browser does not expose the Speech Synthesis API.";
      setDiagnostics({ supported, utteranceSupported, voiceCount: 0, lastError });
      addLog("error", lastError, { supported, utteranceSupported });
      setLoading(false);
      return false;
    }

    const voices = await waitForVoices(addLog);
    const selected = pickVoiceFor(character, voices);
    setDiagnostics({
      supported,
      utteranceSupported,
      voiceCount: voices.length,
      selectedVoice: selected ? `${selected.name} (${selected.lang})` : undefined,
      lastError: voices.length ? undefined : "No system voices were returned by the browser.",
    });
    addLog(selected ? "success" : "warn", selected ? "Selected intro voice" : "No browser voices; bundled fallback will be used on playback", {
      selected: selected ? `${selected.name} (${selected.lang})` : "bundled local fallback",
      voiceCount: voices.length,
      pitch: character.browserVoice?.pitch,
      rate: character.browserVoice?.rate,
    });
    setLoading(false);
    return true;
  }, [addLog, character]);

  useEffect(() => {
    void runVoiceChecks();
  }, [runVoiceChecks]);

  const stop = useCallback(() => {
    addLog("info", "Stop requested", speechState());
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    } catch (error) {
      addLog("error", "speechSynthesis.cancel failed", error);
    }
    if (activeFallbackAudio) {
      activeFallbackAudio.pause();
      activeFallbackAudio.currentTime = 0;
      activeFallbackAudio = null;
    }
    clearActiveSpeech();
    setPlaying(false);
  }, [addLog]);

  const speak = useCallback(
    (rawText: string, options: SpeakOptions = {}) =>
      new Promise<boolean>((resolve) => {
        const text = rawText.trim();
        addLog("info", "Speak requested", {
          source: options.source ?? "button",
          character: character.name,
          textLength: text.length,
          userActivation: getUserActivationState(),
          before: speechState(),
        });

        if (!text) {
          const lastError = "Intro text is empty.";
          setDiagnostics((current) => ({ ...current, lastError }));
          addLog("error", lastError);
          resolve(false);
          return;
        }

        if (typeof window === "undefined" || !window.speechSynthesis || !("SpeechSynthesisUtterance" in window)) {
          const lastError = "Speech Synthesis is not supported in this browser.";
          setDiagnostics((current) => ({ ...current, supported: false, utteranceSupported: false, lastError }));
          addLog("error", lastError);
          resolve(false);
          return;
        }

        const synth = window.speechSynthesis;
        let startResolved = false;
        let finished = false;
        const settleStart = (ok: boolean) => {
          if (startResolved) return;
          startResolved = true;
          resolve(ok);
        };

        let currentUtterance: SpeechSynthesisUtterance | null = null;
        const finish = (level: VoiceLogLevel, message: string, detail?: unknown) => {
          if (finished || !currentUtterance || activeUtterance !== currentUtterance) return;
          finished = true;
          addLog(level, message, detail ?? speechState());
          clearActiveSpeech();
          setPlaying(false);
        };

        try {
          if (activeUtterance || synth.speaking || synth.pending) {
            addLog("warn", "Clearing previous queued speech before intro", speechState());
            synth.cancel();
          }

          const voices = synth.getVoices();
          const selected = pickVoiceFor(character, voices);
          const utter = new SpeechSynthesisUtterance(text);
          currentUtterance = utter;
          if (selected) {
            utter.voice = selected;
            utter.lang = selected.lang;
          } else {
            utter.lang = character.browserVoice?.lang ?? "en-US";
            void waitForVoices(addLog, 1200).then((loaded) => {
              if (loaded.length) addLog("info", "Voices became available after speak request", { voiceCount: loaded.length });
            });
          }

          utter.pitch = Math.min(2, Math.max(0.1, character.browserVoice?.pitch ?? 1));
          utter.rate = Math.min(2, Math.max(0.1, character.browserVoice?.rate ?? 0.95));
          utter.volume = 1;
          activeUtterance = utter;
          setPlaying(true);
          setDiagnostics((current) => ({
            ...current,
            supported: true,
            utteranceSupported: true,
            voiceCount: voices.length,
            selectedVoice: selected ? `${selected.name} (${selected.lang})` : undefined,
            lastError: undefined,
          }));

          utter.onstart = () => {
            setPlaying(true);
            settleStart(true);
            addLog("success", "Speech started", {
              voice: selected ? `${selected.name} (${selected.lang})` : "browser default",
              pitch: utter.pitch,
              rate: utter.rate,
              state: speechState(),
            });
          };
          utter.onend = () => {
            settleStart(true);
            finish("success", "Speech ended normally");
          };
          utter.onerror = (event) => {
            const errorName = (event as SpeechSynthesisErrorEvent).error || "unknown";
            const isStopNoise = errorName === "canceled" || errorName === "interrupted";
            if (!isStopNoise) {
              setDiagnostics((current) => ({ ...current, lastError: `Speech error: ${errorName}` }));
            }
            finish(isStopNoise ? "warn" : "error", `Speech synthesis error: ${errorName}`, {
              error: errorName,
              elapsedTime: (event as SpeechSynthesisEvent).elapsedTime,
              state: speechState(),
            });
            if (isStopNoise) {
              settleStart(false);
              return;
            }
            void speakWithBundledFallback(text, character, addLog, () => setPlaying(false)).then((ok) => {
              setDiagnostics((current) => ({
                ...current,
                lastError: ok ? undefined : current.lastError,
                selectedVoice: ok ? "bundled local fallback" : current.selectedVoice,
              }));
              settleStart(ok);
            });
          };
          utter.onpause = () => addLog("warn", "Speech paused by browser", speechState());
          utter.onresume = () => addLog("info", "Speech resumed", speechState());

          try {
            synth.resume();
          } catch (error) {
            addLog("warn", "speechSynthesis.resume failed before speak", error);
          }
          synth.speak(utter);
          addLog("info", "speechSynthesis.speak called", {
            voice: selected ? `${selected.name} (${selected.lang})` : "browser default",
            after: speechState(),
          });

          activeStartTimer = setTimeout(() => {
            if (finished || startResolved) return;
            const state = speechState();
            if (typeof state !== "string" && (state.speaking || state.pending)) {
              addLog("warn", "No onstart event fired, but browser reports speech queued/active", state);
              settleStart(true);
              return;
            }
            const lastError = "Speech did not start within 2.5 seconds.";
            setDiagnostics((current) => ({ ...current, lastError }));
            finish("error", lastError, { state, userActivation: getUserActivationState() });
            void speakWithBundledFallback(text, character, addLog, () => setPlaying(false)).then((ok) => {
              setDiagnostics((current) => ({
                ...current,
                lastError: ok ? undefined : current.lastError,
                selectedVoice: ok ? "bundled local fallback" : current.selectedVoice,
              }));
              settleStart(ok);
            });
          }, 2500);

          activeKeepAlive = setInterval(() => {
            if (finished || activeUtterance !== utter) return;
            const state = speechState();
            if (typeof state !== "string" && state.speaking && !state.paused) return;
            try {
              synth.resume();
              addLog("info", "Keep-alive resume attempted", state);
            } catch (error) {
              addLog("warn", "Keep-alive resume failed", error);
            }
          }, 3000);

          activeMaxTimer = setTimeout(() => {
            if (finished || activeUtterance !== utter) return;
            addLog("warn", "Speech exceeded expected duration; cancelling stale utterance", speechState());
            try {
              synth.cancel();
            } catch (error) {
              addLog("error", "Cancel after stale speech failed", error);
            }
            finish("warn", "Speech watchdog cleaned up stale playback");
          }, Math.max(7000, text.length * 140));
        } catch (error) {
          const lastError = detailToString(error) ?? "Unknown speech startup error";
          setDiagnostics((current) => ({ ...current, lastError }));
          clearActiveSpeech();
          addLog("error", "Speech startup threw an exception", error);
          void speakWithBundledFallback(text, character, addLog, () => setPlaying(false)).then((ok) => {
            setDiagnostics((current) => ({
              ...current,
              lastError: ok ? undefined : current.lastError,
              selectedVoice: ok ? "bundled local fallback" : current.selectedVoice,
            }));
            if (!ok) setPlaying(false);
            settleStart(ok);
          });
        }
      }),
    [addLog, character]
  );

  const stableDiagnostics = useMemo(() => diagnostics, [diagnostics]);

  return { speak, stop, runVoiceChecks, logs, diagnostics: stableDiagnostics, loading, playing };
}