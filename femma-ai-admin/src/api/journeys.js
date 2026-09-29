import { supabase } from 'lib/supabase';
import { uploadThumbnail } from 'api/uploadThumbnail';

function slugify(text, fallbackPrefix = 'journey') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export function mapJourney(row, courseLinkRows = []) {
  const courseIds = courseLinkRows
    .filter((link) => link.journey_id === row.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((link) => link.course_id);

  return {
    id: row.id,
    title: row.title,
    eyebrow: row.eyebrow || '',
    detail: row.detail || '',
    imageUrl: row.image_url || '',
    colorStart: row.color_start || '#1B6B67',
    colorEnd: row.color_end || '#012E2D',
    status: row.status || 'draft',
    sortOrder: row.sort_order ?? 0,
    courseIds
  };
}

export async function fetchJourneys() {
  const [journeysRes, linksRes] = await Promise.all([
    supabase.from('journeys').select('*').order('sort_order'),
    supabase.from('journey_courses').select('*').order('sort_order')
  ]);

  const firstError = journeysRes.error || linksRes.error;
  if (firstError) throw firstError;

  const linkRows = linksRes.data || [];
  return (journeysRes.data || []).map((row) => mapJourney(row, linkRows));
}

export async function upsertJourney(payload) {
  const id = payload.id || slugify(payload.title);
  const row = {
    id,
    title: payload.title.trim(),
    eyebrow: payload.eyebrow || '',
    detail: payload.detail || '',
    image_url: payload.imageUrl || null,
    color_start: payload.colorStart || '#1B6B67',
    color_end: payload.colorEnd || '#012E2D',
    status: payload.status || 'draft',
    sort_order: payload.sortOrder ?? 0
  };

  const { data, error } = await supabase.from('journeys').upsert(row).select('*').single();
  if (error) throw error;

  const courseIds = payload.courseIds || [];
  const { error: deleteError } = await supabase.from('journey_courses').delete().eq('journey_id', id);
  if (deleteError) throw deleteError;

  if (courseIds.length) {
    const linkRows = courseIds.map((courseId, index) => ({ journey_id: id, course_id: courseId, sort_order: index }));
    const { error: insertError } = await supabase.from('journey_courses').insert(linkRows);
    if (insertError) throw insertError;
  }

  return mapJourney(data, courseIds.map((courseId, index) => ({ journey_id: id, course_id: courseId, sort_order: index })));
}

export async function removeJourney(id) {
  const { error } = await supabase.from('journeys').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadJourneyImage(journeyId, file) {
  return uploadThumbnail(`journeys/${journeyId || 'new'}`, file);
}
