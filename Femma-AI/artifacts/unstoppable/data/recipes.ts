import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ImageSourcePropType } from 'react-native';
import type { UserProfile } from '@/context/AppContext';
import { detectFocus } from '@/lib/dailyMissions';
import { goalLabels, ONBOARDING_GOALS, recipeFitsDiet } from '@/lib/nutritionPlan';
import catalog from '@/data/goal-recipes.json';
import { RECIPE_IMAGES } from '@/data/recipeImageMap';

export type Recipe = {
  id: string;
  title: string;
  time: string;
  timeMin: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  servings: number;
  rating: number;
  tags: string[];
  gradient: [string, string];
  image?: string;
  imageUrl?: string;
  ingredients: string[];
  steps: string[];
  source?: 'catalog' | 'ai';
};

export const RECIPE_FILTERS = ['For you', 'All', 'High Protein', 'Quick', 'Vegan', 'Vegetarian', 'Weight Loss', 'Pregnancy', 'Recovery'];

const COMBAT_FOCUS = new Set(['boxing', 'mma', 'karate', 'hiit', 'muscle', 'self-defense', 'taekwondo', 'jiu-jitsu']);

export const GOAL_RECIPE_IDS: Record<string, string[]> = catalog.goals;

export const CATALOG_RECIPES: Recipe[] = catalog.recipes.map((item) => ({
  ...item,
  gradient: item.gradient as [string, string],
  source: 'catalog',
}));

export function localRecipeImage(image?: string): ImageSourcePropType | undefined {
  if (!image) return undefined;
  return RECIPE_IMAGES[image];
}

export function profileGoalIds(profile: UserProfile): string[] {
  const chunks = String(profile.goal || '')
    .split(/[,/&+]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const ids = new Set<string>();
  for (const chunk of chunks) {
    const lower = chunk.toLowerCase().replace(/\s+/g, '');
    const match = ONBOARDING_GOALS.find(
      (item) => item.id === lower || item.id.replace(/_/g, '') === lower || item.label.toLowerCase() === chunk.toLowerCase()
    );
    if (match) ids.add(match.id);
  }
  if (profile.isPregnant) ids.add('pregnancy');
  return [...ids];
}

const STORAGE_KEY = 'fema-ai-generated-recipes';
const extraRecipes: Recipe[] = [];
let hydrated = false;
let hydratePromise: Promise<void> | null = null;

function isRecipe(value: unknown): value is Recipe {
  const recipe = value as Recipe;
  return Boolean(
    recipe &&
      typeof recipe.id === 'string' &&
      typeof recipe.title === 'string' &&
      Array.isArray(recipe.ingredients) &&
      Array.isArray(recipe.steps)
  );
}

async function persistGenerated() {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(extraRecipes.slice(0, 40)));
}

export async function hydrateGeneratedRecipes() {
  if (hydrated) return;
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      for (const recipe of parsed.filter(isRecipe)) {
        if (!extraRecipes.some((item) => item.id === recipe.id)) extraRecipes.push(recipe);
      }
    } catch {
      // Keep catalog recipes if storage is corrupt.
    } finally {
      hydrated = true;
    }
  })();
  return hydratePromise;
}

export function addGeneratedRecipes(recipes: Recipe[]) {
  for (const recipe of recipes) {
    const index = extraRecipes.findIndex((item) => item.id === recipe.id);
    if (index >= 0) extraRecipes[index] = recipe;
    else extraRecipes.unshift(recipe);
  }
  void persistGenerated();
}

export function allRecipes(): Recipe[] {
  return [...extraRecipes, ...CATALOG_RECIPES];
}

export function getRecipe(id?: string): Recipe | undefined {
  if (!id) return undefined;
  return allRecipes().find((recipe) => recipe.id === id);
}

export function recommendedRecipeFilter(_profile: UserProfile): string {
  return 'For you';
}

