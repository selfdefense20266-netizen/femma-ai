import { LOCAL_GIFS } from '@/data/exerciseGifAssets';
import { lookupMappedGif } from '@/lib/exerciseGifMap';
import { matchExerciseGif, gifUrlFor } from '@/lib/exerciseGifMatch';

const memoryCache = new Map<string, ExerciseGifMatch | null>();

export type ExerciseGifMatch = {
  name: string;
  urls: string[];
  local?: number;
  source?: 'map' | 'catalog' | 'local' | 'missing';
  missing?: boolean;
};

/**
 * Prefer the pre-built ExerciseDB map (data/exerciseGifMap.json).
 * Missing entries return { missing: true } so UI can show "No GIF available".
 */
export async function lookupExerciseGif(
  title: string,
  animation?: string,
  _preferYoga?: boolean
): Promise<ExerciseGifMatch | null> {
  const cacheKey = `${title.toLowerCase().trim()}|${animation || ''}`;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) || null;

  const mapped = lookupMappedGif(title, animation);
  if (mapped) {
    if (mapped.status === 'found' && mapped.gifUrl) {
      const match: ExerciseGifMatch = {
        name: mapped.matchedName || mapped.title,
        urls: [mapped.gifUrl],
        source: 'map',
      };
      memoryCache.set(cacheKey, match);
      return match;
    }
    const missing: ExerciseGifMatch = {
      name: mapped.title,
      urls: [],
      source: 'missing',
      missing: true,
    };
    memoryCache.set(cacheKey, missing);
    return missing;
  }

  // New / unmapped title — soft fallback to rule catalog only (no wrong fuzzy).
  const hit = matchExerciseGif(title, animation);
  const url = hit ? gifUrlFor(hit) : '';
  if (hit?.localKey) {
    const match: ExerciseGifMatch = {
      name: hit.name,
      urls: [],
      local: LOCAL_GIFS[hit.localKey],
      source: 'local',
    };
    memoryCache.set(cacheKey, match);
    return match;
  }

  if (url) {
    const match: ExerciseGifMatch = {
      name: hit?.name || hit?.catalog || title,
      urls: [url],
      source: 'catalog',
    };
    memoryCache.set(cacheKey, match);
    return match;
  }

  const missing: ExerciseGifMatch = {
    name: title,
    urls: [],
    source: 'missing',
    missing: true,
  };
  memoryCache.set(cacheKey, missing);
  return missing;
}
