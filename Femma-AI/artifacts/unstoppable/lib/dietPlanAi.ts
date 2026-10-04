import { supabase, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { resolveMemberId } from '@/lib/memberProgress';
import {
  bmiFromProfile,
  build30DayDietPlan,
  dietCalorieTarget,
  type DietDay,
  type DietPlanProfile,
} from '@/lib/dietPlan';
import type { UserProfile } from '@/context/AppContext';

export type StoredDietPlan = {
  calorieTarget: number;
  bmi: number;
  days: DietDay[];
  source: 'ai' | 'local';
  model?: string | null;
  cached?: boolean;
};

function fingerprintOf(profile: DietPlanProfile) {
  return [
    Math.round(Number(profile.heightCm) || 0),
    Math.round((Number(profile.weightKg) || 0) * 10) / 10,
    String(profile.goal || '').trim().toLowerCase(),
    String(profile.fitnessLevel || '').trim().toLowerCase(),
    String(profile.foodPreference || '').trim().toLowerCase(),
    profile.isPregnant ? '1' : '0',
  ].join('|');
}

function normalizeDays(raw: unknown): DietDay[] {
  const list = Array.isArray(raw) ? raw : [];
  const out: DietDay[] = [];
  for (let i = 0; i < 30; i += 1) {
    const row = (list[i] && typeof list[i] === 'object' ? list[i] : {}) as Record<string, unknown>;
    const meal = (key: string, fallback: string) => {
      const m = (row[key] && typeof row[key] === 'object' ? row[key] : {}) as Record<string, unknown>;
      return {
        name: String(m.name || fallback).trim() || fallback,
        calories: Math.max(120, Math.round(Number(m.calories) || 400)),
        notes: String(m.notes || '').trim() || 'Balanced meal',
      };
    };
    out.push({
      day: i + 1,
      breakfast: meal('breakfast', 'Protein breakfast'),
      lunch: meal('lunch', 'Balanced lunch'),
      dinner: meal('dinner', 'Light dinner'),
    });
  }
  return out;
}

export async function fetchSavedDietPlan(memberId: string, profile: DietPlanProfile): Promise<StoredDietPlan | null> {
  if (!isSupabaseConfigured || !memberId) return null;
  const { data, error } = await supabase
    .from('member_diet_plans')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle();
  if (error || !data) return null;
  if (data.fingerprint && data.fingerprint !== fingerprintOf(profile)) return null;
  const days = normalizeDays(data.days);
  if (days.length !== 30) return null;
  return {
    calorieTarget: Number(data.calorie_target) || dietCalorieTarget(profile),
    bmi: Number(data.bmi) || bmiFromProfile(profile),
    days,
    source: data.source === 'local' ? 'local' : 'ai',
    model: data.model || null,
    cached: true,
  };
}

async function postDietPlan(profile: UserProfile, memberId: string | null, force: boolean) {
  const foodPreference = profile.foodPreference || 'Eat everything';
  const payload = {
    memberId: memberId || undefined,
    heightCm: Number(profile.heightCm) || 165,
    weightKg: Number(profile.weightKg) || 60,
    goal: profile.goal || 'balanced fitness',
    fitnessLevel: profile.fitnessLevel || 'Beginner',
    // Onboarding chip: Eat everything | Vegetarian | Carnivore | Gluten-free | Dairy-free | High protein | Low carb
    foodPreference,
    cyclePhase: profile.cyclePhase || 'none',
    isPregnant: Boolean(profile.isPregnant),
    force,
    save: Boolean(memberId),
  };

  const post = async (token: string) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/openai-diet-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    let json: {
      error?: string;
      plan?: {
        calorieTarget?: number;
        bmi?: number;
        days?: DietDay[];
        source?: string;
        model?: string;
      };
      cached?: boolean;
    } = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { error: text || 'Diet plan generate failed' };
    }
    return { response, json };
  };

  let token = supabaseAnonKey;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) token = sessionData.session.access_token;

  let result = await post(token);
  if (result.response.status === 401 && token !== supabaseAnonKey) {
    result = await post(supabaseAnonKey);
  }
  return result;
}

function localPlan(profile: UserProfile): StoredDietPlan {
  return {
    calorieTarget: dietCalorieTarget(profile),
    bmi: bmiFromProfile(profile),
    days: build30DayDietPlan(profile),
    source: 'local',
    model: null,
    cached: false,
  };
}

/** Load saved AI plan, or generate via OpenAI and save to DB. Falls back to local planner. */
export async function ensureAiDietPlan(
  profile: UserProfile,
  options?: { email?: string | null; force?: boolean }
): Promise<StoredDietPlan> {
  if (!isSupabaseConfigured) return localPlan(profile);

  const memberId = await resolveMemberId(options?.email || undefined);
  if (!options?.force && memberId) {
    const saved = await fetchSavedDietPlan(memberId, profile);
    if (saved) return saved;
  }

  try {
    const { response, json } = await postDietPlan(profile, memberId, Boolean(options?.force));
    if (!response.ok || json.error || !json.plan?.days?.length) {
      throw new Error(json.error || `Diet plan generate failed (${response.status})`);
    }
    return {
      calorieTarget: Number(json.plan.calorieTarget) || dietCalorieTarget(profile),
      bmi: Number(json.plan.bmi) || bmiFromProfile(profile),
      days: normalizeDays(json.plan.days),
      source: 'ai',
      model: json.plan.model || 'gpt-4.1-mini',
      cached: Boolean(json.cached),
    };
  } catch (error) {
    console.warn('AI diet plan failed, using local fallback', error);
    const fallback = localPlan(profile);
    // Best-effort save local plan so UI has something in DB.
    if (memberId) {
      try {
        await supabase.from('member_diet_plans').upsert(
          {
            member_id: memberId,
            goal: profile.goal || '',
            fitness_level: profile.fitnessLevel || '',
            food_preference: profile.foodPreference || '',
            height_cm: profile.heightCm || null,
            weight_kg: profile.weightKg || null,
            calorie_target: fallback.calorieTarget,
            bmi: fallback.bmi,
            fingerprint: fingerprintOf(profile),
            days: fallback.days,
            source: 'local',
            model: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'member_id' }
        );
      } catch {
        // ignore
      }
    }
    return fallback;
  }
}

/** Fire-and-forget after onboarding. */
export function prefetchAiDietPlan(profile: UserProfile, email?: string | null) {
  void ensureAiDietPlan(profile, { email }).catch(() => undefined);
}
