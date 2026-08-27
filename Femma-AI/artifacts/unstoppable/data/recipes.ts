import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '@/context/AppContext';
import { detectFocus } from '@/lib/dailyMissions';

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
  imageUrl?: string;
  ingredients: string[];
  steps: string[];
  source?: 'catalog' | 'ai';
};

export const RECIPE_FILTERS = ['All', 'High Protein', 'Quick', 'Vegan', 'Weight Loss', 'Pregnancy', 'Recovery'];

export const CATALOG_RECIPES: Recipe[] = [
  {
    id: 'r1',
    title: 'Greek Chicken Power Bowl',
    time: '20 min',
    timeMin: 20,
    calories: 480,
    protein: 42,
    carbs: 36,
    fat: 18,
    fiber: 6,
    servings: 2,
    rating: 4.9,
    tags: ['High Protein', 'Meal Prep'],
    gradient: ['#F26BB5', '#B9A7F2'],
    ingredients: [
      '2 chicken breasts',
      '1 cup quinoa',
      '1 cup cherry tomatoes',
      '1/2 cucumber',
      '100g feta cheese',
      '2 tbsp olive oil',
      '1 lemon, juiced',
      '1 tsp dried oregano',
      'Fresh parsley',
      'Salt & pepper',
    ],
    steps: [
      'Cook quinoa in 2 cups of water for 15 minutes until fluffy.',
      'Season chicken with oregano, salt, and pepper. Cook in olive oil over medium heat, 6 min each side.',
      'Halve cherry tomatoes and dice cucumber.',
      'Slice cooked chicken and assemble over quinoa.',
      'Top with tomatoes, cucumber, crumbled feta and fresh parsley.',
      'Drizzle with lemon juice and serve immediately.',
    ],
  },
  {
    id: 'r2',
    title: 'Green Goddess Smoothie',
    time: '5 min',
    timeMin: 5,
    calories: 220,
    protein: 18,
    carbs: 24,
    fat: 6,
    fiber: 5,
    servings: 1,
    rating: 4.7,
    tags: ['Quick', 'Vegan'],
    gradient: ['#A9E4D2', '#77CDED'],
    ingredients: [
      '1 frozen banana',
      '1 cup spinach',
      '1 scoop plant protein',
      '1 tbsp almond butter',
      '1 cup unsweetened almond milk',
      '1 tsp chia seeds',
    ],
    steps: [
      'Add almond milk, spinach, banana, protein, almond butter and chia to a blender.',
      'Blend until completely smooth, 30–45 seconds.',
      'Pour into a glass and drink immediately.',
    ],
  },
  {
    id: 'r3',
    title: 'Salmon & Quinoa',
    time: '25 min',
    timeMin: 25,
    calories: 520,
    protein: 38,
    carbs: 32,
    fat: 24,
    fiber: 4,
    servings: 2,
    rating: 4.8,
    tags: ['Recovery', 'Omega-3'],
    gradient: ['#77CDED', '#B9A7F2'],
    ingredients: [
      '2 salmon fillets',
      '1 cup quinoa',
      '1 lemon',
      '1 cup steamed broccoli',
      '1 tbsp olive oil',
      'Garlic, salt, pepper',
    ],
    steps: [
      'Cook quinoa according to package directions.',
      'Pat salmon dry, season, and pan-sear in olive oil 4 minutes per side.',
      'Steam broccoli until bright green.',
      'Plate quinoa, salmon and broccoli. Finish with lemon.',
    ],
  },
  {
    id: 'r4',
    title: 'Pregnancy Oat Bowl',
    time: '10 min',
    timeMin: 10,
    calories: 380,
    protein: 14,
    carbs: 52,
    fat: 12,
    fiber: 8,
    servings: 1,
    rating: 4.9,
    tags: ['Pregnancy', 'Iron-rich'],
    gradient: ['#FFD88A', '#FF928F'],
    ingredients: [
      '1/2 cup rolled oats',
      '1 cup milk or fortified plant milk',
      '1 tbsp ground flaxseed',
      '1/2 cup berries',
      '1 tbsp peanut butter',
      '1 tsp honey (optional)',
    ],
    steps: [
      'Simmer oats in milk for 5 minutes until creamy.',
      'Stir in flaxseed.',
      'Top with berries, peanut butter and honey.',
    ],
  },
  {
    id: 'r5',
    title: 'Anti-Inflammatory Turmeric Soup',
    time: '30 min',
    timeMin: 30,
    calories: 290,
    protein: 12,
    carbs: 34,
    fat: 10,
    fiber: 7,
    servings: 3,
    rating: 4.6,
    tags: ['Recovery', 'Vegan'],
    gradient: ['#FF928F', '#FFD88A'],
    ingredients: [
      '1 onion, chopped',
      '2 carrots',
      '1 cup red lentils',
      '1 tsp turmeric',
      '1 tsp ginger',
      '4 cups vegetable broth',
      '1 tbsp olive oil',
    ],
    steps: [
      'Sauté onion and carrots in olive oil for 5 minutes.',
      'Add lentils, turmeric, ginger and broth.',
      'Simmer 20 minutes until lentils are soft.',
      'Blend half the soup for a creamy texture and serve.',
    ],
  },
  {
    id: 'r6',
    title: 'Crispy Tofu Stir-Fry',
    time: '20 min',
    timeMin: 20,
    calories: 410,
    protein: 28,
    carbs: 30,
    fat: 18,
    fiber: 6,
    servings: 2,
    rating: 4.7,
    tags: ['Vegan', 'High Protein'],
    gradient: ['#A9E4D2', '#F26BB5'],
    ingredients: [
      '400g extra-firm tofu',
      '2 cups mixed vegetables',
      '2 tbsp soy sauce',
      '1 tbsp sesame oil',
      '1 cup cooked brown rice',
      'Garlic and ginger',
    ],
    steps: [
      'Press tofu, cube, and pan-fry until golden.',
      'Stir-fry vegetables with garlic and ginger.',
      'Add tofu, soy sauce and sesame oil. Toss 2 minutes.',
      'Serve over brown rice.',
    ],
  },
  {
    id: 'r7',
    title: 'Lentil & Spinach Pregnancy Curry',
    time: '30 min',
    timeMin: 30,
    calories: 430,
    protein: 22,
    carbs: 54,
    fat: 12,
    fiber: 14,
    servings: 3,
    rating: 4.8,
    tags: ['Pregnancy', 'Iron-rich', 'Vegan'],
    gradient: ['#FFD88A', '#A9E4D2'],
    ingredients: [
      '1 cup red lentils',
      '2 cups spinach',
      '1 can chopped tomatoes',
      '1 tsp cumin',
      '1 tsp turmeric',
      '1 tbsp olive oil',
      'Fortified plant milk splash',
    ],
    steps: [
      'Sauté spices in olive oil for 1 minute.',
      'Add lentils and tomatoes with 2 cups water. Simmer 18 minutes.',
      'Stir in spinach until wilted. Finish with a splash of milk.',
      'Serve warm.',
    ],
  },
  {
    id: 'r8',
    title: 'Boxing Recovery Shake',
    time: '5 min',
    timeMin: 5,
    calories: 340,
    protein: 32,
    carbs: 28,
    fat: 10,
    fiber: 4,
    servings: 1,
    rating: 4.8,
    tags: ['High Protein', 'Quick', 'Recovery'],
    gradient: ['#77CDED', '#F26BB5'],
    ingredients: [
      '1 scoop whey or plant protein',
      '1 banana',
      '1 cup milk',
      '1 tbsp cocoa',
      'Handful of ice',
    ],
    steps: [
      'Add all ingredients to a blender.',
      'Blend until smooth and drink within 30 minutes after training.',
    ],
  },
  {
    id: 'r9',
    title: 'Egg White Veggie Scramble',
    time: '10 min',
    timeMin: 10,
    calories: 260,
    protein: 28,
    carbs: 10,
    fat: 10,
    fiber: 3,
    servings: 1,
    rating: 4.6,
    tags: ['High Protein', 'Quick', 'Weight Loss'],
    gradient: ['#FFD88A', '#77CDED'],
    ingredients: [
      '5 egg whites + 1 whole egg',
      '1 cup spinach',
      '1/2 cup peppers',
      '1 tsp olive oil',
      'Chili flakes, salt, pepper',
    ],
    steps: [
      'Sauté peppers and spinach in olive oil.',
      'Pour in beaten eggs and scramble until just set.',
      'Season and serve hot.',
    ],
  },
  {
    id: 'r10',
    title: 'Chickpea Lemon Salad',
    time: '10 min',
    timeMin: 10,
    calories: 310,
    protein: 14,
    carbs: 38,
    fat: 11,
    fiber: 10,
    servings: 2,
    rating: 4.5,
    tags: ['Vegan', 'Quick', 'Weight Loss'],
    gradient: ['#A9E4D2', '#FFD88A'],
    ingredients: [
      '1 can chickpeas, rinsed',
      '1 cucumber',
      '1 cup cherry tomatoes',
      'Lemon juice',
      '1 tbsp olive oil',
      'Parsley, salt, pepper',
    ],
    steps: [
      'Chop cucumber and tomatoes.',
      'Toss with chickpeas, lemon, olive oil and parsley.',
      'Season and serve chilled or room temperature.',
    ],
  },
];

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

