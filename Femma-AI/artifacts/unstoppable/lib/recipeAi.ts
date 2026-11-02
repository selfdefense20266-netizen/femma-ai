import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { getAccessToken, refreshAccessToken } from '@/lib/memberAuth';
import type { UserProfile } from '@/context/AppContext';
import { detectFocus } from '@/lib/dailyMissions';
import { calorieTarget, goalLabels, ONBOARDING_GOALS, recipeCoachNotes, recipeFitsDiet } from '@/lib/nutritionPlan';
import { addGeneratedRecipes, hydrateGeneratedRecipes, type Recipe } from '@/data/recipes';
import { sendCoachMessage } from '@/lib/coachAi';

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

export type AiRecipeRequest = {
  goalId?: string;
  foodPreference?: string;
  /** Breakfast / Lunch / Dinner / Snack — only ask the member for this */
  mealType?: string;
  /** Free-text search, e.g. "paneer tikka" or "high protein oats" */
  query?: string;
  /** Abort the in-flight request (timeout / cancel). */
  signal?: AbortSignal;
};

export async function generateAiRecipes(profile: UserProfile, request?: AiRecipeRequest): Promise<Recipe[]> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  await hydrateGeneratedRecipes();
  const goalId = request?.goalId || '';
  const foodPreference = request?.foodPreference || profile.foodPreference;
  const mealType = String(request?.mealType || '').trim();
  const query = String(request?.query || '').trim().slice(0, 120);
  const askedGoal = goalId
    ? ONBOARDING_GOALS.find((item) => item.id === goalId)?.label || goalId
    : '';
  const focus = detectFocus(askedGoal || profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const goalLabel = askedGoal
    || (profile.isPregnant
      ? `pregnancy week ${profile.pregnancyWeek || ''} ${goalLabels(profile.goal).join(', ')}`.trim()
      : goalLabels(profile.goal).join(', ') || focus);
  const workingProfile = {
    ...profile,
    goal: goalId || profile.goal,
    foodPreference,
  };
  const heightCm = Number(profile.heightCm) || 0;
  const weightKg = Number(profile.weightKg) || 0;
  const payload = {
    mode: 'recipes',
    goal: goalLabel,
    cyclePhase: profile.cyclePhase || 'none',
    preferences: [
      query
        ? `User searched for: "${query}". Every recipe must be a version of this dish or closely match this search.`
        : '',
      foodPreference,
      `can eat: ${foodPreference || 'Eat everything'}`,
      askedGoal ? `User picked this training: ${askedGoal}. Build recipes specifically for that.` : '',
      `Training focus: ${goalLabel || profile.goal || 'general fitness'}`,
      profile.fitnessLevel ? `Experience level: ${profile.fitnessLevel}` : '',
      heightCm > 0 ? `Height: ${Math.round(heightCm)} cm` : '',
      weightKg > 0 ? `Weight: ${Math.round(weightKg)} kg` : '',
      profile.environment ? `Training place: ${profile.environment}` : '',
      profile.dailyTime ? `Daily time available: ${profile.dailyTime}` : '',
      mealType
        ? `ONLY create ${mealType} recipes (not other meal times). Every recipe must fit ${mealType}.`
        : '',
      ...recipeCoachNotes(workingProfile),
      profile.isPregnant || goalId === 'pregnancy' ? 'pregnancy-safe food only' : '',
      profile.planDurationWeeks ? `${profile.planDurationWeeks} week plan` : '',
      query
        ? `Return 4 complete recipes for "${query}" with ingredients and numbered steps.`
        : mealType
        ? `Return 4 complete ${mealType} recipes with ingredients and numbered steps.`
        : 'Return 4 complete recipes with ingredients and numbered steps.',
    ].filter(Boolean),
    exclusions: [],
    calories: calorieTarget(workingProfile),
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
      signal: request?.signal,
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

  const token = await getAccessToken();
  let result = await post(token);
  if (result.response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) result = await post(refreshed);
  }

  const { response, json } = result;
  if (!response.ok || json.error) {
    const message =
      response.status === 401
        ? 'Please sign in again to use Recipe AI.'
        : json.error || `Recipe generate failed (${response.status})`;
    throw new Error(message);
  }

  const rawList = json.recipes || json.plan?.recipes || recipesFromPlan(json.plan);
  let recipes = rawList.map(mapAiRecipe).filter((item): item is Recipe => Boolean(item));
  const allowed = recipes.filter((recipe) => recipeFitsDiet(recipe, foodPreference));
  if (allowed.length) recipes = allowed;
  if (!recipes.length) throw new Error('AI did not return usable recipes.');
  if (profile.isPregnant || focus === 'pregnancy' || goalId === 'pregnancy') {
    for (const recipe of recipes) {
      if (!recipe.tags.includes('Pregnancy')) recipe.tags.unshift('Pregnancy');
    }
  }
  addGeneratedRecipes(recipes);
  return recipes;
}

export type RecipeVerdict = 'suitable' | 'moderation' | 'not_suitable';

export type RecipeSuitability = {
  verdict: RecipeVerdict;
  reason: string;
};

/** Asks the AI coach whether a recipe fits the member's onboarding profile. */
export async function checkRecipeSuitability(recipe: Recipe, profile: UserProfile): Promise<RecipeSuitability> {
  const heightCm = Number(profile.heightCm) || 0;
  const weightKg = Number(profile.weightKg) || 0;
  const facts = [
    `Goal: ${goalLabels(profile.goal).join(', ') || profile.goal || 'general fitness'}`,
    profile.fitnessLevel ? `Experience level: ${profile.fitnessLevel}` : '',
    `Food preference: ${profile.foodPreference || 'Eat everything'}`,
    heightCm > 0 ? `Height: ${Math.round(heightCm)} cm` : '',
    weightKg > 0 ? `Weight: ${Math.round(weightKg)} kg` : '',
    profile.isPregnant ? `Pregnant, week ${profile.pregnancyWeek || 'unknown'}` : '',
    profile.cyclePhase && profile.cyclePhase !== 'none' ? `Cycle phase: ${profile.cyclePhase}` : '',
    `Daily calorie target: ${calorieTarget(profile)} kcal`,
  ].filter(Boolean);

  const question = [
    'Is this recipe suitable for me based on my profile?',
    `My profile: ${facts.join('; ')}.`,
    `Recipe: ${recipe.title}. Per serving: ${recipe.calories} kcal, ${recipe.protein}g protein, ${recipe.carbs}g carbs, ${recipe.fat}g fat.`,
    `Ingredients: ${recipe.ingredients.join(', ')}.`,
    'Answer on the first line with exactly one of: SUITABLE, IN MODERATION, NOT SUITABLE.',
    'Then give 2-3 short sentences explaining why, speaking directly to me.',
  ].join('\n');

  const reply = await sendCoachMessage([{ role: 'user', content: question }], profile);
  const [first = '', ...rest] = reply.split('\n');
  const head = first.toUpperCase();
  const verdict: RecipeVerdict = head.includes('NOT SUITABLE')
    ? 'not_suitable'
    : head.includes('MODERATION')
    ? 'moderation'
    : 'suitable';
  const known = /SUITABLE|MODERATION/.test(head);
  const reason = (known ? rest.join('\n') : reply).replace(/^[\s:*-]+/, '').trim();
  return { verdict, reason: reason || first.trim() };
}
