import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Mission, UserProfile } from '@/context/AppContext';
import {
  asActivityLog,
  earlierIso,
  mergeActivityLogs,
  type ActivityEvent,
} from '@/lib/activityLog';

export type CoachChatHistoryMessage = {
  id: string;
  role: 'user' | 'coach';
  text: string;
  createdAt?: string;
};

export type MemberProgressSnapshot = {
  profile: UserProfile;
  onboardingCompleted: boolean;
  completedLessonIds: string[];
  lessonWatchProgress: Record<string, number>;
  savedCourseIds: string[];
  lastViewedLessonId: string | null;
  missions: Mission[];
  coachChatHistory: CoachChatHistoryMessage[];
  activityLog: ActivityEvent[];
};

type MemberProgressRow = {
  member_id: string;
  profile: UserProfile | Record<string, unknown> | null;
  onboarding_completed: boolean | null;
  completed_lesson_ids: string[] | null;
  lesson_watch_progress: Record<string, number> | null;
  saved_course_ids: string[] | null;
  last_viewed_lesson_id: string | null;
  daily_missions: Mission[] | null;
  coach_chat_history: CoachChatHistoryMessage[] | null;
  updated_at?: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function asWatchMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) out[key] = Math.max(0, Math.min(100, Math.round(n)));
  }
  return out;
}

export function unpackProfileBlob(raw: unknown): { profile: Partial<UserProfile>; activityLog: ActivityEvent[] } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { profile: {}, activityLog: [] };
  }
  const blob = raw as Record<string, unknown>;
  const activityLog = asActivityLog(blob.activityLog);
  const { activityLog: _ignored, ...profile } = blob;
  return { profile: profile as Partial<UserProfile>, activityLog };
}

function packProfileBlob(profile: UserProfile, activityLog: ActivityEvent[]) {
  const plan = profile.trainingPlan;
  const compactPlan = plan
    ? {
        ...plan,
        days:
          plan.generatedBy === 'ai'
            ? []
            : (plan.days || []).map((day) => ({
                ...day,
                items: (day.items || []).map(({ steps: _steps, ...item }) => item),
              })),
      }
    : null;
  return { ...profile, trainingPlan: compactPlan, activityLog };
}

function asCoachHistory(value: unknown): CoachChatHistoryMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const id = String(row.id || '').trim();
      const text = String(row.text || '').trim();
      const role = row.role === 'user' ? 'user' : row.role === 'coach' ? 'coach' : null;
      if (!id || !text || !role) return null;
      return {
        id,
        role,
        text,
        createdAt: typeof row.createdAt === 'string' ? row.createdAt : undefined,
      } satisfies CoachChatHistoryMessage;
    })
    .filter((item): item is CoachChatHistoryMessage => Boolean(item))
    .slice(-100);
}

function mergeCoachHistory(
  local: CoachChatHistoryMessage[],
  remote: CoachChatHistoryMessage[]
): CoachChatHistoryMessage[] {
  if (!remote.length) return local.slice(-100);
  if (!local.length) return remote.slice(-100);

  const byId = new Map<string, CoachChatHistoryMessage>();
  for (const message of [...remote, ...local]) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values())
    .sort((a, b) => {
      const aTime = a.createdAt ? Date.parse(a.createdAt) : 0;
      const bTime = b.createdAt ? Date.parse(b.createdAt) : 0;
      if (aTime !== bTime) return aTime - bTime;
      return a.id.localeCompare(b.id);
    })
    .slice(-100);
}

export async function resolveMemberId(emailHint?: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const { data } = await supabase.auth.getUser();
  const email = (data.user?.email || emailHint || '').toLowerCase();

  if (email) {
    const byEmail = await supabase.from('members').select('id').eq('email', email).maybeSingle();
    if (!byEmail.error && byEmail.data?.id) return byEmail.data.id as string;
  }

  const authId = data.user?.id;
  if (!authId) return null;

  const byId = await supabase.from('members').select('id').eq('id', authId).maybeSingle();
  if (!byId.error && byId.data?.id) return byId.data.id as string;
  return authId;
}

