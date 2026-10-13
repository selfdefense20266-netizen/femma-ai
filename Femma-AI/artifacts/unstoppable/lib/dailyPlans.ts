import { supabase } from '@/lib/supabase';
import { detectFocus } from '@/lib/dailyMissions';
import type { UserProfile } from '@/context/AppContext';

export type DailyPlanItemType = 'exercise' | 'rest' | 'recovery' | 'food';

export type DailyPlanIntensity = 'beginner' | 'intermediate' | 'active';

export type RecoveryType = 'full-body' | 'upper-body' | 'lower-body' | 'breath';

export type DailyPlanItem = {
  id: string;
  planId: string;
  dayNumber: number;
  intensityLevel: DailyPlanIntensity;
  recoveryType: RecoveryType | '';
  itemType: DailyPlanItemType;
  title: string;
  tag: string;
  subtitle: string;
  scheduledTime: string;
  durationMinutes: number;
  restMinutes: number;
  mediaUrl: string | null;
  cue: string;
  steps: string[];
  sortOrder: number;
};

export type DailyPlan = {
  id: string;
  title: string;
  description: string;
  userType: string;
  status: string;
  sortOrder: number;
  durationDays: number;
  items: DailyPlanItem[];
};

type PlanProfile = Pick<UserProfile, 'goal' | 'isPregnant' | 'fitnessLevel'>;

function mapItem(row: any): DailyPlanItem {
  const raw = String(row.intensity_level || 'beginner').toLowerCase();
  const intensityLevel: DailyPlanIntensity =
    raw === 'active' || raw === 'advanced' ? 'active' : raw === 'intermediate' ? 'intermediate' : 'beginner';

  return {
    id: row.id,
    planId: row.plan_id,
    dayNumber: Math.max(1, Number(row.day_number ?? 1)),
    intensityLevel,
    recoveryType: (['full-body', 'upper-body', 'lower-body', 'breath'].includes(String(row.recovery_type || ''))
      ? row.recovery_type
      : '') as DailyPlanItem['recoveryType'],
    itemType: row.item_type,
    title: row.title,
    tag: row.tag || '',
    subtitle: row.subtitle || '',
    scheduledTime: row.scheduled_time || '',
    durationMinutes: Number(row.duration_minutes ?? 10),
    restMinutes: Number(row.rest_minutes ?? 0),
    mediaUrl: row.media_url || null,
    cue: row.cue || '',
    steps: Array.isArray(row.steps) ? row.steps : [],
    sortOrder: row.sort_order ?? 0,
  };
}

function mapPlanMeta(row: any): Omit<DailyPlan, 'items'> {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    userType: row.user_type || 'general',
    status: row.status || 'draft',
    sortOrder: row.sort_order ?? 0,
    durationDays: Math.min(30, Math.max(1, Number(row.duration_days ?? 30))),
  };
}

/** Map onboarding level label/id → admin intensity_level */
export function intensityFromProfile(fitnessLevel?: string): DailyPlanIntensity {
  const v = String(fitnessLevel || '').toLowerCase();
  if (v.includes('active') || v.includes('advanced')) return 'active';
  if (v.includes('intermediate')) return 'intermediate';
  return 'beginner';
}

/** Map app focus → daily_plans.user_type */
export function userTypeFromProfile(profile: PlanProfile): string {
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  const map: Record<string, string> = {
    boxing: 'boxing',
    mma: 'mma',
    karate: 'self-defense',
    taekwondo: 'self-defense',
    'jiu-jitsu': 'self-defense',
    'self-defense': 'self-defense',
    'weight-loss': 'weight-loss',
    muscle: 'muscle',
    tone: 'muscle',
    yoga: 'yoga',
    flexibility: 'flexibility',
    pilates: 'pilates',
    hiit: 'hiit',
    cardio: 'cardio',
    pregnancy: 'pregnancy',
    postpartum: 'postpartum',
    stress: 'stress',
    confidence: 'general',
    general: 'general',
  };
  return map[focus] || 'general';
}

