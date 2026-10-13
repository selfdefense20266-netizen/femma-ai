/** Raw multi-line text -> list of non-empty steps (used on save only). */
export function stepsFromText(text) {
  return String(text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Stored steps array -> editable multi-line text. */
export function stepsToText(steps) {
  return Array.isArray(steps) ? steps.join('\n') : '';
}
