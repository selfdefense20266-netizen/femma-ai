import { supabase, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { UserProfile } from '@/context/AppContext';
import { detectFocus } from '@/lib/dailyMissions';
import { addGeneratedRecipes, hydrateGeneratedRecipes, type Recipe } from '@/data/recipes';
import { attachRecipeImages } from '@/lib/recipeImages';

const GRADIENTS: [string, string][] = [
  ['#F26BB5', '#B9A7F2'],
  ['#A9E4D2', '#77CDED'],
  ['#FFD88A', '#FF928F'],
  ['#77CDED', '#B9A7F2'],
];

type AiRecipe = {
  title?: string;
  time_minutes?: number;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  fiber_g?: number;
  servings?: number;
  tags?: string[];
  ingredients?: string[];
  steps?: string[];
};

const KNOWN_TAGS = ['High Protein', 'Quick', 'Vegan', 'Weight Loss', 'Pregnancy', 'Recovery', 'Meal Prep'];

function normalizeTags(tags: string[]) {
  return tags.map((tag) => {
    const lower = tag.toLowerCase();
    return KNOWN_TAGS.find((known) => lower === known.toLowerCase() || lower.includes(known.toLowerCase())) || tag;
  });
}

function mapAiRecipe(raw: AiRecipe, index: number): Recipe | null {
  const title = String(raw.title || '').trim();
  const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients.map(String).filter(Boolean) : [];
  const steps = Array.isArray(raw.steps) ? raw.steps.map(String).filter(Boolean) : [];
  if (!title || ingredients.length < 2 || steps.length < 2) return null;
  const mins = Math.max(5, Number(raw.time_minutes) || 20);
  const tags = normalizeTags(
    Array.isArray(raw.tags) && raw.tags.length ? raw.tags.map(String) : ['AI Generated']
  );
  return {
    id: `ai-${Date.now()}-${index}`,
    title,
    time: `${mins} min`,
    timeMin: mins,
    calories: Math.round(Number(raw.calories) || 400),
    protein: Math.round(Number(raw.protein_g) || 20),
    carbs: Math.round(Number(raw.carbs_g) || 30),
    fat: Math.round(Number(raw.fat_g) || 12),
    fiber: Math.round(Number(raw.fiber_g) || 0),
    servings: Math.max(1, Number(raw.servings) || 1),
    rating: 4.8,
    tags,
    gradient: GRADIENTS[index % GRADIENTS.length],
    ingredients,
    steps,
    source: 'ai',
  };
}

function recipesFromPlan(plan: { days?: Array<{ meals?: Array<AiRecipe & { name?: string; steps?: string[] }> }> } | undefined): AiRecipe[] {
  const meals = Array.isArray(plan?.days)
    ? plan.days.flatMap((day) => (Array.isArray(day.meals) ? day.meals : []))
    : [];
  return meals.map((meal) => {
    const ingredients = Array.isArray(meal.ingredients) ? meal.ingredients.map(String).filter(Boolean) : [];
    const steps = Array.isArray(meal.steps) && meal.steps.length
      ? meal.steps.map(String)
      : [
          `Gather: ${ingredients.join(', ') || 'the listed ingredients'}.`,
          `Cook ${meal.name || meal.title || 'the meal'} until done.`,
          'Plate and serve.',
        ];
    return {
      title: meal.title || meal.name,
      time_minutes: meal.time_minutes || 20,
      calories: meal.calories,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
      fiber_g: meal.fiber_g,
      servings: meal.servings || 1,
      tags: meal.tags,
      ingredients,
      steps,
    };
  });
}

export async function generateAiRecipes(profile: UserProfile): Promise<Recipe[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  await hydrateGeneratedRecipes();
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const goalLabel = profile.isPregnant
    ? `pregnancy week ${profile.pregnancyWeek || ''} ${profile.goal || focus}`.trim()
    : profile.goal || focus;
  const payload = {
    mode: 'recipes',
    goal: goalLabel,
    cyclePhase: profile.cyclePhase || 'none',
    preferences: [
      profile.foodPreference,
      profile.fitnessLevel,
      profile.isPregnant ? 'pregnancy-safe' : '',
    ].filter(Boolean),
    exclusions: [],
    calories: 1800,
    days: 1,
  };

  const post = async (token: string) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/openai-meal-plan`, {
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
      recipes?: AiRecipe[];
      plan?: { recipes?: AiRecipe[]; days?: Array<{ meals?: Array<AiRecipe & { name?: string }> }> };
    } = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { error: text || 'Recipe generate failed' };
    }
    return { response, json };
  };

  let token = supabaseAnonKey;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.access_token) {
    token = sessionData.session.access_token;
  }

  let result = await post(token);
  if (result.response.status === 401 && token !== supabaseAnonKey) {
    result = await post(supabaseAnonKey);
  }

  const { response, json } = result;
  if (!response.ok || json.error) {
    const message =
      response.status === 401
        ? 'Recipe AI is not authorized. Reload the app and try again.'
        : json.error || `Recipe generate failed (${response.status})`;
    throw new Error(message);
  }

  const rawList = json.recipes || json.plan?.recipes || recipesFromPlan(json.plan);
  let recipes = rawList.map(mapAiRecipe).filter((item): item is Recipe => Boolean(item));
  if (!recipes.length) throw new Error('AI did not return usable recipes.');
  recipes = await attachRecipeImages(recipes);
  if (profile.isPregnant || focus === 'pregnancy') {
    for (const recipe of recipes) {
      if (!recipe.tags.includes('Pregnancy')) recipe.tags.unshift('Pregnancy');
    }
  }
  addGeneratedRecipes(recipes);
  return recipes;
}
