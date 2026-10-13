import { supabase } from 'lib/supabase';
import { uploadThumbnail } from 'api/uploadThumbnail';
import { newRecordId } from 'utils/ids';

/**
 * Existing record (has id) -> UPDATE that row only.
 * New record -> INSERT with a unique id (slug + random suffix), so a new item with
 * the same title as an existing one can never overwrite it.
 */
async function saveRow(table, existingId, row, idSeed, fallbackPrefix) {
  if (existingId) {
    const { data, error } = await supabase.from(table).update(row).eq('id', existingId).select('*').single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from(table)
    .insert({ id: newRecordId(idSeed, fallbackPrefix), ...row })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export function mapCategory(row) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || '',
    description: row.description || '',
    icon: row.icon || 'book',
    color: row.color || '#F26BB5',
    status: row.status || 'draft'
  };
}

export function mapLesson(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    durationMinutes: row.duration_minutes ?? 10,
    videoUrl: row.video_url || null,
    thumbnailUrl: row.thumbnail_url || null,
    uploadKey: row.upload_key || '',
    sortOrder: row.sort_order ?? 0,
    muxUploadId: row.mux_upload_id || null,
    muxAssetId: row.mux_asset_id || null,
    muxPlaybackId: row.mux_playback_id || null,
    videoStatus: row.video_status || (row.video_url ? 'ready' : 'awaiting')
  };
}

export function mapModule(row, lessonRows = []) {
  const lessons = lessonRows
    .filter((l) => l.module_id === row.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(mapLesson);

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    sortOrder: row.sort_order ?? 0,
    lessons
  };
}

export function mapCourse(row, moduleRows = [], lessonRows = []) {
  const modules = moduleRows
    .filter((m) => m.course_id === row.id)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((m) => mapModule(m, lessonRows));

  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    shortTitle: row.short_title || row.title,
    description: row.description || '',
    icon: row.icon || 'book',
    color: row.color || '#F26BB5',
    imageUrl: row.image_url || '',
    level: row.level || 'All levels',
    equipment: row.equipment || 'None',
    status: row.status || 'draft',
    disclaimer: row.disclaimer || '',
    sortOrder: row.sort_order ?? 0,
    modules
  };
}

const CATEGORY_ORDER = {
  'self-defence': 1,
  fitness: 2,
  'cycle-pregnancy-health': 3,
  'diet-nutrition': 99
};

function categorySortRank(id) {
  return CATEGORY_ORDER[id] ?? 50;
}

export async function fetchCatalog() {
  const [categoriesRes, coursesRes, modulesRes, lessonsRes] = await Promise.all([
    supabase.from('categories').select('*').order('title'),
    supabase.from('courses').select('*').order('sort_order'),
    supabase.from('modules').select('*').order('sort_order'),
    supabase.from('lessons').select('*').order('sort_order')
  ]);

  const firstError = categoriesRes.error || coursesRes.error || modulesRes.error || lessonsRes.error;
  if (firstError) {
    throw firstError;
  }

  const moduleRows = modulesRes.data || [];
  const lessonRows = lessonsRes.data || [];

  return {
    categories: (categoriesRes.data || [])
      .map(mapCategory)
      .sort((a, b) => categorySortRank(a.id) - categorySortRank(b.id) || a.title.localeCompare(b.title)),
    courses: (coursesRes.data || []).map((row) => mapCourse(row, moduleRows, lessonRows))
  };
}

export async function upsertCategory(payload) {
  const row = {
    title: payload.title.trim(),
    subtitle: payload.subtitle || null,
    description: payload.description || null,
    icon: payload.icon || 'book',
    color: payload.color || '#F26BB5',
    status: payload.status || 'draft'
  };

  const data = await saveRow('categories', payload.id, row, payload.title, 'cat');
  return mapCategory(data);
}

export async function removeCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertCourse(payload) {
  const row = {
    category_id: payload.categoryId,
    title: payload.title.trim(),
    short_title: payload.shortTitle || payload.title.trim(),
    description: payload.description || null,
    icon: payload.icon || 'book',
    color: payload.color || '#F26BB5',
    image_url: payload.imageUrl || null,
    level: payload.level || 'All levels',
    equipment: payload.equipment || 'None',
    status: payload.status || 'draft',
    disclaimer: payload.disclaimer || null,
    sort_order: payload.sortOrder ?? 0
  };

  const data = await saveRow('courses', payload.id, row, payload.title, 'course');
  return mapCourse(data, [], []);
}

