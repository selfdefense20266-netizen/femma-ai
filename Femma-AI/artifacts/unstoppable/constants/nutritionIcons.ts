import type { ImageSourcePropType } from 'react-native';

/**
 * Shared meal / macro logos.
 * Filenames use -v2 so Metro picks up cropped replacements (same path = stale cache).
 * After cropping again: overwrite these files, then bump the suffix (v3…) or restart with --clear.
 */
export const NUTRITION_ICONS = {
  scanMeal: require('../assets/nutrition/scan-meal-v2.png') as ImageSourcePropType,
  calories: require('../assets/nutrition/calories-v2.png') as ImageSourcePropType,
  protein: require('../assets/nutrition/protein-v2.png') as ImageSourcePropType,
  fats: require('../assets/nutrition/fats-v2.png') as ImageSourcePropType,
  carbs: require('../assets/nutrition/carbs-bowl-v2.png') as ImageSourcePropType,
  bowl: require('../assets/nutrition/carbs-bowl-v2.png') as ImageSourcePropType,
  bowlLight: require('../assets/nutrition/carbs-bowl-light-v2.png') as ImageSourcePropType,
  todayMeals: require('../assets/nutrition/today-meals.png') as ImageSourcePropType,
} as const;

export type NutritionIconKey = keyof typeof NUTRITION_ICONS;

export function nutritionIconForLabel(label: string): ImageSourcePropType {
  const key = label.trim().toLowerCase();
  if (key.startsWith('cal') || key.includes('kcal') || key.includes('calorie')) {
    return NUTRITION_ICONS.calories;
  }
  if (key.startsWith('prot') || key === 'p') return NUTRITION_ICONS.protein;
  if (key.startsWith('fat') || key === 'f') return NUTRITION_ICONS.fats;
  if (key.startsWith('carb') || key === 'c' || key.includes('bowl') || key.includes('meal')) {
    return NUTRITION_ICONS.carbs;
  }
  if (key.includes('scan')) return NUTRITION_ICONS.scanMeal;
  return NUTRITION_ICONS.bowl;
}
