// Lightweight ElevenLabs TTS proxy. Returns base64 MP3 + mime type.
// On failure (e.g. free-tier disabled), returns { fallback: true } so the
// client can use the browser's built-in speech synthesis instead.

import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  text: string;
  voiceId: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    speed?: number;
    use_speaker_boost?: boolean;
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return json({ fallback: true, reason: "missing_api_key" });
    }

    const { text, voiceId, voiceSettings }: Body = await req.json();
    if (!text || !voiceId) {
      return json({ error: "text and voiceId required" }, 400);
    }

    const trimmed = text.length > 600 ? text.slice(0, 600) : text;

    const ttsResp = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmed,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: voiceSettings?.stability ?? 0.45,
            similarity_boost: voiceSettings?.similarity_boost ?? 0.8,
            style: voiceSettings?.style ?? 0.5,
            use_speaker_boost: voiceSettings?.use_speaker_boost ?? true,
            speed: voiceSettings?.speed ?? 1.0,
          },
        }),
      }
    );

    if (!ttsResp.ok) {
      const errText = await ttsResp.text();
      console.error("ElevenLabs TTS failed", ttsResp.status, errText);
      // Return 200 with fallback flag so client can degrade gracefully.
      return json({
        fallback: true,
        reason: ttsResp.status === 401 ? "elevenlabs_unavailable" : `status_${ttsResp.status}`,
        detail: errText.slice(0, 200),
      });
    }

    const audio = await ttsResp.arrayBuffer();
    const audioContent = base64Encode(audio);

    return json({ audioContent, mimeType: "audio/mpeg" });
  } catch (e) {
    console.error("tts error", e);
    return json({ fallback: true, reason: "exception", error: e instanceof Error ? e.message : "Unknown" });
  }
});
