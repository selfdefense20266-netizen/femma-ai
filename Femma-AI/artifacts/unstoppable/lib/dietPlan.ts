/** Deterministic 30-day diet plan from onboarding profile (goal, level, food, body metrics). */

export type DietMeal = {
  name: string;
  calories: number;
  notes: string;
};

export type DietDay = {
  day: number;
  breakfast: DietMeal;
  lunch: DietMeal;
  dinner: DietMeal;
};

export type DietPlanProfile = {
  goal?: string;
  fitnessLevel?: string;
  foodPreference?: string;
  heightCm?: number;
  weightKg?: number;
  isPregnant?: boolean;
};

type MealPool = { breakfast: DietMeal[]; lunch: DietMeal[]; dinner: DietMeal[] };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function bmiFromProfile(profile: DietPlanProfile) {
  const h = Number(profile.heightCm) || 0;
  const w = Number(profile.weightKg) || 0;
  if (h < 100 || w < 30) return 0;
  const m = h / 100;
  return Math.round((w / (m * m)) * 10) / 10;
}

/** Daily calorie target from height/weight + activity goal. */
export function dietCalorieTarget(profile: DietPlanProfile) {
  const h = Number(profile.heightCm) || 165;
  const w = Number(profile.weightKg) || 60;
  const bmi = bmiFromProfile(profile) || 22;
  // Mifflin-ish female baseline
  let calories = 10 * w + 6.25 * h - 5 * 30 - 161;
  const goal = String(profile.goal || '').toLowerCase();
  const level = String(profile.fitnessLevel || '').toLowerCase();

  if (goal.includes('weight') || goal.includes('loss')) calories -= 350;
  else if (goal.includes('muscle') || goal.includes('boxing') || goal.includes('mma') || goal.includes('hiit'))
    calories += 250;
  else if (goal.includes('tone') || goal.includes('karate') || goal.includes('self')) calories += 100;
  else if (goal.includes('yoga') || goal.includes('flex') || goal.includes('stress')) calories -= 50;
  else if (goal.includes('pregnant') || profile.isPregnant) calories += 300;
  else if (goal.includes('postpartum')) calories += 200;

  if (level.includes('active')) calories += 150;
  else if (level.includes('inter')) calories += 80;
  else calories += 0;

  if (bmi >= 28 && !goal.includes('muscle')) calories -= 150;
  if (bmi > 0 && bmi < 19) calories += 150;

  return clamp(Math.round(calories / 50) * 50, 1400, 2600);
}

