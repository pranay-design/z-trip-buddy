export type SavedKind = "fact" | "photo";

export interface MoreDetails {
  didYouKnow: string[];
  spotIt: string;
  mascotSays?: string;
}

export interface FactCard {
  id: string;
  kind: "fact";
  title: string;
  fact: string;
  category: string;
  imageUrl: string;
  imageUrls?: string[];
  mascotSays?: string;
  source: "random" | "topic";
  topic?: string;
  more?: MoreDetails;
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
