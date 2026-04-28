import { cn } from "@/lib/utils";

interface MascotProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

// Kit the explorer fox — pure SVG, friendly and adventurous
export const Mascot = ({ message, size = "md", className }: MascotProps) => {
  const dim = size === "sm" ? 56 : size === "lg" ? 120 : 80;
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 120 120"
        className="shrink-0 drop-shadow-[2px_2px_0_hsl(var(--foreground))]"
        aria-hidden
      >
        {/* head */}
        <ellipse cx="60" cy="68" rx="34" ry="30" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3" />
        {/* ears */}
        <polygon points="28,42 38,18 50,40" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="92,42 82,18 70,40" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinejoin="round" />
        <polygon points="34,38 38,24 46,38" fill="hsl(var(--accent))" />
        <polygon points="86,38 82,24 74,38" fill="hsl(var(--accent))" />
        {/* face mask */}
        <ellipse cx="60" cy="78" rx="22" ry="16" fill="hsl(42 50% 97%)" stroke="hsl(var(--foreground))" strokeWidth="2.5" />
        {/* eyes */}
        <circle cx="50" cy="68" r="4" fill="hsl(var(--foreground))" />
        <circle cx="70" cy="68" r="4" fill="hsl(var(--foreground))" />
        <circle cx="51.5" cy="66.5" r="1.4" fill="white" />
        <circle cx="71.5" cy="66.5" r="1.4" fill="white" />
        {/* nose */}
        <ellipse cx="60" cy="80" rx="4" ry="3" fill="hsl(var(--foreground))" />
        {/* smile */}
        <path d="M54 86 Q60 92 66 86" stroke="hsl(var(--foreground))" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* explorer hat band */}
        <path d="M28 46 Q60 30 92 46" stroke="hsl(var(--secondary))" strokeWidth="6" fill="none" strokeLinecap="round" />
        <circle cx="60" cy="34" r="4" fill="hsl(var(--accent))" stroke="hsl(var(--foreground))" strokeWidth="2" />
      </svg>
      {message && (
        <div className="relative comic-border-sm bg-card px-3 py-2 rounded-2xl rounded-bl-none mb-2 max-w-[180px]">
          <span className="text-sm font-bold">{message}</span>
        </div>
      )}
    </div>
  );
};
