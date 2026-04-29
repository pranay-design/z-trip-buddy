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

  // Try to auto-play the intro once on mount. Most browsers block autoplay
  // without a user gesture — we fall back to a "Tap to hear me!" prompt.
  useEffect(() => {
    if (triedAuto.current) return;
    triedAuto.current = true;
    const t = setTimeout(async () => {
      await speak(character.intro);
      // If the audio context never started playing, mark blocked.
      setTimeout(() => setAutoBlocked((prev) => prev || !playing), 300);
    }, 350);
    return () => {
      clearTimeout(t);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character.id]);

  const replay = () => {
    sfxSparkle();
    if (playing) {
      stop();
    } else {
      speak(character.intro);
      setAutoBlocked(false);
    }
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
            ) : autoBlocked ? (
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
