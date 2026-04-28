import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FactCardView } from "@/components/FactCardView";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Mascot } from "@/components/Mascot";
import { useSaved, newId } from "@/lib/saved";
import type { PhotoCard } from "@/lib/types";
import { fileToResizedDataUrl } from "@/lib/image";

export const SnapScreen = () => {
  const cameraRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [card, setCard] = useState<PhotoCard | null>(null);
  const [loading, setLoading] = useState(false);
  const { add, isSaved } = useSaved();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick a photo!");
      return;
    }
    setLoading(true);
    setCard(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file, 1024, 0.82);
      const base64 = dataUrl.split(",")[1];
      const { data, error } = await supabase.functions.invoke("japan-photo", {
        body: { imageBase64: base64, mimeType: "image/jpeg" },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setCard({
        id: newId(),
        kind: "photo",
        title: data.title,
        description: data.description,
        funFact: data.funFact,
        category: data.category || "Photo",
        hasJapaneseText: !!data.hasJapaneseText,
        japaneseText: data.japaneseText,
        imageDataUrl: dataUrl,
        mascotSays: data.mascotSays,
        savedAt: Date.now(),
      });
    } catch (e) {
      console.error(e);
      toast.error("Couldn't read that photo. Try another!");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setCard(null);

  return (
    <div className="space-y-5">
      <header className="text-center pt-2">
        <h1 className="display text-3xl text-primary leading-tight">Snap It!</h1>
        <p className="text-sm font-bold text-muted-foreground">Photo a sign, snack, or sight</p>
      </header>

      {!card && !loading && (
        <>
          <div className="flex flex-col items-center gap-2 py-2">
            <Mascot size="md" message="Show me!" />
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="comic-border-lg bg-primary text-primary-foreground rounded-3xl py-6 display text-xl flex items-center justify-center gap-3 active:translate-y-1 active:shadow-none transition"
            >
              <Camera className="w-7 h-7" />
              Take a Photo
            </button>
            <button
              onClick={() => uploadRef.current?.click()}
              className="comic-border-lg bg-secondary text-secondary-foreground rounded-3xl py-6 display text-xl flex items-center justify-center gap-3 active:translate-y-1 active:shadow-none transition"
            >
              <ImageIcon className="w-7 h-7" />
              Upload a Photo
            </button>
          </div>

          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </>
      )}

      {loading && <LoadingSpinner message="Looking at your photo..." />}

      {card && (
        <>
          {card.mascotSays && <Mascot size="sm" message={card.mascotSays} />}
          <FactCardView
            item={card}
            saved={isSaved(card.id)}
            onSave={() => {
              try {
                add(card);
                toast.success("Saved!");
              } catch {
                toast.error("Storage is full — remove some saves first.");
              }
            }}
          />
          <button
            onClick={reset}
            className="w-full comic-border-sm bg-card rounded-full py-3 display text-lg flex items-center justify-center gap-2 active:translate-y-0.5 transition"
          >
            <RotateCcw className="w-5 h-5" /> Try another photo
          </button>
        </>
      )}
    </div>
  );
};
