import { useState } from "react";
import { Trash2 } from "lucide-react";
import { FactCardView } from "@/components/FactCardView";
import { Mascot } from "@/components/Mascot";
import { useSaved } from "@/lib/saved";
import { toast } from "sonner";

export const SavedScreen = () => {
  const { items, remove, clear } = useSaved();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between pt-2">
        <div>
          <h1 className="display text-3xl text-primary leading-tight">Sticker Book</h1>
          <p className="text-sm font-bold text-muted-foreground">
            {items.length === 0 ? "Empty for now!" : `${items.length} saved`}
          </p>
        </div>
        {items.length > 0 && (
          <button
            onClick={() => setConfirming(true)}
            className="comic-border-sm bg-card rounded-full px-3 py-2 text-sm font-extrabold flex items-center gap-1 active:translate-y-0.5"
          >
            <Trash2 className="w-4 h-4" /> Clear
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12">
          <Mascot size="lg" message="Save some facts!" />
          <p className="text-sm font-bold text-muted-foreground text-center max-w-[260px]">
            Tap the ⭐ on any fact or photo to add it here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item, i) => (
            <FactCardView
              key={item.id}
              item={item}
              className={i % 2 === 0 ? "tilt-1" : "tilt-2"}
              onRemove={() => {
                remove(item.id);
                toast.success("Removed.");
              }}
            />
          ))}
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-6">
          <div className="comic-border-lg bg-card rounded-3xl p-5 max-w-sm w-full space-y-4">
            <h2 className="display text-xl">Clear all saves?</h2>
            <p className="text-sm font-bold text-muted-foreground">This can't be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 comic-border-sm bg-card rounded-full py-2.5 font-extrabold active:translate-y-0.5"
              >
                Keep them
              </button>
              <button
                onClick={() => {
                  clear();
                  setConfirming(false);
                  toast.success("All cleared.");
                }}
                className="flex-1 comic-border-sm bg-destructive text-destructive-foreground rounded-full py-2.5 font-extrabold active:translate-y-0.5"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
