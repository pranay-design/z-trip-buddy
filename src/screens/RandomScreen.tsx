import { useState } from "react";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FactCardView } from "@/components/FactCardView";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Mascot } from "@/components/Mascot";
import { useSaved, newId } from "@/lib/saved";
import type { FactCard } from "@/lib/types";

export const RandomScreen = () => {
  const [card, setCard] = useState<FactCard | null>(null);
  const [loading, setLoading] = useState(false);
  const { add, isSaved } = useSaved();

  const spin = async () => {
    setLoading(true);
    setCard(null);
    try {
      const { data, error } = await supabase.functions.invoke("japan-fact", {
        body: { mode: "random" },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setCard({
        id: newId(),
        kind: "fact",
        title: data.title,
        fact: data.fact,
        category: data.category,
        imageUrl: data.imageUrl,
        mascotSays: data.mascotSays,
        source: "random",
        savedAt: Date.now(),
      });
    } catch (e) {
      console.error(e);
      toast.error("Hmm, try again!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="text-center pt-2">
        <h1 className="display text-3xl text-primary leading-tight">Surprise Me!</h1>
        <p className="text-sm font-bold text-muted-foreground">Spin for a fun fact about Japan 🎌</p>
      </header>

      {!card && !loading && (
        <div className="flex flex-col items-center gap-4 py-6">
          <Mascot size="lg" message="Ready to explore?" />
        </div>
      )}

      {loading && <LoadingSpinner message="Finding a cool fact..." />}

      {card && (
        <>
          {card.mascotSays && (
            <div className="px-1">
              <Mascot size="sm" message={card.mascotSays} />
            </div>
          )}
          <FactCardView
            item={card}
            saved={isSaved(card.id)}
            onSave={() => {
              add(card);
              toast.success("Saved to your sticker book!");
            }}
          />
        </>
      )}

      <button
        onClick={spin}
        disabled={loading}
        className="w-full comic-border-lg bg-primary text-primary-foreground rounded-full py-4 display text-xl flex items-center justify-center gap-2 active:translate-y-1 active:shadow-none transition disabled:opacity-60"
      >
        <Sparkles className="w-6 h-6" />
        {card ? "Another One!" : "Spin the Wheel!"}
      </button>
    </div>
  );
};