export function recommendedRecipeFilter(profile: UserProfile): string {
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const food = (profile.foodPreference || '').toLowerCase();
  if (profile.isPregnant || focus === 'pregnancy') return 'Pregnancy';
  if (food.includes('vegan')) return 'Vegan';
  if (food.includes('vegetarian')) return 'Vegan';
  if (food.includes('protein')) return 'High Protein';
  if (focus === 'weight-loss') return 'Weight Loss';
  if (focus === 'boxing' || focus === 'muscle' || focus === 'hiit') return 'High Protein';
  if (focus === 'postpartum') return 'Recovery';
  return 'All';
}

export function recipesForProfile(profile: UserProfile, filter: string): Recipe[] {
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const food = (profile.foodPreference || '').toLowerCase();
  let list = allRecipes();

  if (filter !== 'All') {
    list = list.filter((recipe) => recipe.tags.includes(filter));
  }

  const score = (recipe: Recipe) => {
    let n = 0;
    if (recipe.source === 'ai') n += 20;
    if (profile.isPregnant || focus === 'pregnancy') n += recipe.tags.includes('Pregnancy') ? 10 : 0;
    if (food.includes('vegan')) n += recipe.tags.includes('Vegan') ? 8 : 0;
    if (food.includes('protein') || focus === 'muscle' || focus === 'boxing') {
      n += recipe.tags.includes('High Protein') ? 6 : 0;
    }
    if (focus === 'weight-loss') n += recipe.tags.includes('Weight Loss') ? 6 : 0;
    return n;
  };

  return [...list].sort((a, b) => score(b) - score(a));
}
