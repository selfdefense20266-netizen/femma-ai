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

/** Load the single best admin plan + level-filtered day items for this member/profile. */
export async function fetchResolvedDailyPlan(
  profile: PlanProfile & { dailyPlanId?: string },
  memberIdOrEmail?: string | null
): Promise<DailyPlan | null> {
  const [metas, assignedPlanId] = await Promise.all([
    fetchPublishedPlanMetas(),
    fetchMemberDailyPlanId(memberIdOrEmail),
  ]);

  const preferredId = assignedPlanId || profile.dailyPlanId || null;
  const meta = resolveDailyPlanMeta(metas, profile, preferredId);
  if (!meta) return null;

  const intensity = intensityFromProfile(profile.fitnessLevel);
  const allItems = await fetchPlanItems(meta.id);
  const levelItems = allItems.filter((item) => item.intensityLevel === intensity);
  // Fallback: if admin only filled beginner, still show something
  const items = levelItems.length ? levelItems : allItems.filter((item) => item.intensityLevel === 'beginner');
  const resolvedItems = (items.length ? items : allItems).slice().sort((a, b) => {
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

export function itemMetaLine(item: DailyPlanItem): string {
  const parts = [
    item.scheduledTime || null,
    item.durationMinutes > 0 ? `${item.durationMinutes} Mins` : null,
    item.restMinutes > 0 ? `${item.restMinutes} min rest` : null,
    item.subtitle || null,
  ].filter(Boolean);
  return parts.join(' • ');
}
