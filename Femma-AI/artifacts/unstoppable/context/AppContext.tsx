import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMemberProgress,
  mergeProgressSnapshots,
  saveMemberProgress,
  unpackProfileBlob,
  type CoachChatHistoryMessage,
  type MemberProgressSnapshot,
} from '@/lib/memberProgress';
import { buildDailyMissions, mergeMissionCompletion, missionsNeedRefresh, planNameForGoal, type PersonalizedPlan } from '@/lib/dailyMissions';
import {
  markPlanItemComplete,
  markPlanItemSkipped,
  missionsFromPlanDay,
  weekPreviewFromPlan,
} from '@/lib/buildCoursePlan';
import type { CatalogBundle } from '@/lib/catalog';
import { linkPlanToCatalog, planNeedsCatalogLinks } from '@/lib/missionHref';
import { journeyDayFromStart, logActivity, startedAtFromJourney, type ActivityEvent } from '@/lib/activityLog';
import { levelFromPoints, pointsFromCompletedDays, POINTS_PER_DAY } from '@/lib/levels';
import {
  addDays,
  buildTrainingPlan,
  countEarnedPlanDays,
  planTotalDays,
  snapshotPerformance,
  type TrainingPlan,
} from '@/lib/trainingPlan';
import {
  generateRoadmapTrainingPlan,
  exerciseCountForDay,
  ensureYogaDeepBreathPlan,
  primaryRoadmapCategory,
} from '@/lib/exerciseRoadmap';

export type MissionCategory = 'fitness' | 'yoga' | 'safety' | 'nutrition' | 'recipe';
export type MissionSlot = 'course' | 'meal' | 'recipe' | 'exercise';
export type CyclePhase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal' | 'none';
export type Level = 1 | 2 | 3 | 4 | 5;

export interface Mission {
  id: string;
  title: string;
  category: MissionCategory;
  duration: number;
  calories: number;
  difficulty: string;
  completed: boolean;
  skipped?: boolean;
  accentColor: string;
  icon: string;
  label?: string;
  href?: string;
  courseId?: string;
  lessonId?: string;
  slot?: MissionSlot;
  cue?: string;
  animation?: string;
  steps?: string[];
  /** Admin daily-plan media for Today / reveal cards */
  mediaUrl?: string | number;
  metaLine?: string;
}

export interface UserProfile {
  name: string;
  goal: string;
  fitnessLevel: string;
  environment: string;
  dailyTime: string;
  foodPreference: string;
  planName: string;
  journeyDay: number;
  streak: number;
  level: Level;
  points: number;
  cyclePhase: CyclePhase;
  cycleDay: number;
  /** ISO date when cycleDay was last set as "today" — used to auto-advance */
  cycleAnchorDate?: string;
  isPregnant: boolean;
  pregnancyWeek: number;
  planStartedAt: string;
  planDurationWeeks: number;
  trainingPlan: TrainingPlan | null;
  planHistory: TrainingPlan[];
  /** Locked admin daily plan id (activity plan matched at onboarding) */
  dailyPlanId?: string;
}

export const LEVEL_NAMES: Record<Level, string> = {
  1: 'Beginner',
  2: 'Warrior',
  3: 'Protector',
  4: 'Elite',
  5: 'Goddess',
};

export const LEVEL_COLORS: Record<Level, string> = {
  1: '#2FA88F',
  2: colors.light.skyBlue,
  3: colors.light.lavender,
  4: colors.light.pink,
  5: colors.light.warmYellow,
};

/** Card gradients — saturated enough for white text on Progress level hero. */
export const LEVEL_GRADIENTS: Record<Level, readonly [string, string]> = {
  1: ['#7EE8CC', '#239B7A'],
  2: ['#9AE2F7', '#3D9FD4'],
  3: ['#D4C8FF', '#8B73E8'],
  4: ['#FF8FD0', '#D94A9A'],
  5: ['#FFE5A8', '#E5A020'],
};

export const CYCLE_PHASE_INFO: Record<CyclePhase, { name: string; color: string; insight: string }> = {
  menstrual: { name: 'Menstrual', color: colors.light.coral, insight: 'Rest and gentle movement support your body today.' },
  follicular: { name: 'Follicular', color: colors.light.mint, insight: 'Your energy is rising — great time for new challenges.' },
  ovulation: { name: 'Ovulation', color: colors.light.pink, insight: 'Peak energy phase — push a little harder today.' },
  luteal: { name: 'Luteal', color: colors.light.lavender, insight: 'Wind down with yoga and gentle workouts this week.' },
  none: { name: 'Not tracking', color: colors.light.muted, insight: '' },
};

export function phaseFromCycleDay(day: number): CyclePhase {
  const value = ((Math.max(1, day) - 1) % 28) + 1;
  if (value <= 5) return 'menstrual';
  if (value <= 13) return 'follicular';
  if (value === 14) return 'ovulation';
  return 'luteal';
}

function startOfLocalDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function cycleDateKey(date = new Date()) {
  const d = startOfLocalDay(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Advance cycle day from the last anchored calendar day. */
export function resolveCycleFromAnchor(profile: Pick<UserProfile, 'cyclePhase' | 'cycleDay' | 'cycleAnchorDate'>): {
  cycleDay: number;
  cyclePhase: CyclePhase;
  cycleAnchorDate: string;
  changed: boolean;
} {
  const todayKey = cycleDateKey();
  if (!profile.cyclePhase || profile.cyclePhase === 'none') {
    return { cycleDay: 0, cyclePhase: 'none', cycleAnchorDate: '', changed: false };
  }
  const baseDay = Math.max(1, Math.min(28, Number(profile.cycleDay) || 1));
  const anchor = profile.cycleAnchorDate || todayKey;
  const anchorDate = startOfLocalDay(new Date(`${anchor}T12:00:00`));
  const today = startOfLocalDay();
  const diff = Math.round((today.getTime() - anchorDate.getTime()) / 86400000);
  const nextDay = ((baseDay - 1 + Math.max(0, diff)) % 28) + 1;
  const nextPhase = phaseFromCycleDay(nextDay);
  const changed =
    nextDay !== baseDay ||
    nextPhase !== profile.cyclePhase ||
    anchor !== todayKey;
  return {
    cycleDay: nextDay,
    cyclePhase: nextPhase,
    cycleAnchorDate: todayKey,
    changed,
  };
}

/** Set today's cycle day (1–28) and anchor to today so tracking advances from here. */
export function cycleUpdateForDay(cycleDay: number): Pick<UserProfile, 'cycleDay' | 'cyclePhase' | 'cycleAnchorDate' | 'isPregnant'> {
  const day = Math.max(1, Math.min(28, Math.round(cycleDay) || 1));
  return {
    cycleDay: day,
    cyclePhase: phaseFromCycleDay(day),
    cycleAnchorDate: cycleDateKey(),
    isPregnant: false,
  };
}

const DEFAULT_MISSIONS: Mission[] = [
  { id: '1', title: '20 min Lower Body Sculpt', category: 'fitness', duration: 20, calories: 180, difficulty: 'Intermediate', completed: false, accentColor: colors.light.pink, icon: 'zap' },
  { id: '2', title: '10 min Stress Relief Yoga', category: 'yoga', duration: 10, calories: 60, difficulty: 'Beginner', completed: false, accentColor: colors.light.lavender, icon: 'wind' },
  { id: '3', title: '5 min Wrist Escape Practice', category: 'safety', duration: 5, calories: 30, difficulty: 'Beginner', completed: false, accentColor: colors.light.skyBlue, icon: 'shield' },
  { id: '4', title: 'Scan Your Lunch', category: 'nutrition', duration: 2, calories: 0, difficulty: '', completed: false, accentColor: colors.light.mint, icon: 'camera' },
  { id: '5', title: 'AI Dinner Recipe', category: 'recipe', duration: 5, calories: 0, difficulty: '', completed: false, accentColor: colors.light.warmYellow, icon: 'book-open' },
];

const DEFAULT_PROFILE: UserProfile = {
  name: '',
  goal: '',
  fitnessLevel: '',
  environment: '',
  dailyTime: '',
  foodPreference: '',
  planName: '',
  journeyDay: 1,
  streak: 0,
  level: 1,
  points: 0,
  cyclePhase: 'none',
  cycleDay: 0,
  cycleAnchorDate: '',
  isPregnant: false,
  pregnancyWeek: 0,
  planStartedAt: '',
  planDurationWeeks: 8,
  trainingPlan: null,
  planHistory: [],
};

const STORAGE_KEYS = {
  profile: 'user_profile',
  missions: 'daily_missions',
  onboarding: 'onboarding_completed',
  lessons: 'completed_video_lessons',
  courses: 'saved_video_courses',
  lastLesson: 'last_viewed_video_lesson',
  watch: 'lesson_watch_progress',
  coach: 'coach_chat_history',
  owner: 'progress_owner_email',
} as const;

function emptySnapshot(): MemberProgressSnapshot {
  return {
    profile: { ...DEFAULT_PROFILE },
    missions: DEFAULT_MISSIONS.map((item) => ({ ...item, completed: false, skipped: false })),
    onboardingCompleted: false,
    completedLessonIds: [],
    lessonWatchProgress: {},
    savedCourseIds: [],
    lastViewedLessonId: null,
    coachChatHistory: [],
    activityLog: [],
  };
}

function normalizeEmail(email?: string | null) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

/** Strip cross-account bleed: day-1 rest + leftover points from a previous local user. */
function scrubCrossAccountPollution(snapshot: MemberProgressSnapshot): MemberProgressSnapshot {
  const journeyDay = snapshot.profile.journeyDay || 1;
  const points = Math.max(0, Number(snapshot.profile.points) || 0);
  const hasDaySkip = snapshot.activityLog.some((event) => String(event.ref || '').startsWith('day-skip:'));
  const hasDayEarn = snapshot.activityLog.some((event) => String(event.ref || '').startsWith('day-earn:'));
  if (journeyDay !== 1 || !hasDaySkip || hasDayEarn || points <= 0) return snapshot;

  return {
    ...snapshot,
    activityLog: snapshot.activityLog.filter((event) => {
      const ref = String(event.ref || '');
      return !ref.startsWith('day-skip:') && !ref.startsWith('skip:');
    }),
    missions: snapshot.missions.map((item) => ({ ...item, skipped: false, completed: false })),
    profile: {
      ...snapshot.profile,
      points: 0,
      streak: 0,
      level: 1,
    },
  };
}

interface AppContextType {
  profile: UserProfile;
  missions: Mission[];
  onboardingCompleted: boolean;
  completedLessonIds: string[];
  lessonWatchProgress: Record<string, number>;
  savedCourseIds: string[];
  lastViewedLessonId: string | null;
  coachChatHistory: CoachChatHistoryMessage[];
  activityLog: ActivityEvent[];
  syncReady: boolean;
  stagedPlan: PersonalizedPlan | null;
  buildOnboardingPlan: () => Promise<PersonalizedPlan>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeMission: (idOrKey: string, options?: { dayTaskIds?: string[] }) => boolean;
  skipMission: (idOrKey: string) => boolean;
  /** Mark today's tasks skipped (Rest / Recovery stretch). No points. */
  skipTodayTasks: (taskIds: string[]) => void;
  resetMissions: () => void;
  syncMissions: (catalog?: CatalogBundle) => void;
  completeOnboarding: (profile: Partial<UserProfile>) => void;
  startNewPlan: () => void;
  advanceTestDay: () => void;
  setLessonComplete: (lessonId: string, completed: boolean) => void;
  setLessonWatchProgress: (lessonId: string, percent: number) => void;
  toggleSavedCourse: (courseId: string) => void;
  setLastViewedLesson: (lessonId: string) => void;
  saveCoachChatHistory: (history: CoachChatHistoryMessage[]) => void;
  missionsCompleted: number;
  totalMissions: number;
}

const AppContext = createContext<AppContextType | null>(null);

function compactMissions(missions: Mission[]) {
  return missions.map(({ steps: _steps, ...item }) => ({
    ...item,
    icon: item.icon || 'circle',
  }));
}

function compactTrainingPlan(plan: TrainingPlan | null): TrainingPlan | null {
  if (!plan) return null;
  return {
    ...plan,
    days: (plan.days || []).map((day) => ({
      ...day,
      items: compactMissions((day.items || []) as Mission[]),
    })),
    generatedBy: plan.generatedBy || 'roadmap',
  };
}

function safeCyclePhase(value: unknown): CyclePhase {
  return value === 'menstrual' || value === 'follicular' || value === 'ovulation' || value === 'luteal' || value === 'none'
    ? value
    : 'none';
}

function neverLosePoints(profile: UserProfile, missions?: Mission[]): { points: number; level: Level } {
  const todayDone = Boolean(
    missions &&
      missions.length > 0 &&
      missions.every((item) => item.completed || item.skipped) &&
      missions.some((item) => item.completed)
  );
  const stored = Math.max(0, Number(profile.points) || 0);
  const streakFloor = Math.max(0, Number(profile.streak) || 0) * POINTS_PER_DAY;
  const archivedBest = Math.max(
    0,
    ...(profile.planHistory || []).map((plan) => Number(plan.performance?.points) || 0)
  );
  const historyDays = (profile.planHistory || []).reduce(
    (sum, plan) => sum + countEarnedPlanDays(plan, plan.days?.length || 1, false),
    0
  );
  const currentDays = countEarnedPlanDays(profile.trainingPlan, profile.journeyDay, todayDone);
  const computed = pointsFromCompletedDays(historyDays + currentDays);
  const currentOnly = pointsFromCompletedDays(currentDays);
  const points = Math.max(stored, streakFloor, archivedBest + currentOnly, computed);
  return { points, level: levelFromPoints(points) };
}

function withDayPoints(profile: UserProfile, missions?: Mission[]): UserProfile {
  const { points, level } = neverLosePoints(profile, missions);
  return { ...profile, points, level };
}

function sanitizeLoadedProfile(profile: UserProfile, missions?: Mission[]): UserProfile {
  const next: UserProfile = {
    ...DEFAULT_PROFILE,
    ...profile,
    streak: Number.isFinite(Number(profile.streak)) ? Number(profile.streak) : 0,
    journeyDay: Math.max(1, Number(profile.journeyDay) || 1),
    cyclePhase: safeCyclePhase(profile.cyclePhase),
    planHistory: Array.isArray(profile.planHistory) ? profile.planHistory.slice(-6) : [],
  };
  const plan = next.trainingPlan;
  let result = next;
  if (plan) {
    const first = plan.days?.[0] as { items?: Mission[]; tasks?: unknown } | undefined;
    const broken = Boolean(first && !first.items && first.tasks);
    const tooBig = (plan.days?.length || 0) > 90;
    const notRoadmap = plan.generatedBy === 'ai';
    if ((broken || tooBig || notRoadmap) && next.goal && next.dailyTime) {
      try {
        result = { ...next, trainingPlan: generateRoadmapTrainingPlan(next) };
      } catch {
        result = { ...next, trainingPlan: null };
      }
    } else {
      result = { ...next, trainingPlan: compactTrainingPlan(plan) };
    }
  }
  return withDayPoints(result, missions);
}

function sanitizeMissions(missions: Mission[], profile: UserProfile): Mission[] {
  const cleaned = compactMissions(Array.isArray(missions) ? missions : []).filter((item) => item?.title);
  if (cleaned.length > 12 && profile.trainingPlan?.days?.length) {
    return compactMissions(missionsFromPlanDay(profile.trainingPlan, profile.journeyDay || 1));
  }
  return cleaned.length ? cleaned : DEFAULT_MISSIONS;
}

async function writeLocalSnapshot(snapshot: MemberProgressSnapshot, ownerEmail?: string | null) {
  const profile = {
    ...snapshot.profile,
    trainingPlan: compactTrainingPlan(snapshot.profile.trainingPlan),
    activityLog: snapshot.activityLog,
  };
  const owner = normalizeEmail(ownerEmail);
  try {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile)),
      AsyncStorage.setItem(STORAGE_KEYS.missions, JSON.stringify(compactMissions(snapshot.missions))),
      AsyncStorage.setItem(STORAGE_KEYS.onboarding, snapshot.onboardingCompleted ? 'true' : 'false'),
      AsyncStorage.setItem(STORAGE_KEYS.lessons, JSON.stringify(snapshot.completedLessonIds)),
      AsyncStorage.setItem(STORAGE_KEYS.courses, JSON.stringify(snapshot.savedCourseIds)),
      AsyncStorage.setItem(STORAGE_KEYS.watch, JSON.stringify(snapshot.lessonWatchProgress)),
      snapshot.lastViewedLessonId
        ? AsyncStorage.setItem(STORAGE_KEYS.lastLesson, snapshot.lastViewedLessonId)
        : AsyncStorage.removeItem(STORAGE_KEYS.lastLesson),
      AsyncStorage.setItem(STORAGE_KEYS.coach, JSON.stringify(snapshot.coachChatHistory)),
      owner
        ? AsyncStorage.setItem(STORAGE_KEYS.owner, owner)
        : AsyncStorage.removeItem(STORAGE_KEYS.owner),
    ]);
  } catch (error) {
    console.warn('Local persist failed', error);
  }
}

