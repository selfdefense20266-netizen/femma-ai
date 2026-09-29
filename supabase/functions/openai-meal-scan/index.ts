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

  let body: {
    imageBase64?: string;
    mimeType?: string;
    goal?: string;
    foodPreference?: string;
    durationWeeks?: number;
    dailyTime?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const imageBase64 = String(body.imageBase64 || "").trim().replace(/^data:[^;]+;base64,/, "");
  if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);
  const mimeType = String(body.mimeType || "image/jpeg");
  const goal = String(body.goal || "balanced nutrition for women");
  const foodPreference = String(body.foodPreference || "Eat everything");
  const durationWeeks = Number(body.durationWeeks) || 8;
  const dailyTime = String(body.dailyTime || "20–30 min");

  const prompt = `You are Fema AI nutrition coach. Analyze this food photo for a woman.
Her training selection: ${goal}
Plan length: ${durationWeeks} weeks
Daily training time: ${dailyTime}
What she can eat: ${foodPreference}

Judge the meal AGAINST that selection. If it breaks her food rule (vegan, vegetarian, gluten-free, dairy-free, high protein, low carb), verdict must be "avoid".
Say clearly whether this food is good for her plan, and give calories.

IMPORTANT: Fill EVERY field below with best-effort estimates from the visible food. Do not leave dietary / preparation / allergen / enhanced sections empty — always provide values (use false/No/"None" when appropriate). Clients display this full report.

Return ONLY valid JSON with this exact shape:
{
  "name": "food name",
  "score": 0-100,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "added_sugar_g": number,
  "cholesterol_mg": number,
  "sodium_mg": number,
  "calcium_mg": number,
  "iron_mg": number,
  "potassium_mg": number,
  "vitamin_a_iu": number,
  "vitamin_d_mcg": number,
  "summary": "1-2 sentence insight",
  "verdict": "good" | "okay" | "avoid",
  "verdict_label": "Good for your plan",
  "calories_note": "540 kcal · 42g protein",
  "fit_reason": "why this helps or hurts her selected plan",
  "tips": ["tip1", "tip2", "tip3"],
  "tags": ["tag1", "tag2"],
  "ingredients": [{"name": "item", "concern": false, "detail": ""}],
  "alternatives": [{"name": "option", "score": 85, "why": "reason"}],
  "dietary": {
    "vegetarian": boolean,
    "vegan": boolean,
    "gluten_free": boolean,
    "keto": boolean,
    "paleo": boolean,
    "organic": boolean,
    "kosher": boolean,
    "halal": boolean,
    "low_carb": boolean,
    "low_fodmap": boolean
  },
  "preparation": {
    "method": "e.g. Grilling",
    "raw": boolean,
    "cooked": boolean,
    "processed": boolean,
    "ingredients_text": "Beef Ribeye Steak, Arugula, Cherry Tomatoes, Lemon, Olive Oil, Black Pepper, Salt, Dried Herbs"
  },
  "allergens": {
    "contains": [],
    "may_contain": ["Soy"],
    "meal_timing": "Best consumed for lunch or early dinner…",
    "satiety_score": "Very High due to…",
    "digestibility": "High, though…",
    "nutrient_density": "High in B-vitamins…",
    "absorption_tips": "Vitamin C from lemon…"
  },
  "enhanced_insight": {
    "impact": "Glycemic / blood-sugar impact paragraph, e.g. Very low. The meal is high in protein…",
    "inflammation": "Inflammation balance paragraph, e.g. Low to Neutral. The omega-3 content…",
    "sensitivity": "Sensitivity / trigger paragraph, e.g. Moderate, as grilled meats…"
  }
}

Rules for numbers: use decimals where useful (e.g. iron_mg: 4.8). vitamin_a_iu must be International Units (not mcg). If no allergens, contains should be []. Always write full allergen insight paragraphs.`;

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
