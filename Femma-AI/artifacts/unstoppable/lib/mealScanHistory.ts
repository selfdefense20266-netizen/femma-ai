import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MealScanResult } from '@/lib/mealScan';

export type SavedMealScan = {
  id: string;
  scannedAt: string;
  result: MealScanResult;
};

const MAX_SCANS = 40;

function storageKey(email?: string | null) {
  return `fema-ai-meal-scans:${(email || 'local').trim().toLowerCase() || 'local'}`;
}

export async function loadMealScans(email?: string | null): Promise<SavedMealScan[]> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.id && item?.scannedAt && item?.result?.name);
  } catch {
    return [];
  }
}

export async function saveMealScan(
  result: MealScanResult,
  email?: string | null
): Promise<SavedMealScan[]> {
  const next: SavedMealScan = {
    id: `scan-${Date.now()}`,
    scannedAt: new Date().toISOString(),
    result,
  };
  const current = await loadMealScans(email);
  const all = [next, ...current].slice(0, MAX_SCANS);
  await AsyncStorage.setItem(storageKey(email), JSON.stringify(all));
  return all;
}

export function formatScanTime(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 2) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  ) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function isSameDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function todayNutritionTotals(scans: SavedMealScan[]) {
  return scans.filter((item) => isSameDay(item.scannedAt)).reduce(
    (sum, item) => ({
      calories: sum.calories + (Number(item.result.calories) || 0),
      protein: sum.protein + (Number(item.result.protein_g) || 0),
      carbs: sum.carbs + (Number(item.result.carbs_g) || 0),
      fat: sum.fat + (Number(item.result.fat_g) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}
