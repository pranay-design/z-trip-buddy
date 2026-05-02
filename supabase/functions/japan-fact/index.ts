// Generates a kid-safe Japan fact (random or topic-based) and picks a stock image query.
// Also supports mode: "more" to fetch deeper details about an existing fact.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = ["Food", "Animals", "Tokyo", "Kyoto", "Tradition", "Nature", "Trains", "Festivals", "Temples", "Pop Culture"];

const SYSTEM = `You are "Kit the Fox", a friendly guide for kids aged 6-10 visiting Japan (Tokyo & Kyoto).

RULES (very important):
- Audience is a child. Use simple, cheerful, easy words. 2-3 short sentences max.
- ALWAYS safe and wholesome. Never mention violence, war, weapons, scary creatures, death, politics, religion debates, alcohol, dating, or anything frightening.
- If a topic is unsafe or unclear, gently pick a related friendly angle (e.g. "samurai" -> talk about cool armor in a museum, not fighting).
- Focus on fun facts about food, animals, nature, trains, temples, festivals, games, anime/Pokemon, daily life.
- Always positive, curious, and amazed tone. Add 1 emoji at most.
- Tokyo and Kyoto themed when possible.

Return your answer ONLY by calling the provided tool.`;

const MORE_SYSTEM = `You are "Kit the Fox", giving a curious child (age 6-10) MORE details about something Japanese.

RULES:
- Kid-safe, wholesome, cheerful, simple words.
- Provide 3 short bullet "did you know" facts (1 sentence each), and 1 short "see if you can spot it" tip for the trip.
- No violence, scary stuff, politics, etc. Reframe unsafe topics positively.
- Tokyo or Kyoto angle when possible.

Return ONLY by calling the provided tool.`;

async function callGenerate(userMsg: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      tools: [{
        type: "function",
        function: {
          name: "share_fact",
          description: "Share a kid-friendly Japan fact",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short catchy title (max 6 words)" },
              fact: { type: "string", description: "2-3 sentence kid-safe fact" },
              category: { type: "string", enum: CATEGORIES },
              imageQuery: { type: "string", description: "A specific Wikipedia article title or 2-3 word noun phrase for a real Japan photo, e.g. 'Japanese macaque', 'Shibuya Crossing', 'Fushimi Inari-taisha', 'Shinkansen'. Be SPECIFIC and use proper nouns when possible." },
              mascotSays: { type: "string", description: "Short fun reaction from Kit the fox, max 5 words" },
            },
            required: ["title", "fact", "category", "imageQuery", "mascotSays"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "share_fact" } },
    }),
  });

  if (res.status === 429) return { error: "rate", status: 429 };
  if (res.status === 402) return { error: "credits", status: 402 };
  if (!res.ok) {
    const t = await res.text();
    console.error("AI error", res.status, t);
    return { error: "ai", status: 500 };
  }

  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return { error: "no_tool", status: 500 };
  const args = JSON.parse(call.function.arguments);
  return { data: args };
}

async function callMore(title: string, fact: string, topic?: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const userMsg = `The kid just learned this fact:\nTitle: "${title}"\nFact: "${fact}"\n${topic ? `Topic: "${topic}"\n` : ""}Now share MORE cool details to keep them excited.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: MORE_SYSTEM },
        { role: "user", content: userMsg },
      ],
      tools: [{
        type: "function",
        function: {
          name: "share_more",
          description: "Share more kid-friendly details",
          parameters: {
            type: "object",
            properties: {
              didYouKnow: {
                type: "array",
                description: "Exactly 3 short kid-safe 'did you know' facts",
                items: { type: "string" },
                minItems: 3,
                maxItems: 3,
              },
              spotIt: { type: "string", description: "One short tip on how/where to spot it on a Tokyo/Kyoto trip" },
              mascotSays: { type: "string", description: "Short fun reaction, max 5 words" },
            },
            required: ["didYouKnow", "spotIt", "mascotSays"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "share_more" } },
    }),
  });

  if (res.status === 429) return { error: "rate", status: 429 };
  if (res.status === 402) return { error: "credits", status: 402 };
  if (!res.ok) {
    const t = await res.text();
    console.error("AI more error", res.status, t);
    return { error: "ai", status: 500 };
  }
  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) return { error: "no_tool", status: 500 };
  return { data: JSON.parse(call.function.arguments) };
}

// Try Wikipedia first (real, topical photos). Returns up to `max` distinct image URLs.
// Falls back to deterministic Picsum images if nothing is found.
async function findImages(query: string, max = 3): Promise<string[]> {
  const clean = query.trim();
  const found: string[] = [];
  const seen = new Set<string>();

  const push = (url?: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    found.push(url);
  };

  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      clean + " Japan"
    )}&format=json&origin=*&srlimit=8`;
    const sRes = await fetch(searchUrl, { headers: { "User-Agent": "JapanTripBuddy/1.0" } });
    if (sRes.ok) {
      const sJson = await sRes.json();
      const hits: { title: string }[] = sJson?.query?.search ?? [];
      for (const hit of hits) {
        if (found.length >= max) break;
        const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`;
        const pRes = await fetch(sumUrl, { headers: { "User-Agent": "JapanTripBuddy/1.0" } });
        if (!pRes.ok) continue;
        const pJson = await pRes.json();
        push(pJson?.originalimage?.source || pJson?.thumbnail?.source);
      }
    }
  } catch (e) {
    console.error("wiki image lookup failed", e);
  }

  let i = 0;
  while (found.length < max) {
    const seed = encodeURIComponent(`${clean.toLowerCase()}-${i++}-japan`);
    push(`https://picsum.photos/seed/${seed}/800/600`);
  }
  return found.slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { mode, topic } = body;

    if (mode === "more") {
      const { title, fact } = body;
      if (!title || !fact) {
        return new Response(JSON.stringify({ error: "Missing fact details." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await callMore(String(title), String(fact), topic ? String(topic) : undefined);
      if ("error" in result) {
        const msg = result.error === "rate" ? "Kit is catching his breath! Try again in a sec."
          : result.error === "credits" ? "Out of adventure points — ask a grown-up to top up Lovable AI credits."
          : "Hmm, something went wrong. Try again!";
        return new Response(JSON.stringify({ error: msg }), {
          status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(result.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt: string;
    if (mode === "topic") {
      const t = (topic ?? "").toString().trim().slice(0, 80);
      if (!t) {
        return new Response(JSON.stringify({ error: "Please type something to search!" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      prompt = `Give me ONE fun, kid-safe Japan fact related to: "${t}". If the topic is not safe for kids, pick a related happy angle. Make it about Japan (especially Tokyo or Kyoto).`;
    } else {
      const seed = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      prompt = `Give me ONE surprising, kid-safe fun fact about Japan. Theme it around: ${seed}. Make it different from common facts. Tokyo or Kyoto preferred.`;
    }

    const result = await callGenerate(prompt);
    if ("error" in result) {
      const msg = result.error === "rate" ? "Kit is catching his breath! Try again in a sec."
        : result.error === "credits" ? "Out of adventure points — ask a grown-up to top up Lovable AI credits."
        : "Hmm, something went wrong. Try again!";
      return new Response(JSON.stringify({ error: msg }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = result.data;
    const imageUrls = await findImages(args.imageQuery, 3);

    return new Response(JSON.stringify({ ...args, imageUrl: imageUrls[0], imageUrls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("japan-fact error", e);
    return new Response(JSON.stringify({ error: "Something went wrong. Try again!" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
