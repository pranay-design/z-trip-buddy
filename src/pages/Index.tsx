import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { RandomScreen } from "@/screens/RandomScreen";
import { SearchScreen } from "@/screens/SearchScreen";
import { SnapScreen } from "@/screens/SnapScreen";
import { SavedScreen } from "@/screens/SavedScreen";
import { useSaved } from "@/lib/saved";
import { setMuted, isMuted, sfxPop } from "@/lib/sounds";

const Index = () => {
  const [tab, setTab] = useState<Tab>("random");
  const [muted, setMutedState] = useState<boolean>(isMuted());
  const { items } = useSaved();

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) sfxPop();
  };

  return (
    <div className="min-h-screen pb-32">
      {/* Top brand bar */}
      <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b-[3px] border-foreground">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="display text-xl text-primary leading-none">Japan</span>
            <span className="display text-xl text-secondary leading-none">Trip</span>
            <span className="display text-xl text-foreground leading-none">Buddy</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute sounds" : "Mute sounds"}
              className="comic-border-sm rounded-full p-1.5 bg-card active:translate-y-0.5 transition"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-xl" aria-hidden>⛩️</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {tab === "random" && <RandomScreen />}
        {tab === "search" && <SearchScreen />}
        {tab === "snap" && <SnapScreen />}
        {tab === "saved" && <SavedScreen />}
      </main>

      <BottomNav tab={tab} onChange={setTab} savedCount={items.length} />
    </div>
  );
};

export default Index;
