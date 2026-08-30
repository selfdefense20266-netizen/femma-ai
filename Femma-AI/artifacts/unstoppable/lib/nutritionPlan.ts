const PLAN_WEEKS = [4, 8, 12] as const;

export const ONBOARDING_GOALS = [
  { id: 'weight_loss', label: 'Weight Loss', icon: 'trending-down', desc: 'Burn fat, feel lighter' },
  { id: 'tone', label: 'Tone & Sculpt', icon: 'activity', desc: 'Define and strengthen' },
  { id: 'muscle', label: 'Build Muscle', icon: 'zap', desc: 'Get stronger every week' },
  { id: 'boxing', label: 'Boxing', icon: 'target', desc: 'Footwork, punches, fight fitness' },
  { id: 'mma', label: 'MMA', icon: 'target', desc: 'Mixed martial arts' },
  { id: 'karate', label: 'Karate', icon: 'award', desc: 'Strikes, forms, discipline' },
  { id: 'selfdefense', label: 'Learn Self-Defense', icon: 'shield', desc: 'Feel safe anywhere' },
  { id: 'hiit', label: 'HIIT', icon: 'zap', desc: 'Short, high-energy intervals' },
  { id: 'yoga', label: 'Yoga', icon: 'wind', desc: 'Strength, breath, and flow' },
  { id: 'confidence', label: 'Build Confidence', icon: 'star', desc: 'Inside and out' },
  { id: 'pregnancy', label: 'Pregnancy Wellness', icon: 'heart', desc: 'Safe & supported' },
  { id: 'postpartum', label: 'Postpartum Recovery', icon: 'sun', desc: 'Gentle return to strength' },
  { id: 'flexibility', label: 'Improve Flexibility', icon: 'repeat', desc: 'Move freely and deeply' },
  { id: 'stress', label: 'Reduce Stress', icon: 'cloud', desc: 'Calm your mind and body' },
] as const;

export type ScanVerdict = 'good' | 'okay' | 'avoid';

export type NutritionProfile = {
  goal?: string;
  foodPreference?: string;
  planDurationWeeks?: number;
  dailyTime?: string;
  isPregnant?: boolean;
};

export function goalLabels(goal: string) {
  return String(goal || '')
    .split(/[,/&+]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ONBOARDING_GOALS.find((item) => item.id === part || item.label.toLowerCase() === part.toLowerCase())?.label || part);
}

function categoryId(goal?: string) {
  const first = String(goal || '')
    .split(/[,/&+]+/)
    .map((part) => part.trim().toLowerCase())
    .find(Boolean) || '';
  return ONBOARDING_GOALS.find((item) => item.id === first || item.label.toLowerCase() === first)?.id || 'hiit';
}

export function durationLabel(weeks?: number) {
  const value = PLAN_WEEKS.includes((weeks || 8) as (typeof PLAN_WEEKS)[number]) ? weeks || 8 : 8;
  if (value <= 4) return '1 month';
  if (value <= 8) return '2 months';
  return '3 months';
}

export function calorieTarget(profile: NutritionProfile) {
  const category = categoryId(profile.goal);
  if (profile.isPregnant || category === 'pregnancy') return 2000;
  if (category === 'weight_loss') return 1600;
  if (category === 'muscle' || category === 'boxing' || category === 'mma' || category === 'hiit') return 2100;
  if (category === 'postpartum') return 1900;
  return 1800;
}

export function foodRule(preference?: string) {
  const food = (preference || '').toLowerCase();
  if (food.includes('vegan')) return 'vegan';
  if (food.includes('vegetarian')) return 'vegetarian';
  if (food.includes('gluten')) return 'gluten-free';
  if (food.includes('dairy')) return 'dairy-free';
  if (food.includes('protein')) return 'high-protein';
  if (food.includes('carb')) return 'low-carb';
  return 'flexible';
}

