export type SavedKind = "fact" | "photo";

export interface FactCard {
  id: string;
  kind: "fact";
  title: string;
  fact: string;
  category: string;
  imageUrl: string;
  mascotSays?: string;
  source: "random" | "topic";
  topic?: string;
  savedAt: number;
}

export interface PhotoCard {
  id: string;
  kind: "photo";
  title: string;
  description: string;
  funFact: string;
  category: string;
  hasJapaneseText: boolean;
  japaneseText?: { original: string; romaji: string; english: string };
  imageDataUrl: string; // user's photo, base64
  mascotSays?: string;
  savedAt: number;
}

export type SavedItem = FactCard | PhotoCard;