export async function fetchMemberDailyPlanId(memberIdOrEmail?: string | null): Promise<string | null> {
  if (!memberIdOrEmail) return null;
  const key = String(memberIdOrEmail).trim();
  if (!key) return null;

  // Prefer email lookup — app AuthUser has email, not always member id.
  if (key.includes('@')) {
    const { data, error } = await supabase
      .from('members')
      .select('daily_plan_id')
      .eq('email', key.toLowerCase())
      .maybeSingle();
    if (error) {
      if (/daily_plan_id|column|schema cache/i.test(error.message || '')) return null;
      throw error;
    }
    return data?.daily_plan_id || null;
  }

  const { data, error } = await supabase.from('members').select('daily_plan_id').eq('id', key).maybeSingle();
  if (error) {
    if (/daily_plan_id|column|schema cache/i.test(error.message || '')) return null;
    throw error;
  }
  return data?.daily_plan_id || null;
}

export async function assignMemberDailyPlan(
  email: string | null | undefined,
  planId: string | null | undefined
): Promise<boolean> {
  const normalized = String(email || '')
    .trim()
    .toLowerCase();
  const id = String(planId || '').trim();
  if (!normalized || !id) return false;
  const { error } = await supabase.from('members').update({ daily_plan_id: id }).eq('email', normalized);
  if (error) {
    if (/daily_plan_id|column|schema cache/i.test(error.message || '')) return false;
    console.warn('assignMemberDailyPlan failed', error.message);
    return false;
  }
  return true;
}

async function fetchPlanItems(planId: string): Promise<DailyPlanItem[]> {
  const { data, error } = await supabase
    .from('daily_plan_items')
    .select('*')
    .eq('plan_id', planId)
    .order('day_number')
    .order('sort_order')
    .limit(5000);

  if (error) {
    if (/relation|does not exist|schema cache/i.test(error.message || '')) return [];
    throw error;
  }
  return (data || []).map(mapItem);
}

async function fetchPublishedPlanMetas(): Promise<Omit<DailyPlan, 'items'>[]> {
  const { data, error } = await supabase
    .from('daily_plans')
    .select('id,title,description,user_type,status,sort_order,duration_days')
    .eq('status', 'published')
    .order('sort_order')
    .limit(500);

  if (error) {
    if (/relation|does not exist|schema cache/i.test(error.message || '')) return [];
    throw error;
  }
  return (data || []).map(mapPlanMeta);
}

/** Admin-assigned plans must load even if not in the published auto-match list. */
async function fetchPlanMetaById(planId: string): Promise<Omit<DailyPlan, 'items'> | null> {
  const id = String(planId || '').trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from('daily_plans')
    .select('id,title,description,user_type,status,sort_order,duration_days')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    if (/relation|does not exist|schema cache/i.test(error.message || '')) return null;
    throw error;
  }
  return data ? mapPlanMeta(data) : null;
}

function scorePlan(plan: Omit<DailyPlan, 'items'>, userType: string): number {
  let score = 0;
  if (plan.userType === userType) score += 100;
  else if (plan.userType === 'general' && (userType === 'general' || userType === 'all')) score += 50;
  else if (plan.userType === 'all') score += 40;
  else return -1;
  return score;
}

export function resolveDailyPlanMeta(
  plans: Omit<DailyPlan, 'items'>[],
  profile: PlanProfile,
  assignedPlanId?: string | null
): Omit<DailyPlan, 'items'> | null {
  if (!plans.length) return null;

  if (assignedPlanId) {
    const assigned = plans.find((plan) => plan.id === assignedPlanId);
    if (assigned) return assigned;
  }

  const userType = userTypeFromProfile(profile);

  let best: Omit<DailyPlan, 'items'> | null = null;
  let bestScore = -1;
  for (const plan of plans) {
    const s = scorePlan(plan, userType);
    if (s > bestScore) {
      bestScore = s;
      best = plan;
    }
  }

  // Never silently attach a mismatched activity plan (e.g. boxing for a yoga user).
  if (best && bestScore >= 100) return best;
  const general = plans.find((p) => p.userType === 'general' || p.userType === 'all');
  return general || null;
}

