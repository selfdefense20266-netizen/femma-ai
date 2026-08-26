import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Mission, UserProfile } from '@/context/AppContext';

export type MemberProgressSnapshot = {
  profile: UserProfile;
  onboardingCompleted: boolean;
  completedLessonIds: string[];
  lessonWatchProgress: Record<string, number>;
  savedCourseIds: string[];
  lastViewedLessonId: string | null;
  missions: Mission[];
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

export async function resolveMemberId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const authId = data.user.id;
  const email = (data.user.email || '').toLowerCase();

  if (email) {
    const byEmail = await supabase.from('members').select('id').eq('email', email).maybeSingle();
    if (!byEmail.error && byEmail.data?.id) return byEmail.data.id as string;
  }

  const byId = await supabase.from('members').select('id').eq('id', authId).maybeSingle();
  if (!byId.error && byId.data?.id) return byId.data.id as string;

  return authId;
}

export async function fetchMemberProgress(): Promise<MemberProgressSnapshot | null> {
  const memberId = await resolveMemberId();
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
  return {
    profile: (row.profile || {}) as UserProfile,
    onboardingCompleted: Boolean(row.onboarding_completed),
    completedLessonIds: asStringArray(row.completed_lesson_ids),
    lessonWatchProgress: asWatchMap(row.lesson_watch_progress),
    savedCourseIds: asStringArray(row.saved_course_ids),
    lastViewedLessonId: row.last_viewed_lesson_id || null,
    missions: Array.isArray(row.daily_missions) ? (row.daily_missions as Mission[]) : [],
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
    points: Math.max(localPoints || 0, Number.isFinite(remotePoints) ? remotePoints : 0),
    streak: Math.max(Number(local.streak || 0), Number(remote.streak || 0)),
    journeyDay: Math.max(Number(local.journeyDay || 0), Number(remote.journeyDay || 0)),
    level: Math.max(Number(local.level || 1), Number(remote.level || 1)) as UserProfile['level'],
    cyclePhase: (remote.cyclePhase || local.cyclePhase) as UserProfile['cyclePhase'],
    cycleDay: remote.cycleDay ?? local.cycleDay,
    isPregnant: remote.isPregnant ?? local.isPregnant,
    pregnancyWeek: remote.pregnancyWeek ?? local.pregnancyWeek,
  };
}

function mergeMissions(local: Mission[], remote: Mission[]): Mission[] {
  if (!remote.length) return local;
  if (!local.length) return remote;
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
  };
}

export async function saveMemberProgress(snapshot: MemberProgressSnapshot): Promise<boolean> {
  const memberId = await resolveMemberId();
  if (!memberId) return false;

  const { data: authData } = await supabase.auth.getUser();
  const email = (authData.user?.email || '').toLowerCase();
  if (email) {
    const existing = await supabase.from('members').select('id').eq('id', memberId).maybeSingle();
    if (!existing.data) {
      const name =
        `${authData.user?.user_metadata?.first_name || ''} ${authData.user?.user_metadata?.last_name || ''}`.trim() ||
        email.split('@')[0];
      await supabase.from('members').upsert(
        {
          id: memberId,
          email,
          name,
          status: 'active',
          points: snapshot.profile.points,
          streak: snapshot.profile.streak,
          level: snapshot.profile.level,
        },
        { onConflict: 'email' }
      );
    }
  }

  const row = {
    member_id: memberId,
    profile: snapshot.profile,
    onboarding_completed: snapshot.onboardingCompleted,
    completed_lesson_ids: snapshot.completedLessonIds,
    lesson_watch_progress: snapshot.lessonWatchProgress,
    saved_course_ids: snapshot.savedCourseIds,
    last_viewed_lesson_id: snapshot.lastViewedLessonId,
    daily_missions: snapshot.missions,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('member_progress').upsert(row, { onConflict: 'member_id' });
  if (error) {
    console.warn('Failed to save member progress', error.message);
    return false;
  }

  // Mirror key stats onto members for admin Progress/analytics views.
  const completedCount = snapshot.completedLessonIds.length;
  await supabase
    .from('members')
    .update({
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
      completed_lessons: completedCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', memberId);

  return true;
}
