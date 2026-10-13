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
  /** 'fallback' = local planner saved after an AI failure (AI is retried next load). */
  source: 'ai' | 'local' | 'fallback';
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
    source: data.source === 'fallback' ? 'fallback' : data.source === 'local' ? 'local' : 'ai',
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

  // The edge function requires the signed-in user's JWT; the anon key is only
  // used when there is no session (the function will then reject with 401).
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || supabaseAnonKey;
  return post(token);
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
  let force = Boolean(options?.force);
  let savedFallback: StoredDietPlan | null = null;
  if (!force && memberId) {
    const saved = await fetchSavedDietPlan(memberId, profile);
    // Legacy rows saved with source 'local' were also failure fallbacks.
    if (saved && saved.source === 'ai') return saved;
    if (saved) {
      // Previous AI attempt failed — retry AI (force so the server doesn't return the cached fallback).
      savedFallback = saved;
      force = true;
    }
  }

  try {
    const { response, json } = await postDietPlan(profile, memberId, force);
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
    if (savedFallback) return savedFallback;
    const fallback: StoredDietPlan = { ...localPlan(profile), source: 'fallback' };
    // Best-effort save local plan (marked as fallback so AI is retried later).
    // RLS only allows writing the signed-in member's own row, so require a session;
    // memberId comes from resolveMemberId, which prefers the session user's email/uid.
    const { data: sessionData } = await supabase.auth.getSession();
    if (memberId && sessionData.session) {
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
            source: 'fallback',
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
