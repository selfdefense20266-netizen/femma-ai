import { supabase } from 'lib/supabase';
import { uploadThumbnail } from 'api/uploadThumbnail';

function slugify(text, fallbackPrefix = 'daily-plan') {
  const base = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || `${fallbackPrefix}-${Date.now().toString(36)}`;
}

export const USER_TYPE_OPTIONS = [
  { id: 'yoga', label: 'Yoga' },
  { id: 'flexibility', label: 'Flexibility' },
  { id: 'pilates', label: 'Pilates' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'mma', label: 'MMA' },
  { id: 'self-defense', label: 'Self defense' },
  { id: 'weight-loss', label: 'Weight loss' },
  { id: 'muscle', label: 'Muscle' },
  { id: 'hiit', label: 'HIIT' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'pregnancy', label: 'Pregnancy' },
  { id: 'postpartum', label: 'Postpartum' },
  { id: 'stress', label: 'Stress relief' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'general', label: 'General fitness' }
];

export const INTENSITY_OPTIONS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'active', label: 'Active' }
];

export const DURATION_DAY_PRESETS = [7, 14, 21, 30];

export const ITEM_TYPE_OPTIONS = [{ id: 'exercise', label: 'Exercise' }];

export const RECOVERY_TYPE_OPTIONS = [
  { id: 'full-body', label: 'Full body stretch' },
  { id: 'upper-body', label: 'Upper body stretch' },
  { id: 'lower-body', label: 'Lower body stretch' },
  { id: 'breath', label: 'Breath & calm' }
];

export function clampDurationDays(days) {
  const n = Number(days);
  if (!Number.isFinite(n)) return 30;
  return Math.min(30, Math.max(1, Math.round(n)));
}

function mapItem(row) {
  return {
    id: row.id,
    planId: row.plan_id,
    libraryId: row.library_id || '',
    dayNumber: Math.max(1, Number(row.day_number ?? 1)),
    intensityLevel: row.intensity_level || 'beginner',
    recoveryType: row.recovery_type || '',
    itemType: row.item_type,
    title: row.title,
    tag: row.tag || '',
    subtitle: row.subtitle || '',
    scheduledTime: row.scheduled_time || '',
    durationMinutes: Number(row.duration_minutes ?? 10),
    restMinutes: Number(row.rest_minutes ?? 0),
    mediaUrl: row.media_url || '',
    cue: row.cue || '',
    steps: Array.isArray(row.steps) ? row.steps : [],
    sortOrder: row.sort_order ?? 0
  };
}

export function mapLibraryItem(row) {
  return {
    id: row.id,
    title: row.title,
    itemType: row.item_type || 'exercise',
    tag: row.tag || '',
    subtitle: row.subtitle || '',
    durationMinutes: Number(row.duration_minutes ?? 10),
    restMinutes: Number(row.rest_minutes ?? 0),
    mediaUrl: row.media_url || '',
    cue: row.cue || '',
    steps: Array.isArray(row.steps) ? row.steps : [],
    status: row.status || 'published',
    sortOrder: row.sort_order ?? 0
  };
}

export function mapDailyPlan(row, itemRows = []) {
  const items = itemRows
    .filter((item) => item.plan_id === row.id)
    .sort((a, b) => {
      const dayDiff = (a.day_number ?? 1) - (b.day_number ?? 1);
      if (dayDiff !== 0) return dayDiff;
      const levelOrder = { beginner: 0, intermediate: 1, active: 2 };
      const levelDiff = (levelOrder[a.intensity_level] ?? 0) - (levelOrder[b.intensity_level] ?? 0);
      if (levelDiff !== 0) return levelDiff;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    })
    .map(mapItem);

  const durationDays = clampDurationDays(row.duration_days ?? 30);

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    userType: row.user_type || 'general',
    status: row.status || 'draft',
    sortOrder: row.sort_order ?? 0,
    durationDays,
    items
  };
}

export async function fetchExerciseLibrary() {
  const { data, error } = await supabase
    .from('exercise_library')
    .select('*')
    .order('sort_order', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapLibraryItem);
}