/** Load the admin-assigned plan (or auto-match) + level-filtered day items. */
export async function fetchResolvedDailyPlan(
  profile: PlanProfile & { dailyPlanId?: string },
  memberIdOrEmail?: string | null
): Promise<DailyPlan | null> {
  const [metas, assignedPlanId] = await Promise.all([
    fetchPublishedPlanMetas(),
    fetchMemberDailyPlanId(memberIdOrEmail),
  ]);

  // members.daily_plan_id from admin always wins over local/profile fallback.
  const preferredId = assignedPlanId || profile.dailyPlanId || null;

  let meta: Omit<DailyPlan, 'items'> | null = null;
  if (preferredId) {
    meta = metas.find((plan) => plan.id === preferredId) || null;
    if (!meta) {
      meta = await fetchPlanMetaById(preferredId);
    }
  }
  if (!meta) {
    meta = resolveDailyPlanMeta(metas, profile, null);
  }
  if (!meta) return null;

  // Beginner / Intermediate / Active comes from the member's onboarding level.
  // Workouts stay level-filtered. Meals keep every intensity so food filters
  // (food style / height / weight) can pick the right plate in the Food screen.
  const intensity = intensityFromProfile(profile.fitnessLevel);
  const allItems = await fetchPlanItems(meta.id);
  const foodItems = allItems.filter((item) => item.itemType === 'food');
  const otherItems = allItems.filter((item) => item.itemType !== 'food');
  const levelOthers = otherItems.filter((item) => item.intensityLevel === intensity);
  const others =
    levelOthers.length > 0
      ? levelOthers
      : otherItems.filter((item) => item.intensityLevel === 'beginner');
  const resolvedOthers = others.length ? others : otherItems;
  const resolvedItems = [...resolvedOthers, ...foodItems].slice().sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.title.localeCompare(b.title);
  });

  return { ...meta, items: resolvedItems };
}

/** @deprecated prefer fetchResolvedDailyPlan — kept for callers that need the list */
export async function fetchPublishedDailyPlans(): Promise<DailyPlan[]> {
  const metas = await fetchPublishedPlanMetas();
  const top = metas.slice(0, 20);
  const results: DailyPlan[] = [];
  for (const meta of top) {
    const items = await fetchPlanItems(meta.id);
    results.push({ ...meta, items });
  }
  return results;
}

export function resolveDailyPlan(
  plans: DailyPlan[],
  profile: PlanProfile,
  assignedPlanId?: string | null
): DailyPlan | null {
  const meta = resolveDailyPlanMeta(plans, profile, assignedPlanId);
  if (!meta) return null;
  return plans.find((p) => p.id === meta.id) || null;
}

export function itemsForDay(
  plan: DailyPlan | null | undefined,
  journeyDay = 1,
  types?: DailyPlanItemType[]
): DailyPlanItem[] {
  if (!plan?.items?.length) return [];
  const duration = Math.max(1, plan.durationDays || 7);
  const dayNumber = ((Math.max(1, journeyDay) - 1) % duration) + 1;
  const dayItems = plan.items.filter((item) => Number(item.dayNumber || 1) === dayNumber);
  const source = dayItems.length ? dayItems : plan.items.filter((item) => Number(item.dayNumber || 1) === 1);
  const filtered = !types?.length ? source : source.filter((item) => types.includes(item.itemType));
  return filtered.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

export function itemsOfType(plan: DailyPlan | null | undefined, types: DailyPlanItemType[]): DailyPlanItem[] {
  if (!plan?.items?.length) return [];
  return plan.items.filter((item) => types.includes(item.itemType));
}

/** Recovery stretch pool for a type + user level (shared across days). */
export function recoveryItemsForType(
  plan: DailyPlan | null | undefined,
  recoveryType: string,
  intensity: DailyPlanIntensity = 'beginner'
): DailyPlanItem[] {
  if (!plan?.items?.length || !recoveryType) return [];
  const matched = plan.items.filter(
    (item) =>
      item.itemType === 'recovery' &&
      item.recoveryType === recoveryType &&
      item.intensityLevel === intensity
  );
  if (matched.length) return matched.sort((a, b) => a.sortOrder - b.sortOrder);
  // Fallback: any level for that type
  return plan.items
    .filter((item) => item.itemType === 'recovery' && item.recoveryType === recoveryType)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Format a duration stored in SECONDS (daily_plan_items.duration_minutes holds seconds). */
export function formatDurationSeconds(seconds: number): string | null {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s <= 0) return null;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem ? `${m} min ${rem}s` : `${m} min`;
}

export function itemMetaLine(item: DailyPlanItem): string {
  const format = formatDurationSeconds;
  const parts = [
    item.scheduledTime || null,
    item.durationMinutes > 0 ? format(item.durationMinutes) : null,
    item.restMinutes > 0 ? `${format(item.restMinutes)} rest` : null,
    stripMealAudience(item.subtitle) || null,
  ].filter(Boolean);
  return parts.join(' • ');
}

const AUDIENCE_PREFIX = 'AUDIENCE:';

export type MealAudience = {
  food: string;
  foods: string[];
  heightMin: number | null;
  heightMax: number | null;
  weightMin: number | null;
  weightMax: number | null;
};

function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeFoods(data: { food?: string; foods?: string[] }): string[] {
  const list = Array.isArray(data.foods) ? data.foods : data.food ? [data.food] : ['Eat everything'];
  const cleaned = [...new Set(list.map((f) => String(f || '').trim()).filter(Boolean))];
  return cleaned.length ? cleaned : ['Eat everything'];
}

/**
 * Locate the `AUDIENCE:{...}` JSON block in a subtitle using brace matching that
 * respects JSON strings (so `}` inside a string value doesn't end the object early).
 */
function findAudienceBlock(raw: string): { start: number; end: number; json: string } | null {
  const idx = raw.indexOf(AUDIENCE_PREFIX);
  if (idx < 0) return null;
  let i = idx + AUDIENCE_PREFIX.length;
  while (i < raw.length && /\s/.test(raw[i])) i += 1;
  if (raw[i] !== '{') return null;
  const objStart = i;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (; i < raw.length; i += 1) {
    const ch = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { start: idx, end: i + 1, json: raw.slice(objStart, i + 1) };
      }
    }
  }
  return null;
}