export async function fetchMemberProgress(emailHint?: string): Promise<MemberProgressSnapshot | null> {
  const memberId = await resolveMemberId(emailHint);
  if (!memberId) return null;

  const { data, error } = await supabase
    .from('member_progress')
    .select('*')
    .eq('member_id', memberId)
    .maybeSingle();

  if (error) {
    console.warn('Failed to load member progress', error.message);
    return null;
  }
  if (!data) return null;

  const row = data as MemberProgressRow;
  const unpacked = unpackProfileBlob(row.profile);
  return {
    profile: unpacked.profile as UserProfile,
    onboardingCompleted: Boolean(row.onboarding_completed),
    completedLessonIds: asStringArray(row.completed_lesson_ids),
    lessonWatchProgress: asWatchMap(row.lesson_watch_progress),
    savedCourseIds: asStringArray(row.saved_course_ids),
    lastViewedLessonId: row.last_viewed_lesson_id || null,
    missions: Array.isArray(row.daily_missions) ? (row.daily_missions as Mission[]) : [],
    coachChatHistory: asCoachHistory(row.coach_chat_history),
    activityLog: unpacked.activityLog,
  };
}

function mergeWatch(
  local: Record<string, number>,
  remote: Record<string, number>
): Record<string, number> {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, number> = {};
  for (const key of keys) {
    out[key] = Math.max(local[key] ?? 0, remote[key] ?? 0);
  }
  return out;
}

function mergeStringIds(a: string[], b: string[]) {
  return Array.from(new Set([...a, ...b]));
}

function mergeProfile(local: UserProfile, remote: Partial<UserProfile> | null | undefined): UserProfile {
  if (!remote || typeof remote !== 'object') return local;
  const remotePoints = Number(remote.points);
  const localPoints = Number(local.points);
  const useRemote =
    (Number.isFinite(remotePoints) && remotePoints > localPoints) ||
    (Number.isFinite(remotePoints) && remotePoints === localPoints && Number(remote.streak || 0) > Number(local.streak || 0));

  if (!useRemote && Object.keys(remote).length === 0) return local;

  return {
    ...local,
    ...remote,
    name: remote.name || local.name,
    goal: remote.goal || local.goal,
    fitnessLevel: remote.fitnessLevel || local.fitnessLevel,
    environment: remote.environment || local.environment,
    planName: remote.planName || local.planName,
    dailyTime: remote.dailyTime || local.dailyTime,
    foodPreference: remote.foodPreference || local.foodPreference,
    points: Math.max(localPoints || 0, Number.isFinite(remotePoints) ? remotePoints : 0),
    streak: Math.max(Number(local.streak || 0), Number(remote.streak || 0)),
    journeyDay: Math.max(Number(local.journeyDay || 0), Number(remote.journeyDay || 0)),
    level: Math.max(Number(local.level || 1), Number(remote.level || 1)) as UserProfile['level'],
    cyclePhase: (remote.cyclePhase || local.cyclePhase) as UserProfile['cyclePhase'],
    cycleDay: remote.cycleDay ?? local.cycleDay,
    isPregnant: remote.isPregnant ?? local.isPregnant,
    pregnancyWeek: remote.pregnancyWeek ?? local.pregnancyWeek,
    planStartedAt: earlierIso(local.planStartedAt, remote.planStartedAt),
    planDurationWeeks: Number(remote.planDurationWeeks || local.planDurationWeeks || 8),
    trainingPlan: (() => {
      const score = (plan: UserProfile['trainingPlan']) => {
        if (!plan) return 0;
        const first = plan.days?.[0] as { items?: unknown; tasks?: unknown } | undefined;
        if (plan.generatedBy === 'ai' || (first && !first.items && first.tasks)) return 1;
        if (plan.generatedBy === 'roadmap' && plan.days?.length) return 3;
        return plan.days?.length ? 2 : 1;
      };
      const localPlan = local.trainingPlan;
      const remotePlan = remote.trainingPlan;
      return score(localPlan) >= score(remotePlan) ? localPlan || remotePlan || null : remotePlan || localPlan || null;
    })(),
    planHistory: Array.from(
      new Map(
        [...(local.planHistory || []), ...(remote.planHistory || [])].map((plan) => [plan.id, plan])
      ).values()
    ).slice(-12),
  };
}