export async function removeCourse(id) {
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadCourseImage(courseId, file) {
  return uploadThumbnail(`courses/${courseId || 'new'}`, file);
}

export async function upsertModule(courseId, payload) {
  const row = {
    course_id: courseId,
    title: payload.title.trim(),
    description: payload.description || null,
    sort_order: payload.sortOrder ?? 0
  };

  const data = await saveRow('modules', payload.id, row, `${courseId}-${payload.title}`, 'mod');
  return mapModule(data, []);
}

export async function removeModule(moduleId) {
  const { error } = await supabase.from('modules').delete().eq('id', moduleId);
  if (error) throw error;
}

function clampDurationMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.min(240, Math.round(n)));
}

export function durationMinutesFromVideoFile(file) {
  return new Promise((resolve) => {
    if (!file || typeof URL === 'undefined' || typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const finish = (minutes) => {
      URL.revokeObjectURL(url);
      resolve(minutes);
    };
    video.onloadedmetadata = () => {
      finish(clampDurationMinutes(video.duration / 60));
    };
    video.onerror = () => finish(null);
    video.src = url;
  });
}

export async function upsertLesson(courseId, moduleId, payload) {
  const id = payload.id || newRecordId(`${moduleId}-${payload.title}`, 'lesson');
  const duration = clampDurationMinutes(payload.durationMinutes);

  if (payload.id) {
    const patch = {
      title: payload.title.trim(),
      description: payload.description || null,
      course_id: courseId,
      module_id: moduleId
    };
    // Keep existing duration unless caller explicitly provides one (e.g. video upload).
    if (duration != null) patch.duration_minutes = duration;

    const { data, error } = await supabase.from('lessons').update(patch).eq('id', id).select('*').single();
    if (error) throw error;
    return mapLesson(data);
  }

  const { data, error } = await supabase
    .from('lessons')
    .insert({
      id,
      course_id: courseId,
      module_id: moduleId,
      title: payload.title.trim(),
      description: payload.description || null,
      // Placeholder until video upload/Mux sync fills the real length.
      duration_minutes: duration ?? 1,
      video_status: 'awaiting',
      sort_order: payload.sortOrder ?? 0
    })
    .select('*')
    .single();
  if (error) throw error;
  return mapLesson(data);
}

export async function removeLesson(lessonId) {
  const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
  if (error) throw error;
}

export async function createMuxDirectUpload(lessonId) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('You must be signed in to upload video');

  const { data, error } = await supabase.functions.invoke('mux-create-upload', {
    body: { lessonId },
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  if (!data?.uploadUrl) throw new Error('Mux did not return an upload URL');
  return data;
}

export async function putFileToMuxUpload(uploadUrl, file, onProgress) {
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Mux upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Network error while uploading to Mux'));
    xhr.send(file);
  });
}

export async function setLessonVideoStatus(lessonId, videoStatus, extra = {}) {
  const row = {
    video_status: videoStatus,
    ...extra
  };
  const { data, error } = await supabase.from('lessons').update(row).eq('id', lessonId).select('*').single();
  if (error) throw error;
  return mapLesson(data);
}

export async function uploadLessonVideo(lessonId, file, onProgress) {
  const { uploadUrl, uploadId } = await createMuxDirectUpload(lessonId);
  await putFileToMuxUpload(uploadUrl, file, onProgress);
  const durationMinutes = await durationMinutesFromVideoFile(file);
  const processing = await setLessonVideoStatus(lessonId, 'processing', {
    mux_upload_id: uploadId,
    upload_key: `mux://${uploadId}`,
    ...(durationMinutes != null ? { duration_minutes: durationMinutes } : {})
  });
  try {
    return await syncLessonVideoStatus(lessonId);
  } catch (err) {
    // The upload itself succeeded; Mux status sync is best-effort and retried on the next catalog refresh.
    console.warn('[uploadLessonVideo] status sync failed:', err?.message || err);
    return processing;
  }
}

export async function syncLessonVideoStatus(lessonId) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('You must be signed in to sync video status');

  const { data, error } = await supabase.functions.invoke('mux-sync-status', {
    body: lessonId ? { lessonId } : {},
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  if (lessonId) {
    const { data: row, error: rowError } = await supabase.from('lessons').select('*').eq('id', lessonId).single();
    if (rowError) throw rowError;
    return mapLesson(row);
  }

  return data;
}

export async function syncProcessingLessonVideos() {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { ok: false };

  const { data, error } = await supabase.functions.invoke('mux-sync-status', {
    body: {},
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function uploadLessonThumbnail(lessonId, file) {
  const publicUrl = await uploadThumbnail(`lesson-thumbs/${lessonId || 'new'}`, file);
  return setLessonThumbnailUrl(lessonId, publicUrl);
}

export async function setLessonThumbnailUrl(lessonId, thumbnailUrl) {
  const { data, error } = await supabase
    .from('lessons')
    .update({ thumbnail_url: thumbnailUrl || null })
    .eq('id', lessonId)
    .select('*')
    .single();

  if (error) throw error;
  return mapLesson(data);
}
