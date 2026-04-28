import { useState } from "react";
import { BottomNav, type Tab } from "@/components/BottomNav";
import { RandomScreen } from "@/screens/RandomScreen";
import { SearchScreen } from "@/screens/SearchScreen";
import { SnapScreen } from "@/screens/SnapScreen";
import { SavedScreen } from "@/screens/SavedScreen";
import { useSaved } from "@/lib/saved";

const Index = () => {
  const [tab, setTab] = useState<Tab>("random");
  const { items } = useSaved();

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
          <span className="text-xl" aria-hidden>⛩️</span>
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
