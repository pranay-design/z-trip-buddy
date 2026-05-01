import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bug, CheckCircle2, Pause, Volume2, VolumeX } from "lucide-react";
import { Mascot } from "./Mascot";
import { useCharacter } from "@/lib/character-context";
import { useSpeak } from "@/lib/use-speak";
import { sfxSparkle } from "@/lib/sounds";

export const IntroBanner = () => {
  const character = useCharacter();
  const { speak, stop, runVoiceChecks, logs, diagnostics, loading, playing } = useSpeak(character);
  const triedAuto = useRef(false);
  const [autoBlocked, setAutoBlocked] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  // Try to auto-play once — but autoplay is usually blocked without a user
  // gesture, so we also listen for the first interaction anywhere on the page
  // and trigger the intro then.
  useEffect(() => {
    if (triedAuto.current) return;
    triedAuto.current = true;

    let cancelled = false;
    let played = false;

    const tryPlay = async (fromGesture: boolean) => {
      if (cancelled || played) return;
      const ok = await speak(character.spokenIntro ?? character.intro, { source: fromGesture ? "gesture" : "auto" }).catch(() => false);
      if (cancelled) return;
      played = ok;
      if (ok) setHasPlayedOnce(true);
      if (!ok && !fromGesture) setAutoBlocked(true);
    };

    const hintTimer = setTimeout(() => setAutoBlocked(true), 650);

    // Also bind a one-shot gesture listener as a reliable fallback.
    const onGesture = (event: Event) => {
      if ((event.target as HTMLElement | null)?.closest("button")) return;
      tryPlay(true);
      cleanup();
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      window.removeEventListener("touchstart", onGesture);
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    window.addEventListener("touchstart", onGesture, { once: true });

    return () => {
      cancelled = true;
      clearTimeout(hintTimer);
      cleanup();
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  const replay = async () => {
    sfxSparkle();
    if (playing) {
      stop();
      return;
    }
    setAutoBlocked(false);
    const ok = await speak(character.spokenIntro ?? character.intro, { source: "button" });
    if (ok) setHasPlayedOnce(true);
  };

  const testVoice = async () => {
    setShowLogs(true);
    const ready = await runVoiceChecks();
    if (!ready) return;
    const ok = await speak(`${character.name} voice test. Konnichiwa! Can you hear me now?`, { source: "diagnostic" });
    if (ok) setHasPlayedOnce(true);
  };

  return (
    <section
      className="comic-border-lg rounded-3xl bg-card p-4 animate-pop-in"
      style={{ background: `linear-gradient(180deg, hsl(${character.accentHsl} / 0.18), hsl(var(--card)))` }}
    >
      <div className="flex items-start gap-3">
        <Mascot size="md" />
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="display text-xl text-primary leading-none">
              Hi, I'm {character.name}!
            </span>
            <span className="stamp" style={{ background: `hsl(${character.accentHsl})` }}>
              {character.realName}
            </span>
          </div>
          <p className="text-sm font-bold mt-2 leading-snug">{character.intro}</p>

          <button
            onClick={replay}
            disabled={loading}
            className="mt-3 comic-border-sm rounded-full px-3 py-1.5 text-xs font-extrabold bg-accent text-accent-foreground inline-flex items-center gap-1.5 active:translate-y-0.5 transition disabled:opacity-60"
          >
            {loading ? (
              <>
                <Volume2 className="w-4 h-4 animate-pulse" /> Loading voice…
              </>
            ) : playing ? (
              <>
                <Pause className="w-4 h-4" /> Stop
              </>
            ) : autoBlocked && !hasPlayedOnce ? (
              <>
                <VolumeX className="w-4 h-4" /> Tap to hear me!
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" /> Hear it again
              </>
            )}
          </button>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={testVoice}
              disabled={loading}
              className="comic-border-sm rounded-full px-3 py-1.5 text-xs font-extrabold bg-secondary text-secondary-foreground inline-flex items-center gap-1.5 active:translate-y-0.5 transition disabled:opacity-60"
            >
              <Bug className="w-4 h-4" /> Test voice
            </button>
            <button
              onClick={() => setShowLogs((value) => !value)}
              className="comic-border-sm rounded-full px-3 py-1.5 text-xs font-extrabold bg-muted text-muted-foreground inline-flex items-center gap-1.5 active:translate-y-0.5 transition"
            >
              {diagnostics.lastError ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
              Voice logs
            </button>
          </div>

          {showLogs && (
            <div className="mt-3 rounded-2xl border border-border bg-muted/60 p-3 text-xs font-bold text-muted-foreground space-y-2">
              <div className="grid gap-1">
                <div>Support: {diagnostics.supported && diagnostics.utteranceSupported ? "available" : "not available"}</div>
                <div>Voices: {diagnostics.voiceCount}</div>
                <div>Selected: {diagnostics.selectedVoice ?? "browser default"}</div>
                {diagnostics.lastError && <div className="text-destructive">Last error: {diagnostics.lastError}</div>}
              </div>
              <div className="max-h-44 overflow-auto rounded-xl bg-card p-2 space-y-1">
                {logs.length ? logs.map((log) => (
                  <div key={log.id} className="break-words">
                    <span className="text-foreground">[{log.time}] {log.level.toUpperCase()}:</span> {log.message}
                    {log.detail && <pre className="mt-1 whitespace-pre-wrap break-words text-[10px] font-mono">{log.detail}</pre>}
                  </div>
                )) : <div>No voice logs yet.</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
