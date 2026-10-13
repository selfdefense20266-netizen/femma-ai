import { supabase } from 'lib/supabase';
import { uploadThumbnail } from 'api/uploadThumbnail';
import { deleteChildrenNotIn } from 'api/childRows';
import { newRecordId } from 'utils/ids';

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

export const ITEM_TYPE_OPTIONS = [
  { id: 'exercise', label: 'Exercise' },
  { id: 'food', label: 'Food / Meal' },
  { id: 'recovery', label: 'Recovery' },
  { id: 'rest', label: 'Rest' }
];

/** Meal slot tags used by the app Today’s meals card (Breakfast / Lunch / Dinner). */
export const MEAL_SLOT_OPTIONS = [
  { id: 'Breakfast', label: 'Breakfast (morning)' },
  { id: 'Lunch', label: 'Lunch' },
  { id: 'Dinner', label: 'Dinner' }
];

/** Food styles from app onboarding (lifestyle). */
export const FOOD_PREFERENCE_OPTIONS = [
  'Eat everything',
  'Vegetarian',
  'Carnivore',
  'Gluten-free',
  'Dairy-free',
  'High protein',
  'Low carb'
];

const AUDIENCE_PREFIX = 'AUDIENCE:';

function numOrNull(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeFoods(audience = {}) {
  const list = Array.isArray(audience.foods)
    ? audience.foods
    : audience.food
      ? [audience.food]
      : ['Eat everything'];
  const cleaned = [...new Set(list.map((f) => String(f || '').trim()).filter(Boolean))];
  return cleaned.length ? cleaned : ['Eat everything'];
}

/** Encode who should see this meal (height cm / weight kg / food styles). Stored on plan item subtitle. */
export function encodeMealAudience(audience = {}) {
  const foods = normalizeFoods(audience);
  const payload = {
    food: foods[0],
    foods,
    heightMin: numOrNull(audience.heightMin),
    heightMax: numOrNull(audience.heightMax),
    weightMin: numOrNull(audience.weightMin),
    weightMax: numOrNull(audience.weightMax)
  };
  return `${AUDIENCE_PREFIX}${JSON.stringify(payload)}`;
}

export function parseMealAudience(text) {
  const raw = String(text || '');
  const idx = raw.indexOf(AUDIENCE_PREFIX);
  if (idx < 0) return null;
  try {
    const json = raw.slice(idx + AUDIENCE_PREFIX.length).trim();
    // Full object parse (supports foods array)
    const data = JSON.parse(json.match(/^\{[\s\S]*\}/)?.[0] || json);
    const foods = normalizeFoods(data);
    return {
      food: foods[0],
      foods,
      heightMin: numOrNull(data.heightMin),
      heightMax: numOrNull(data.heightMax),
      weightMin: numOrNull(data.weightMin),
      weightMax: numOrNull(data.weightMax)
    };
  } catch {
    return null;
  }
}

export function cmFromFtIn(ft, inch = 0) {
  const f = Number(ft);
  const i = Number(inch) || 0;
  if (!Number.isFinite(f)) return null;
  return Math.round((f * 12 + i) * 2.54);
}

export function ftInFromCm(cm) {
  const n = Number(cm);
  if (!Number.isFinite(n) || n <= 0) return { ft: '', inch: '' };
  const totalIn = Math.round(n / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn % 12;
  return { ft, inch };
}

/** @deprecated use cmFromFtIn */
export function cmFromFt(ft) {
  return cmFromFtIn(ft, 0);
}

/** @deprecated use ftInFromCm */
export function ftFromCm(cm) {
  const { ft, inch } = ftInFromCm(cm);
  if (ft === '') return '';
  return Math.round((ft + inch / 12) * 100) / 100;
}

function formatHeightFtRange(minCm, maxCm) {
  const lo = ftInFromCm(minCm);
  const hi = ftInFromCm(maxCm);
  const fmt = (p) => (p.ft === '' ? '?' : `${p.ft}'${p.inch || 0}"`);
  if (minCm == null && maxCm == null) return null;
  return `${fmt(lo)}–${fmt(hi)}`;
}

export function formatMealAudienceLabel(audience) {
  if (!audience) return 'Anyone';
  const parts = [];
  const foods = normalizeFoods(audience);
  if (foods.length) parts.push(foods.join(' + '));
  if (audience.heightMin != null || audience.heightMax != null) {
    parts.push(formatHeightFtRange(audience.heightMin, audience.heightMax) || 'Height');
  }
  if (audience.weightMin != null || audience.weightMax != null) {
    parts.push(`${audience.weightMin ?? '?'}–${audience.weightMax ?? '?'} kg`);
  }
  return parts.join(' · ') || 'Anyone';
}

export function mealSlotKey(item) {
  const blob = `${item?.tag || ''} ${item?.scheduledTime || ''} ${item?.title || ''}`.toLowerCase();
  if (/breakfast|morning/.test(blob)) return 'Breakfast';
  if (/lunch|midday|noon/.test(blob)) return 'Lunch';
  if (/dinner|evening|supper|night/.test(blob)) return 'Dinner';
  return item?.tag || '';
}

export function audienceSignature(audience) {
  const a = audience || {};
  const foods = normalizeFoods(a).slice().sort().join(',');
  return [foods, a.heightMin ?? '', a.heightMax ?? '', a.weightMin ?? '', a.weightMax ?? ''].join('|');
}

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
  const isNew = !payload.id;
  const id = payload.id || newRecordId(payload.title, 'lib');
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
  const query = isNew
    ? supabase.from('exercise_library').insert(row)
    : supabase.from('exercise_library').update(row).eq('id', id);
  const { data, error } = await query.select('*').single();
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

const ALLOWED_INTENSITY = new Set(['beginner', 'intermediate', 'active']);
const ALLOWED_RECOVERY = new Set(['full-body', 'upper-body', 'lower-body', 'breath']);

function toItemRow(planId, item, index, stamp = Date.now().toString(36)) {
  const itemType = item.itemType || 'exercise';
  const recoveryType = itemType === 'recovery' && ALLOWED_RECOVERY.has(item.recoveryType) ? item.recoveryType : null;
  return {
    // Keep stable ids for existing items so saves are in-place upserts.
    id: item.id || `${planId}-d${item.dayNumber || 1}-${item.intensityLevel || 'beginner'}-${index}-${stamp}`,
    plan_id: planId,
    day_number: Math.max(1, Number(item.dayNumber ?? 1)),
    intensity_level: ALLOWED_INTENSITY.has(item.intensityLevel) ? item.intensityLevel : 'beginner',
    recovery_type: recoveryType,
    item_type: itemType,
    title: String(item.title || '').trim() || `Item ${index + 1}`,
    tag: item.tag || '',
    subtitle: item.subtitle || '',
    scheduled_time: item.scheduledTime || '',
    // Stored in SECONDS (column name kept for compatibility).
    duration_minutes: Math.max(1, Math.round(Number(item.durationMinutes ?? 10))),
    rest_minutes: Math.max(0, Math.round(Number(item.restMinutes ?? 0))),
    media_url: item.mediaUrl || null,
    cue: item.cue || '',
    steps: Array.isArray(item.steps) ? item.steps : [],
    sort_order: item.sortOrder ?? index
  };
}

export async function upsertDailyPlan(payload) {
  const isNew = !payload.id;
  const id = payload.id || newRecordId(payload.title, 'daily-plan');
  const durationDays = clampDurationDays(payload.durationDays ?? 30);

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

  const planQuery = isNew
    ? supabase.from('daily_plans').insert(planRow)
    : supabase.from('daily_plans').update(planRow).eq('id', id);
  const { data, error } = await planQuery.select('*').single();
  if (error) throw error;

  const items = Array.isArray(payload.items) ? payload.items : [];
  const stamp = Date.now().toString(36);
  const itemRows = items
    .filter((item) => Number(item.dayNumber || 1) <= durationDays)
    .map((item, index) => toItemRow(id, item, index, stamp));

  // 1) Upsert the new item set first. If this fails, the existing plan items are untouched.
  let savedItemRows = [];
  if (itemRows.length) {
    const { data: upserted, error: upsertError } = await supabase
      .from('daily_plan_items')
      .upsert(itemRows, { onConflict: 'id' })
      .select('*');
    if (upsertError) throw upsertError;
    savedItemRows = upserted || itemRows;
  }

  // 2) Only then remove items that are no longer part of the plan.
  await deleteChildrenNotIn(
    'daily_plan_items',
    'plan_id',
    id,
    'id',
    itemRows.map((r) => r.id)
  );

  return mapDailyPlan(data, savedItemRows);
}

/** Add items to an existing plan without touching its other items. Returns mapped items. */
export async function insertDailyPlanItems(planId, items) {
  if (!items?.length) return [];
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const rows = items.map((item, index) => toItemRow(planId, { ...item, id: item.id || '' }, index, stamp));
  const { data, error } = await supabase.from('daily_plan_items').insert(rows).select('*');
  if (error) throw error;
  return (data || rows).map(mapItem);
}

/** Remove specific items from a plan (only those ids). */
export async function deleteDailyPlanItems(planId, itemIds) {
  const ids = (itemIds || []).filter(Boolean);
  if (!ids.length) return;
  const { error } = await supabase.from('daily_plan_items').delete().eq('plan_id', planId).in('id', ids);
  if (error) throw error;
}

export async function updateDailyPlanDuration(planId, durationDays) {
  const { data, error } = await supabase
    .from('daily_plans')
    .update({ duration_days: clampDurationDays(durationDays) })
    .eq('id', planId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
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
