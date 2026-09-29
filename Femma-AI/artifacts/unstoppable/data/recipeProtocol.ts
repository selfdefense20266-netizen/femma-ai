import type { Recipe } from '@/data/recipes';

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const CUISINES = [
  'Any Cuisine',
  'Mexican',
  'Italian',
  'Asian',
  'Mediterranean',
  'Indian',
  'Middle Eastern',
  'American',
] as const;
export type Cuisine = (typeof CUISINES)[number];

export type RecipeDietary = {
  vegetarian: boolean;
  vegan: boolean;
  gluten_free: boolean;
  keto: boolean;
  paleo: boolean;
  low_fodmap: boolean;
  organic: boolean;
  halal: boolean;
  kosher: boolean;
  low_carb: boolean;
};

export type RecipeAllergens = {
  contains: string[];
  may_contain: string[];
  meal_timing: string;
  satiety_score: string;
  digestibility: string;
  nutrient_density: string;
  absorption_tips: string;
};

export type RecipeEnhanced = {
  impact: string;
  inflammation: string;
  sensitivity: string;
};

export type RecipeProtocol = Recipe & {
  mealType: MealType;
  cuisine: Exclude<Cuisine, 'Any Cuisine'>;
  blueprint: string;
  prepMin: number;
  cookMin: number;
  netCarbs: number;
  sugar_g: number;
  added_sugar_g: number;
  cholesterol_mg: number;
  sodium_mg: number;
  calcium_mg: number;
  iron_mg: number;
  potassium_mg: number;
  vitamin_a_iu: number;
  vitamin_d_mcg: number;
  method: string;
  cooked: boolean;
  processed: boolean;
  raw: boolean;
  dietary: RecipeDietary;
  allergens: RecipeAllergens;
  enhanced: RecipeEnhanced;
};

type Meta = Partial<
  Omit<RecipeProtocol, keyof Recipe | 'dietary' | 'allergens' | 'enhanced'> & {
    dietary?: Partial<RecipeDietary>;
    allergens?: Partial<RecipeAllergens>;
    enhanced?: Partial<RecipeEnhanced>;
  }
>;

