const API_BASE = 'https://oss.exercisedb.dev/api/v1';

export type ExerciseDbRow = {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts?: string[];
  equipments?: string[];
  targetMuscles?: string[];
  instructions?: string[];
};

type SearchResponse = {
  success?: boolean;
  data?: ExerciseDbRow[];
  meta?: { total?: number };
};

const searchCache = new Map<string, ExerciseDbRow[]>();

function normalizeQuery(value: string) {
  return value
    .toLowerCase()
    .replace(/^\d+\s*min\s+/, '')
    .replace(/\s+(home or gym|at the gym|at home)\s*$/i, '')
    .replace(/[^\w\s/+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Score how well an API row matches the search phrase (higher is better). */
export function scoreExerciseMatch(row: ExerciseDbRow, query: string) {
  const q = normalizeQuery(query);
  const name = normalizeQuery(row.name || '');
  if (!q || !name) return 0;
  if (name === q) return 1000;
  if (name.startsWith(q) || q.startsWith(name)) return 800;
  if (name.includes(q) || q.includes(name)) return 600;
  const qTokens = q.split(' ').filter((t) => t.length > 2);
  const hits = qTokens.filter((t) => name.includes(t)).length;
  return hits * 40;
}

export function pickBestExercise(rows: ExerciseDbRow[], query: string): ExerciseDbRow | null {
  if (!rows.length) return null;
  let best = rows[0];
  let bestScore = scoreExerciseMatch(best, query);
  for (let i = 1; i < rows.length; i += 1) {
    const score = scoreExerciseMatch(rows[i], query);
    if (score > bestScore) {
      best = rows[i];
      bestScore = score;
    }
  }
  // Reject very weak fuzzy hits (e.g. unrelated "rotation" for "upward facing dog").
  if (bestScore < 40 && normalizeQuery(query).split(' ').length > 1) {
    const exactish = rows.find((row) => scoreExerciseMatch(row, query) >= 600);
    return exactish || (bestScore >= 40 ? best : rows[0]);
  }
  return best;
}

export async function searchExerciseDb(query: string, limit = 12): Promise<ExerciseDbRow[]> {
  const q = normalizeQuery(query);
  if (!q) return [];
  const cacheKey = `${q}|${limit}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey) || [];

  const url = `${API_BASE}/exercises/search?search=${encodeURIComponent(q)}&threshold=0.35&limit=${Math.min(25, Math.max(1, limit))}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    if (!res.ok || text.trim().startsWith('<')) {
      searchCache.set(cacheKey, []);
      return [];
    }
    const json = JSON.parse(text) as SearchResponse;
    const rows = (json.data || []).filter((row) => row?.gifUrl && row?.name);
    searchCache.set(cacheKey, rows);
    return rows;
  } catch {
    searchCache.set(cacheKey, []);
    return [];
  }
}

/** Resolve the best ExerciseDB gif for a search phrase. */
export async function resolveExerciseDbGif(query: string): Promise<ExerciseDbRow | null> {
  const rows = await searchExerciseDb(query);
  return pickBestExercise(rows, query);
}