function mergeMissions(local: Mission[], remote: Mission[]): Mission[] {
  if (!remote.length) return local;
  if (!local.length) return remote;

  const overlap = local.some((item) => remote.some((other) => other.id === item.id));
  if (!overlap) {
    const localPreferred = local.some((item) => item.href || item.id.startsWith('train-'));
    const source = localPreferred ? local : remote;
    const other = source === local ? remote : local;
    const completedCategories = new Set(other.filter((item) => item.completed).map((item) => item.category));
    return source.map((item) => ({
      ...item,
      completed: item.completed || completedCategories.has(item.category),
    }));
  }

  const byId = new Map(local.map((m) => [m.id, m]));
  for (const mission of remote) {
    const existing = byId.get(mission.id);
    if (!existing) {
      byId.set(mission.id, mission);
      continue;
    }
    byId.set(mission.id, {
      ...existing,
      ...mission,
      title: existing.href ? existing.title : mission.title,
      href: existing.href || mission.href,
      label: existing.label || mission.label,
      courseId: existing.courseId || mission.courseId,
      lessonId: existing.lessonId || mission.lessonId,
      completed: Boolean(existing.completed || mission.completed),
    });
  }
  return Array.from(byId.values());
}

export function mergeProgressSnapshots(
  local: MemberProgressSnapshot,
  remote: MemberProgressSnapshot | null
): MemberProgressSnapshot {
  if (!remote) return local;
  return {
    profile: mergeProfile(local.profile, remote.profile),
    onboardingCompleted: Boolean(local.onboardingCompleted || remote.onboardingCompleted),
    completedLessonIds: mergeStringIds(local.completedLessonIds, remote.completedLessonIds),
    lessonWatchProgress: mergeWatch(local.lessonWatchProgress, remote.lessonWatchProgress),
    savedCourseIds: mergeStringIds(local.savedCourseIds, remote.savedCourseIds),
    lastViewedLessonId: remote.lastViewedLessonId || local.lastViewedLessonId,
    missions: mergeMissions(local.missions, remote.missions),
    coachChatHistory: mergeCoachHistory(local.coachChatHistory, remote.coachChatHistory),
    activityLog: mergeActivityLogs(local.activityLog, remote.activityLog),
  };
}

async function updateMemberRow(memberId: string, payload: Record<string, unknown>) {
  const body: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value !== undefined && value !== '') body[key] = value;
  }
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from('members').update(body).eq('id', memberId);
    if (!error) return null;
    const missing =
      error.message.match(/'([^']+)' column/i)?.[1] ||
      error.message.match(/column "([^"]+)"/i)?.[1];
    if (!missing || !(missing in body)) return error;
    delete body[missing];
  }
  return { message: 'Could not update member' };
}

export async function saveMemberProgress(
  snapshot: MemberProgressSnapshot,
  emailHint?: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return false;
  const memberId = await resolveMemberId(emailHint);
  if (!memberId) return false;

  const memberError = await updateMemberRow(memberId, {
    name: snapshot.profile.name || undefined,
    points: snapshot.profile.points,
    streak: snapshot.profile.streak,
    level: snapshot.profile.level,
    journey_day: snapshot.profile.journeyDay,
    goal: snapshot.profile.goal,
    fitness_level: snapshot.profile.fitnessLevel,
    environment: snapshot.profile.environment,
    cycle_phase: snapshot.profile.cyclePhase,
    cycle_day: snapshot.profile.cycleDay,
    is_pregnant: snapshot.profile.isPregnant,
    pregnancy_week: snapshot.profile.pregnancyWeek,
    completed_lessons: snapshot.completedLessonIds.length,
    food_preference: snapshot.profile.foodPreference || undefined,
    updated_at: new Date().toISOString(),
  });
  if (memberError) {
    console.warn('Failed to save member onboarding', memberError.message);
  }

  const row = {
    member_id: memberId,
    profile: packProfileBlob(snapshot.profile, snapshot.activityLog),
    onboarding_completed: snapshot.onboardingCompleted,
    completed_lesson_ids: snapshot.completedLessonIds,
    lesson_watch_progress: snapshot.lessonWatchProgress,
    saved_course_ids: snapshot.savedCourseIds,
    last_viewed_lesson_id: snapshot.lastViewedLessonId,
    daily_missions: snapshot.missions,
    coach_chat_history: snapshot.coachChatHistory,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('member_progress').upsert(row, { onConflict: 'member_id' });
  if (error) {
    if (/401|JWT|not authorized|row-level/i.test(error.message)) {
      console.warn('Cloud progress save skipped (not signed in to Supabase)');
    } else {
      console.warn('Failed to save member progress', error.message);
    }
    return !memberError;
  }

  return !memberError;
}
