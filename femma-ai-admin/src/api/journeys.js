import { supabase } from 'lib/supabase';
import { uploadThumbnail } from 'api/uploadThumbnail';
import { deleteChildrenNotIn } from 'api/childRows';
import { newRecordId } from 'utils/ids';


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
  const isNew = !payload.id;
  const id = payload.id || newRecordId(payload.title, 'journey');
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

  const query = isNew ? supabase.from('journeys').insert(row) : supabase.from('journeys').update(row).eq('id', id);
  const { data, error } = await query.select('*').single();
  if (error) throw error;

  const courseIds = [...new Set(payload.courseIds || [])];

  // Upsert the new link set first (PK is journey_id + course_id), then drop links no longer selected.
  if (courseIds.length) {
    const linkRows = courseIds.map((courseId, index) => ({ journey_id: id, course_id: courseId, sort_order: index }));
    const { error: upsertError } = await supabase.from('journey_courses').upsert(linkRows, { onConflict: 'journey_id,course_id' });
    if (upsertError) throw upsertError;
  }
  await deleteChildrenNotIn('journey_courses', 'journey_id', id, 'course_id', courseIds);

  return mapJourney(data, courseIds.map((courseId, index) => ({ journey_id: id, course_id: courseId, sort_order: index })));
}

export async function removeJourney(id) {
  const { error } = await supabase.from('journeys').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadJourneyImage(journeyId, file) {
  return uploadThumbnail(`journeys/${journeyId || 'new'}`, file);
}
