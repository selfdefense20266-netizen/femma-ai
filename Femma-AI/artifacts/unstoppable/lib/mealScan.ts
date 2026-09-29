import { supabase, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { Platform } from 'react-native';
import { applyScanVerdict } from '@/lib/nutritionPlan';

export type MealScanResult = {
  name: string;
  score: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  added_sugar_g?: number;
  cholesterol_mg?: number;
  sodium_mg?: number;
  calcium_mg?: number;
  iron_mg?: number;
  potassium_mg?: number;
  vitamin_a_iu?: number;
  vitamin_a_mcg?: number;
  vitamin_d_mcg?: number;
  summary?: string;
  tips?: string[];
  tags?: string[];
  ingredients?: Array<{ name: string; concern?: boolean; detail?: string }>;
  alternatives?: Array<{ name: string; score: number; why: string }>;
  verdict?: 'good' | 'okay' | 'avoid';
  verdict_label?: string;
  calories_note?: string;
  fit_reason?: string;
  dietary?: {
    vegetarian?: boolean;
    vegan?: boolean;
    gluten_free?: boolean;
    keto?: boolean;
    paleo?: boolean;
    organic?: boolean;
    kosher?: boolean;
    halal?: boolean;
    low_carb?: boolean;
    low_fodmap?: boolean;
  };
  preparation?: {
    method?: string;
    raw?: boolean;
    cooked?: boolean;
    processed?: boolean;
    ingredients_text?: string;
  };
  allergens?: {
    contains?: string[];
    may_contain?: string[];
    meal_timing?: string;
    satiety_score?: string;
    digestibility?: string;
    nutrient_density?: string;
    absorption_tips?: string;
  };
  enhanced_insight?: {
    impact?: string;
    inflammation?: string;
    sensitivity?: string;
  };
};

function num(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function bool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0) return false;
  return undefined;
}

function strList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

/** Normalize AI JSON so the result screen always has the full report shape. */
export function normalizeMealScanResult(raw: Partial<MealScanResult> | null | undefined): MealScanResult {
  const source = raw || {};
  const vitaminAIu =
    num(source.vitamin_a_iu) ??
    (num(source.vitamin_a_mcg) != null ? Math.round(Number(source.vitamin_a_mcg) * 3.33) : undefined);

  return {
    name: String(source.name || 'Scanned meal').trim() || 'Scanned meal',
    score: Math.round(num(source.score) ?? 0),
    calories: Math.round(num(source.calories) ?? 0),
    protein_g: num(source.protein_g) ?? 0,
    carbs_g: num(source.carbs_g) ?? 0,
    fat_g: num(source.fat_g) ?? 0,
    fiber_g: num(source.fiber_g),
    sugar_g: num(source.sugar_g),
    added_sugar_g: num(source.added_sugar_g),
    cholesterol_mg: num(source.cholesterol_mg),
    sodium_mg: num(source.sodium_mg),
    calcium_mg: num(source.calcium_mg),
    iron_mg: num(source.iron_mg),
    potassium_mg: num(source.potassium_mg),
    vitamin_a_iu: vitaminAIu,
    vitamin_a_mcg: num(source.vitamin_a_mcg),
    vitamin_d_mcg: num(source.vitamin_d_mcg),
    summary: source.summary ? String(source.summary) : undefined,
    tips: Array.isArray(source.tips) ? source.tips.map(String) : [],
    tags: Array.isArray(source.tags) ? source.tags.map(String) : [],
    ingredients: Array.isArray(source.ingredients)
      ? source.ingredients.map((item) => ({
          name: String(item?.name || '').trim() || 'Item',
          concern: Boolean(item?.concern),
          detail: String(item?.detail || ''),
        }))
      : [],
    alternatives: Array.isArray(source.alternatives)
      ? source.alternatives.map((item) => ({
          name: String(item?.name || '').trim() || 'Option',
          score: Math.round(num(item?.score) ?? 0),
          why: String(item?.why || ''),
        }))
      : [],
    verdict: source.verdict,
    verdict_label: source.verdict_label ? String(source.verdict_label) : undefined,
    calories_note: source.calories_note ? String(source.calories_note) : undefined,
    fit_reason: source.fit_reason ? String(source.fit_reason) : undefined,
    dietary: {
      vegetarian: bool(source.dietary?.vegetarian),
      vegan: bool(source.dietary?.vegan),
      gluten_free: bool(source.dietary?.gluten_free),
      keto: bool(source.dietary?.keto),
      paleo: bool(source.dietary?.paleo),
      organic: bool(source.dietary?.organic),
      kosher: bool(source.dietary?.kosher),
      halal: bool(source.dietary?.halal ?? (source.dietary as { hallal?: boolean } | undefined)?.hallal),
      low_carb: bool(source.dietary?.low_carb),
      low_fodmap: bool(source.dietary?.low_fodmap),
    },
    preparation: {
      method: source.preparation?.method ? String(source.preparation.method) : undefined,
      raw: bool(source.preparation?.raw),
      cooked: bool(source.preparation?.cooked),
      processed: bool(source.preparation?.processed),
      ingredients_text: source.preparation?.ingredients_text
        ? String(source.preparation.ingredients_text)
        : undefined,
    },
    allergens: {
      contains: strList(source.allergens?.contains),
      may_contain: strList(source.allergens?.may_contain),
      meal_timing: source.allergens?.meal_timing ? String(source.allergens.meal_timing) : undefined,
      satiety_score: source.allergens?.satiety_score ? String(source.allergens.satiety_score) : undefined,
      digestibility: source.allergens?.digestibility ? String(source.allergens.digestibility) : undefined,
      nutrient_density: source.allergens?.nutrient_density ? String(source.allergens.nutrient_density) : undefined,
      absorption_tips: source.allergens?.absorption_tips ? String(source.allergens.absorption_tips) : undefined,
    },
    enhanced_insight: {
      impact: source.enhanced_insight?.impact
        ? String(source.enhanced_insight.impact)
        : source.fit_reason
          ? String(source.fit_reason)
          : undefined,
      inflammation: source.enhanced_insight?.inflammation
        ? String(source.enhanced_insight.inflammation)
        : undefined,
      sensitivity: source.enhanced_insight?.sensitivity
        ? String(source.enhanced_insight.sensitivity)
        : undefined,
    },
  };
}

