/** Lowercase, dash-separated slug from free text. */
export function slugify(text, fallbackPrefix = 'item') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60)
    .replace(/-$/, '');
  return base || fallbackPrefix;
}

function randomSuffix(length = 6) {
  try {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const bytes = new Uint8Array(length);
      crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => (b % 36).toString(36)).join('');
    }
  } catch {
    // fall through
  }
  return Math.random()
    .toString(36)
    .slice(2, 2 + length)
    .padEnd(length, '0');
}

/**
 * Id for a NEW record: readable slug plus a short random suffix so two records
 * with the same title never collide (and never overwrite each other via upsert).
 */
export function newRecordId(text, fallbackPrefix = 'item') {
  return `${slugify(text, fallbackPrefix)}-${randomSuffix()}`;
}
