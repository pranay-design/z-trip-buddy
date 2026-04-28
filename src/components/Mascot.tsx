import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface MascotProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Kit the explorer fox — chubby, kawaii style with big sparkly eyes & blush
export const Mascot = forwardRef<HTMLDivElement, MascotProps>(
  ({ message, size = "md", className }, ref) => {
    const dim = size === "sm" ? 64 : size === "lg" ? 140 : 96;
    return (
      <div ref={ref} className={cn("flex items-end gap-2", className)}>
        <svg
          width={dim}
          height={dim}
          viewBox="0 0 140 140"
          className="shrink-0 drop-shadow-[3px_3px_0_hsl(var(--foreground))]"
          aria-hidden
        >
          {/* Back ears (inner pink) */}
          <path d="M30 52 Q26 22 48 32 Q50 40 46 52 Z" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
          <path d="M110 52 Q114 22 92 32 Q90 40 94 52 Z" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
          <path d="M35 46 Q34 30 44 36 Q44 42 42 48 Z" fill="hsl(350 90% 80%)" />
          <path d="M105 46 Q106 30 96 36 Q96 42 98 48 Z" fill="hsl(350 90% 80%)" />

          {/* Round chubby head */}
          <ellipse cx="70" cy="78" rx="44" ry="40" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3.5" />

          {/* Cheeks/face cream area */}
          <path
            d="M30 84 Q40 110 70 112 Q100 110 110 84 Q100 96 70 96 Q40 96 30 84 Z"
            fill="hsl(42 60% 97%)"
            stroke="hsl(var(--foreground))"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />

          {/* Forehead tuft */}
          <path d="M58 44 Q70 36 82 44 Q76 50 70 50 Q64 50 58 44 Z" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="2.5" />

          {/* Big sparkly eyes */}
          <ellipse cx="54" cy="78" rx="7" ry="9" fill="hsl(var(--foreground))" />
          <ellipse cx="86" cy="78" rx="7" ry="9" fill="hsl(var(--foreground))" />
          <circle cx="56.5" cy="75" r="2.6" fill="white" />
          <circle cx="88.5" cy="75" r="2.6" fill="white" />
          <circle cx="52" cy="82" r="1.2" fill="white" />
          <circle cx="84" cy="82" r="1.2" fill="white" />

          {/* Blush */}
          <ellipse cx="40" cy="92" rx="6" ry="3.5" fill="hsl(350 90% 78%)" opacity="0.85" />
          <ellipse cx="100" cy="92" rx="6" ry="3.5" fill="hsl(350 90% 78%)" opacity="0.85" />

          {/* Tiny nose */}
          <path d="M66 92 Q70 96 74 92 Q72 95 70 95 Q68 95 66 92 Z" fill="hsl(var(--foreground))" />

          {/* Smile with little tongue */}
          <path d="M60 100 Q70 108 80 100" stroke="hsl(var(--foreground))" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M67 104 Q70 108 73 104 Z" fill="hsl(350 90% 72%)" />

          {/* Explorer hat band */}
          <path d="M30 56 Q70 38 110 56" stroke="hsl(var(--secondary))" strokeWidth="6" fill="none" strokeLinecap="round" />
          <circle cx="70" cy="42" r="5" fill="hsl(var(--accent))" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
          <path d="M70 37 L72 33 L70 35 L68 33 Z" fill="hsl(var(--secondary))" />
        </svg>
        {message && (
          <div className="relative comic-border-sm bg-card px-3 py-2 rounded-2xl rounded-bl-none mb-2 max-w-[180px]">
            <span className="text-sm font-bold">{message}</span>
          </div>
        )}
      </div>
    );
  }
);

Mascot.displayName = "Mascot";