type MealScanResponse = {
  ok?: boolean;
  result?: MealScanResult;
  error?: string;
  model?: string;
};

let lastScan: MealScanResult | null = null;
let lastScanPhotoUri: string | null = null;

export function setLastMealScan(result: MealScanResult | null) {
  lastScan = result;
}

export function getLastMealScan() {
  return lastScan;
}

export function setLastMealScanPhotoUri(uri: string | null) {
  lastScanPhotoUri = uri;
}

export function getLastMealScanPhotoUri() {
  return lastScanPhotoUri;
}

function stripDataUrl(value: string) {
  return value.replace(/^data:[^;]+;base64,/, '');
}

async function shrinkImage(imageBase64: string, mimeType: string): Promise<{ base64: string; mimeType: string }> {
  const raw = stripDataUrl(imageBase64);
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return { base64: raw, mimeType };
  }

  const dataUrl = imageBase64.startsWith('data:') ? imageBase64 : `data:${mimeType};base64,${raw}`;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that photo.'));
    img.src = dataUrl;
  });

  const maxEdge = 1024;
  const scale = Math.min(1, maxEdge / Math.max(image.width || 1, image.height || 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((image.width || 1) * scale));
  canvas.height = Math.max(1, Math.round((image.height || 1) * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return { base64: raw, mimeType };
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const jpeg = canvas.toDataURL('image/jpeg', 0.72);
  return { base64: stripDataUrl(jpeg), mimeType: 'image/jpeg' };
}

async function authToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || supabaseAnonKey;
}

export async function scanMealFromBase64(input: {
  imageBase64: string;
  mimeType?: string;
  goal?: string;
  foodPreference?: string;
  durationWeeks?: number;
  dailyTime?: string;
}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const shrunk = await shrinkImage(input.imageBase64, input.mimeType || 'image/jpeg');
  const payload = {
    imageBase64: shrunk.base64,
    mimeType: shrunk.mimeType,
    goal: input.goal || 'balanced nutrition for women',
    foodPreference: input.foodPreference || '',
    durationWeeks: input.durationWeeks || 8,
    dailyTime: input.dailyTime || '',
  };

  const post = async (token: string) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/openai-meal-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: MealScanResponse = {};
    try {
      data = text ? (JSON.parse(text) as MealScanResponse) : {};
    } catch {
      data = { error: text || 'Meal scan failed' };
    }
    return { response, data };
  };

  let token = await authToken();
  let posted: { response: Response; data: MealScanResponse };
  try {
    posted = await post(token);
  } catch {
    throw new Error('Could not reach the meal scanner. Check your connection and try a smaller photo.');
  }
  if (posted.response.status === 401 && token !== supabaseAnonKey) {
    try {
      posted = await post(supabaseAnonKey);
    } catch {
      throw new Error('Could not reach the meal scanner. Check your connection and try a smaller photo.');
    }
  }
  const { response, data } = posted;

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Meal scan failed (${response.status})`);
  }
  if (!data?.result) throw new Error('No scan result returned');

  const scanned = applyScanVerdict(normalizeMealScanResult(data.result), {
    goal: input.goal,
    foodPreference: input.foodPreference,
    planDurationWeeks: input.durationWeeks,
    dailyTime: input.dailyTime,
  });
  setLastMealScan(scanned);
  return scanned;
}
