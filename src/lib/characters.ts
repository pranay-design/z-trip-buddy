// Three Japanese mascot-inspired characters that cycle each app load.
// Each has its own personality, color theme, voice (ElevenLabs voice id), and intro.

export type CharacterId = "tanuki" | "maneki" | "kitsune";

export interface Character {
  id: CharacterId;
  name: string;        // friendly name shown to kids
  realName: string;    // actual Japanese name
  emoji: string;
  // Personality used to color mascot dialogue throughout the app
  personality: string;
  // Spoken introduction (kid friendly, short)
  intro: string;
  // Optional phonetic version used only for speech playback.
  spokenIntro?: string;
  // ElevenLabs voice id (from approved list)
  voiceId: string;
  // Optional voice tuning
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
  };
  // Browser Speech Synthesis fallback tuning. The spokenIntro text carries
  // the Japanese-English accent while English voices keep playback reliable.
  browserVoice?: {
    lang: "en-US";
    pitch: number;
    rate: number;
    preferredNames: RegExp;
  };
  // Theme accent color (HSL string, no hsl() wrapper)
  accentHsl: string;
}

export const CHARACTERS: Record<CharacterId, Character> = {
  tanuki: {
    id: "tanuki",
    name: "Pon",
    realName: "Tanuki",
    emoji: "🦝",
    personality: "playful, mischievous, loves snacks and surprises",
    intro:
      "Hi hi! I'm Pon the Tanuki! I'm a lucky shape-shifter from Japanese folklore. Let's hunt for fun facts together!",
    voiceId: "nPczCjzI2devNBz1zQrb", // Brian — deep, jolly, mischievous
    voiceSettings: { stability: 0.3, similarity_boost: 0.75, style: 0.7, speed: 1.1 },
    browserVoice: { lang: "ja-JP", pitch: 0.82, rate: 0.92, preferredNames: /(otoya|ichiro|google.*日本語|google.*japanese|kyoko|haruka)/i },
    accentHsl: "28 80% 50%",
  },
  maneki: {
    id: "maneki",
    name: "Miko",
    realName: "Maneki Neko",
    emoji: "🐱",
    personality: "cheerful, polite, brings good luck",
    intro:
      "Konnichiwa! I'm Miko the lucky cat! My paw waves in good fortune. Ready to discover something wonderful?",
    voiceId: "pFZP5JQG7iQjIQuC4Bku", // Lily — sweet, high, cheerful
    voiceSettings: { stability: 0.55, similarity_boost: 0.9, style: 0.4, speed: 1.08 },
    browserVoice: { lang: "ja-JP", pitch: 1.58, rate: 1.02, preferredNames: /(kyoko|haruka|google.*日本語|google.*japanese|samantha)/i },
    accentHsl: "350 80% 60%",
  },
  kitsune: {
    id: "kitsune",
    name: "Kit",
    realName: "Kitsune",
    emoji: "🦊",
    personality: "wise, curious, magical fox spirit",
    intro:
      "Greetings, little explorer! I am Kit the Kitsune, a clever fox spirit. Together we shall uncover Japan's secrets!",
    voiceId: "SAz9YHcvj6GT2YYXdXww", // River — calm, mystical, wise
    voiceSettings: { stability: 0.7, similarity_boost: 0.8, style: 0.6, speed: 0.92 },
    browserVoice: { lang: "ja-JP", pitch: 1.04, rate: 0.82, preferredNames: /(kyoko|otoya|hattori|google.*日本語|google.*japanese|fiona|serena)/i },
    accentHsl: "358 78% 54%",
  },
};

const ORDER: CharacterId[] = ["tanuki", "maneki", "kitsune"];
const KEY = "japan-buddy-character-index";

/** Picks a character for this app load, cycling through the three on each reload. */
export function pickCharacterForSession(): Character {
  let next = 0;
  try {
    const raw = localStorage.getItem(KEY);
    const prev = raw == null ? -1 : parseInt(raw, 10);
    next = Number.isFinite(prev) ? (prev + 1) % ORDER.length : 0;
    localStorage.setItem(KEY, String(next));
  } catch {
    next = Math.floor(Math.random() * ORDER.length);
  }
  return CHARACTERS[ORDER[next]];
}
