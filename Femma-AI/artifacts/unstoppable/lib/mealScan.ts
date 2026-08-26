import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type MealScanResult = {
  name: string;
  score: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  summary?: string;
  tips?: string[];
  tags?: string[];
  ingredients?: Array<{ name: string; concern?: boolean; detail?: string }>;
  alternatives?: Array<{ name: string; score: number; why: string }>;
};

type MealScanResponse = {
  ok?: boolean;
  result?: MealScanResult;
  error?: string;
  model?: string;
};

let lastScan: MealScanResult | null = null;

export function setLastMealScan(result: MealScanResult | null) {
  lastScan = result;
}

export function getLastMealScan() {
  return lastScan;
}

export async function scanMealFromBase64(input: {
  imageBase64: string;
  mimeType?: string;
  goal?: string;
}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const cleanBase64 = input.imageBase64.replace(/^data:[^;]+;base64,/, '');

  const { data, error } = await supabase.functions.invoke<MealScanResponse>('openai-meal-scan', {
    body: {
      imageBase64: cleanBase64,
      mimeType: input.mimeType || 'image/jpeg',
      goal: input.goal || 'balanced nutrition for women',
    },
  });

  if (error) throw new Error(error.message || 'Meal scan failed');
  if (data?.error) throw new Error(data.error);
  if (!data?.result) throw new Error('No scan result returned');

  setLastMealScan(data.result);
  return data.result;
}
