import { matchWebExerciseGif, type WebExerciseGif } from '@/data/webExerciseGifs';

const GIPHY_KEY = process.env.EXPO_PUBLIC_GIPHY_API_KEY || '';
const searchCache = new Map<string, { name: string; url: string } | null>();

type GiphySearchResponse = {
  data?: Array<{
    title?: string;
    images?: { original?: { url?: string }; downsized?: { url?: string } };
  }>;
};

/**
 * Optional live web GIF search (Giphy) when EXPO_PUBLIC_GIPHY_API_KEY is set.
 * Always falls back to curated links in data/webExerciseGifs.ts.
 */
export async function searchWebGif(query: string): Promise<{ name: string; url: string } | null> {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (searchCache.has(q)) return searchCache.get(q) || null;

  if (!GIPHY_KEY) {
    searchCache.set(q, null);
    return null;
  }

  try {
    const url =
      `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(GIPHY_KEY)}` +
      `&q=${encodeURIComponent(q)}&limit=5&rating=g&lang=en`;
    const res = await fetch(url);
    if (!res.ok) {
      searchCache.set(q, null);
      return null;
    }
    const json = (await res.json()) as GiphySearchResponse;
    for (const row of json.data || []) {
      const gif = row.images?.downsized?.url || row.images?.original?.url;
      if (gif) {
        const hit = { name: row.title || query, url: gif };
        searchCache.set(q, hit);
        return hit;
      }
    }
  } catch {
    // ignore
  }
  searchCache.set(q, null);
  return null;
}

export function resolveCuratedWebGif(title: string, animation?: string): WebExerciseGif | null {
  return matchWebExerciseGif(title, animation);
}
