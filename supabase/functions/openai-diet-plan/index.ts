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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function calorieTarget(input: {
  heightCm: number;
  weightKg: number;
  goal: string;
  fitnessLevel: string;
  isPregnant: boolean;
}) {
  const h = input.heightCm || 165;
  const w = input.weightKg || 60;
  const m = h / 100;
  const bmi = m > 0 ? Math.round((w / (m * m)) * 10) / 10 : 22;
  let calories = 10 * w + 6.25 * h - 5 * 30 - 161;
  const goal = input.goal.toLowerCase();
  const level = input.fitnessLevel.toLowerCase();

  if (goal.includes("weight") || goal.includes("loss")) calories -= 350;
  else if (goal.includes("muscle") || goal.includes("boxing") || goal.includes("mma") || goal.includes("hiit"))
    calories += 250;
  else if (goal.includes("tone") || goal.includes("karate") || goal.includes("self")) calories += 100;
  else if (goal.includes("yoga") || goal.includes("flex") || goal.includes("stress")) calories -= 50;
  else if (goal.includes("pregnant") || input.isPregnant) calories += 300;
  else if (goal.includes("postpartum")) calories += 200;

  if (level.includes("active")) calories += 150;
  else if (level.includes("inter")) calories += 80;

  if (bmi >= 28 && !goal.includes("muscle")) calories -= 150;
  if (bmi > 0 && bmi < 19) calories += 150;

  return {
    calorieTarget: clamp(Math.round(calories / 50) * 50, 1400, 2600),
    bmi,
  };
}

type Meal = { name: string; calories: number; notes: string };
type Day = { day: number; breakfast: Meal; lunch: Meal; dinner: Meal };

function asMeal(raw: unknown, fallback: string): Meal {
  const row = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: String(row.name || fallback).trim() || fallback,
    calories: Math.max(120, Math.round(Number(row.calories) || 400)),
    notes: String(row.notes || "").trim() || "Balanced meal",
  };
}

function normalizeDays(parsed: unknown): Day[] {
  const root = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const list = Array.isArray(root.days) ? root.days : Array.isArray(parsed) ? parsed : [];
  const byDay = new Map<number, Day>();

  for (const item of list) {
    const row = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const day = Math.round(Number(row.day) || 0);
    if (day < 1 || day > 30) continue;
    byDay.set(day, {
      day,
      breakfast: asMeal(row.breakfast, "Protein breakfast"),
      lunch: asMeal(row.lunch, "Balanced lunch"),
      dinner: asMeal(row.dinner, "Light dinner"),
    });
  }

  const out: Day[] = [];
  for (let day = 1; day <= 30; day += 1) {
    const existing = byDay.get(day);
    if (existing) {
      out.push(existing);
      continue;
    }
    // Fill gaps by cycling earlier AI days when model returns fewer than 30.
    const donor = byDay.get(((day - 1) % Math.max(byDay.size, 1)) + 1) || out[0];
    if (donor) {
      out.push({
        day,
        breakfast: { ...donor.breakfast },
        lunch: { ...donor.lunch },
        dinner: { ...donor.dinner },
      });
    } else {
      out.push({
        day,
        breakfast: asMeal(null, "Oats & yogurt"),
        lunch: asMeal(null, "Chicken bowl"),
        dinner: asMeal(null, "Fish & veg"),
      });
    }
  }
  return out;
}

function fingerprintOf(input: {
  heightCm: number;
  weightKg: number;
  goal: string;
  fitnessLevel: string;
  foodPreference: string;
  isPregnant: boolean;
}) {
  return [
    Math.round(input.heightCm),
    Math.round(input.weightKg * 10) / 10,
    input.goal.trim().toLowerCase(),
    input.fitnessLevel.trim().toLowerCase(),
    input.foodPreference.trim().toLowerCase(),
    input.isPregnant ? "1" : "0",
  ].join("|");
}

