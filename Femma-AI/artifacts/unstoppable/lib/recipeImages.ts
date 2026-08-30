/** Look up real food photos by recipe title (free, no API key). */

const memoryCache = new Map<string, string | null>();

type MealDbResponse = {
  meals?: Array<{ strMealThumb?: string | null }> | null;
};

const KEYWORD_PHOTOS: Array<[RegExp, string]> = [
  [/chicken|turkey/, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80'],
  [/salmon|tuna|fish/, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80'],
  [/tofu|stir.?fry/, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=800&q=80'],
  [/soup|lentil/, 'https://images.unsplash.com/photo-1547592166-23acba3e6ef8?auto=format&fit=crop&w=800&q=80'],
  [/smoothie|shake|cocoa/, 'https://images.unsplash.com/photo-1623065422902-30dd32d19fc8?auto=format&fit=crop&w=800&q=80'],
  [/oat|overnight/, 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=800&q=80'],
  [/egg/, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=800&q=80'],
  [/chickpea|salad/, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80'],
  [/curry/, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80'],
  [/yogurt|yoghurt|berry/, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'],
  [/quinoa|bean|bowl/, 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80'],
  [/sweet potato|hash/, 'https://images.unsplash.com/photo-1588166524941-3bf61a2c0d3e?auto=format&fit=crop&w=800&q=80'],
  [/rice/, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=800&q=80'],
];

function photoForTitle(title: string): string | null {
  const hay = title.toLowerCase();
  const match = KEYWORD_PHOTOS.find(([pattern]) => pattern.test(hay));
  return match?.[1] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
}

async function searchMealDb(query: string): Promise<string | null> {
  const q = query.trim();
  if (!q) return null;

  try {
    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`
    );
    if (!response.ok) return null;
    const json = (await response.json()) as MealDbResponse;
    const thumb = json.meals?.[0]?.strMealThumb;
    return typeof thumb === 'string' && thumb.startsWith('http') ? thumb : null;
  } catch {
    return null;
  }
}

function searchQueries(title: string): string[] {
  const clean = title.replace(/[^\w\s-]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const queries = [clean];
  if (words.length >= 3) queries.push(words.slice(0, 3).join(' '));
  if (words.length >= 2) queries.push(words.slice(0, 2).join(' '));
  if (words[0]) queries.push(words[0]);
  return [...new Set(queries)];
}

/** Returns a food photo URL matched to the recipe title, or null. */
export async function lookupRecipeImageUrl(title: string): Promise<string | null> {
  const cacheKey = title.toLowerCase().trim();
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) ?? null;

  for (const query of searchQueries(title)) {
    const url = await searchMealDb(query);
    if (url) {
      memoryCache.set(cacheKey, url);
      return url;
    }
  }

  const fallback = photoForTitle(title);
  memoryCache.set(cacheKey, fallback);
  return fallback;
}

export async function attachRecipeImages<T extends { title: string; imageUrl?: string }>(
  recipes: T[]
): Promise<(T & { imageUrl?: string })[]> {
  return Promise.all(
    recipes.map(async (recipe) => {
      if (recipe.imageUrl) return recipe;
      const imageUrl = (await lookupRecipeImageUrl(recipe.title)) || undefined;
      return imageUrl ? { ...recipe, imageUrl } : recipe;
    })
  );
}
