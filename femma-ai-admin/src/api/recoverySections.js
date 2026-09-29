import { supabase } from 'lib/supabase';
import { uploadThumbnail } from 'api/uploadThumbnail';

function slugify(text, fallbackPrefix = 'recovery') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

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
  const id = payload.id || slugify(payload.title);
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

  const { data, error } = await supabase.from('recovery_sections').upsert(sectionRow).select('*').single();
  if (error) throw error;

  const { error: delErr } = await supabase.from('recovery_section_items').delete().eq('section_id', id);
  if (delErr) throw delErr;

  const items = Array.isArray(payload.items) ? payload.items : [];
  let savedItems = [];
  if (items.length && !isRest) {
    const allowed = new Set(['beginner', 'intermediate', 'active']);
    const rows = items.map((item, index) => ({
      id: item.id || `${id}-${item.intensityLevel || 'beginner'}-${index}-${Date.now().toString(36)}`,
      section_id: id,
      intensity_level: allowed.has(item.intensityLevel) ? item.intensityLevel : 'beginner',
      title: String(item.title || '').trim() || `Move ${index + 1}`,
      duration_minutes: Math.max(1, Number(item.durationMinutes ?? 10)),
      rest_minutes: Number(item.restMinutes ?? 0),
      media_url: item.mediaUrl || null,
      cue: item.cue || '',
      steps: Array.isArray(item.steps) ? item.steps : [],
      sort_order: item.sortOrder ?? index
    }));
    const { data: inserted, error: insErr } = await supabase.from('recovery_section_items').insert(rows).select('*');
    if (insErr) throw insErr;
    savedItems = inserted || rows;
  }

  return mapRecoverySection(data, savedItems);
}

export async function removeRecoverySection(id) {
  const { error } = await supabase.from('recovery_sections').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadRecoveryCover(sectionId, file) {
  return uploadThumbnail(`recovery/${sectionId || 'new'}`, file);
}