export function nutritionCoachPrompt(profile: NutritionProfile) {
  const labels = goalLabels(profile.goal || '').join(', ') || 'general fitness';
  const food = profile.foodPreference && profile.foodPreference !== 'Eat everything' ? profile.foodPreference : 'no diet restriction';
  return [
    `Training: ${labels} (${durationLabel(profile.planDurationWeeks)}, ${profile.dailyTime || '20–30 min'} a day).`,
    `What she can eat: ${food}.`,
    profile.isPregnant ? 'Pregnancy-safe food only.' : '',
    `Judge the meal for THIS plan. Say if it is good, okay, or not a fit, and give calories.`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function recipeCoachNotes(profile: NutritionProfile) {
  const food = foodRule(profile.foodPreference);
  const notes = [
    `Only suggest meals she can eat: ${profile.foodPreference || 'Eat everything'}.`,
    food === 'vegan' ? 'No meat, fish, eggs, or dairy.' : '',
    food === 'vegetarian' ? 'No meat or fish.' : '',
    food === 'gluten-free' ? 'No wheat, barley, rye, or regular soy sauce.' : '',
    food === 'dairy-free' ? 'No milk, cheese, yogurt, or butter.' : '',
    food === 'high-protein' ? 'At least 25g protein per serving.' : '',
    food === 'low-carb' ? 'Keep carbs modest; prioritize protein and vegetables.' : '',
  ];
  return notes.filter(Boolean);
}

const MEAT = /chicken|beef|pork|turkey|lamb|bacon|steak|meatball|sausage|ham|pepperoni/;
const FISH = /fish|salmon|tuna|shrimp|prawn|cod|tilapia|anchovy/;
const DAIRY = /cheese|milk|yogurt|yoghurt|butter|cream|whey|paneer/;
const GLUTEN = /wheat|bread|pasta|noodle|flour|soy sauce|couscous|seitan/;
const EGG = /\begg\b|eggs/;

export function recipeFitsDiet(input: { title?: string; tags?: string[]; ingredients?: string[] }, preference?: string) {
  const rule = foodRule(preference);
  if (rule === 'flexible') return true;
  const hay = `${input.title || ''} ${(input.tags || []).join(' ')} ${(input.ingredients || []).join(' ')}`.toLowerCase();
  const veganTag = (input.tags || []).some((tag) => /vegan/i.test(tag));
  if (rule === 'vegan') return veganTag || (!MEAT.test(hay) && !FISH.test(hay) && !DAIRY.test(hay) && !EGG.test(hay));
  if (rule === 'vegetarian') return !MEAT.test(hay) && !FISH.test(hay);
  if (rule === 'dairy-free') return !DAIRY.test(hay);
  if (rule === 'gluten-free') return !GLUTEN.test(hay);
  if (rule === 'low-carb') return !/pasta|rice|bread|noodle|potato|wrap/i.test(hay);
  return true;
}

export function applyScanVerdict<T extends {
  name?: string;
  score?: number;
  calories?: number;
  protein_g?: number;
  tags?: string[];
  ingredients?: Array<{ name: string; concern?: boolean; detail?: string }>;
  verdict?: ScanVerdict;
  verdict_label?: string;
  calories_note?: string;
  fit_reason?: string;
}>(scan: T, profile: NutritionProfile): T {
  const labels = goalLabels(profile.goal || '');
  const planName = labels.join(' + ') || 'your plan';
  const food = profile.foodPreference && profile.foodPreference !== 'Eat everything' ? profile.foodPreference : '';
  const hay = `${scan.name || ''} ${(scan.tags || []).join(' ')} ${(scan.ingredients || []).map((item) => item.name).join(' ')}`.toLowerCase();
  const rule = foodRule(profile.foodPreference);
  const calories = Number(scan.calories) || 0;
  const protein = Number(scan.protein_g) || 0;
  const score = Number(scan.score) || 0;
  const category = categoryId(profile.goal);

  let verdict: ScanVerdict = scan.verdict || (score >= 78 ? 'good' : score >= 58 ? 'okay' : 'avoid');
  const dietBreaks =
    (rule === 'vegan' && (MEAT.test(hay) || FISH.test(hay) || DAIRY.test(hay) || EGG.test(hay))) ||
    (rule === 'vegetarian' && (MEAT.test(hay) || FISH.test(hay))) ||
    (rule === 'dairy-free' && DAIRY.test(hay)) ||
    (rule === 'gluten-free' && GLUTEN.test(hay));

  if (dietBreaks) verdict = 'avoid';
  else if (category === 'weight_loss' && calories > 750) verdict = verdict === 'good' ? 'okay' : verdict;
  else if ((category === 'muscle' || category === 'boxing' || category === 'mma') && protein < 15 && calories > 350) {
    verdict = verdict === 'good' ? 'okay' : verdict;
  }

  const verdict_label =
    scan.verdict_label ||
    (verdict === 'good'
      ? `Good for your ${planName}${food ? ` · ${food}` : ''} plan`
      : verdict === 'okay'
        ? `Okay for ${planName}, not perfect`
        : food && dietBreaks
          ? `Not a fit — this does not match ${food}`
          : `Not the best choice for ${planName}`);

  const calories_note =
    scan.calories_note ||
    `${Math.round(calories)} kcal · ${Math.round(protein)}g protein${food ? ` · ${food}` : ''}`;

  const fit_reason =
    scan.fit_reason ||
    (dietBreaks
      ? `Your onboarding food choice is ${food}. Pick a meal that follows that.`
      : `Scored against ${planName} and a ${durationLabel(profile.planDurationWeeks)} plan.`);

  return { ...scan, verdict, verdict_label, calories_note, fit_reason };
}
