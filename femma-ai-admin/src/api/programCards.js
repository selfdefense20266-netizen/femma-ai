import { supabase } from 'lib/supabase';
import { uploadThumbnail } from 'api/uploadThumbnail';

function slugify(text, fallbackPrefix = 'program') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

/** Postgres integer max is 2_147_483_647 — never use Date.now() ms. */
function safeSortOrder(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n >= 0 && n <= 2147483647) return Math.trunc(n);
  return Math.floor(Date.now() / 1000);
}

export function mapProgramCard(row) {
  return {
    id: row.id,
    title: row.title || '',
    subtitle: row.subtitle || '',
    imageUrl: row.image_url || '',
    courseId: row.course_id || '',
    courseTitle: row.courses?.title || row.course_title || '',
    categoryId: row.courses?.category_id || row.category_id || '',
    status: row.status || 'draft',
    sortOrder: row.sort_order ?? 0
  };
}

export async function fetchProgramCards() {
  const { data, error } = await supabase
    .from('program_cards')
    .select('*, courses(id, title, category_id, image_url, status)')
    .order('sort_order');
  if (error) throw error;
  return (data || []).map(mapProgramCard);
}

export async function upsertProgramCard(payload) {
  const id = payload.id || slugify(payload.title);
  const courseId = String(payload.courseId || '').trim();
  if (!courseId) throw new Error('Select a course for this card');

  const row = {
    id,
    title: String(payload.title || '').trim() || 'Program',
    subtitle: String(payload.subtitle || '').trim(),
    image_url: payload.imageUrl || null,
    course_id: courseId,
    status: payload.status || 'published',
    sort_order: safeSortOrder(payload.sortOrder)
  };

  const { data, error } = await supabase
    .from('program_cards')
    .upsert(row)
    .select('*, courses(id, title, category_id, image_url, status)')
    .single();
  if (error) throw error;
  return mapProgramCard(data);
}

export async function removeProgramCard(id) {
  const { error } = await supabase.from('program_cards').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadProgramCardImage(cardId, file) {
  return uploadThumbnail(`program/${cardId || 'new'}`, file);
}
