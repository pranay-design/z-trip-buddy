// Analyzes an uploaded photo: kid-safe description, Japanese translation if any text, fun fact.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are "Kit the Fox", a kid's friendly guide for a family trip to Japan.

RULES:
- Audience is a child aged 6-10. Use simple, cheerful, short sentences.
- Always wholesome. Never describe violence, scary content, or identify real people by name. If you see people, just say "some people" or describe clothing/activity.
- If you see Japanese text (kanji, hiragana, katakana) on signs/menus/packages, transcribe it, give romaji, and a simple English meaning.
- Tie the fun fact to what's in the photo and to Japan (especially Tokyo or Kyoto).
- If the photo is unclear, do your best and stay positive.

Return ONLY by calling the provided tool.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No photo provided." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Look at this photo from our Japan trip. Tell us what's in it (kid-friendly), translate any Japanese text you see, and share one fun fact related to it." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "describe_photo",
            description: "Describe a kids' Japan photo",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Short catchy title (max 6 words)" },
                description: { type: "string", description: "2-3 short sentences, kid-friendly" },
                hasJapaneseText: { type: "boolean" },
                japaneseText: {
                  type: "object",
                  properties: {
                    original: { type: "string", description: "Japanese text seen" },
                    romaji: { type: "string", description: "Romanized pronunciation" },
                    english: { type: "string", description: "Simple English meaning" },
                  },
                  required: ["original", "romaji", "english"],
                  additionalProperties: false,
                },
                funFact: { type: "string", description: "1-2 sentence kid-safe fun fact tied to the photo" },
                category: { type: "string" },
                mascotSays: { type: "string", description: "Short fun reaction, max 5 words" },
              },
              required: ["title", "description", "hasJapaneseText", "funFact", "category", "mascotSays"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "describe_photo" } },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Kit is catching his breath! Try again in a sec." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "Out of adventure points — ask a grown-up to top up Lovable AI credits." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      console.error("AI photo error", res.status, t);
      return new Response(JSON.stringify({ error: "Hmm, couldn't read that photo. Try another!" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "Couldn't analyze that one. Try another photo!" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const args = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("japan-photo error", e);
    return new Response(JSON.stringify({ error: "Something went wrong. Try again!" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
