import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Pause } from "lucide-react";
import { Mascot } from "./Mascot";
import { useCharacter } from "@/lib/character-context";
import { useSpeak } from "@/lib/use-speak";
import { sfxSparkle } from "@/lib/sounds";

export const IntroBanner = () => {
  const character = useCharacter();
  const { speak, stop, loading, playing } = useSpeak(character);
  const triedAuto = useRef(false);
  const [autoBlocked, setAutoBlocked] = useState(false);
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false);

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
      const ok = await speak(character.intro, { preferBrowser: fromGesture }).catch(() => false);
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
    const ok = await speak(character.intro, { preferBrowser: true });
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
        </div>
      </div>
    </section>
  );
};
