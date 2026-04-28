import { forwardRef } from "react";
import { Dice5, Search, Camera, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tab = "random" | "search" | "snap" | "saved";

interface Props {
  tab: Tab;
  onChange: (t: Tab) => void;
  savedCount: number;
}

const items: { id: Tab; label: string; Icon: typeof Dice5 }[] = [
  { id: "random", label: "Surprise", Icon: Dice5 },
  { id: "search", label: "Search", Icon: Search },
  { id: "snap", label: "Snap It", Icon: Camera },
  { id: "saved", label: "Saved", Icon: Star },
];

export const BottomNav = forwardRef<HTMLElement, Props>(({ tab, onChange, savedCount }, ref) => {
  return (
    <nav ref={ref} className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t-[3px] border-foreground pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-4 max-w-md mx-auto">
        {items.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <li key={id}>
              <button
                onClick={() => onChange(id)}
                className={cn(
                  "w-full flex flex-col items-center gap-0.5 py-2.5 font-extrabold text-xs transition-colors relative",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-full transition-transform",
                  active && "bg-accent text-accent-foreground comic-border-sm -translate-y-2"
                )}>
                  <Icon className="w-5 h-5" />
                  {id === "saved" && savedCount > 0 && (
                    <span className="absolute -top-0.5 right-3 bg-primary text-primary-foreground rounded-full text-[10px] min-w-[18px] h-[18px] px-1 flex items-center justify-center border-2 border-foreground font-extrabold">
                      {savedCount}
                    </span>
                  )}
                </div>
                <span className={cn("uppercase tracking-wider", active && "-mt-1")}>{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});

BottomNav.displayName = "BottomNav";
