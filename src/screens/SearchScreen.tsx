import { useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FactCardView } from "@/components/FactCardView";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Mascot } from "@/components/Mascot";
import { useSaved, newId } from "@/lib/saved";
import { sfxSparkle, sfxSave, sfxOops, sfxPop } from "@/lib/sounds";
import { useCharacter } from "@/lib/character-context";
import { useSpeak } from "@/lib/use-speak";
import type { FactCard } from "@/lib/types";

const CHIPS = ["animals", "food", "ninjas", "trains", "temples", "Tokyo", "Kyoto", "anime", "festivals"];

export const SearchScreen = () => {
  const [q, setQ] = useState("");
  const [card, setCard] = useState<FactCard | null>(null);
  const [loading, setLoading] = useState(false);
  const { add, isSaved } = useSaved();
  const character = useCharacter();
  const { speak } = useSpeak(character);

  const ask = async (topic: string) => {
    if (!topic.trim()) {
      sfxOops();
      toast.error("Type or tap something to search!");
      return;
    }
    sfxSparkle();
    setLoading(true);
    setCard(null);
    try {
      const { data, error } = await supabase.functions.invoke("japan-fact", {
        body: { mode: "topic", topic },
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
        source: "topic",
        topic,
        savedAt: Date.now(),
      });
      void speak(character.surprise, { source: "button" });
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
        <h1 className="display text-3xl text-primary leading-tight">Ask Kit!</h1>
        <p className="text-sm font-bold text-muted-foreground">What do you want to learn about?</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. monkeys, sushi, robots..."
          className="flex-1 comic-border-sm rounded-full px-4 py-3 bg-card font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary"
          maxLength={80}
        />
        <button
          type="submit"
          disabled={loading}
          className="comic-border-sm bg-primary text-primary-foreground rounded-full p-3 active:translate-y-0.5 transition disabled:opacity-60"
          aria-label="Search"
        >
          <Search className="w-6 h-6" />
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => {
              sfxPop();
              setQ(c);
              ask(c);
            }}
            disabled={loading}
            className="comic-border-sm bg-accent text-accent-foreground rounded-full px-3 py-1.5 text-sm font-extrabold active:translate-y-0.5 transition disabled:opacity-60"
          >
            #{c}
          </button>
        ))}
      </div>

      {!card && !loading && (
        <div className="flex flex-col items-center gap-2 py-4">
          <Mascot size="md" message="Pick a topic!" />
        </div>
      )}

      {loading && <LoadingSpinner message="Thinking up a fact..." />}

      {card && (
        <>
          {card.mascotSays && <Mascot size="sm" message={card.mascotSays} />}
          <FactCardView
            item={card}
            saved={isSaved(card.id)}
            onSave={() => {
              sfxSave();
              add(card);
              toast.success("Saved!");
            }}
          />
        </>
      )}
    </div>
  );
};
