import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { useCharacter } from "@/lib/character-context";
import type { CharacterId } from "@/lib/characters";

interface MascotProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// ---- Character SVGs (kawaii style, comic-bordered with drop shadow) ----

const Tanuki = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 140 140" aria-hidden className="shrink-0 drop-shadow-[3px_3px_0_hsl(var(--foreground))]">
    {/* Ears */}
    <path d="M30 50 Q26 22 50 36 Q48 46 44 54 Z" fill="hsl(28 35% 28%)" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
    <path d="M110 50 Q114 22 90 36 Q92 46 96 54 Z" fill="hsl(28 35% 28%)" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
    <path d="M36 46 Q34 30 46 38 Q44 46 42 50 Z" fill="hsl(28 60% 70%)" />
    <path d="M104 46 Q106 30 94 38 Q96 46 98 50 Z" fill="hsl(28 60% 70%)" />
    {/* Head */}
    <ellipse cx="70" cy="80" rx="46" ry="42" fill="hsl(28 45% 55%)" stroke="hsl(var(--foreground))" strokeWidth="3.5" />
    {/* Cream chest/face */}
    <path d="M28 88 Q40 116 70 116 Q100 116 112 88 Q98 100 70 100 Q42 100 28 88 Z" fill="hsl(42 60% 95%)" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Bandit mask */}
    <path d="M30 70 Q50 58 70 68 Q90 58 110 70 Q98 86 70 80 Q42 86 30 70 Z" fill="hsl(28 35% 22%)" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Eyes (white inside mask) */}
    <ellipse cx="54" cy="74" rx="9" ry="8" fill="hsl(42 60% 97%)" stroke="hsl(var(--foreground))" strokeWidth="2" />
    <ellipse cx="86" cy="74" rx="9" ry="8" fill="hsl(42 60% 97%)" stroke="hsl(var(--foreground))" strokeWidth="2" />
    <circle cx="55" cy="76" r="4" fill="hsl(var(--foreground))" />
    <circle cx="87" cy="76" r="4" fill="hsl(var(--foreground))" />
    <circle cx="56.5" cy="74.5" r="1.4" fill="white" />
    <circle cx="88.5" cy="74.5" r="1.4" fill="white" />
    {/* Nose */}
    <ellipse cx="70" cy="92" rx="4" ry="3" fill="hsl(var(--foreground))" />
    {/* Smile */}
    <path d="M62 100 Q70 108 78 100" stroke="hsl(var(--foreground))" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    {/* Cheeks */}
    <ellipse cx="38" cy="96" rx="5" ry="3" fill="hsl(350 80% 78%)" opacity="0.85" />
    <ellipse cx="102" cy="96" rx="5" ry="3" fill="hsl(350 80% 78%)" opacity="0.85" />
    {/* Leaf on head (folklore detail) */}
    <path d="M70 30 Q78 22 84 28 Q80 38 70 36 Z" fill="hsl(120 50% 45%)" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const ManekiNeko = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 140 140" aria-hidden className="shrink-0 drop-shadow-[3px_3px_0_hsl(var(--foreground))]">
    {/* Ears */}
    <path d="M30 50 Q24 18 50 34 L46 56 Z" fill="hsl(42 60% 97%)" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
    <path d="M110 50 Q116 18 90 34 L94 56 Z" fill="hsl(42 60% 97%)" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
    <path d="M36 44 Q36 28 46 38 L44 50 Z" fill="hsl(350 80% 78%)" />
    <path d="M104 44 Q104 28 94 38 L96 50 Z" fill="hsl(350 80% 78%)" />
    {/* Head */}
    <ellipse cx="70" cy="80" rx="46" ry="42" fill="hsl(42 60% 97%)" stroke="hsl(var(--foreground))" strokeWidth="3.5" />
    {/* Eyes — happy closed cat eyes */}
    <path d="M46 78 Q54 70 62 78" stroke="hsl(var(--foreground))" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M78 78 Q86 70 94 78" stroke="hsl(var(--foreground))" strokeWidth="3.2" fill="none" strokeLinecap="round" />
    {/* Nose */}
    <path d="M67 88 Q70 92 73 88 Z" fill="hsl(350 80% 60%)" stroke="hsl(var(--foreground))" strokeWidth="1.6" />
    {/* Mouth */}
    <path d="M70 91 L70 95" stroke="hsl(var(--foreground))" strokeWidth="2" />
    <path d="M62 96 Q66 102 70 98 Q74 102 78 96" stroke="hsl(var(--foreground))" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    {/* Whiskers */}
    <path d="M30 88 L48 90 M30 96 L48 94" stroke="hsl(var(--foreground))" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M110 88 L92 90 M110 96 L92 94" stroke="hsl(var(--foreground))" strokeWidth="1.6" strokeLinecap="round" />
    {/* Cheeks */}
    <ellipse cx="40" cy="100" rx="5" ry="3" fill="hsl(350 80% 78%)" opacity="0.9" />
    <ellipse cx="100" cy="100" rx="5" ry="3" fill="hsl(350 80% 78%)" opacity="0.9" />
    {/* Red collar with bell */}
    <path d="M40 116 Q70 124 100 116" stroke="hsl(358 78% 54%)" strokeWidth="6" fill="none" strokeLinecap="round" />
    <circle cx="70" cy="122" r="6" fill="hsl(42 92% 56%)" stroke="hsl(var(--foreground))" strokeWidth="2.2" />
    <circle cx="70" cy="123" r="1.5" fill="hsl(var(--foreground))" />
    {/* Waving paw — top right */}
    <ellipse cx="116" cy="58" rx="11" ry="9" fill="hsl(42 60% 97%)" stroke="hsl(var(--foreground))" strokeWidth="3" transform="rotate(-20 116 58)" />
    <path d="M112 56 L114 56 M118 56 L120 56" stroke="hsl(var(--foreground))" strokeWidth="1.4" />
  </svg>
);