/** Expand onboarding food chip into hard meal rules for the model. */
function foodPreferenceRules(foodPreference: string) {
  const f = foodPreference.toLowerCase();
  if (f.includes("carnivore")) {
    return [
      "CARNIVORE ONLY: animal foods only (meat, fish, eggs, dairy if tolerated).",
      "NO plants: no vegetables, fruit, grains, legumes, nuts, seeds, or plant oils.",
    ].join(" ");
  }
  if (f.includes("vegetarian") && !f.includes("vegan")) {
    return [
      "VEGETARIAN ONLY: no meat, poultry, or fish.",
      "Eggs and dairy are allowed. Use tofu, legumes, dairy, eggs for protein.",
    ].join(" ");
  }
  if (f.includes("vegan")) {
    return "VEGAN ONLY: no meat, fish, eggs, or dairy. Use plants, legumes, tofu, tempeh only.";
  }
  if (f.includes("gluten")) {
    return "GLUTEN-FREE ONLY: no wheat, barley, rye, or regular bread/pasta. Use rice, quinoa, potatoes, gluten-free grains.";
  }
  if (f.includes("dairy")) {
    return "DAIRY-FREE ONLY: no milk, cheese, yogurt, butter, cream, or whey. Use dairy-free alternatives.";
  }
  if (f.includes("high protein") || f.includes("protein")) {
    return "HIGH PROTEIN: every meal should be protein-forward (eggs, meat, fish, Greek yogurt, tofu, legumes). Aim ~30%+ calories from protein.";
  }
  if (f.includes("low carb") || f.includes("keto")) {
    return "LOW CARB: minimize bread, pasta, rice, sweets. Prefer protein, non-starchy veg, healthy fats.";
  }
  return "EAT EVERYTHING: balanced omnivore meals with protein, carbs, and vegetables. No unnecessary restrictions.";
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
    memberId?: string;
    heightCm?: number;
    weightKg?: number;
    goal?: string;
    fitnessLevel?: string;
    foodPreference?: string;
    cyclePhase?: string;
    isPregnant?: boolean;
    force?: boolean;
    save?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const heightCm = Math.max(120, Number(body.heightCm) || 165);
  const weightKg = Math.max(35, Number(body.weightKg) || 60);
  const goal = String(body.goal || "balanced fitness").trim();
  const fitnessLevel = String(body.fitnessLevel || "Beginner").trim();
  const foodPreference = String(body.foodPreference || "Eat everything").trim();
  const cyclePhase = String(body.cyclePhase || "none").trim();
  const isPregnant = Boolean(body.isPregnant);
  const memberId = String(body.memberId || "").trim();
  const save = body.save !== false;
  const force = Boolean(body.force);
  const fingerprint = fingerprintOf({ heightCm, weightKg, goal, fitnessLevel, foodPreference, isPregnant });
  const { calorieTarget: target, bmi } = calorieTarget({ heightCm, weightKg, goal, fitnessLevel, isPregnant });

  if (memberId && !force) {
    const existing = await adminClient
      .from("member_diet_plans")
      .select("*")
      .eq("member_id", memberId)
      .maybeSingle();
    if (!existing.error && existing.data && existing.data.fingerprint === fingerprint) {
      const days = normalizeDays({ days: existing.data.days });
      if (days.length === 30) {
        return json({
          ok: true,
          cached: true,
          plan: {
            calorieTarget: existing.data.calorie_target || target,
            bmi: existing.data.bmi || bmi,
            days,
            source: existing.data.source || "ai",
            model: existing.data.model || null,
          },
        });
      }
    }
  }

  const dietRules = foodPreferenceRules(foodPreference);

  const prompt = `You are Fema AI nutrition coach for women.
Create a personalized 30-day diet plan with breakfast, lunch, and dinner for EVERY day (days 1 through 30).

User profile:
- Height: ${heightCm} cm
- Weight: ${weightKg} kg
- BMI: ${bmi}
- Training / activity focus: ${goal}
- Fitness level: ${fitnessLevel}
- Food preference chip (from onboarding): ${foodPreference}
- Food preference RULES (MUST follow every meal): ${dietRules}
- Cycle phase: ${cyclePhase}
- Pregnant: ${isPregnant ? "yes" : "no"}
- Daily calorie target: ~${target} kcal

Rules:
- Match meals to the activity (e.g. yoga = lighter, anti-inflammatory, easy digest; boxing/HIIT = higher carbs around training; muscle = higher protein; weight loss = deficit-friendly).
- FOOD PREFERENCE IS MANDATORY: every breakfast, lunch, and dinner must obey the food preference rules above. Do not include banned foods.
- Allowed preference chips: Eat everything | Vegetarian | Carnivore | Gluten-free | Dairy-free | High protein | Low carb.
- If pregnant: pregnancy-safe only (no raw fish, alcohol, unpasteurized cheese).
- Vary meals across 30 days; do not repeat the exact same day three times in a row.
- Keep meal names short and practical for home cooking.
- Breakfast ~22%, lunch ~38%, dinner ~40% of daily calories.
- notes: one short coaching tip (max 8 words), mention the diet style when useful (e.g. "Carnivore protein", "Gluten-free carbs").

Return ONLY valid JSON:
{
  "daily_calories": ${target},
  "food_preference": "${foodPreference}",
  "days": [
    {
      "day": 1,
      "breakfast": { "name": "", "calories": 0, "notes": "" },
      "lunch": { "name": "", "calories": 0, "notes": "" },
      "dinner": { "name": "", "calories": 0, "notes": "" }
    }
  ]
}
You MUST include all 30 days.`;

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a careful women's nutrition coach. Output strict JSON only with exactly 30 days.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  const openaiJson = await openaiRes.json();
  if (!openaiRes.ok) {
    return json({ error: openaiJson?.error?.message || "OpenAI diet plan failed" }, 502);
  }

  const content = openaiJson.choices?.[0]?.message?.content || "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return json({ error: "Failed to parse OpenAI response", raw: content }, 502);
  }

  const days = normalizeDays(parsed);
  const model = "gpt-4.1-mini";
  const plan = {
    calorieTarget: Number((parsed as { daily_calories?: number })?.daily_calories) || target,
    bmi,
    days,
    source: "ai" as const,
    model,
  };

  if (save && memberId) {
    const row = {
      member_id: memberId,
      goal,
      fitness_level: fitnessLevel,
      food_preference: foodPreference,
      height_cm: heightCm,
      weight_kg: weightKg,
      calorie_target: plan.calorieTarget,
      bmi,
      fingerprint,
      days,
      source: "ai",
      model,
      updated_at: new Date().toISOString(),
    };
    const { error } = await adminClient.from("member_diet_plans").upsert(row, { onConflict: "member_id" });
    if (error) {
      console.error("member_diet_plans upsert failed", error.message);
      return json({ ok: true, plan, saved: false, warning: error.message, model });
    }
  }

  return json({ ok: true, plan, saved: Boolean(save && memberId), cached: false, model });
});