const CATALOG_META: Record<string, Meta> = {
  r1: {
    mealType: 'Lunch',
    cuisine: 'Mediterranean',
    blueprint: 'A high-protein Mediterranean bowl with lemon-oregano chicken, fluffy quinoa, crisp vegetables, and briny feta.',
    prepMin: 10,
    cookMin: 15,
    method: 'Sautéing',
    dietary: { vegetarian: false, vegan: false, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  r2: {
    mealType: 'Breakfast',
    cuisine: 'American',
    blueprint: 'A quick green smoothie packed with plant protein, spinach, banana, and almond butter for steady morning energy.',
    prepMin: 5,
    cookMin: 0,
    method: 'Blending',
    cooked: false,
    raw: true,
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  r3: {
    mealType: 'Dinner',
    cuisine: 'Mediterranean',
    blueprint: 'Omega-rich salmon over quinoa with bright herbs — recovery fuel with clean protein and healthy fats.',
    prepMin: 10,
    cookMin: 15,
    method: 'Baking',
    dietary: { vegetarian: false, vegan: false, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  r4: {
    mealType: 'Breakfast',
    cuisine: 'American',
    blueprint: 'Iron-forward oats with berries and seeds designed for pregnancy energy without heaviness.',
    prepMin: 5,
    cookMin: 5,
    method: 'Simmering',
    dietary: { vegetarian: true, vegan: false, gluten_free: false, keto: false, paleo: false, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  r5: {
    mealType: 'Lunch',
    cuisine: 'Indian',
    blueprint: 'A warming turmeric soup with anti-inflammatory spices and vegetables for gentle recovery days.',
    prepMin: 10,
    cookMin: 20,
    method: 'Simmering',
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: false, paleo: true, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  r6: {
    mealType: 'Dinner',
    cuisine: 'Asian',
    blueprint: 'Crispy tofu stir-fried with vegetables in a light savory glaze — plant protein with fighter-friendly macros.',
    prepMin: 10,
    cookMin: 10,
    method: 'Stir-frying',
    dietary: { vegetarian: true, vegan: true, gluten_free: false, keto: false, paleo: false, low_carb: false, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  r7: {
    mealType: 'Dinner',
    cuisine: 'Indian',
    blueprint: 'Iron-rich lentil curry with spinach — pregnancy-friendly comfort with deep spice and plant protein.',
    prepMin: 10,
    cookMin: 20,
    method: 'Simmering',
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  r8: {
    mealType: 'Snack',
    cuisine: 'American',
    blueprint: 'A post-training shake built for muscle repair — fast protein with carbs for glycogen refill.',
    prepMin: 5,
    cookMin: 0,
    method: 'Blending',
    cooked: false,
    raw: true,
    dietary: { vegetarian: true, vegan: false, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: false, halal: true, kosher: true, low_fodmap: true },
  },
  r9: {
    mealType: 'Breakfast',
    cuisine: 'American',
    blueprint: 'Egg-white scramble loaded with vegetables — high protein, low calorie start for weight-loss and fight camps.',
    prepMin: 5,
    cookMin: 5,
    method: 'Sautéing',
    dietary: { vegetarian: true, vegan: false, gluten_free: true, keto: true, paleo: true, low_carb: true, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  r10: {
    mealType: 'Lunch',
    cuisine: 'Mediterranean',
    blueprint: 'Bright chickpea lemon salad — fiber-rich, vegan, and ready in minutes for lighter training days.',
    prepMin: 10,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  r11: {
    mealType: 'Dinner',
    cuisine: 'American',
    blueprint: 'Fighter-sized chicken rice bowl with balanced macros for hard training sessions and meal prep weeks.',
    prepMin: 10,
    cookMin: 15,
    method: 'Sautéing',
    dietary: { vegetarian: false, vegan: false, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  r12: {
    mealType: 'Lunch',
    cuisine: 'Mexican',
    blueprint: 'Black bean quinoa bowl with bold spices — vegan protein and fiber that keeps you full through sessions.',
    prepMin: 10,
    cookMin: 10,
    method: 'Assembling',
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  r13: {
    mealType: 'Breakfast',
    cuisine: 'American',
    blueprint: 'Turkey and sweet potato hash — savory recovery breakfast with lean protein and complex carbs.',
    prepMin: 10,
    cookMin: 15,
    method: 'Sautéing',
    dietary: { vegetarian: false, vegan: false, gluten_free: true, keto: false, paleo: true, low_carb: false, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  r14: {
    mealType: 'Snack',
    cuisine: 'American',
    blueprint: 'Creamy yogurt with berries — quick protein cup for between sessions or evening satiety.',
    prepMin: 5,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
    dietary: { vegetarian: true, vegan: false, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: true },
  },
};

/** Extra protocols across meal types & cuisines (reuse catalog images). */
export const EXTRA_PROTOCOL_RECIPES: Recipe[] = [
  {
    id: 'p15',
    title: 'Keto Omelette',
    time: '12 min',
    timeMin: 12,
    calories: 360,
    protein: 28,
    carbs: 4,
    fat: 26,
    fiber: 1,
    servings: 1,
    rating: 4.8,
    tags: ['High Protein', 'Quick', 'Keto'],
    gradient: ['#F26BB5', '#B9A7F2'],
    image: 'r9.webp',
    ingredients: ['3 eggs', '1 oz cheddar', '1 cup spinach', '1 tbsp butter', 'Salt & pepper'],
    steps: [
      'Whisk eggs with salt and pepper.',
      'Melt butter in a nonstick pan over medium heat.',
      'Pour eggs, add spinach and cheese, fold when set.',
      'Cook 1 more minute and plate.',
    ],
  },
  {
    id: 'p16',
    title: 'Avocado Salad',
    time: '10 min',
    timeMin: 10,
    calories: 320,
    protein: 8,
    carbs: 18,
    fat: 26,
    fiber: 10,
    servings: 1,
    rating: 4.6,
    tags: ['Vegan', 'Quick', 'Weight Loss'],
    gradient: ['#A9E4D2', '#77CDED'],
    image: 'r10.webp',
    ingredients: ['1 avocado', '2 cups mixed greens', '1/2 cup cherry tomatoes', '1 tbsp olive oil', '1/2 lemon', 'Salt'],
    steps: [
      'Chop avocado and halve tomatoes.',
      'Toss greens with olive oil and lemon.',
      'Top with avocado and tomatoes, season, serve.',
    ],
  },
  {
    id: 'p17',
    title: 'Grilled Salmon',
    time: '20 min',
    timeMin: 20,
    calories: 420,
    protein: 38,
    carbs: 2,
    fat: 28,
    fiber: 0,
    servings: 1,
    rating: 4.9,
    tags: ['High Protein', 'Recovery'],
    gradient: ['#77CDED', '#B9A7F2'],
    image: 'r3.webp',
    ingredients: ['6 oz salmon fillet', '1 tbsp olive oil', '1 lemon', '1 tsp dill', 'Salt & pepper'],
    steps: [
      'Brush salmon with oil, dill, salt, and pepper.',
      'Grill or pan-sear 4–5 minutes per side.',
      'Finish with lemon juice and rest 2 minutes.',
    ],
  },
  {
    id: 'p18',
    title: 'Almond Fat Bombs',
    time: '15 min',
    timeMin: 15,
    calories: 180,
    protein: 5,
    carbs: 4,
    fat: 16,
    fiber: 2,
    servings: 6,
    rating: 4.5,
    tags: ['Quick', 'Keto'],
    gradient: ['#FFD88A', '#FF928F'],
    image: 'r14.webp',
    ingredients: ['1/2 cup almond butter', '2 tbsp coconut oil', '1 tbsp cocoa powder', 'Pinch salt', 'Stevia to taste'],
    steps: [
      'Melt coconut oil and mix with almond butter, cocoa, salt, and stevia.',
      'Spoon into mini molds.',
      'Chill 20 minutes until firm.',
    ],
  },
  {
    id: 'p19',
    title: 'Cauliflower Chicken Biryani',
    time: '35 min',
    timeMin: 35,
    calories: 480,
    protein: 42,
    carbs: 12,
    fat: 28,
    fiber: 4,
    servings: 1,
    rating: 4.9,
    tags: ['High Protein', 'Low Carb'],
    gradient: ['#F26BB5', '#FFD88A'],
    image: 'r11.webp',
    ingredients: [
      '6 oz Chicken breast, cubed',
      '2 cups Cauliflower rice, fresh',
      '2 tbsp Greek yogurt, full fat',
      '1 tbsp Ghee',
      '1 tbsp Biryani spice blend (sugar-free)',
      '0.25 cup Fresh cilantro, chopped',
      '1 tsp Ginger-garlic paste',
      '5 pieces Saffron threads soaked in 1 tsp water',
    ],
    steps: [
      'Marinate the chicken in yogurt, ginger-garlic paste, and half the spice blend for 20 minutes.',
      'Sauté the chicken in ghee over medium heat until fully cooked and browned.',
      'Add cauliflower rice and the remaining spice blend to the pan, stirring to combine with chicken juices.',
      'Cover and steam for 5 minutes until cauliflower is tender but not mushy.',
      'Drizzle with saffron water and garnish with fresh cilantro before serving.',
    ],
  },
  {
    id: 'p20',
    title: 'Shrimp Tacos',
    time: '18 min',
    timeMin: 18,
    calories: 390,
    protein: 28,
    carbs: 32,
    fat: 14,
    fiber: 5,
    servings: 2,
    rating: 4.7,
    tags: ['High Protein', 'Quick'],
    gradient: ['#FF928F', '#F26BB5'],
    image: 'r6.webp',
    ingredients: ['8 oz shrimp', '4 corn tortillas', '1 cup cabbage slaw', '1/2 avocado', 'Lime', 'Chili powder'],
    steps: [
      'Season shrimp with chili powder and sear 2 minutes per side.',
      'Warm tortillas.',
      'Fill with shrimp, slaw, avocado, and lime.',
    ],
  },
  {
    id: 'p21',
    title: 'Zucchini Pasta Primavera',
    time: '22 min',
    timeMin: 22,
    calories: 340,
    protein: 14,
    carbs: 22,
    fat: 22,
    fiber: 6,
    servings: 1,
    rating: 4.6,
    tags: ['Vegetarian', 'Weight Loss'],
    gradient: ['#A9E4D2', '#B9A7F2'],
    image: 'r5.webp',
    ingredients: ['2 zucchini', '1 cup cherry tomatoes', '2 tbsp olive oil', '2 garlic cloves', 'Parmesan', 'Basil'],
    steps: [
      'Spiralize zucchini and sauté garlic in olive oil.',
      'Add tomatoes until soft, toss in zucchini noodles briefly.',
      'Finish with basil and parmesan.',
    ],
  },
  {
    id: 'p22',
    title: 'Miso Glazed Cod',
    time: '25 min',
    timeMin: 25,
    calories: 360,
    protein: 34,
    carbs: 10,
    fat: 18,
    fiber: 1,
    servings: 1,
    rating: 4.8,
    tags: ['High Protein', 'Recovery'],
    gradient: ['#77CDED', '#A9E4D2'],
    image: 'r3.webp',
    ingredients: ['6 oz cod', '1 tbsp white miso', '1 tsp sesame oil', '1 tsp ginger', 'Green onions'],
    steps: [
      'Mix miso, sesame oil, and ginger; brush on cod.',
      'Bake at 400°F for 12–14 minutes.',
      'Garnish with green onions.',
    ],
  },
  {
    id: 'p23',
    title: 'Falafel Bowl',
    time: '30 min',
    timeMin: 30,
    calories: 450,
    protein: 18,
    carbs: 48,
    fat: 20,
    fiber: 12,
    servings: 1,
    rating: 4.7,
    tags: ['Vegan', 'High Protein'],
    gradient: ['#FFD88A', '#A9E4D2'],
    image: 'r12.webp',
    ingredients: ['6 baked falafel', '1 cup cucumber tomato salad', '2 tbsp tahini', '1/2 cup hummus', 'Lemon'],
    steps: [
      'Warm falafel.',
      'Assemble bowl with salad and hummus.',
      'Drizzle tahini and lemon.',
    ],
  },
  {
    id: 'p24',
    title: 'Chia Pudding Parfait',
    time: '10 min',
    timeMin: 10,
    calories: 280,
    protein: 12,
    carbs: 28,
    fat: 12,
    fiber: 10,
    servings: 1,
    rating: 4.5,
    tags: ['Vegan', 'Quick'],
    gradient: ['#B9A7F2', '#F26BB5'],
    image: 'r2.webp',
    ingredients: ['3 tbsp chia seeds', '1 cup almond milk', '1/2 cup berries', '1 tsp vanilla', 'Stevia'],
    steps: [
      'Stir chia into almond milk with vanilla and stevia.',
      'Chill at least 2 hours or overnight.',
      'Layer with berries and serve.',
    ],
  },
  {
    id: 'p25',
    title: 'Beef Lettuce Wraps',
    time: '20 min',
    timeMin: 20,
    calories: 410,
    protein: 32,
    carbs: 12,
    fat: 26,
    fiber: 3,
    servings: 2,
    rating: 4.8,
    tags: ['High Protein', 'Low Carb'],
    gradient: ['#FF928F', '#FFD88A'],
    image: 'r13.webp',
    ingredients: ['8 oz ground beef', 'Butter lettuce cups', '1 tbsp soy sauce', 'Garlic', 'Ginger', 'Green onion'],
    steps: [
      'Brown beef with garlic and ginger.',
      'Season with soy sauce.',
      'Spoon into lettuce cups and top with green onion.',
    ],
  },
  {
    id: 'p26',
    title: 'Dark Chocolate Avocado Mousse',
    time: '12 min',
    timeMin: 12,
    calories: 260,
    protein: 4,
    carbs: 18,
    fat: 20,
    fiber: 8,
    servings: 2,
    rating: 4.6,
    tags: ['Vegan', 'Quick'],
    gradient: ['#B9A7F2', '#17181C'],
    image: 'r14.webp',
    ingredients: ['1 ripe avocado', '2 tbsp cocoa powder', '2 tbsp maple syrup', '1 tsp vanilla', 'Pinch salt'],
    steps: [
      'Blend avocado, cocoa, maple, vanilla, and salt until silky.',
      'Chill 10 minutes.',
      'Serve in small cups.',
    ],
  },
  {
    id: 'p27',
    title: 'Berry Protein Pancakes',
    time: '18 min',
    timeMin: 18,
    calories: 340,
    protein: 28,
    carbs: 32,
    fat: 10,
    fiber: 5,
    servings: 1,
    rating: 4.7,
    tags: ['High Protein', 'Quick'],
    gradient: ['#F26BB5', '#FFD88A'],
    image: 'r4.webp',
    ingredients: ['1 scoop protein powder', '1 egg', '1/2 banana', '1/4 cup oats', '1/2 cup berries', 'Cinnamon'],
    steps: [
      'Blend protein, egg, banana, and oats into a batter.',
      'Cook pancakes on a lightly oiled pan, 2 minutes per side.',
      'Top with berries and cinnamon.',
    ],
  },
  {
    id: 'p28',
    title: 'Mediterranean Tuna Bowl',
    time: '12 min',
    timeMin: 12,
    calories: 390,
    protein: 36,
    carbs: 18,
    fat: 18,
    fiber: 5,
    servings: 1,
    rating: 4.8,
    tags: ['High Protein', 'Quick'],
    gradient: ['#77CDED', '#B9A7F2'],
    image: 'r1.webp',
    ingredients: ['1 can tuna in olive oil', '1 cup cucumber', '1/2 cup cherry tomatoes', 'Olives', 'Lemon', 'Oregano'],
    steps: [
      'Drain tuna lightly and flake into a bowl.',
      'Add chopped cucumber, tomatoes, and olives.',
      'Dress with lemon and oregano.',
    ],
  },
  {
    id: 'p29',
    title: 'Thai Coconut Chicken Soup',
    time: '28 min',
    timeMin: 28,
    calories: 410,
    protein: 32,
    carbs: 14,
    fat: 26,
    fiber: 3,
    servings: 2,
    rating: 4.8,
    tags: ['High Protein', 'Recovery'],
    gradient: ['#A9E4D2', '#F26BB5'],
    image: 'r5.webp',
    ingredients: ['8 oz chicken breast', '1 cup coconut milk', '1 cup broth', 'Ginger', 'Lime', 'Chili', 'Cilantro'],
    steps: [
      'Simmer ginger and chili in broth for 5 minutes.',
      'Add chicken and coconut milk; cook until done.',
      'Finish with lime and cilantro.',
    ],
  },
  {
    id: 'p30',
    title: 'Protein Overnight Oats',
    time: '8 min',
    timeMin: 8,
    calories: 360,
    protein: 26,
    carbs: 40,
    fat: 10,
    fiber: 8,
    servings: 1,
    rating: 4.6,
    tags: ['High Protein', 'Quick'],
    gradient: ['#FFD88A', '#F26BB5'],
    image: 'r2.webp',
    ingredients: ['1/2 cup oats', '1 scoop protein', '1 cup almond milk', '1 tbsp chia', 'Berries'],
    steps: [
      'Mix oats, protein, milk, and chia in a jar.',
      'Chill overnight.',
      'Top with berries before eating.',
    ],
  },
  {
    id: 'p31',
    title: 'Steak & Asparagus',
    time: '22 min',
    timeMin: 22,
    calories: 480,
    protein: 42,
    carbs: 8,
    fat: 30,
    fiber: 3,
    servings: 1,
    rating: 4.9,
    tags: ['High Protein', 'Low Carb'],
    gradient: ['#FF928F', '#17181C'],
    image: 'r13.webp',
    ingredients: ['6 oz sirloin', '1 bunch asparagus', '1 tbsp butter', 'Garlic', 'Salt & pepper'],
    steps: [
      'Season steak and sear 3–4 minutes per side.',
      'Sauté asparagus in butter and garlic.',
      'Rest steak 5 minutes, slice, and plate.',
    ],
  },
  {
    id: 'p32',
    title: 'Mango Coconut Chia Cups',
    time: '10 min',
    timeMin: 10,
    calories: 270,
    protein: 8,
    carbs: 30,
    fat: 12,
    fiber: 9,
    servings: 2,
    rating: 4.5,
    tags: ['Vegan', 'Quick'],
    gradient: ['#FFD88A', '#A9E4D2'],
    image: 'r14.webp',
    ingredients: ['3 tbsp chia seeds', '1 cup coconut milk', '1/2 cup mango', '1 tsp vanilla', 'Lime zest'],
    steps: [
      'Stir chia into coconut milk with vanilla.',
      'Chill until thick.',
      'Top with mango and lime zest.',
    ],
  },
  {
    id: 'p33',
    title: 'Egg White Breakfast Wrap',
    time: '12 min',
    timeMin: 12,
    calories: 280,
    protein: 24,
    carbs: 22,
    fat: 10,
    fiber: 4,
    servings: 1,
    rating: 4.6,
    tags: ['High Protein', 'Quick', 'Weight Loss'],
    gradient: ['#F26BB5', '#77CDED'],
    image: 'r9.webp',
    ingredients: ['4 egg whites', '1 whole-wheat tortilla', 'Spinach', 'Tomato', '1 tbsp feta'],
    steps: [
      'Scramble egg whites with spinach.',
      'Warm tortilla and fill with eggs, tomato, and feta.',
      'Roll and serve.',
    ],
  },
  {
    id: 'p34',
    title: 'Garlic Butter Shrimp Bowl',
    time: '16 min',
    timeMin: 16,
    calories: 400,
    protein: 34,
    carbs: 24,
    fat: 18,
    fiber: 4,
    servings: 1,
    rating: 4.8,
    tags: ['High Protein', 'Quick'],
    gradient: ['#77CDED', '#F26BB5'],
    image: 'r6.webp',
    ingredients: ['8 oz shrimp', '1 cup cauliflower rice', '1 tbsp butter', 'Garlic', 'Lemon', 'Parsley'],
    steps: [
      'Sauté garlic in butter, add shrimp until pink.',
      'Warm cauliflower rice in the same pan.',
      'Finish with lemon and parsley.',
    ],
  },
  {
    id: 'p35',
    title: 'Spiced Lentil Dal',
    time: '30 min',
    timeMin: 30,
    calories: 380,
    protein: 20,
    carbs: 48,
    fat: 10,
    fiber: 14,
    servings: 2,
    rating: 4.7,
    tags: ['Vegan', 'High Protein'],
    gradient: ['#FFD88A', '#FF928F'],
    image: 'r7.webp',
    ingredients: ['1 cup red lentils', '1 onion', 'Tomato', 'Turmeric', 'Cumin', 'Garlic', 'Cilantro'],
    steps: [
      'Sauté onion, garlic, and spices.',
      'Add lentils, tomato, and water; simmer until soft.',
      'Garnish with cilantro.',
    ],
  },
  {
    id: 'p36',
    title: 'Coconut Yogurt Parfait',
    time: '6 min',
    timeMin: 6,
    calories: 240,
    protein: 10,
    carbs: 26,
    fat: 10,
    fiber: 5,
    servings: 1,
    rating: 4.5,
    tags: ['Vegan', 'Quick'],
    gradient: ['#B9A7F2', '#C9F2F6'],
    image: 'r2.webp',
    ingredients: ['1 cup coconut yogurt', '1/2 cup berries', '2 tbsp granola', '1 tsp honey'],
    steps: [
      'Layer yogurt and berries in a glass.',
      'Top with granola and a drizzle of honey.',
      'Serve immediately.',
    ],
  },
];

const EXTRA_META: Record<string, Meta> = {
  p15: {
    mealType: 'Breakfast',
    cuisine: 'American',
    blueprint: 'A low-carb, high-protein omelette with spinach and cheese for a ketogenic morning protocol.',
    prepMin: 5,
    cookMin: 7,
    method: 'Sautéing',
    dietary: { vegetarian: true, vegan: false, gluten_free: true, keto: true, paleo: false, low_carb: true, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  p16: {
    mealType: 'Lunch',
    cuisine: 'Mediterranean',
    blueprint: 'Creamy avocado over crisp greens with lemon — simple fats and fiber for midday satiety.',
    prepMin: 10,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: true, paleo: true, low_carb: true, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  p17: {
    mealType: 'Dinner',
    cuisine: 'American',
    blueprint: 'Clean grilled salmon with dill and lemon — high protein, near-zero carb dinner protocol.',
    prepMin: 8,
    cookMin: 12,
    method: 'Grilling',
    dietary: { vegetarian: false, vegan: false, gluten_free: true, keto: true, paleo: true, low_carb: true, organic: false, halal: true, kosher: true, low_fodmap: true },
  },
  p18: {
    mealType: 'Snack',
    cuisine: 'American',
    blueprint: 'Bite-sized almond cocoa fat bombs for keto snack windows without sugar spikes.',
    prepMin: 10,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: true, paleo: false, low_carb: true, organic: false, halal: true, kosher: true, low_fodmap: true },
  },
  p19: {
    mealType: 'Dinner',
    cuisine: 'Indian',
    blueprint:
      'A low-carb, high-protein reimagining of the classic Biryani using riced cauliflower infused with aromatic spices, tender marinated chicken, and fresh herbs.',
    prepMin: 25,
    cookMin: 20,
    method: 'Sautéing and Steaming',
    sugar_g: 4,
    added_sugar_g: 0,
    cholesterol_mg: 115,
    sodium_mg: 740,
    calcium_mg: 85,
    iron_mg: 3.2,
    potassium_mg: 680,
    vitamin_a_iu: 450,
    vitamin_d_mcg: 0.1,
    dietary: {
      vegetarian: false,
      vegan: false,
      gluten_free: true,
      keto: true,
      paleo: false,
      low_fodmap: false,
      organic: true,
      halal: true,
      kosher: true,
      low_carb: true,
    },
    allergens: {
      contains: ['Milk'],
      may_contain: ['Tree Nuts'],
      meal_timing: 'Ideal for dinner to provide sustained amino acids overnight.',
      satiety_score: '9/10 due to high protein-to-calorie ratio.',
      digestibility: 'Fermented yogurt in marinade helps tenderize protein for easier digestion.',
      nutrient_density: 'High density of cruciferous micronutrients and lean protein.',
      absorption_tips: 'The fat from ghee enhances the absorption of fat-soluble vitamins and curcumin from spices.',
    },
    enhanced: {
      impact: 'Very low glycemic load; minimal impact on blood glucose levels.',
      inflammation: 'Anti-inflammatory due to high turmeric and ginger content.',
      sensitivity: 'Moderate histamine due to yogurt and fermented ginger-garlic paste.',
    },
  },
  p20: {
    mealType: 'Dinner',
    cuisine: 'Mexican',
    blueprint: 'Chili-spiced shrimp tacos with crunchy slaw — bright, high-protein Mexican dinner.',
    prepMin: 8,
    cookMin: 10,
    method: 'Sautéing',
    dietary: { vegetarian: false, vegan: false, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  p21: {
    mealType: 'Dinner',
    cuisine: 'Italian',
    blueprint: 'Zucchini noodles tossed with tomatoes and basil — Italian comfort without heavy pasta carbs.',
    prepMin: 10,
    cookMin: 12,
    method: 'Sautéing',
    dietary: { vegetarian: true, vegan: false, gluten_free: true, keto: false, paleo: false, low_carb: true, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  p22: {
    mealType: 'Dinner',
    cuisine: 'Asian',
    blueprint: 'Miso-glazed baked cod — umami Asian protocol with lean protein and gentle carbs.',
    prepMin: 10,
    cookMin: 14,
    method: 'Baking',
    dietary: { vegetarian: false, vegan: false, gluten_free: false, keto: false, paleo: false, low_carb: true, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  p23: {
    mealType: 'Lunch',
    cuisine: 'Middle Eastern',
    blueprint: 'Baked falafel bowl with tahini and fresh salad — plant protein Middle Eastern protocol.',
    prepMin: 10,
    cookMin: 20,
    method: 'Baking',
    dietary: { vegetarian: true, vegan: true, gluten_free: false, keto: false, paleo: false, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  p24: {
    mealType: 'Dessert',
    cuisine: 'American',
    blueprint: 'Overnight chia parfait with berries — dessert-like finish that still hits fiber goals.',
    prepMin: 10,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: false, paleo: false, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: false },
  },
  p25: {
    mealType: 'Lunch',
    cuisine: 'Asian',
    blueprint: 'Savory beef lettuce wraps — low-carb Asian lunch with high satiety protein.',
    prepMin: 8,
    cookMin: 12,
    method: 'Sautéing',
    dietary: { vegetarian: false, vegan: false, gluten_free: false, keto: true, paleo: false, low_carb: true, organic: false, halal: true, kosher: true, low_fodmap: false },
  },
  p26: {
    mealType: 'Dessert',
    cuisine: 'American',
    blueprint: 'Silky chocolate avocado mousse — decadent dessert with healthy fats and no dairy.',
    prepMin: 12,
    cookMin: 0,
    method: 'Blending',
    cooked: false,
    raw: true,
    dietary: { vegetarian: true, vegan: true, gluten_free: true, keto: false, paleo: true, low_carb: false, organic: true, halal: true, kosher: true, low_fodmap: true },
  },
  p27: {
    mealType: 'Breakfast',
    cuisine: 'American',
    blueprint: 'Fluffy berry protein pancakes — high-protein breakfast that still feels like a treat.',
    prepMin: 8,
    cookMin: 10,
    method: 'Griddling',
  },
  p28: {
    mealType: 'Lunch',
    cuisine: 'Mediterranean',
    blueprint: 'Bright tuna bowl with cucumber, tomato, and olives — no-cook Mediterranean protein lunch.',
    prepMin: 12,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
  },
  p29: {
    mealType: 'Dinner',
    cuisine: 'Asian',
    blueprint: 'Creamy Thai coconut chicken soup with ginger and lime — warming recovery dinner.',
    prepMin: 10,
    cookMin: 18,
    method: 'Simmering',
  },
  p30: {
    mealType: 'Breakfast',
    cuisine: 'American',
    blueprint: 'Make-ahead protein overnight oats — grab-and-go breakfast with lasting energy.',
    prepMin: 8,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
  },
  p31: {
    mealType: 'Dinner',
    cuisine: 'American',
    blueprint: 'Seared steak with garlic butter asparagus — low-carb, high-protein dinner protocol.',
    prepMin: 8,
    cookMin: 14,
    method: 'Searing',
  },
  p32: {
    mealType: 'Dessert',
    cuisine: 'Asian',
    blueprint: 'Tropical mango coconut chia cups — lightly sweet dessert with fiber and healthy fats.',
    prepMin: 10,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
  },
  p33: {
    mealType: 'Breakfast',
    cuisine: 'American',
    blueprint: 'Egg-white wrap with spinach and feta — light high-protein start for weight-loss days.',
    prepMin: 5,
    cookMin: 7,
    method: 'Sautéing',
  },
  p34: {
    mealType: 'Dinner',
    cuisine: 'American',
    blueprint: 'Garlic butter shrimp over cauliflower rice — fast high-protein dinner under 20 minutes.',
    prepMin: 6,
    cookMin: 10,
    method: 'Sautéing',
  },
  p35: {
    mealType: 'Lunch',
    cuisine: 'Indian',
    blueprint: 'Comforting spiced lentil dal — vegan protein and fiber for steady midday energy.',
    prepMin: 10,
    cookMin: 20,
    method: 'Simmering',
  },
  p36: {
    mealType: 'Snack',
    cuisine: 'American',
    blueprint: 'Layered coconut yogurt parfait — quick snack or light dessert with crunch and fruit.',
    prepMin: 6,
    cookMin: 0,
    method: 'Assembling',
    cooked: false,
    raw: true,
  },

};

function inferMealType(recipe: Recipe): MealType {
  const t = `${recipe.title} ${recipe.tags.join(' ')}`.toLowerCase();
  if (/smoothie|scramble|oat|hash|omelette|breakfast/.test(t)) return 'Breakfast';
  if (/shake|fat bomb|yogurt|parfait|mousse|dessert|chocolate/.test(t)) return /mousse|parfait|chocolate|fat bomb/.test(t) ? 'Dessert' : 'Snack';
  if (/soup|salad|bowl|wrap|taco/.test(t) && !/dinner|salmon|biryani|curry|stir/.test(t)) return 'Lunch';
  if (/salmon|chicken|biryani|curry|stir|cod|turkey|dinner/.test(t)) return 'Dinner';
  if (recipe.timeMin <= 10 && recipe.calories < 350) return 'Snack';
  return 'Dinner';
}

function inferCuisine(recipe: Recipe): Exclude<Cuisine, 'Any Cuisine'> {
  const t = `${recipe.title} ${recipe.tags.join(' ')} ${recipe.ingredients.join(' ')}`.toLowerCase();
  if (/taco|black bean|chili/.test(t)) return 'Mexican';
  if (/pasta|parmesan|basil|primavera/.test(t)) return 'Italian';
  if (/tofu|miso|stir|soy|ginger|sesame|lettuce wrap/.test(t)) return 'Asian';
  if (/quinoa|feta|oregano|lemon salad|mediterranean|falafel|tahini|hummus/.test(t)) {
    return /falafel|tahini|hummus/.test(t) ? 'Middle Eastern' : 'Mediterranean';
  }
  if (/curry|turmeric|biryani|lentil|masala/.test(t)) return 'Indian';
  if (/falafel|tahini|hummus/.test(t)) return 'Middle Eastern';
  return 'American';
}

function defaultDietary(recipe: Recipe): RecipeDietary {
  const vegan = recipe.tags.some((t) => /vegan/i.test(t));
  const vegetarian = vegan || recipe.tags.some((t) => /vegetarian/i.test(t)) || !/chicken|beef|turkey|salmon|shrimp|cod|fish|meat/i.test(recipe.title + recipe.ingredients.join(' '));
  const lowCarb = recipe.carbs <= 15 || recipe.tags.some((t) => /keto|low carb/i.test(t));
  return {
    vegetarian,
    vegan,
    gluten_free: !/oat|tortilla|soy sauce|miso|falafel|wheat/i.test(recipe.ingredients.join(' ')),
    keto: lowCarb && recipe.fat >= 18,
    paleo: !vegan && lowCarb,
    low_fodmap: false,
    organic: false,
    halal: true,
    kosher: true,
    low_carb: lowCarb,
  };
}

export function toProtocol(recipe: Recipe): RecipeProtocol {
  const meta = CATALOG_META[recipe.id] || EXTRA_META[recipe.id] || {};
  const mealType = meta.mealType || inferMealType(recipe);
  const cuisine = meta.cuisine || inferCuisine(recipe);
  const prepMin = meta.prepMin ?? Math.max(5, Math.round(recipe.timeMin * 0.4));
  const cookMin = meta.cookMin ?? Math.max(0, recipe.timeMin - prepMin);
  const fiber = recipe.fiber || 0;
  const netCarbs = meta.netCarbs ?? Math.max(0, Math.round(recipe.carbs - fiber));
  const dietary = { ...defaultDietary(recipe), ...meta.dietary };
  const containsMilk = /yogurt|cheese|milk|feta|parmesan|butter|ghee/i.test(recipe.ingredients.join(' '));
  const containsNuts = /almond|nut|peanut/i.test(recipe.ingredients.join(' '));

  return {
    ...recipe,
    mealType,
    cuisine,
    blueprint:
      meta.blueprint ||
      `A ${mealType.toLowerCase()} protocol featuring ${recipe.title.toLowerCase()} with balanced macros for your training day.`,
    prepMin,
    cookMin,
    netCarbs,
    sugar_g: meta.sugar_g ?? Math.max(0, Math.round(recipe.carbs * 0.25)),
    added_sugar_g: meta.added_sugar_g ?? 0,
    cholesterol_mg: meta.cholesterol_mg ?? (dietary.vegan ? 0 : Math.round(recipe.protein * 2.5)),
    sodium_mg: meta.sodium_mg ?? Math.round(400 + recipe.protein * 8),
    calcium_mg: meta.calcium_mg ?? Math.round(40 + recipe.protein * 1.5),
    iron_mg: meta.iron_mg ?? Math.round((1.5 + fiber * 0.2) * 10) / 10,
    potassium_mg: meta.potassium_mg ?? Math.round(400 + recipe.calories * 0.5),
    vitamin_a_iu: meta.vitamin_a_iu ?? Math.round(200 + fiber * 40),
    vitamin_d_mcg: meta.vitamin_d_mcg ?? (/salmon|egg|cod/i.test(recipe.title) ? 2 : 0),
    method: meta.method || (cookMin === 0 ? 'Assembling' : 'Cooking'),
    cooked: meta.cooked ?? cookMin > 0,
    processed: meta.processed ?? false,
    raw: meta.raw ?? cookMin === 0,
    dietary,
    allergens: {
      contains: meta.allergens?.contains ?? (containsMilk ? ['Milk'] : containsNuts ? ['Tree Nuts'] : []),
      may_contain: meta.allergens?.may_contain ?? (containsNuts ? [] : ['Soy']),
      meal_timing:
        meta.allergens?.meal_timing ||
        (mealType === 'Dinner'
          ? 'Ideal for dinner to provide sustained amino acids overnight.'
          : mealType === 'Breakfast'
            ? 'Best earlier in the day to fuel training and focus.'
            : 'Flexible timing — works between sessions or as a planned meal.'),
      satiety_score:
        meta.allergens?.satiety_score ||
        `${Math.min(10, Math.round(recipe.protein / 5 + recipe.fat / 8))}/10 based on protein and fat density.`,
      digestibility:
        meta.allergens?.digestibility ||
        'Generally high digestibility when portions stay moderate.',
      nutrient_density:
        meta.allergens?.nutrient_density ||
        `Balanced density of protein (${recipe.protein}g) with supportive micronutrients.`,
      absorption_tips:
        meta.allergens?.absorption_tips ||
        'Pair with colorful produce or citrus when possible to support iron and antioxidant uptake.',
    },
    enhanced: {
      impact:
        meta.enhanced?.impact ||
        (netCarbs <= 15
          ? 'Very low glycemic load; minimal impact on blood glucose levels.'
          : 'Moderate glycemic response depending on portion size.'),
      inflammation:
        meta.enhanced?.inflammation ||
        'Generally neutral to anti-inflammatory when spices and oils stay clean.',
      sensitivity:
        meta.enhanced?.sensitivity ||
        'Low to moderate sensitivity risk depending on individual allergen profile.',
    },
  };
}