export function parseMealAudience(text?: string | null): MealAudience | null {
  const block = findAudienceBlock(String(text || ''));
  if (!block) return null;
  try {
    const data = JSON.parse(block.json);
    if (!data || typeof data !== 'object') return null;
    const foods = normalizeFoods(data);
    return {
      food: foods[0],
      foods,
      heightMin: numOrNull(data.heightMin),
      heightMax: numOrNull(data.heightMax),
      weightMin: numOrNull(data.weightMin),
      weightMax: numOrNull(data.weightMax),
    };
  } catch {
    return null;
  }
}

export function stripMealAudience(text?: string | null): string {
  const raw = String(text || '');
  if (!raw.includes(AUDIENCE_PREFIX)) return raw.trim();
  let out = raw;
  // Remove every AUDIENCE block (normally only one).
  for (let guard = 0; guard < 5; guard += 1) {
    const block = findAudienceBlock(out);
    if (!block) break;
    out = out.slice(0, block.start) + out.slice(block.end);
  }
  // Malformed/unterminated block: drop everything from the marker on.
  const leftover = out.indexOf(AUDIENCE_PREFIX);
  if (leftover >= 0) out = out.slice(0, leftover);
  return out.replace(/\s+/g, ' ').trim();
}

/** Score how well a meal audience matches the member (higher = better). -1 = hard miss. */
export function scoreMealAudience(
  audience: MealAudience | null,
  profile: { foodPreference?: string; heightCm?: number; weightKg?: number }
): number {
  if (!audience) return 1; // legacy meals without targeting still show
  let score = 10;
  const food = String(profile.foodPreference || 'Eat everything').trim().toLowerCase();
  const targetFoods = (audience.foods?.length ? audience.foods : [audience.food || 'Eat everything']).map((f) =>
    String(f || '').trim().toLowerCase()
  );
  const targetsAny = targetFoods.includes('eat everything') || targetFoods.length === 0;
  if (targetsAny) {
    score += 5;
  } else if (targetFoods.includes(food)) {
    score += 50;
  } else if (food === 'eat everything' || !food) {
    score += 5;
  } else {
    return -1;
  }
  const height = Number(profile.heightCm) || 0;
  if (audience.heightMin != null || audience.heightMax != null) {
    if (height > 0) {
      if (audience.heightMin != null && height < audience.heightMin) return -1;
      if (audience.heightMax != null && height > audience.heightMax) return -1;
      score += 30;
    }
  }
  const weight = Number(profile.weightKg) || 0;
  if (audience.weightMin != null || audience.weightMax != null) {
    if (weight > 0) {
      if (audience.weightMin != null && weight < audience.weightMin) return -1;
      if (audience.weightMax != null && weight > audience.weightMax) return -1;
      score += 25;
    }
  }
  return score;
}

