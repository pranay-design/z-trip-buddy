import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  alt: string;
  fallback?: string;
  className?: string;
}

/**
 * Swipeable photo carousel used inside fact cards.
 * - Swipe left/right (touch + mouse drag) to change photo.
 * - Tap on chevron buttons or dots as a fallback.
 * - Per-image error fallback so a broken Wikipedia image never blanks the card.
 */
export const PhotoCarousel = ({ images, alt, fallback, className }: Props) => {
  const safeImages = images.length > 0 ? images : fallback ? [fallback] : [];
  const [index, setIndex] = useState(0);
  const [errored, setErrored] = useState<Record<number, boolean>>({});
  const startX = useRef<number | null>(null);
  const deltaX = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset to first image whenever the set of images changes
  useEffect(() => {
    setIndex(0);
    setErrored({});
  }, [safeImages.join("|")]);

  if (safeImages.length === 0) return null;

  const go = (next: number) => {
    const clamped = (next + safeImages.length) % safeImages.length;
    setIndex(clamped);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    deltaX.current = 0;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current == null) return;
    deltaX.current = e.clientX - startX.current;
    setDragOffset(deltaX.current);
  };

  const onPointerUp = () => {
    if (startX.current == null) return;
    const width = containerRef.current?.clientWidth ?? 1;
    const threshold = Math.min(60, width * 0.18);
    if (deltaX.current > threshold) go(index - 1);
    else if (deltaX.current < -threshold) go(index + 1);
    startX.current = null;
    deltaX.current = 0;
    setDragOffset(0);
  };

  const total = safeImages.length;

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full h-full overflow-hidden touch-pan-y select-none", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{
          width: `${total * 100}%`,
          transform: `translateX(calc(${-index * (100 / total)}% + ${dragOffset}px))`,
          transitionDuration: dragOffset === 0 ? "300ms" : "0ms",
        }}
      >
        {safeImages.map((src, i) => (
          <div key={i} className="h-full" style={{ width: `${100 / total}%` }}>
            <img
              src={errored[i] && fallback ? fallback : src}
              alt={`${alt} (${i + 1} of ${total})`}
              className="w-full h-full object-cover"
              draggable={false}
              loading={i === 0 ? "eager" : "lazy"}
              onError={() => setErrored((m) => ({ ...m, [i]: true }))}
            />
          </div>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(index - 1);
            }}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 comic-border-sm bg-card/90 hover:bg-card rounded-full p-1.5 active:translate-y-0 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(index + 1);
            }}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 comic-border-sm bg-card/90 hover:bg-card rounded-full p-1.5 active:translate-y-0 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-card/80 rounded-full px-2 py-1 comic-border-sm">
            {safeImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(i);
                }}
                aria-label={`Go to photo ${i + 1}`}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i === index ? "bg-primary w-4" : "bg-foreground/30"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