function poolFor(food: string, goal: string): MealPool {
  const f = food.toLowerCase();
  const g = goal.toLowerCase();
  const carnivore = f.includes('carnivore');
  const vegetarian = f.includes('vegetarian') && !f.includes('vegan');
  const vegan = f.includes('vegan');
  const highProtein = f.includes('protein') || g.includes('muscle') || g.includes('boxing') || g.includes('mma');
  const lowCarb = f.includes('carb') || f.includes('keto') || carnivore;
  const weightLoss = g.includes('weight') || g.includes('loss');

  if (carnivore) {
    return {
      breakfast: [
        { name: 'Eggs & beef patties', calories: 420, notes: '3 eggs + lean beef' },
        { name: 'Steak & eggs', calories: 450, notes: 'Sirloin + 2 eggs' },
        { name: 'Salmon omelette', calories: 400, notes: 'Eggs + smoked salmon' },
        { name: 'Turkey sausage scramble', calories: 380, notes: 'Turkey + eggs' },
        { name: 'Chicken liver & eggs', calories: 410, notes: 'Nutrient-dense start' },
      ],
      lunch: [
        { name: 'Grilled chicken thighs', calories: 480, notes: 'Skin-on, salt & herbs' },
        { name: 'Beef burger (no bun)', calories: 520, notes: 'Patty + egg yolk' },
        { name: 'Tuna steak', calories: 450, notes: 'Seared tuna' },
        { name: 'Lamb chops', calories: 500, notes: 'Simple salt finish' },
        { name: 'Shrimp & butter', calories: 420, notes: 'Garlic butter shrimp' },
      ],
      dinner: [
        { name: 'Ribeye & bone broth', calories: 550, notes: 'Satisfying evening plate' },
        { name: 'Baked salmon', calories: 480, notes: 'Fatty fish for recovery' },
        { name: 'Roast chicken', calories: 500, notes: 'Dark + white meat' },
        { name: 'Beef stew (meat only)', calories: 520, notes: 'Slow-cooked beef' },
        { name: 'Pork chops', calories: 490, notes: 'Pan-seared' },
      ],
    };
  }

  if (vegan) {
    return {
      breakfast: [
        { name: 'Tofu scramble bowl', calories: 380, notes: 'Tofu + spinach + toast' },
        { name: 'Overnight oats + berries', calories: 360, notes: 'Oats + plant milk' },
        { name: 'Chickpea pancake', calories: 400, notes: 'Savory besan crepe' },
        { name: 'Peanut butter banana toast', calories: 390, notes: 'Whole-grain toast' },
        { name: 'Smoothie bowl', calories: 370, notes: 'Banana + greens + seeds' },
      ],
      lunch: [
        { name: 'Lentil Buddha bowl', calories: 480, notes: 'Lentils + rice + veg' },
        { name: 'Quinoa chickpea salad', calories: 450, notes: 'High-fiber lunch' },
        { name: 'Black bean burrito bowl', calories: 500, notes: 'Beans + salsa + greens' },
        { name: 'Tempeh stir-fry', calories: 470, notes: 'Tempeh + mixed veg' },
        { name: 'Hummus wrap', calories: 440, notes: 'Whole-wheat wrap' },
      ],
      dinner: [
        { name: 'Chickpea curry + rice', calories: 520, notes: 'Warming dinner' },
        { name: 'Tofu veggie stir-fry', calories: 480, notes: 'Colorful plate' },
        { name: 'Lentil pasta', calories: 500, notes: 'Protein pasta + sauce' },
        { name: 'Stuffed sweet potato', calories: 460, notes: 'Beans + avocado' },
        { name: 'Vegan chili', calories: 490, notes: 'Beans + tomatoes' },
      ],
    };
  }

  if (vegetarian) {
    return {
      breakfast: [
        { name: 'Greek yogurt parfait', calories: 360, notes: 'Yogurt + fruit + nuts' },
        { name: 'Veggie omelette', calories: 380, notes: 'Eggs + peppers' },
        { name: 'Cottage cheese bowl', calories: 340, notes: 'Fruit + seeds' },
        { name: 'Paneer toast', calories: 400, notes: 'Whole-grain + paneer' },
        { name: 'Overnight oats', calories: 350, notes: 'Milk + berries' },
      ],
      lunch: [
        { name: 'Paneer grain bowl', calories: 480, notes: 'Paneer + quinoa' },
        { name: 'Egg fried rice', calories: 460, notes: 'Eggs + veg' },
        { name: 'Caprese salad + bread', calories: 440, notes: 'Mozzarella + tomato' },
        { name: 'Dal + roti', calories: 470, notes: 'Lentils + whole wheat' },
        { name: 'Veggie wrap + yogurt', calories: 450, notes: 'Light midday meal' },
      ],
      dinner: [
        { name: 'Palak paneer + rice', calories: 520, notes: 'Spinach + paneer' },
        { name: 'Egg curry + roti', calories: 500, notes: 'Comfort dinner' },
        { name: 'Veg lasagna', calories: 540, notes: 'Layered bake' },
        { name: 'Tofu tikka bowl', calories: 480, notes: 'Spiced tofu' },
        { name: 'Stuffed peppers', calories: 460, notes: 'Rice + cheese' },
      ],
    };
  }

  // Default omnivore pools — tweak by goal
  const breakfast: DietMeal[] = highProtein
    ? [
        { name: 'Egg white omelette + toast', calories: 360, notes: 'Lean protein start' },
        { name: 'Greek yogurt + whey', calories: 340, notes: 'Fast protein' },
        { name: 'Chicken sausage + eggs', calories: 400, notes: 'Savory plate' },
        { name: 'Protein smoothie', calories: 380, notes: 'Banana + whey + milk' },
        { name: 'Smoked salmon toast', calories: 390, notes: 'Omega-3 boost' },
      ]
    : [
        { name: 'Oats + berries + yogurt', calories: 360, notes: 'Steady energy' },
        { name: 'Eggs & avocado toast', calories: 400, notes: 'Balanced fats' },
        { name: 'Banana peanut butter toast', calories: 380, notes: 'Quick fuel' },
        { name: 'Veggie omelette', calories: 350, notes: 'Eggs + greens' },
        { name: 'Cottage cheese bowl', calories: 330, notes: 'Light protein' },
      ];

  const lunch: DietMeal[] = weightLoss || lowCarb
    ? [
        { name: 'Grilled chicken salad', calories: 420, notes: 'Greens + lean chicken' },
        { name: 'Turkey lettuce wraps', calories: 400, notes: 'Low-carb lunch' },
        { name: 'Tuna salad bowl', calories: 410, notes: 'Fish + crunchy veg' },
        { name: 'Shrimp veggie plate', calories: 390, notes: 'Light seafood' },
        { name: 'Chicken soup + salad', calories: 380, notes: 'Warm & filling' },
      ]
    : [
        { name: 'Chicken rice bowl', calories: 520, notes: 'Training fuel' },
        { name: 'Salmon quinoa plate', calories: 500, notes: 'Protein + grains' },
        { name: 'Turkey wrap', calories: 480, notes: 'Whole-wheat wrap' },
        { name: 'Beef stir-fry + rice', calories: 540, notes: 'Iron-rich lunch' },
        { name: 'Chicken pasta', calories: 530, notes: 'Moderate carbs' },
      ];

  const dinner: DietMeal[] =
    g.includes('yoga') || g.includes('stress') || g.includes('flex')
      ? [
          { name: 'Baked fish + veg', calories: 450, notes: 'Light evening meal' },
          { name: 'Chicken vegetable soup', calories: 420, notes: 'Easy to digest' },
          { name: 'Tofu veggie bowl', calories: 440, notes: 'Plant-forward' },
          { name: 'Turkey meatballs + zucchini', calories: 460, notes: 'Gentle protein' },
          { name: 'Salmon + sweet potato', calories: 480, notes: 'Recovery plate' },
        ]
      : g.includes('boxing') || g.includes('mma') || g.includes('hiit') || g.includes('muscle')
        ? [
            { name: 'Steak + rice + veg', calories: 620, notes: 'Rebuild after training' },
            { name: 'Chicken thighs + potatoes', calories: 580, notes: 'Hearty dinner' },
            { name: 'Salmon + pasta', calories: 600, notes: 'Carbs for recovery' },
            { name: 'Beef burrito bowl', calories: 590, notes: 'Rice + beans + beef' },
            { name: 'Turkey chili', calories: 560, notes: 'High-protein stew' },
          ]
        : [
            { name: 'Grilled chicken + veg', calories: 480, notes: 'Simple balanced plate' },
            { name: 'Baked salmon + quinoa', calories: 500, notes: 'Omega-3 dinner' },
            { name: 'Turkey stir-fry', calories: 470, notes: 'Lean evening meal' },
            { name: 'Fish tacos (soft)', calories: 490, notes: 'Light carbs' },
            { name: 'Chicken curry + rice', calories: 520, notes: 'Comfort plate' },
          ];

  return { breakfast, lunch, dinner };
}

