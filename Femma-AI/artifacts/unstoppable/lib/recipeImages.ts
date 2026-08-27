/** Look up real food photos by recipe title (free, no API key). */

const memoryCache = new Map<string, string | null>();

type MealDbResponse = {
  meals?: Array<{ strMealThumb?: string | null }> | null;
};

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

  memoryCache.set(cacheKey, null);
  return null;
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
