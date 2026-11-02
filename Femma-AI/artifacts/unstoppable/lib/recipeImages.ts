/** Recipe photos: bundled dish-type photo library (assets/recipes/lib), matched by the dish a title names. */
import { DISH_PHOTOS, type DishType } from '@/data/recipePhotoLibrary';



/** Dish type keywords, most specific first (ties go to the earlier entry). */
const DISH_PATTERNS: Array<[DishType, RegExp]> = [
  ['smoothie_bowl', /smoothie bowl|acai|açaí|nice cream/g],
  ['shake', /shake/g],
  ['smoothie', /smoothie|juice|lassi/g],
  ['overnight_oats', /overnight oat/g],
  ['pancakes', /pancake|crepe/g],
  ['waffles', /waffle/g],
  ['muffins', /muffin|banana bread|loaf/g],
  ['oatmeal', /oat|porridge|muesli|granola/g],
  ['omelette', /omelet|frittata/g],
  ['chia', /chia/g],
  ['parfait', /parfait|yogurt|yoghurt/g],
  ['bites', /fat bomb|energy ball|energy bite|protein ball|truffle|bites/g],
  ['dessert', /mousse|brownie|chocolate|pudding|cake|cookie/g],
  ['toast', /toast/g],
  ['tacos', /taco|quesadilla|enchilada|fajita/g],
  ['wrap', /wrap|burrito|pita/g],
  ['sandwich', /sandwich|burger|panini/g],
  ['shrimp', /shrimp|prawn/g],
  ['salmon', /salmon/g],
  ['tuna', /tuna|poke/g],
  ['fish', /\bcod\b|halibut|tilapia|fish|sea ?bass|mackerel|trout/g],
  ['falafel', /falafel/g],
  ['hummus', /hummus/g],
  ['lentils', /\bdal\b|daal|lentil/g],
  ['curry', /curry|masala|korma|chili|stew|tikka/g],
  ['soup', /soup|broth|chowder|ramen/g],
  ['rice', /biryani|fried rice|risotto|pilaf|paella|\brice\b/g],
  ['stirfry', /stir.?fry|tofu|teriyaki/g],
  ['pasta', /pasta|primavera|noodle|spaghetti|zoodle|lasagna|penne/g],
  ['beef', /steak|beef|sirloin|meatball|lamb|pork/g],
  ['sweet_potato', /sweet potato|\bhash\b/g],
  ['grain_bowl', /quinoa|bean|buddha|power bowl|grain bowl|\bbowl\b/g],
  ['salad', /salad|slaw/g],
  ['chicken', /chicken|turkey/g],
  ['eggs', /\beggs?\b|shakshuka|scramble/g],
];

function lastMatchEnd(text: string, pattern: RegExp) {
  let end = -1;
  pattern.lastIndex = 0;
  for (let m = pattern.exec(text); m; m = pattern.exec(text)) end = m.index + m[0].length;
  pattern.lastIndex = 0;
  return end;
}

/**
 * The dish a title names is its head noun, which comes last in the main phrase:
 * "Banana Oat Pancakes" -> pancakes, "Spinach and Feta Omelette" -> omelette,
 * "Lemon Garlic Chicken with Quinoa" -> chicken (anything after "with" is a side).
 */
export function dishTypeForTitle(title: string): DishType | null {
  const lower = title.toLowerCase();
  for (const text of [lower.split(/\bwith\b|,|\(|\bserved\b/)[0], lower]) {
    let best: DishType | null = null;
    let bestEnd = -1;
    for (const [type, pattern] of DISH_PATTERNS) {
      const end = lastMatchEnd(text, pattern);
      if (end > bestEnd) {
        best = type;
        bestEnd = end;
      }
    }
    if (best) return best;
  }
  return null;
}

function hashString(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Bundled photo key (see data/recipeImageMap.ts) for a dish title. Picks from the dish type's pool,
 * preferring a photo not in `used` so lists don't repeat. Null when the title matches no dish type
 * (the card then shows its colour gradient instead of a wrong photo).
 */
export function localPhotoKeyForTitle(title: string, used: ReadonlySet<string> = new Set()): string | null {
  const type = dishTypeForTitle(title);
  if (!type) return null;
  const pool = DISH_PHOTOS[type];
  if (!pool.length) return null;
  // Library photos first (rotated per title), then the catalog's own photos as a last resort.
  const library = pool.filter((key) => key.startsWith('lib/'));
  const catalog = pool.filter((key) => !key.startsWith('lib/'));
  const offset = library.length ? hashString(title.toLowerCase()) % library.length : 0;
  const ordered = [...library.slice(offset), ...library.slice(0, offset), ...catalog];
  return ordered.find((key) => !used.has(key)) ?? ordered[0];
}

/** Give each recipe without a photo a bundled dish photo, avoiding keys already in `used` (mutated). */
export function attachRecipeImages<T extends { title: string; image?: string; imageUrl?: string }>(
  recipes: T[],
  used: Set<string> = new Set()
): T[] {
  return recipes.map((recipe) => {
    if (recipe.image || recipe.imageUrl) return recipe;
    const image = localPhotoKeyForTitle(recipe.title, used);
    if (!image) return recipe;
    used.add(image);
    return { ...recipe, image };
  });
}