function pick(pool: DietMeal[], day: number, salt: number): DietMeal {
  const idx = (day * 3 + salt) % pool.length;
  return pool[idx];
}

function scaleMeal(meal: DietMeal, factor: number): DietMeal {
  return {
    ...meal,
    calories: Math.round(meal.calories * factor),
  };
}

export function build30DayDietPlan(profile: DietPlanProfile): DietDay[] {
  const target = dietCalorieTarget(profile);
  const pool = poolFor(profile.foodPreference || '', profile.goal || '');
  // Assume breakfast ~22%, lunch ~38%, dinner ~40% of day
  const sample =
    pick(pool.breakfast, 1, 1).calories + pick(pool.lunch, 1, 2).calories + pick(pool.dinner, 1, 3).calories;
  const factor = clamp(target / Math.max(sample, 1), 0.75, 1.35);

  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    return {
      day,
      breakfast: scaleMeal(pick(pool.breakfast, day, 1), factor),
      lunch: scaleMeal(pick(pool.lunch, day, 2), factor),
      dinner: scaleMeal(pick(pool.dinner, day, 3), factor),
    };
  });
}

export function dietPlanSummary(profile: DietPlanProfile) {
  const target = dietCalorieTarget(profile);
  const bmi = bmiFromProfile(profile);
  return {
    calorieTarget: target,
    bmi,
    days: 30,
  };
}
