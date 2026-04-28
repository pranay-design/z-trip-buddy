import { Star, StarOff, Trash2 } from "lucide-react";
import type { FactCard, PhotoCard, SavedItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Props {
  item: SavedItem;
  saved?: boolean;
  onSave?: () => void;
  onRemove?: () => void;
  className?: string;
}

export const FactCardView = ({ item, saved, onSave, onRemove, className }: Props) => {
  const [imgErr, setImgErr] = useState(false);
  const isPhoto = item.kind === "photo";
  const fact = item as FactCard;
  const photo = item as PhotoCard;

  const imageSrc = isPhoto
    ? photo.imageDataUrl
    : imgErr
    ? `https://loremflickr.com/800/600/${encodeURIComponent(fact.category.toLowerCase())},japan?lock=${item.id.slice(0, 4)}`
    : fact.imageUrl;

  return (
    <article
      className={cn(
        "comic-border-lg bg-card rounded-3xl overflow-hidden animate-pop-in tilt-1",
        className
      )}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden border-b-[3px] border-foreground">
        <img
          src={imageSrc}
          alt={item.title}
          className="w-full h-full object-cover"
          onError={() => setImgErr(true)}
          loading="lazy"
        />
        <span className="stamp absolute top-3 right-3">{item.category}</span>
        {isPhoto && photo.hasJapaneseText && (
          <span className="absolute top-3 left-3 stamp" style={{ background: "hsl(var(--secondary))" }}>
            日本語
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h3 className="display text-2xl leading-tight text-primary">{item.title}</h3>

        {isPhoto ? (
          <>
            <p className="text-base font-semibold leading-snug">{photo.description}</p>

            {photo.hasJapaneseText && photo.japaneseText && (
              <div className="comic-border-sm rounded-2xl bg-muted p-3 space-y-1">
                <div className="text-xs font-extrabold uppercase tracking-wider text-secondary">Japanese</div>
                <div className="display text-xl leading-tight">{photo.japaneseText.original}</div>
                <div className="text-sm italic text-muted-foreground">{photo.japaneseText.romaji}</div>
                <div className="text-sm font-bold">→ {photo.japaneseText.english}</div>
              </div>
            )}

            <div className="comic-border-sm rounded-2xl bg-accent/30 p-3">
              <div className="text-xs font-extrabold uppercase tracking-wider mb-1">Fun Fact</div>
              <p className="text-base font-semibold leading-snug">{photo.funFact}</p>
            </div>
          </>
        ) : (
          <p className="text-base font-semibold leading-snug">{fact.fact}</p>
        )}

        <div className="flex gap-2 pt-1">
          {onSave && (
            <button
              onClick={onSave}
              className={cn(
                "flex-1 comic-border-sm rounded-full py-2.5 px-4 font-extrabold flex items-center justify-center gap-2 transition-transform active:translate-y-0.5",
                saved ? "bg-accent text-accent-foreground" : "bg-card hover:bg-accent/40"
              )}
            >
              {saved ? <Star className="w-5 h-5 fill-current" /> : <StarOff className="w-5 h-5" />}
              {saved ? "Saved!" : "Save"}
            </button>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="comic-border-sm rounded-full py-2.5 px-4 font-extrabold bg-card hover:bg-destructive hover:text-destructive-foreground flex items-center gap-2 active:translate-y-0.5 transition"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
