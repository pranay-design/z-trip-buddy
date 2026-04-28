// Generates a kid-safe Japan fact (random or topic-based) and picks a stock image query.
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

async function callAI(userMsg: string) {
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
              imageQuery: { type: "string", description: "2-4 word search query for a real Japan photo, e.g. 'snow monkeys onsen', 'tokyo shibuya crossing'" },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, topic } = await req.json();
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

    const result = await callAI(prompt);
    if ("error" in result) {
      const msg = result.error === "rate"
        ? "Kit is catching his breath! Try again in a sec."
        : result.error === "credits"
        ? "Out of adventure points — ask a grown-up to top up Lovable AI credits."
        : "Hmm, something went wrong. Try again!";
      return new Response(JSON.stringify({ error: msg }), {
        status: result.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = result.data;
    // Build a stock image URL via loremflickr (keyless, real photos from Flickr)
    const tags = encodeURIComponent(`${args.imageQuery},japan`.toLowerCase().replace(/\s+/g, ","));
    const lock = Math.floor(Math.random() * 1000);
    const imageUrl = `https://loremflickr.com/800/600/${tags}?lock=${lock}`;

    return new Response(JSON.stringify({ ...args, imageUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("japan-fact error", e);
    return new Response(JSON.stringify({ error: "Something went wrong. Try again!" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