function scoreFoodStyleOnly(
  audience: MealAudience | null,
  profile: { foodPreference?: string }
): number {
  if (!audience) return 1;
  const food = String(profile.foodPreference || 'Eat everything').trim().toLowerCase();
  const targetFoods = (audience.foods?.length ? audience.foods : [audience.food || 'Eat everything']).map((f) =>
    String(f || '').trim().toLowerCase()
  );
  if (targetFoods.includes('eat everything') || !targetFoods.length) return 5;
  if (targetFoods.includes(food)) return 50;
  if (food === 'eat everything' || !food) return 5;
  return -1;
}

/** Prefer meals targeted to this member’s food / height / weight. */
export function pickFoodForProfile(
  items: DailyPlanItem[],
  profile: { foodPreference?: string; heightCm?: number; weightKg?: number; fitnessLevel?: string }
): DailyPlanItem[] {
  if (!items.length) return [];
  const level = intensityFromProfile(profile.fitnessLevel);
  const levelPreferred = items.filter((item) => !item.intensityLevel || item.intensityLevel === level);
  const pool = levelPreferred.length ? levelPreferred : items;

  const scored = pool
    .map((item) => ({ item, score: scoreMealAudience(parseMealAudience(item.subtitle), profile) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length) {
    const best = scored[0].score;
    return scored.filter((row) => row.score === best).map((row) => row.item);
  }

  // Soft fallback: food style only (ignore height/weight hard misses)
  const soft = pool
    .map((item) => ({ item, score: scoreFoodStyleOnly(parseMealAudience(item.subtitle), profile) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score);
  if (soft.length) {
    const best = soft[0].score;
    return soft.filter((row) => row.score === best).map((row) => row.item);
  }

  return pool;
}

export type MealSlotKey = 'breakfast' | 'lunch' | 'dinner';

function slotFromText(text: string): MealSlotKey | null {
  const blob = text.toLowerCase();
  if (!blob.trim()) return null;
  if (/breakfast|morning/.test(blob)) return 'breakfast';
  if (/lunch|midday|noon/.test(blob)) return 'lunch';
  if (/dinner|evening|supper|night/.test(blob)) return 'dinner';
  return null;
}

/** Explicit slot (tag, then scheduled time) wins over keywords in the meal title. */
export function mealSlotFromItem(item: DailyPlanItem): MealSlotKey | null {
  return (
    slotFromText(String(item.tag || '')) ||
    slotFromText(String(item.scheduledTime || '')) ||
    slotFromText(String(item.title || ''))
  );
}

/** Split admin food items into breakfast/lunch/dinner using audience filters. */
export function foodBySlotForProfile(
  plan: DailyPlan | null | undefined,
  journeyDay: number,
  profile: { foodPreference?: string; heightCm?: number; weightKg?: number; fitnessLevel?: string }
): Record<MealSlotKey, DailyPlanItem[]> {
  const empty: Record<MealSlotKey, DailyPlanItem[]> = { breakfast: [], lunch: [], dinner: [] };
  if (!plan?.items?.length) return empty;

  const allFood = (plan.items || []).filter((i) => i.itemType === 'food');
  if (!allFood.length) return empty;

  const dayFoodRaw = itemsForDay(plan, journeyDay, ['food']);
  const dayPool = dayFoodRaw.length ? dayFoodRaw : allFood.filter((i) => Number(i.dayNumber) === 1);
  const dayMatched = pickFoodForProfile(dayPool, profile);

  const buckets: Record<MealSlotKey, DailyPlanItem[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
  };
  const untagged: DailyPlanItem[] = [];

  for (const item of dayMatched) {
    const slot = mealSlotFromItem(item);
    if (slot) buckets[slot].push(item);
    else untagged.push(item);
  }

  const order: MealSlotKey[] = ['breakfast', 'lunch', 'dinner'];
  let u = 0;
  for (const slot of order) {
    if (!buckets[slot].length && untagged[u]) {
      buckets[slot].push(untagged[u]);
      u += 1;
    }
  }

  // If a slot is still empty, fill only from THIS day's same-slot food, ignoring
  // body (height/weight) filters. Meals from other days are never mixed in —
  // callers fall back to their own generated plan when a slot stays empty.
  for (const slot of order) {
    if (buckets[slot].length) continue;
    const sameSlot = dayPool.filter((item) => mealSlotFromItem(item) === slot);
    if (!sameSlot.length) continue;
    const soft = pickFoodForProfile(sameSlot, { foodPreference: profile.foodPreference, fitnessLevel: profile.fitnessLevel });
    buckets[slot] = soft.length ? soft : sameSlot;
  }

  return buckets;
}