async function clearLocalSnapshot() {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.profile),
      AsyncStorage.removeItem(STORAGE_KEYS.missions),
      AsyncStorage.removeItem(STORAGE_KEYS.onboarding),
      AsyncStorage.removeItem(STORAGE_KEYS.lessons),
      AsyncStorage.removeItem(STORAGE_KEYS.courses),
      AsyncStorage.removeItem(STORAGE_KEYS.watch),
      AsyncStorage.removeItem(STORAGE_KEYS.lastLesson),
      AsyncStorage.removeItem(STORAGE_KEYS.coach),
      AsyncStorage.removeItem(STORAGE_KEYS.owner),
    ]);
  } catch (error) {
    console.warn('Local clear failed', error);
  }
}

async function readLocalOwner(): Promise<string> {
  try {
    return normalizeEmail(await AsyncStorage.getItem(STORAGE_KEYS.owner));
  } catch {
    return '';
  }
}

async function readLocalSnapshot(): Promise<MemberProgressSnapshot> {
  const [savedProfile, savedMissions, completed, savedLessons, savedCourses, lastLesson, watchProgress, coachHistory] =
    await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.profile),
      AsyncStorage.getItem(STORAGE_KEYS.missions),
      AsyncStorage.getItem(STORAGE_KEYS.onboarding),
      AsyncStorage.getItem(STORAGE_KEYS.lessons),
      AsyncStorage.getItem(STORAGE_KEYS.courses),
      AsyncStorage.getItem(STORAGE_KEYS.lastLesson),
      AsyncStorage.getItem(STORAGE_KEYS.watch),
      AsyncStorage.getItem(STORAGE_KEYS.coach),
    ]);

  const parse = <T,>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };
  const unpacked = unpackProfileBlob(parse(savedProfile, {}));
  const missions = parse(savedMissions, DEFAULT_MISSIONS);
  const profile = sanitizeLoadedProfile({ ...DEFAULT_PROFILE, ...unpacked.profile }, missions);
  return {
    profile,
    missions: sanitizeMissions(missions, profile),
    onboardingCompleted: completed === 'true',
    completedLessonIds: parse(savedLessons, [] as string[]),
    savedCourseIds: parse(savedCourses, [] as string[]),
    lastViewedLessonId: lastLesson || null,
    lessonWatchProgress: parse(watchProgress, {} as Record<string, number>),
    coachChatHistory: parse(coachHistory, []),
    activityLog: unpacked.activityLog,
  };
}

