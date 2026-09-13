import gifMap from '../data/exerciseGifMap.json';
import { normalizeExerciseTitle } from '@/lib/exerciseGifMatch';

export type ExerciseGifMapEntry = {
  title: string;
  animation: string;
  categories: string[];
  status: 'found' | 'missing';
  matchedName: string | null;
  gifUrl: string | null;
  source: 'rule' | 'fuzzy' | 'api' | null;
  score: number;
};

type GifMapFile = {
  generatedAt: string;
  total: number;
  found: number;
  missing: number;
  exercises: ExerciseGifMapEntry[];
  missingTitles: string[];
};

const MAP = gifMap as GifMapFile;

const byTitle = new Map<string, ExerciseGifMapEntry>();
for (const row of MAP.exercises || []) {
  byTitle.set(normalizeExerciseTitle(row.title), row);
}

export function getGifMapStats() {
  return {
    generatedAt: MAP.generatedAt,
    total: MAP.total,
    found: MAP.found,
    missing: MAP.missing,
    missingTitles: MAP.missingTitles || [],
  };
}

/** Lookup pre-built ExerciseDB match for a mission title. */
export function lookupMappedGif(title: string, animation?: string): ExerciseGifMapEntry | null {
  const key = normalizeExerciseTitle(title);
  const exact = byTitle.get(key);
  if (exact) return exact;

  // Strip "N min … at home" style mission wrappers.
  const stripped = normalizeExerciseTitle(
    title
      .replace(/^\d+\s*min\s+/i, '')
      .replace(/\s+(at home|at the gym|home or gym)\s*$/i, '')
  );
  if (byTitle.has(stripped)) return byTitle.get(stripped) || null;

  // Fallback: find by animation + partial title token match.
  if (animation) {
    const tokens = stripped.split(' ').filter((t) => t.length > 3);
    let best: ExerciseGifMapEntry | null = null;
    let bestHits = 0;
    for (const row of MAP.exercises || []) {
      if (row.animation !== animation) continue;
      const name = normalizeExerciseTitle(row.title);
      const hits = tokens.filter((t) => name.includes(t)).length;
      if (hits > bestHits) {
        best = row;
        bestHits = hits;
      }
    }
    if (best && bestHits >= 2) return best;
  }
  return null;
}
