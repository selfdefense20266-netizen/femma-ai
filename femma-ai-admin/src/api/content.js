import { supabase } from 'lib/supabase';

function slugify(text, fallbackPrefix = 'item') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `${fallbackPrefix}-${Date.now().toString(36)}`;
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
    level: row.level || 'All levels',
    equipment: row.equipment || 'None',
    status: row.status || 'draft',
    disclaimer: row.disclaimer || '',
    sortOrder: row.sort_order ?? 0,
    modules
  };
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
    categories: (categoriesRes.data || []).map(mapCategory),
    courses: (coursesRes.data || []).map((row) => mapCourse(row, moduleRows, lessonRows))
  };
}

export async function upsertCategory(payload) {
  const id = payload.id || slugify(payload.title, 'cat');
  const row = {
    id,
    title: payload.title.trim(),
    subtitle: payload.subtitle || null,
    description: payload.description || null,
    icon: payload.icon || 'book',
    color: payload.color || '#F26BB5',
    status: payload.status || 'draft'
  };

  const { data, error } = await supabase.from('categories').upsert(row).select('*').single();
  if (error) throw error;
  return mapCategory(data);
}

export async function removeCategory(id) {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertCourse(payload) {
  const id = payload.id || slugify(payload.title, 'course');
  const row = {
    id,
    category_id: payload.categoryId,
    title: payload.title.trim(),
    short_title: payload.shortTitle || payload.title.trim(),
    description: payload.description || null,
    icon: payload.icon || 'book',
    color: payload.color || '#F26BB5',
    level: payload.level || 'All levels',
    equipment: payload.equipment || 'None',
    status: payload.status || 'draft',
    disclaimer: payload.disclaimer || null,
    sort_order: payload.sortOrder ?? 0
  };

  const { data, error } = await supabase.from('courses').upsert(row).select('*').single();
  if (error) throw error;
  return mapCourse(data, [], []);
}

export async function removeCourse(id) {
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (error) throw error;
}

export async function upsertModule(courseId, payload) {
  const id = payload.id || slugify(`${courseId}-${payload.title}`, 'mod');
  const row = {
    id,
    course_id: courseId,
    title: payload.title.trim(),
    description: payload.description || null,
    sort_order: payload.sortOrder ?? 0
  };

  const { data, error } = await supabase.from('modules').upsert(row).select('*').single();
  if (error) throw error;
  return mapModule(data, []);
}

export async function removeModule(moduleId) {
  const { error } = await supabase.from('modules').delete().eq('id', moduleId);
  if (error) throw error;
}

export async function upsertLesson(courseId, moduleId, payload) {
  const id = payload.id || slugify(`${moduleId}-${payload.title}`, 'lesson');
  const duration = Math.max(1, Math.min(240, Number(payload.durationMinutes) || 10));

  if (payload.id) {
    const { data, error } = await supabase
      .from('lessons')
      .update({
        title: payload.title.trim(),
        description: payload.description || null,
        duration_minutes: duration,
        course_id: courseId,
        module_id: moduleId
      })
      .eq('id', id)
      .select('*')
      .single();
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
      duration_minutes: duration,
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
  await setLessonVideoStatus(lessonId, 'processing', {
    mux_upload_id: uploadId,
    upload_key: `mux://${uploadId}`
  });
  return syncLessonVideoStatus(lessonId);
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

export async function markLessonMediaUploaded(lessonId) {
  const videoUrl = `https://cdn.fema.ai/mock/${lessonId}.mp4`;
  const thumbnailUrl = `https://cdn.fema.ai/mock/${lessonId}-thumb.jpg`;
  const { data, error } = await supabase
    .from('lessons')
    .update({
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      video_status: 'ready'
    })
    .eq('id', lessonId)
    .select('*')
    .single();
  if (error) throw error;
  return mapLesson(data);
}
