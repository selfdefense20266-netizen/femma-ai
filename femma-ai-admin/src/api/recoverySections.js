import { supabase } from 'lib/supabase';
import { uploadThumbnail } from 'api/uploadThumbnail';
import { deleteChildrenNotIn } from 'api/childRows';
import { newRecordId } from 'utils/ids';


export const RECOVERY_KEY_OPTIONS = [
  { id: 'rest', label: 'Rest (skip day)' },
  { id: 'full-body', label: 'Full body stretch' },
  { id: 'upper-body', label: 'Upper body stretch' },
  { id: 'lower-body', label: 'Lower body stretch' },
  { id: 'breath', label: 'Breath & calm' },
  { id: 'custom', label: 'Custom' }
];

function mapItem(row) {
  return {
    id: row.id,
    sectionId: row.section_id,
    intensityLevel: row.intensity_level || 'beginner',
    title: row.title,
    durationMinutes: Number(row.duration_minutes ?? 10),
    restMinutes: Number(row.rest_minutes ?? 0),
    mediaUrl: row.media_url || '',
    cue: row.cue || '',
    steps: Array.isArray(row.steps) ? row.steps : [],
    sortOrder: row.sort_order ?? 0
  };
}

export function mapRecoverySection(row, itemRows = []) {
  const items = itemRows
    .filter((item) => item.section_id === row.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(mapItem);

  return {
    id: row.id,
    title: row.title,
    sectionKey: row.section_key || 'custom',
    isRest: Boolean(row.is_rest),
    coverUrl: row.cover_url || '',
    status: row.status || 'draft',
    sortOrder: row.sort_order ?? 0,
    items
  };
}

export async function fetchRecoverySections() {
  const [secRes, itemRes] = await Promise.all([
    supabase.from('recovery_sections').select('*').order('sort_order'),
    supabase.from('recovery_section_items').select('*').order('sort_order')
  ]);
  if (secRes.error) throw secRes.error;
  if (itemRes.error) throw itemRes.error;
  return (secRes.data || []).map((row) => mapRecoverySection(row, itemRes.data || []));
}

export async function upsertRecoverySection(payload) {
  const isNew = !payload.id;
  const id = payload.id || newRecordId(payload.title, 'recovery');
  const isRest = Boolean(payload.isRest) || payload.sectionKey === 'rest';
  const sectionRow = {
    id,
    title: String(payload.title || '').trim() || 'Recovery',
    section_key: payload.sectionKey || 'custom',
    is_rest: isRest,
    cover_url: payload.coverUrl || null,
    status: payload.status || 'published',
    sort_order: (() => {
      const n = Number(payload.sortOrder);
      if (Number.isFinite(n) && n >= 0 && n <= 2147483647) return Math.trunc(n);
      return Math.floor(Date.now() / 1000);
    })()
  };

  const sectionQuery = isNew
    ? supabase.from('recovery_sections').insert(sectionRow)
    : supabase.from('recovery_sections').update(sectionRow).eq('id', id);
  const { data, error } = await sectionQuery.select('*').single();
  if (error) throw error;

  const items = Array.isArray(payload.items) ? payload.items : [];
  let savedItems = [];
  let keepIds = [];
  if (items.length && !isRest) {
    const allowed = new Set(['beginner', 'intermediate', 'active']);
    const stamp = Date.now().toString(36);
    const rows = items.map((item, index) => ({
      id: item.id || `${id}-${item.intensityLevel || 'beginner'}-${index}-${stamp}`,
      section_id: id,
      intensity_level: allowed.has(item.intensityLevel) ? item.intensityLevel : 'beginner',
      title: String(item.title || '').trim() || `Move ${index + 1}`,
      // Stored in SECONDS (column name kept for compatibility).
      duration_minutes: Math.max(1, Math.round(Number(item.durationMinutes ?? 10))),
      rest_minutes: Math.max(0, Math.round(Number(item.restMinutes ?? 0))),
      media_url: item.mediaUrl || null,
      cue: item.cue || '',
      steps: Array.isArray(item.steps) ? item.steps : [],
      sort_order: item.sortOrder ?? index
    }));
    // Upsert first so a failure never leaves the section empty…
    const { data: upserted, error: upErr } = await supabase.from('recovery_section_items').upsert(rows, { onConflict: 'id' }).select('*');
    if (upErr) throw upErr;
    savedItems = upserted || rows;
    keepIds = rows.map((r) => r.id);
  }

  // …then remove only items that are no longer in the section.
  await deleteChildrenNotIn('recovery_section_items', 'section_id', id, 'id', keepIds);

  return mapRecoverySection(data, savedItems);
}

export async function removeRecoverySection(id) {
  const { error } = await supabase.from('recovery_sections').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadRecoveryCover(sectionId, file) {
  return uploadThumbnail(`recovery/${sectionId || 'new'}`, file);
}