function missionKeyAliases(key: string): string[] {
  const raw = key.trim();
  const lower = raw.toLowerCase();
  const aliases = new Set([raw, lower]);
  if (lower === 'self-defence' || lower === 'self-defense') aliases.add('safety');
  if (lower === 'safety') {
    aliases.add('self-defence');
    aliases.add('self-defense');
  }
  if (lower === 'diet-nutrition' || lower === 'nutrition') aliases.add('nutrition');
  return [...aliases];
}

function findMissionIndex(missions: Mission[], idOrKey: string): number {
  const keys = missionKeyAliases(idOrKey);
  const open = (item: Mission) => !item.completed && !item.skipped;
  const exact = missions.findIndex(
    (item) => open(item) && (keys.includes(item.id) || (item.lessonId && keys.includes(item.lessonId)))
  );
  if (exact >= 0) return exact;
  const byCourse = missions.findIndex(
    (item) => open(item) && item.courseId && keys.includes(item.courseId)
  );
  if (byCourse >= 0) return byCourse;
  return missions.findIndex((item) => open(item) && keys.includes(item.category));
}

function isMissionResolved(mission: Mission) {
  return Boolean(mission.completed || mission.skipped);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [missions, setMissions] = useState<Mission[]>(DEFAULT_MISSIONS);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [lessonWatchProgress, setLessonWatchProgressState] = useState<Record<string, number>>({});
  const [savedCourseIds, setSavedCourseIds] = useState<string[]>([]);
  const [lastViewedLessonId, setLastViewedLessonIdState] = useState<string | null>(null);
  const [coachChatHistory, setCoachChatHistory] = useState<CoachChatHistoryMessage[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [syncReady, setSyncReady] = useState(false);
  const [stagedPlan, setStagedPlan] = useState<PersonalizedPlan | null>(null);
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiPlanPromiseRef = useRef<Promise<PersonalizedPlan> | null>(null);
  const snapshotRef = useRef<MemberProgressSnapshot>({
    profile: DEFAULT_PROFILE,
    missions: DEFAULT_MISSIONS,
    onboardingCompleted: false,
    completedLessonIds: [],
    lessonWatchProgress: {},
    savedCourseIds: [],
    lastViewedLessonId: null,
    coachChatHistory: [],
    activityLog: [],
  });

  const applySnapshot = useCallback((snapshot: MemberProgressSnapshot) => {
    const profile = sanitizeLoadedProfile({ ...DEFAULT_PROFILE, ...snapshot.profile }, snapshot.missions);
    const next = {
      ...snapshot,
      profile,
      missions: sanitizeMissions(snapshot.missions, profile),
    };
    snapshotRef.current = next;
    setProfile(next.profile);
    setMissions(next.missions);
    setOnboardingCompleted(next.onboardingCompleted);
    setCompletedLessonIds(next.completedLessonIds);
    setLessonWatchProgressState(next.lessonWatchProgress);
    setSavedCourseIds(next.savedCourseIds);
    setLastViewedLessonIdState(next.lastViewedLessonId);
    setCoachChatHistory(next.coachChatHistory);
    setActivityLog(next.activityLog);
  }, []);

  const queueCloudSave = useCallback((snapshot: MemberProgressSnapshot, immediate = false) => {
    snapshotRef.current = snapshot;
    if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
    const run = () => {
      saveMemberProgress(snapshot, user?.email).catch(() => undefined);
    };
    if (immediate) {
      run();
      return;
    }
    cloudTimerRef.current = setTimeout(run, 800);
  }, [user?.email]);

  const persistAll = useCallback(
    async (snapshot: MemberProgressSnapshot, options?: { immediateCloud?: boolean; skipCloud?: boolean }) => {
      const profile = sanitizeLoadedProfile({ ...DEFAULT_PROFILE, ...snapshot.profile }, snapshot.missions);
      const next = {
        ...snapshot,
        profile,
        missions: sanitizeMissions(snapshot.missions, profile),
      };
      applySnapshot(next);
      try {
        await writeLocalSnapshot(next, user?.email);
      } catch {
        // Keep the in-memory snapshot even if disk is full.
      }
      if (user?.email && !options?.skipCloud) {
        queueCloudSave(next, options?.immediateCloud);
      }
    },
    [applySnapshot, queueCloudSave, user?.email]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const local = await readLocalSnapshot();
        if (!mounted) return;
        applySnapshot(local);
        try {
          await writeLocalSnapshot(snapshotRef.current, await readLocalOwner());
        } catch {
          // keep in-memory snapshot
        }
      } catch {
        // keep defaults
      } finally {
        if (mounted) setSyncReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [applySnapshot]);

  useEffect(() => {
    if (!syncReady || authLoading) return;
    let mounted = true;
    const email = normalizeEmail(user?.email);

    (async () => {
      // Logged out — drop in-memory progress so the next account starts clean.
      if (!email) {
        applySnapshot(emptySnapshot());
        await clearLocalSnapshot();
        return;
      }

      try {
        const owner = await readLocalOwner();
        const localBelongsToUser = owner === email;
        if (!localBelongsToUser) {
          // Unscoped / other-user local progress must never bleed into this account.
          applySnapshot(emptySnapshot());
          await clearLocalSnapshot();
        }

        const remote = await fetchMemberProgress(user?.email);
        if (!mounted) return;

        const base = localBelongsToUser ? snapshotRef.current : emptySnapshot();
        let next = remote ? mergeProgressSnapshots(base, remote) : base;
        next = scrubCrossAccountPollution(next);
        applySnapshot(next);
        next = snapshotRef.current;
        await writeLocalSnapshot(next, email);
        if (remote || next.onboardingCompleted) {
          await saveMemberProgress(next, user?.email);
        }
      } catch (error) {
        console.warn('Cloud progress sync failed', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.email, syncReady, authLoading, applySnapshot]);

  useEffect(() => {
    return () => {
      if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!syncReady) return;
    const snapshot = snapshotRef.current;
    if (!snapshot.onboardingCompleted) return;

    const startedAt = snapshot.profile.planStartedAt || startedAtFromJourney(snapshot.profile.journeyDay);
    const nextDay = journeyDayFromStart(startedAt);
    let nextLog = snapshot.activityLog;
    for (const mission of snapshot.missions) {
      if (!mission.completed) continue;
      if (mission.category === 'fitness' || mission.category === 'yoga' || mission.category === 'safety') {
        nextLog = logActivity(nextLog, { kind: 'workout', ref: mission.lessonId || mission.id });
      } else if (mission.category === 'recipe') {
        nextLog = logActivity(nextLog, { kind: 'recipe', ref: mission.id });
      }
    }
    for (const lessonId of snapshot.completedLessonIds) {
      nextLog = logActivity(nextLog, { kind: 'workout', ref: lessonId });
    }

    const dayChanged = nextDay !== snapshot.profile.journeyDay || startedAt !== snapshot.profile.planStartedAt;
    const logChanged = nextLog.length !== snapshot.activityLog.length;
    if (!dayChanged && !logChanged) return;

    const nextMissions =
      dayChanged && snapshot.profile.trainingPlan?.days?.length
        ? missionsFromPlanDay(snapshot.profile.trainingPlan, nextDay)
        : snapshot.missions;

    void persistAll({
      ...snapshot,
      activityLog: nextLog,
      missions: nextMissions,
      profile: {
        ...snapshot.profile,
        planStartedAt: startedAt,
        journeyDay: nextDay,
      },
    });
  }, [syncReady, persistAll, onboardingCompleted, completedLessonIds]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    const next = {
      ...snapshotRef.current,
      profile: { ...snapshotRef.current.profile, ...updates },
    };
    void persistAll(next);
  };

  // Auto-advance cycle day from the last anchored calendar date.
  useEffect(() => {
    if (!syncReady || !onboardingCompleted) return;
    const current = snapshotRef.current.profile;
    if (current.cyclePhase === 'none') return;
    const resolved = resolveCycleFromAnchor(current);
    if (!resolved.changed) return;
    void persistAll({
      ...snapshotRef.current,
      profile: {
        ...current,
        cycleDay: resolved.cycleDay,
        cyclePhase: resolved.cyclePhase,
        cycleAnchorDate: resolved.cycleAnchorDate,
      },
    });
  }, [syncReady, onboardingCompleted, persistAll, profile.cyclePhase, profile.cycleDay, profile.cycleAnchorDate]);

  const completeMission = useCallback((idOrKey: string, options?: { dayTaskIds?: string[] }) => {
    const dayTaskIds = (options?.dayTaskIds || []).map((id) => String(id || '').trim()).filter(Boolean);
    const index = findMissionIndex(snapshotRef.current.missions, idOrKey);

    if (index < 0) {
      // Admin daily-plan item — log completion only; points come once when the full day is done.
      const already = snapshotRef.current.activityLog.some(
        (event) => event.kind === 'workout' && event.ref === idOrKey
      );
      let nextLog = already
        ? snapshotRef.current.activityLog
        : logActivity(snapshotRef.current.activityLog, {
            kind: 'workout',
            ref: idOrKey,
          });

      const journeyDay = snapshotRef.current.profile.journeyDay || 1;
      const dayEarnRef = `day-earn:${journeyDay}`;
      const daySkipRef = `day-skip:${journeyDay}`;
      const dayAlreadyEarned = nextLog.some((event) => event.ref === dayEarnRef);
      const daySkipped = nextLog.some((event) => event.ref === daySkipRef);
      const dayComplete =
        !dayAlreadyEarned &&
        !daySkipped &&
        dayTaskIds.length > 0 &&
        dayTaskIds.every((id) => nextLog.some((event) => event.ref === id));

      let streak = snapshotRef.current.profile.streak;
      let points = snapshotRef.current.profile.points;
      let level = snapshotRef.current.profile.level;

      if (dayComplete) {
        nextLog = logActivity(nextLog, { kind: 'workout', ref: dayEarnRef });
        streak = streak + 1;
        points = points + POINTS_PER_DAY;
        const scored = neverLosePoints({
          ...snapshotRef.current.profile,
          streak,
          points,
        });
        points = scored.points;
        level = scored.level;
      }

      const next: MemberProgressSnapshot = {
        ...snapshotRef.current,
        activityLog: nextLog,
        profile: {
          ...snapshotRef.current.profile,
          points,
          level,
          streak,
        },
      };
      void persistAll(next, { immediateCloud: true });
      return true;
    }

    const mission = snapshotRef.current.missions[index];
    const updatedMissions = snapshotRef.current.missions.map((item, i) =>
      i === index ? { ...item, completed: true, skipped: false } : item
    );
    const allResolved = updatedMissions.length > 0 && updatedMissions.every(isMissionResolved);
    const anyCompleted = updatedMissions.some((item) => item.completed);
    let nextLog = snapshotRef.current.activityLog;
    if (mission.category === 'fitness' || mission.category === 'yoga' || mission.category === 'safety') {
      nextLog = logActivity(nextLog, {
        kind: 'workout',
        ref: mission.lessonId || mission.id,
      });
    } else if (mission.category === 'recipe') {
      nextLog = logActivity(nextLog, { kind: 'recipe', ref: mission.id });
    } else if (mission.category === 'nutrition') {
      nextLog = logActivity(nextLog, { kind: 'nutrition', ref: mission.id });
    }
    // Also tag the exact mission id so carousel ticks work for roadmap + admin ids
    nextLog = logActivity(nextLog, { kind: 'workout', ref: mission.id });
    const currentPlan = snapshotRef.current.profile.trainingPlan;
    const trainingPlan = currentPlan?.days?.length
      ? markPlanItemComplete(currentPlan, snapshotRef.current.profile.journeyDay || 1, mission.id)
      : currentPlan;
    const finishedPlan =
      allResolved &&
      anyCompleted &&
      (snapshotRef.current.profile.journeyDay || 1) >=
        planTotalDays(snapshotRef.current.profile.planDurationWeeks || trainingPlan?.durationWeeks)
        ? trainingPlan
          ? { ...trainingPlan, status: 'completed' as const }
          : trainingPlan
        : trainingPlan;
    const streak =
      allResolved && anyCompleted ? snapshotRef.current.profile.streak + 1 : snapshotRef.current.profile.streak;
    const { points, level } = neverLosePoints(
      {
        ...snapshotRef.current.profile,
        streak,
        trainingPlan: finishedPlan || snapshotRef.current.profile.trainingPlan,
      },
      updatedMissions
    );
    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      missions: updatedMissions,
      activityLog: nextLog,
      profile: {
        ...snapshotRef.current.profile,
        points,
        level,
        streak,
        trainingPlan: finishedPlan || snapshotRef.current.profile.trainingPlan,
      },
    };
    void persistAll(next, { immediateCloud: true });
    return true;
  }, [persistAll]);

  const skipMission = useCallback((idOrKey: string) => {
    const index = findMissionIndex(snapshotRef.current.missions, idOrKey);
    if (index < 0) return false;

    const mission = snapshotRef.current.missions[index];
    const updatedMissions = snapshotRef.current.missions.map((item, i) =>
      i === index ? { ...item, skipped: true, completed: false } : item
    );
    const allResolved = updatedMissions.length > 0 && updatedMissions.every(isMissionResolved);
    const anyCompleted = updatedMissions.some((item) => item.completed);
    const currentPlan = snapshotRef.current.profile.trainingPlan;
    const trainingPlan = currentPlan?.days?.length
      ? markPlanItemSkipped(currentPlan, snapshotRef.current.profile.journeyDay || 1, mission.id)
      : currentPlan;
    const finishedPlan =
      allResolved &&
      anyCompleted &&
      (snapshotRef.current.profile.journeyDay || 1) >=
        planTotalDays(snapshotRef.current.profile.planDurationWeeks || trainingPlan?.durationWeeks)
        ? trainingPlan
          ? { ...trainingPlan, status: 'completed' as const }
          : trainingPlan
        : trainingPlan;
    // Skipped days do not earn streak / points
    const streak = snapshotRef.current.profile.streak;
    const { points, level } = neverLosePoints(
      {
        ...snapshotRef.current.profile,
        streak,
        trainingPlan: finishedPlan || snapshotRef.current.profile.trainingPlan,
      },
      updatedMissions
    );
    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      missions: updatedMissions,
      profile: {
        ...snapshotRef.current.profile,
        points,
        level,
        streak,
        trainingPlan: finishedPlan || snapshotRef.current.profile.trainingPlan,
      },
    };
    void persistAll(next, { immediateCloud: true });
    return true;
  }, [persistAll]);

  const skipTodayTasks = useCallback((taskIds: string[]) => {
    const journeyDay = snapshotRef.current.profile.journeyDay || 1;
    const daySkipRef = `day-skip:${journeyDay}`;
    let nextLog = snapshotRef.current.activityLog;
    if (nextLog.some((event) => event.ref === daySkipRef)) {
      return;
    }
    const ids = (taskIds || []).map((id) => String(id || '').trim()).filter(Boolean);
    // If any today task is already completed, rest/skip is not allowed.
    if (ids.some((id) => nextLog.some((event) => event.ref === id))) {
      return;
    }
    for (const id of ids) {
      nextLog = logActivity(nextLog, { kind: 'workout', ref: `skip:${id}` });
    }
    nextLog = logActivity(nextLog, { kind: 'workout', ref: daySkipRef });

    const updatedMissions = snapshotRef.current.missions.map((item) =>
      item.completed ? item : { ...item, skipped: true, completed: false }
    );

    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      missions: updatedMissions,
      activityLog: nextLog,
      profile: {
        ...snapshotRef.current.profile,
        // Explicitly keep points/streak — rest day earns nothing
        points: snapshotRef.current.profile.points,
        streak: snapshotRef.current.profile.streak,
        level: snapshotRef.current.profile.level,
      },
    };
    void persistAll(next, { immediateCloud: true });
  }, [persistAll]);

  const missionsForProfile = (profile: UserProfile, catalog?: CatalogBundle) => {
    if (profile.trainingPlan?.days?.length) {
      return missionsFromPlanDay(profile.trainingPlan, profile.journeyDay || 1);
    }
    if (profile.goal && profile.dailyTime) {
      return missionsFromPlanDay(generateRoadmapTrainingPlan(profile), profile.journeyDay || 1);
    }
    return buildDailyMissions(profile, catalog, snapshotRef.current.completedLessonIds);
  };

  const resetMissions = () => {
    const generated = missionsForProfile(snapshotRef.current.profile);
    void persistAll({ ...snapshotRef.current, missions: generated });
  };

  const syncMissions = useCallback((catalog?: CatalogBundle) => {
    const profile = snapshotRef.current.profile;
    let saved = profile.trainingPlan;
    const category = primaryRoadmapCategory(profile.goal || '');
    const expectedExercises =
      exerciseCountForDay(profile.fitnessLevel || 'beginner', profile.dailyTime, false) +
      (category === 'yoga' ? 1 : 0);
    const sampleExercises = saved?.days?.[0]?.items.filter((item) => item.slot === 'exercise').length;
    const hasCourseOnToday = saved?.days?.some((day) => day.items.some((item) => item.slot === 'course'));
    const needsRoadmap =
      Boolean(profile.goal && profile.dailyTime) &&
      saved?.status !== 'completed' &&
      (!saved?.days?.length ||
        saved.generatedBy !== 'roadmap' ||
        (saved.fitnessLevel || '').toLowerCase() !== (profile.fitnessLevel || 'beginner').toLowerCase() ||
        hasCourseOnToday ||
        (typeof sampleExercises === 'number' && sampleExercises !== expectedExercises));
    if (needsRoadmap) {
      try {
        saved = generateRoadmapTrainingPlan({ ...profile, trainingPlan: saved });
      } catch (error) {
        console.warn('Roadmap rebuild failed', error);
        return;
      }
    } else if (saved?.days?.length) {
      saved = ensureYogaDeepBreathPlan(saved, profile.goal) || saved;
    }
    if (saved?.days?.length && catalog && planNeedsCatalogLinks(saved)) {
      saved = linkPlanToCatalog(saved, catalog);
    }
    const generated = saved?.days?.length
      ? missionsFromPlanDay(saved, profile.journeyDay || 1)
      : missionsForProfile({ ...profile, trainingPlan: saved }, catalog);
    const nextPlan = profile.goal ? planNameForGoal(profile.goal) : profile.planName;
    const missionsChanged = missionsNeedRefresh(snapshotRef.current.missions, generated);
    const planChanged = Boolean(nextPlan && nextPlan !== profile.planName);
    const linksChanged = saved !== profile.trainingPlan;
    if (!missionsChanged && !planChanged && !linksChanged) return;
    void persistAll({
      ...snapshotRef.current,
      missions: missionsChanged || linksChanged
        ? mergeMissionCompletion(snapshotRef.current.missions, generated)
        : snapshotRef.current.missions,
      profile: {
        ...profile,
        planName: planChanged ? nextPlan : profile.planName,
        trainingPlan: saved,
      },
    });
  }, [persistAll]);

  const buildOnboardingPlan = useCallback(async () => {
    if (aiPlanPromiseRef.current) return aiPlanPromiseRef.current;

    const run = (async () => {
      const { fetchCatalog } = await import('@/lib/catalog');
      const { generateRoadmapTrainingPlan } = await import('@/lib/exerciseRoadmap');
      const { buildRoadmapTrainingPlan } = await import('@/lib/exerciseRoadmapDb');
      const { fetchResolvedDailyPlan, itemsForDay, itemMetaLine, assignMemberDailyPlan } = await import('@/lib/dailyPlans');
      const { defaultMediaForDailyItem } = await import('@/lib/dailyPlanMedia');

      let catalog;
      try {
        catalog = await fetchCatalog();
      } catch {
        catalog = undefined;
      }

      const profileNow = snapshotRef.current.profile;
      let adminPlan = null as Awaited<ReturnType<typeof fetchResolvedDailyPlan>>;
      try {
        adminPlan = await fetchResolvedDailyPlan(profileNow, user?.email || null);
      } catch {
        adminPlan = null;
      }

      if (adminPlan?.id && user?.email) {
        await assignMemberDailyPlan(user.email, adminPlan.id);
      }

      const existing = profileNow.trainingPlan;
      let trainingPlan =
        existing?.days?.length && existing.generatedBy === 'roadmap'
          ? existing
          : generateRoadmapTrainingPlan(profileNow);
      try {
        const fromDb = await buildRoadmapTrainingPlan(profileNow, catalog);
        if (fromDb?.days?.length) trainingPlan = fromDb;
      } catch {
        // Keep the on-device roadmap as secondary structure.
      }
      trainingPlan = ensureYogaDeepBreathPlan(trainingPlan, profileNow.goal) || trainingPlan;

      const adminDayOne = itemsForDay(adminPlan, 1, ['exercise', 'rest']);
      const dayOneFromAdmin: Mission[] = adminDayOne.map((item) => {
        const media = defaultMediaForDailyItem(item);
        const accent =
          item.itemType === 'rest'
            ? colors.light.mint
            : item.itemType === 'recovery'
              ? colors.light.lavender
              : colors.light.pink;
        return {
          id: item.id,
          title: item.title,
          category: item.itemType === 'rest' || item.itemType === 'recovery' ? 'yoga' : 'fitness',
          duration: item.durationMinutes || 0,
          calories: 0,
          difficulty: item.intensityLevel || profileNow.fitnessLevel || 'Beginner',
          completed: false,
          skipped: false,
          accentColor: accent,
          icon: item.itemType === 'rest' ? 'moon' : 'activity',
          label: item.tag || item.itemType,
          slot: 'exercise',
          cue: item.cue || '',
          steps: item.steps || [],
          mediaUrl: media,
          metaLine: itemMetaLine(item),
        };
      });

      const dayOneRoadmap = missionsFromPlanDay(trainingPlan, 1);
      const dayOne = dayOneFromAdmin.length ? dayOneFromAdmin : dayOneRoadmap;

      const planName = adminPlan?.title || trainingPlan.planName;
      const durationDays = adminPlan?.durationDays || planTotalDays(trainingPlan.durationWeeks);
      const weeks = Math.max(1, Math.ceil(durationDays / 7));
      const dailyMinutes = dayOne.reduce((sum, item) => sum + (item.duration || 0), 0);

      await persistAll(
        {
          ...snapshotRef.current,
          profile: {
            ...snapshotRef.current.profile,
            trainingPlan,
            planName,
            planDurationWeeks: weeks,
            dailyPlanId: adminPlan?.id || snapshotRef.current.profile.dailyPlanId || '',
          },
        },
        { immediateCloud: true }
      );

      const plan: PersonalizedPlan = {
        planName,
        focusLabel: adminPlan?.userType || trainingPlan.goal,
        missions: dayOne,
        weekSchedule: weekPreviewFromPlan(trainingPlan),
        stats: {
          missionsPerDay: dayOne.length,
          weeks,
          focusAreas: trainingPlan.watchCourses.length,
          dailyMinutes,
        },
        courseIds: trainingPlan.courseIds,
        courseNames: trainingPlan.courseNames,
        hasCatalogLessons: trainingPlan.watchCourses.some((course) => course.lessons.length > 0),
        trainingPlan,
      };
      setStagedPlan(plan);
      return plan;
    })();

    aiPlanPromiseRef.current = run;
    try {
      return await run;
    } catch (error) {
      aiPlanPromiseRef.current = null;
      throw error;
    }
  }, [persistAll, user?.email]);

  const completeOnboarding = (profileUpdates: Partial<UserProfile>) => {
    const name =
      profileUpdates.name ||
      snapshotRef.current.profile.name ||
      (user ? `${user.firstName} ${user.lastName}`.trim() : '');
    const startedAt = new Date().toISOString();
    const merged = {
      ...snapshotRef.current.profile,
      ...profileUpdates,
      name,
      planName: stagedPlan?.planName || profileUpdates.planName || planNameForGoal(snapshotRef.current.profile.goal || profileUpdates.goal || ''),
      planStartedAt: startedAt,
      planDurationWeeks: stagedPlan?.stats?.weeks || stagedPlan?.trainingPlan?.durationWeeks || profileUpdates.planDurationWeeks || snapshotRef.current.profile.planDurationWeeks || 8,
      journeyDay: 1,
      streak: 0,
      points: 0,
      level: 1 as Level,
      dailyPlanId: snapshotRef.current.profile.dailyPlanId || '',
    };
    const sourcePlan = stagedPlan?.trainingPlan || snapshotRef.current.profile.trainingPlan;
    const trainingPlan = sourcePlan?.days?.length
      ? {
          ...sourcePlan,
          startedAt,
          endsAt: addDays(startedAt, planTotalDays(sourcePlan.durationWeeks)),
          status: 'active' as const,
        }
      : buildTrainingPlan({
          profile: merged,
          planName: merged.planName,
          courseIds: stagedPlan?.courseIds || sourcePlan?.courseIds || [],
          courseNames: stagedPlan?.courseNames || sourcePlan?.courseNames || [],
        });
    const profile = { ...merged, trainingPlan };
    const dayMissions =
      stagedPlan?.missions?.length
        ? stagedPlan.missions
        : missionsFromPlanDay(trainingPlan, 1).length
          ? missionsFromPlanDay(trainingPlan, 1)
          : buildDailyMissions(profile);
    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      profile,
      missions: dayMissions.map((item) => ({ ...item, completed: false, skipped: false })),
      activityLog: [],
      completedLessonIds: [],
      lessonWatchProgress: {},
      savedCourseIds: Array.from(new Set([...(trainingPlan.courseIds || [])])),
      onboardingCompleted: true,
    };
    setStagedPlan(null);
    void persistAll(next, { immediateCloud: true });
  };

  const advanceTestDay = useCallback(() => {
    const snapshot = snapshotRef.current;
    const profile = snapshot.profile;
    const totalDays = planTotalDays(profile.planDurationWeeks || profile.trainingPlan?.durationWeeks);
    if ((profile.journeyDay || 1) >= totalDays) return;

    const startedAt = profile.planStartedAt || startedAtFromJourney(profile.journeyDay || 1);
    const nextStarted = addDays(startedAt, -1);
    const nextJourney = Math.min(totalDays, journeyDayFromStart(nextStarted));
    let trainingPlan = profile.trainingPlan;
    let nextLog = snapshot.activityLog;
    const hadWork = snapshot.missions.some((item) => !item.skipped);
    if (trainingPlan?.days?.length) {
      for (const mission of snapshot.missions) {
        trainingPlan = markPlanItemComplete(trainingPlan, profile.journeyDay || 1, mission.id);
        if (mission.category === 'fitness' || mission.category === 'yoga' || mission.category === 'safety') {
          nextLog = logActivity(nextLog, { kind: 'workout', ref: `${mission.lessonId || mission.id}-d${profile.journeyDay}` });
        } else if (mission.category === 'recipe') {
          nextLog = logActivity(nextLog, { kind: 'recipe', ref: `${mission.id}-d${profile.journeyDay}` });
        } else if (mission.category === 'nutrition') {
          nextLog = logActivity(nextLog, { kind: 'nutrition', ref: `${mission.id}-d${profile.journeyDay}` });
        }
      }
    }
    const nextMissions = trainingPlan?.days?.length
      ? missionsFromPlanDay(trainingPlan, nextJourney)
      : snapshot.missions.map((item) => ({ ...item, completed: false, skipped: false }));

    let cycleDay = profile.cycleDay;
    let cyclePhase = profile.cyclePhase;
    if (cyclePhase !== 'none') {
      cycleDay = (Math.max(1, cycleDay) % 28) + 1;
      cyclePhase = phaseFromCycleDay(cycleDay);
    }

    void persistAll(
      {
        ...snapshot,
        missions: nextMissions,
        activityLog: nextLog,
        profile: {
          ...profile,
          planStartedAt: nextStarted,
          journeyDay: nextJourney,
          trainingPlan,
          cycleDay,
          cyclePhase,
          streak: hadWork ? profile.streak + 1 : profile.streak,
        },
      },
      { immediateCloud: true }
    );
  }, [persistAll]);

  const startNewPlan = useCallback(() => {
    const snapshot = snapshotRef.current;
    const restored = withDayPoints(snapshot.profile, snapshot.missions);
    const finished = snapshot.profile.trainingPlan
      ? {
          ...snapshot.profile.trainingPlan,
          status: 'completed' as const,
          performance: snapshotPerformance({
            profile: restored,
            activityLog: snapshot.activityLog,
            completedLessonIds: snapshot.completedLessonIds,
          }),
        }
      : null;
    const planHistory = finished
      ? [...(snapshot.profile.planHistory || []), finished].slice(-12)
      : snapshot.profile.planHistory || [];
    const { points, level } = neverLosePoints({ ...restored, planHistory, trainingPlan: null, journeyDay: 1 });
    const next: MemberProgressSnapshot = {
      ...snapshot,
      onboardingCompleted: false,
      missions: DEFAULT_MISSIONS,
      profile: {
        ...restored,
        goal: '',
        planName: '',
        planStartedAt: '',
        journeyDay: 1,
        planDurationWeeks: 8,
        trainingPlan: null,
        streak: restored.streak,
        points,
        level,
        planHistory,
      },
    };
    aiPlanPromiseRef.current = null;
    void persistAll(next, { immediateCloud: true });
  }, [persistAll]);

  const setLessonWatchProgress = (lessonId: string, percent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    const current = snapshotRef.current.lessonWatchProgress[lessonId] ?? 0;
    if (clamped <= current) return;
    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      lessonWatchProgress: {
        ...snapshotRef.current.lessonWatchProgress,
        [lessonId]: clamped,
      },
    };
    snapshotRef.current = next;
    setLessonWatchProgressState(next.lessonWatchProgress);
    if (clamped < 100 && clamped - current < 8) return;
    void persistAll(next, { skipCloud: clamped < 90, immediateCloud: clamped >= 90 });
  };

  const setLessonComplete = (lessonId: string, completed: boolean) => {
    const wasCompleted = snapshotRef.current.completedLessonIds.includes(lessonId);
    const completedLessonIdsNext = completed
      ? wasCompleted
        ? snapshotRef.current.completedLessonIds
        : [...snapshotRef.current.completedLessonIds, lessonId]
      : snapshotRef.current.completedLessonIds.filter((id) => id !== lessonId);

    let profileNext = snapshotRef.current.profile;
    let watchNext = snapshotRef.current.lessonWatchProgress;
    let activityNext = snapshotRef.current.activityLog;

    if (completed && !wasCompleted) {
      watchNext = { ...watchNext, [lessonId]: Math.max(watchNext[lessonId] ?? 0, 100) };
      activityNext = logActivity(activityNext, { kind: 'workout', ref: lessonId });
    }

    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      completedLessonIds: completedLessonIdsNext,
      lessonWatchProgress: watchNext,
      activityLog: activityNext,
      profile: profileNext,
    };
    void persistAll(next, { immediateCloud: true });
  };

  const toggleSavedCourse = (courseId: string) => {
    const saved = snapshotRef.current.savedCourseIds.includes(courseId)
      ? snapshotRef.current.savedCourseIds.filter((id) => id !== courseId)
      : [...snapshotRef.current.savedCourseIds, courseId];
    void persistAll({ ...snapshotRef.current, savedCourseIds: saved }, { immediateCloud: true });
  };

  const setLastViewedLesson = (lessonId: string) => {
    void persistAll({ ...snapshotRef.current, lastViewedLessonId: lessonId });
  };

  const saveCoachChatHistory = useCallback(
    (history: CoachChatHistoryMessage[]) => {
      const capped = history.slice(-100);
      void persistAll({ ...snapshotRef.current, coachChatHistory: capped }, { immediateCloud: true });
    },
    [persistAll]
  );

  const missionsCompleted = missions.filter(isMissionResolved).length;
  const totalMissions = missions.length;

  return (
    <AppContext.Provider
      value={{
        profile,
        missions,
        onboardingCompleted,
        completedLessonIds,
        lessonWatchProgress,
        savedCourseIds,
        lastViewedLessonId,
        coachChatHistory,
        activityLog,
        syncReady,
        stagedPlan,
        buildOnboardingPlan,
        updateProfile,
        completeMission,
        skipMission,
        skipTodayTasks,
        resetMissions,
        syncMissions,
        completeOnboarding,
        startNewPlan,
        advanceTestDay,
        setLessonComplete,
        setLessonWatchProgress,
        toggleSavedCourse,
        setLastViewedLesson,
        saveCoachChatHistory,
        missionsCompleted,
        totalMissions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