export function recipesListTitle(profile: UserProfile, filter: string): string {
  if (filter && filter !== 'For you' && filter !== 'All') return `${filter} recipes`;
  const labels = goalLabels(profile.goal || '');
  if (profile.isPregnant && !labels.some((label) => /pregnan/i.test(label))) {
    return labels.length ? `Pregnancy + ${labels.join(' + ')} recipes` : 'Pregnancy recipes';
  }
  if (labels.length) return `${labels.join(' + ')} recipes`;
  return 'Recipes for you';
}

function hasTag(recipe: Recipe, tag: string) {
  return recipe.tags.some((item) => item.toLowerCase() === tag.toLowerCase());
}

function recipeFitsTraining(recipe: Recipe, profile: UserProfile): boolean {
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  if (focus === 'pregnancy' || profile.isPregnant) {
    return hasTag(recipe, 'Pregnancy') || hasTag(recipe, 'Iron-rich') || recipe.protein >= 12;
  }
  if (focus === 'postpartum') {
    return hasTag(recipe, 'Recovery') || hasTag(recipe, 'Pregnancy') || recipe.protein >= 16;
  }
  if (focus === 'weight-loss') {
    return recipe.calories <= 450 || hasTag(recipe, 'Weight Loss');
  }
  if (COMBAT_FOCUS.has(focus)) {
    if (hasTag(recipe, 'Pregnancy') && !hasTag(recipe, 'High Protein')) return false;
    return (
      recipe.protein >= 18 ||
      hasTag(recipe, 'High Protein') ||
      hasTag(recipe, 'Boxing') ||
      (hasTag(recipe, 'Recovery') && recipe.protein >= 16)
    );
  }
  if (focus === 'yoga' || focus === 'stress' || focus === 'flexibility') {
    return !hasTag(recipe, 'Pregnancy') || hasTag(recipe, 'Vegan') || hasTag(recipe, 'Recovery');
  }
  return !hasTag(recipe, 'Pregnancy') || recipe.protein >= 18;
}

export function recipesForProfile(profile: UserProfile, filter: string): Recipe[] {
  const food = (profile.foodPreference || '').toLowerCase();
  const goalIds = profileGoalIds(profile);
  const allowedIds = new Set(goalIds.flatMap((id) => GOAL_RECIPE_IDS[id] || []));
  let list = allRecipes().filter((recipe) => recipeFitsDiet(recipe, profile.foodPreference));

  if (filter === 'For you') {
    if (allowedIds.size) {
      list = list.filter((recipe) => recipe.source === 'ai' || allowedIds.has(recipe.id));
    } else {
      list = list.filter((recipe) => recipeFitsTraining(recipe, profile));
    }
  } else if (filter !== 'All') {
    list = list.filter(
      (recipe) => recipe.tags.includes(filter) || (filter === 'Vegetarian' && recipeFitsDiet(recipe, 'Vegetarian'))
    );
  }

  const score = (recipe: Recipe) => {
    let n = 0;
    if (recipe.source === 'ai') n += 20;
    if (allowedIds.has(recipe.id)) n += 14;
    if (recipeFitsTraining(recipe, profile)) n += 8;
    if (profile.isPregnant || goalIds.includes('pregnancy')) n += hasTag(recipe, 'Pregnancy') ? 10 : 0;
    if (food.includes('vegan')) n += hasTag(recipe, 'Vegan') ? 8 : 0;
    if (food.includes('protein') || goalIds.some((id) => COMBAT_FOCUS.has(id === 'selfdefense' ? 'self-defense' : id))) {
      n += hasTag(recipe, 'High Protein') ? 6 : 0;
      n += Math.min(8, Math.round(recipe.protein / 8));
    }
    if (goalIds.includes('weight_loss')) n += hasTag(recipe, 'Weight Loss') ? 6 : 0;
    return n;
  };

  return [...list].sort((a, b) => score(b) - score(a));
}
