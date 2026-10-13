import { supabase } from 'lib/supabase';

/** PostgREST `in` list with quoted values (safe for ids containing commas/dots). */
export function inList(values) {
  return `(${values.map((v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`;
}

/**
 * After the new child set has been upserted, delete only the children of `parentId`
 * whose `keyCol` is not in `keepKeys`. Never leaves the parent empty if the upsert failed,
 * because callers run this only after a successful upsert.
 */
export async function deleteChildrenNotIn(table, parentCol, parentId, keyCol, keepKeys) {
  let query = supabase.from(table).delete().eq(parentCol, parentId);
  if (keepKeys.length) query = query.not(keyCol, 'in', inList(keepKeys));
  const { error } = await query;
  if (error) throw error;
}