export async function upsertExerciseLibraryItem(payload) {
  const id = payload.id || `${slugify(payload.title, 'lib')}-${Date.now().toString(36)}`;
  const row = {
    id,
    title: String(payload.title || '').trim(),
    item_type: payload.itemType || 'exercise',
    tag: payload.tag || '',
    subtitle: payload.subtitle || '',
    duration_minutes: Number(payload.durationMinutes ?? 10),
    rest_minutes: Number(payload.restMinutes ?? 0),
    media_url: payload.mediaUrl || null,
    cue: payload.cue || '',
    steps: Array.isArray(payload.steps) ? payload.steps : [],
    status: payload.status || 'published',
    sort_order: (() => {
      const n = Number(payload.sortOrder);
      if (Number.isFinite(n) && n >= 0 && n <= 2147483647) return Math.trunc(n);
      return Math.floor(Date.now() / 1000);
    })()
  };
  const { data, error } = await supabase.from('exercise_library').upsert(row).select('*').single();
  if (error) throw error;
  return mapLibraryItem(data);
}

export async function removeExerciseLibraryItem(id) {
  const { error } = await supabase.from('exercise_library').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchDailyPlans() {
  const [plansRes, itemsRes] = await Promise.all([
    supabase.from('daily_plans').select('*').order('sort_order'),
    supabase.from('daily_plan_items').select('*').order('day_number').order('sort_order')
  ]);

  const firstError = plansRes.error || itemsRes.error;
  if (firstError) throw firstError;

  const itemRows = itemsRes.data || [];
  return (plansRes.data || []).map((row) => mapDailyPlan(row, itemRows));
}

export async function upsertDailyPlan(payload) {
  const id = payload.id || slugify(payload.title);
  const durationDays = clampDurationDays(payload.durationDays ?? 30);
  const allowedIntensity = new Set(['beginner', 'intermediate', 'active']);

  const planRow = {
    id,
    title: String(payload.title || '').trim(),
    description: payload.description || '',
    user_type: payload.userType || 'general',
    status: payload.status || 'draft',
    sort_order: payload.sortOrder ?? 0,
    plan_months: 1,
    intensity_level: 'beginner',
    session_minutes: 20,
    duration_days: durationDays
  };

  const { data, error } = await supabase.from('daily_plans').upsert(planRow).select('*').single();
  if (error) throw error;

  const { error: deleteError } = await supabase.from('daily_plan_items').delete().eq('plan_id', id);
  if (deleteError) throw deleteError;

  const items = Array.isArray(payload.items) ? payload.items : [];
  let savedItemRows = [];
  const allowedRecovery = new Set(['full-body', 'upper-body', 'lower-body', 'breath']);

  if (items.length) {
    const itemRows = items
      .filter((item) => Number(item.dayNumber || 1) <= durationDays)
      .map((item, index) => {
        const itemType = item.itemType || 'exercise';
        const recoveryType =
          itemType === 'recovery' && allowedRecovery.has(item.recoveryType) ? item.recoveryType : null;
        return {
          id: item.id || `${id}-d${item.dayNumber || 1}-${item.intensityLevel || 'beginner'}-${index}-${Date.now().toString(36)}`,
          plan_id: id,
          day_number: Math.max(1, Number(item.dayNumber ?? 1)),
          intensity_level: allowedIntensity.has(item.intensityLevel) ? item.intensityLevel : 'beginner',
          recovery_type: recoveryType,
          item_type: itemType,
          title: String(item.title || '').trim() || `Item ${index + 1}`,
          tag: item.tag || '',
          subtitle: item.subtitle || '',
          scheduled_time: item.scheduledTime || '',
          duration_minutes: Math.max(1, Number(item.durationMinutes ?? 10)),
          rest_minutes: Number(item.restMinutes ?? 0),
          media_url: item.mediaUrl || null,
          cue: item.cue || '',
          steps: Array.isArray(item.steps) ? item.steps : [],
          sort_order: item.sortOrder ?? index
        };
      });

    if (itemRows.length) {
      const { data: inserted, error: insertError } = await supabase.from('daily_plan_items').insert(itemRows).select('*');
      if (insertError) throw insertError;
      savedItemRows = inserted || itemRows;
    }
  }

  return mapDailyPlan(data, savedItemRows);
}

export async function removeDailyPlan(id) {
  const { error } = await supabase.from('daily_plans').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadDailyPlanMedia(planId, file) {
  return uploadThumbnail(`daily-plans/${planId || 'new'}`, file);
}

export async function assignMemberDailyPlan(memberId, planId) {
  const { data, error } = await supabase
    .from('members')
    .update({ daily_plan_id: planId || null, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
