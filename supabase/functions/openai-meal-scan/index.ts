import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function resolveOpenAiKey(adminClient: ReturnType<typeof createClient>) {
  const fromEnv = Deno.env.get("OPENAI_API_KEY");
  if (fromEnv) return fromEnv;

  const { data } = await adminClient.from("app_secrets").select("value").eq("id", "openai_api_key").maybeSingle();
  return data?.value || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Supabase env is not configured" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const openAiKey = await resolveOpenAiKey(adminClient);
  if (!openAiKey) return json({ error: "OpenAI API key is not configured on the server" }, 500);

  let body: { imageBase64?: string; mimeType?: string; goal?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const imageBase64 = String(body.imageBase64 || "").trim().replace(/^data:[^;]+;base64,/, "");
  if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);
  const mimeType = String(body.mimeType || "image/jpeg");
  const goal = String(body.goal || "balanced nutrition for women");

  const prompt = `You are Fema AI nutrition coach. Analyze this food photo for a woman focusing on ${goal}.
Return ONLY valid JSON with this shape:
{
  "name": "food name",
  "score": 0-100,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "summary": "1-2 sentence insight",
  "tips": ["tip1", "tip2", "tip3"],
  "tags": ["tag1", "tag2"],
  "ingredients": [{"name": "item", "concern": false, "detail": ""}],
  "alternatives": [{"name": "option", "score": 85, "why": "reason"}]
}`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
    }),
  });

  const openaiJson = await openaiRes.json();
  if (!openaiRes.ok) {
    return json({ error: openaiJson?.error?.message || "OpenAI meal scan failed" }, 502);
  }

  const content = openaiJson.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return json({ error: "Failed to parse OpenAI response", raw: content }, 502);
  }

  return json({ ok: true, result: parsed, model: "gpt-4o" });
});
