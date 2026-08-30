import { LOCAL_GIFS } from '@/data/exerciseGifAssets';
import { gifUrlFor, matchExerciseGif, type GifHit } from '@/lib/exerciseGifMatch';

const memoryCache = new Map<string, ExerciseGifMatch | null>();

export type ExerciseGifMatch = {
  name: string;
  urls: string[];
  local?: number;
};

function toMatch(hit: GifHit): ExerciseGifMatch {
  const url = gifUrlFor(hit);
  return {
    name: hit.name,
    urls: url ? [url] : [],
    local: hit.localKey ? LOCAL_GIFS[hit.localKey] : undefined,
  };
}

export async function lookupExerciseGif(title: string, animation?: string): Promise<ExerciseGifMatch | null> {
  const cacheKey = `${title.toLowerCase().trim()}|${animation || ''}`;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey) || null;
  const hit = matchExerciseGif(title, animation);
  const match = hit ? toMatch(hit) : null;
  memoryCache.set(cacheKey, match);
  return match;
}
