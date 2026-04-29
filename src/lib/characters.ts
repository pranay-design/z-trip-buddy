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
  // ElevenLabs voice id (from approved list)
  voiceId: string;
  // Optional voice tuning
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
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
    voiceId: "iP95p4xoKVk53GoZ742B", // Chris — warm, friendly
    voiceSettings: { stability: 0.4, similarity_boost: 0.8, style: 0.55, speed: 1.05 },
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
    voiceId: "XrExE9yKIg1WjnnlVkGX", // Matilda — sweet, friendly
    voiceSettings: { stability: 0.45, similarity_boost: 0.85, style: 0.5, speed: 1.0 },
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
    voiceId: "FGY2WhTYpPnrIDTdsKH5", // Laura — bright, expressive
    voiceSettings: { stability: 0.5, similarity_boost: 0.8, style: 0.45, speed: 1.0 },
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