const Kitsune = ({ s }: { s: number }) => (
  <svg width={s} height={s} viewBox="0 0 140 140" aria-hidden className="shrink-0 drop-shadow-[3px_3px_0_hsl(var(--foreground))]">
    {/* Ears */}
    <path d="M30 52 Q26 18 50 32 Q50 42 46 54 Z" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
    <path d="M110 52 Q114 18 90 32 Q90 42 94 54 Z" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
    <path d="M35 46 Q34 28 44 36 Q44 44 42 50 Z" fill="hsl(350 90% 80%)" />
    <path d="M105 46 Q106 28 96 36 Q96 44 98 50 Z" fill="hsl(350 90% 80%)" />
    {/* Head */}
    <ellipse cx="70" cy="80" rx="44" ry="40" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3.5" />
    {/* Cream face */}
    <path d="M30 84 Q40 110 70 112 Q100 110 110 84 Q100 96 70 96 Q40 96 30 84 Z" fill="hsl(42 60% 97%)" stroke="hsl(var(--foreground))" strokeWidth="2.5" strokeLinejoin="round" />
    {/* Forehead tuft */}
    <path d="M58 44 Q70 36 82 44 Q76 50 70 50 Q64 50 58 44 Z" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
    {/* Eyes */}
    <ellipse cx="54" cy="78" rx="7" ry="9" fill="hsl(var(--foreground))" />
    <ellipse cx="86" cy="78" rx="7" ry="9" fill="hsl(var(--foreground))" />
    <circle cx="56.5" cy="75" r="2.6" fill="white" />
    <circle cx="88.5" cy="75" r="2.6" fill="white" />
    {/* Blush */}
    <ellipse cx="40" cy="92" rx="6" ry="3.5" fill="hsl(350 90% 78%)" opacity="0.85" />
    <ellipse cx="100" cy="92" rx="6" ry="3.5" fill="hsl(350 90% 78%)" opacity="0.85" />
    {/* Nose & smile */}
    <path d="M66 92 Q70 96 74 92 Q72 95 70 95 Q68 95 66 92 Z" fill="hsl(var(--foreground))" />
    <path d="M60 100 Q70 108 80 100" stroke="hsl(var(--foreground))" strokeWidth="2.8" fill="none" strokeLinecap="round" />
    {/* Magical flame above forehead (kitsune-bi) */}
    <path d="M70 26 Q66 18 70 12 Q74 18 70 26 Z" fill="hsl(42 92% 60%)" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

const RENDERERS: Record<CharacterId, (p: { s: number }) => JSX.Element> = {
  tanuki: Tanuki,
  maneki: ManekiNeko,
  kitsune: Kitsune,
};

export const Mascot = forwardRef<HTMLDivElement, MascotProps>(
  ({ message, size = "md", className }, ref) => {
    const character = useCharacter();
    const dim = size === "sm" ? 64 : size === "lg" ? 140 : 96;
    const Render = RENDERERS[character.id];
    return (
      <div ref={ref} className={cn("flex items-end gap-2", className)}>
        <Render s={dim} />
        {message && (
          <div className="relative comic-border-sm bg-card px-3 py-2 rounded-2xl rounded-bl-none mb-2 max-w-[200px]">
            <span className="text-sm font-bold">{message}</span>
          </div>
        )}
      </div>
    );
  }
);

Mascot.displayName = "Mascot";
