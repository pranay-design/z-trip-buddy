# Japan Trip Buddy — Plan

A bold, adventure-themed mobile-first web app for exploring Japan with your 8-year-old nephew. Three ways to discover fun, kid-safe facts, plus a local Saved list.

## Look & Feel — "Bold Adventure"

- Comic-book energy: chunky borders, drop shadows, badge/stamp accents, slight rotation on cards.
- Japan map motif in the background (subtle), torii gate and shinkansen icons, "passport stamp" stickers when you save items.
- Big tappable buttons, playful display font for headings (e.g. Bowlby/ Fredoka), readable sans for body.
- Warm adventure palette: red (torii), indigo blue, mustard yellow, off-white paper background.
- Friendly mascot: a little explorer fox 🦊 ("Kit") that pops up with reactions ("Sugoi!", "Let's go!").

## Screens

**Bottom tab bar** with 4 tabs (mobile-first since viewport is 411px):
1. 🎲 Surprise Me
2. 🔍 Search
3. 📸 Snap It
4. ⭐ Saved

### 1. Surprise Me (Random fact)
- Big "Spin the Wheel!" button. Tap → a "fact card" flips in with:
  - Curated stock photo of Japan (Tokyo, Kyoto, food, animals, festivals, etc.).
  - Kid-friendly fact (1–3 short sentences, simple words).
  - Category stamp (e.g. "Food", "Animals", "Tokyo", "Kyoto", "Tradition").
  - "Save ⭐" and "Another!" buttons.
- Mascot reacts with a fun phrase each spin.

### 2. Search (Topic fact)
- Search bar: "What do you want to learn about?" with quick-tap chips (animals, food, ninjas, trains, temples, Tokyo, Kyoto).
- Returns a fact card themed to the topic (e.g. "animals" → snow monkeys in hot springs).
- Stock photo matched to the topic. Save ⭐ available.

### 3. Snap It (Photo)
- Two big buttons: "Take a Photo" (camera) and "Upload a Photo" (gallery).
- After capture, shows the user's photo, then generates:
  - **What is it?** — short kid-safe description of what's in the photo.
  - **Japanese translation** — if Japanese text/signs are detected, shows the text + romaji + English translation.
  - **Fun fact** — related fact tied to what's in the image.
- Save ⭐ stores the photo + result.

### 4. Saved
- Grid of saved fact cards and photo finds, like a passport sticker book.
- Tap to view full card. Swipe / long-press to delete. "Clear all" with confirm.
- Empty state: Kit the fox holding an empty sticker book.

## How it works (technical)

- **Frontend**: React + Tailwind, mobile-first, bottom tab navigation.
- **Backend**: Lovable Cloud (edge functions) — keeps the AI key server-side.
- **AI**: Lovable AI Gateway.
  - Random/topic facts: `google/gemini-3-flash-preview` with a strict kid-safe system prompt (ages 6–10, no scary/violent content, simple language, 2–3 sentences, always positive). Structured output via tool calling: `{ title, fact, category, imageQuery }`.
  - Photo analysis: `google/gemini-2.5-pro` (multimodal) with the same kid-safe rules. Structured output: `{ description, japaneseText?: { original, romaji, english }, funFact, imageQuery }`.
- **Images (curated stock)**: Use Unsplash Source / Pexels via a server function that takes the AI's `imageQuery` (or category) and returns a real Japan photo URL. No user API key needed for Unsplash Source; Pexels can be added if a free key is provided.
- **Camera**: HTML `<input type="file" accept="image/*" capture="environment">` for camera, plain file input for upload. Works on iOS/Android browsers without native app.
- **Saved list**: `localStorage` only — no login. Stores fact cards as JSON; photos stored as compressed base64 (resized to ~800px max to keep storage small). "Storage almost full" warning if needed.
- **Safety guardrails**:
  - System prompt forbids scary, violent, political, or adult content; redirects to wholesome angles.
  - Server-side topic filter rejects unsafe search terms with a friendly "Let's pick something else!" message.
  - Photo analysis prompt explicitly avoids identifying real people, focuses on objects/places/food/animals/text.
- **Errors**: Friendly toasts for 429 ("Kit is catching his breath, try again!") and 402 ("Out of adventure points — ask a grown-up to top up.").

## Out of scope (for v1)
- Accounts, cloud sync, multi-device saves.
- Trip itinerary / maps / bookings.
- Audio narration (could be a nice add-on later via TTS).

## Suggested build order
1. Layout, theme tokens, bottom tabs, mascot component.
2. Edge function for kid-safe fact generation + stock image lookup.
3. Surprise Me + Search screens sharing the fact card component.
4. Edge function for photo analysis (multimodal) + Snap It screen with camera/upload.
5. Saved list with localStorage + delete/clear.
6. Polish: animations, empty states, error toasts.
