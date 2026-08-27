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
    mode?: string;
    goal?: string;
    calories?: number;
    cyclePhase?: string;
    days?: number;
    preferences?: string[];
    exclusions?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const goal = String(body.goal || "balanced energy");
  const calories = Number(body.calories) || 1800;
  const cyclePhase = String(body.cyclePhase || "follicular");
  const days = Math.min(7, Math.max(1, Number(body.days) || 3));
  const preferences = Array.isArray(body.preferences) ? body.preferences : [];
  const exclusions = Array.isArray(body.exclusions) ? body.exclusions : [];
  const recipeMode = String(body.mode || "").toLowerCase() === "recipes";

  const prompt = recipeMode
    ? `You are Fema AI recipe coach for women.
Create 4 complete recipes matched to this person.
Goal / focus: ${goal}
Cycle phase: ${cyclePhase}
Preferences: ${preferences.join(", ") || "none"}
Exclusions: ${exclusions.join(", ") || "none"}
Daily calories context: ~${calories}

Rules:
- Recipes must be practical home cooking.
- If the goal is pregnancy or prenatal, make food pregnancy-safe (no raw fish, alcohol, or unpasteurized cheese) and iron/folate friendly.
- If vegan or vegetarian is in preferences, follow that strictly.
- Each recipe needs real ingredients and numbered cooking steps.

Return ONLY valid JSON:
{
  "recipes": [
    {
      "title": "",
      "time_minutes": 20,
      "calories": 0,
      "protein_g": 0,
      "carbs_g": 0,
      "fat_g": 0,
      "fiber_g": 0,
      "servings": 1,
      "tags": ["High Protein"],
      "ingredients": [""],
      "steps": [""]
    }
  ]
}`
    : `You are Fema AI meal planner for women.
Create a ${days}-day meal plan.
Goal: ${goal}
Daily calories target: ~${calories}
Cycle phase: ${cyclePhase}
Preferences: ${preferences.join(", ") || "none"}
Exclusions: ${exclusions.join(", ") || "none"}

Return ONLY valid JSON:
{
  "title": "plan title",
  "daily_calories": number,
  "notes": "short coaching note",
  "days": [
    {
      "day": 1,
      "meals": [
        { "type": "breakfast|lunch|dinner|snack", "name": "", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "ingredients": [""] }
      ]
    }
  ]
}`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.5,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a careful nutrition coach. Output strict JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const openaiJson = await openaiRes.json();
  if (!openaiRes.ok) {
    return json({ error: openaiJson?.error?.message || "OpenAI meal plan failed" }, 502);
  }

  const content = openaiJson.choices?.[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return json({ error: "Failed to parse OpenAI response", raw: content }, 502);
  }

  if (recipeMode) {
    const recipes = Array.isArray(parsed?.recipes) ? parsed.recipes : Array.isArray(parsed) ? parsed : [];
    return json({ ok: true, recipes, model: "gpt-4.1-mini" });
  }

  return json({ ok: true, plan: parsed, model: "gpt-4.1-mini" });
});
