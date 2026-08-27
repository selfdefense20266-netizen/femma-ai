import { supabase, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { Platform } from 'react-native';

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
}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const shrunk = await shrinkImage(input.imageBase64, input.mimeType || 'image/jpeg');
  const payload = {
    imageBase64: shrunk.base64,
    mimeType: shrunk.mimeType,
    goal: input.goal || 'balanced nutrition for women',
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
  let result: { response: Response; data: MealScanResponse };
  try {
    result = await post(token);
  } catch {
    throw new Error('Could not reach the meal scanner. Check your connection and try a smaller photo.');
  }
  if (result.response.status === 401 && token !== supabaseAnonKey) {
    try {
      result = await post(supabaseAnonKey);
    } catch {
      throw new Error('Could not reach the meal scanner. Check your connection and try a smaller photo.');
    }
  }
  const { response, data } = result;

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Meal scan failed (${response.status})`);
  }
  if (!data?.result) throw new Error('No scan result returned');

  setLastMealScan(data.result);
  return data.result;
}
