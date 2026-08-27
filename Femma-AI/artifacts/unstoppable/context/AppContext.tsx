import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import {
  fetchMemberProgress,
  mergeProgressSnapshots,
  saveMemberProgress,
  type MemberProgressSnapshot,
} from '@/lib/memberProgress';
import { buildDailyMissions, mergeMissionCompletion, missionsNeedRefresh, planNameForGoal } from '@/lib/dailyMissions';
import type { CatalogBundle } from '@/lib/catalog';

export type MissionCategory = 'fitness' | 'yoga' | 'safety' | 'nutrition' | 'recipe';
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
  accentColor: string;
  icon: string;
  label?: string;
  href?: string;
  courseId?: string;
  lessonId?: string;
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
  isPregnant: boolean;
  pregnancyWeek: number;
}

export const LEVEL_NAMES: Record<Level, string> = {
  1: 'Beginner',
  2: 'Warrior',
  3: 'Protector',
  4: 'Elite',
  5: 'Goddess',
};

export const LEVEL_COLORS: Record<Level, string> = {
  1: colors.light.mint,
  2: colors.light.skyBlue,
  3: colors.light.lavender,
  4: colors.light.pink,
  5: colors.light.warmYellow,
};

export const CYCLE_PHASE_INFO: Record<CyclePhase, { name: string; color: string; insight: string }> = {
  menstrual: { name: 'Menstrual', color: colors.light.coral, insight: 'Rest and gentle movement support your body today.' },
  follicular: { name: 'Follicular', color: colors.light.mint, insight: 'Your energy is rising — great time for new challenges.' },
  ovulation: { name: 'Ovulation', color: colors.light.pink, insight: 'Peak energy phase — push a little harder today.' },
  luteal: { name: 'Luteal', color: colors.light.lavender, insight: 'Wind down with yoga and gentle workouts this week.' },
  none: { name: 'Not tracking', color: colors.light.muted, insight: '' },
};

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
  isPregnant: false,
  pregnancyWeek: 0,
};

const STORAGE_KEYS = {
  profile: 'user_profile',
  missions: 'daily_missions',
  onboarding: 'onboarding_completed',
  lessons: 'completed_video_lessons',
  courses: 'saved_video_courses',
  lastLesson: 'last_viewed_video_lesson',
  watch: 'lesson_watch_progress',
} as const;

interface AppContextType {
  profile: UserProfile;
  missions: Mission[];
  onboardingCompleted: boolean;
  completedLessonIds: string[];
  lessonWatchProgress: Record<string, number>;
  savedCourseIds: string[];
  lastViewedLessonId: string | null;
  syncReady: boolean;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeMission: (idOrKey: string) => boolean;
  resetMissions: () => void;
  syncMissions: (catalog?: CatalogBundle) => void;
  completeOnboarding: (profile: Partial<UserProfile>) => void;
  setLessonComplete: (lessonId: string, completed: boolean) => void;
  setLessonWatchProgress: (lessonId: string, percent: number) => void;
  toggleSavedCourse: (courseId: string) => void;
  setLastViewedLesson: (lessonId: string) => void;
  missionsCompleted: number;
  totalMissions: number;
}

const AppContext = createContext<AppContextType | null>(null);

async function writeLocalSnapshot(snapshot: MemberProgressSnapshot) {
  await Promise.all([
    AsyncStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(snapshot.profile)),
    AsyncStorage.setItem(STORAGE_KEYS.missions, JSON.stringify(snapshot.missions)),
    AsyncStorage.setItem(STORAGE_KEYS.onboarding, snapshot.onboardingCompleted ? 'true' : 'false'),
    AsyncStorage.setItem(STORAGE_KEYS.lessons, JSON.stringify(snapshot.completedLessonIds)),
    AsyncStorage.setItem(STORAGE_KEYS.courses, JSON.stringify(snapshot.savedCourseIds)),
    AsyncStorage.setItem(STORAGE_KEYS.watch, JSON.stringify(snapshot.lessonWatchProgress)),
    snapshot.lastViewedLessonId
      ? AsyncStorage.setItem(STORAGE_KEYS.lastLesson, snapshot.lastViewedLessonId)
      : AsyncStorage.removeItem(STORAGE_KEYS.lastLesson),
  ]);
}

async function readLocalSnapshot(): Promise<MemberProgressSnapshot> {
  const [savedProfile, savedMissions, completed, savedLessons, savedCourses, lastLesson, watchProgress] =
    await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.profile),
      AsyncStorage.getItem(STORAGE_KEYS.missions),
      AsyncStorage.getItem(STORAGE_KEYS.onboarding),
      AsyncStorage.getItem(STORAGE_KEYS.lessons),
      AsyncStorage.getItem(STORAGE_KEYS.courses),
      AsyncStorage.getItem(STORAGE_KEYS.lastLesson),
      AsyncStorage.getItem(STORAGE_KEYS.watch),
    ]);

  return {
    profile: savedProfile ? { ...DEFAULT_PROFILE, ...JSON.parse(savedProfile) } : DEFAULT_PROFILE,
    missions: savedMissions ? JSON.parse(savedMissions) : DEFAULT_MISSIONS,
    onboardingCompleted: completed === 'true',
    completedLessonIds: savedLessons ? JSON.parse(savedLessons) : [],
    savedCourseIds: savedCourses ? JSON.parse(savedCourses) : [],
    lastViewedLessonId: lastLesson || null,
    lessonWatchProgress: watchProgress ? JSON.parse(watchProgress) : {},
  };
}

function levelFromPoints(points: number): Level {
  if (points >= 10000) return 5;
  if (points >= 6000) return 4;
  if (points >= 3000) return 3;
  if (points >= 1000) return 2;
  return 1;
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
  const exact = missions.findIndex(
    (item) => !item.completed && (keys.includes(item.id) || (item.lessonId && keys.includes(item.lessonId)))
  );
  if (exact >= 0) return exact;
  const byCourse = missions.findIndex(
    (item) => !item.completed && item.courseId && keys.includes(item.courseId)
  );
  if (byCourse >= 0) return byCourse;
  return missions.findIndex((item) => !item.completed && keys.includes(item.category));
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [missions, setMissions] = useState<Mission[]>(DEFAULT_MISSIONS);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [lessonWatchProgress, setLessonWatchProgressState] = useState<Record<string, number>>({});
  const [savedCourseIds, setSavedCourseIds] = useState<string[]>([]);
  const [lastViewedLessonId, setLastViewedLessonIdState] = useState<string | null>(null);
  const [syncReady, setSyncReady] = useState(false);
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef<MemberProgressSnapshot>({
    profile: DEFAULT_PROFILE,
    missions: DEFAULT_MISSIONS,
    onboardingCompleted: false,
    completedLessonIds: [],
    lessonWatchProgress: {},
    savedCourseIds: [],
    lastViewedLessonId: null,
  });

  const applySnapshot = useCallback((snapshot: MemberProgressSnapshot) => {
    snapshotRef.current = snapshot;
    setProfile(snapshot.profile);
    setMissions(snapshot.missions.length ? snapshot.missions : DEFAULT_MISSIONS);
    setOnboardingCompleted(snapshot.onboardingCompleted);
    setCompletedLessonIds(snapshot.completedLessonIds);
    setLessonWatchProgressState(snapshot.lessonWatchProgress);
    setSavedCourseIds(snapshot.savedCourseIds);
    setLastViewedLessonIdState(snapshot.lastViewedLessonId);
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
    async (snapshot: MemberProgressSnapshot, options?: { immediateCloud?: boolean }) => {
      applySnapshot(snapshot);
      await writeLocalSnapshot(snapshot);
      if (user?.email) {
        queueCloudSave(snapshot, options?.immediateCloud);
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
    if (!user?.email || !syncReady) return;
    let mounted = true;

    (async () => {
      try {
        const remote = await fetchMemberProgress(user.email);
        if (!mounted) return;
        const merged = mergeProgressSnapshots(snapshotRef.current, remote);
        applySnapshot(merged);
        await writeLocalSnapshot(merged);
        await saveMemberProgress(merged, user.email);
      } catch (error) {
        console.warn('Cloud progress sync failed', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.email, syncReady, applySnapshot]);

  useEffect(() => {
    return () => {
      if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
    };
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    const next = {
      ...snapshotRef.current,
      profile: { ...snapshotRef.current.profile, ...updates },
    };
    void persistAll(next);
  };

  const completeMission = useCallback((idOrKey: string) => {
    const index = findMissionIndex(snapshotRef.current.missions, idOrKey);
    if (index < 0) return false;

    const updatedMissions = snapshotRef.current.missions.map((item, i) =>
      i === index ? { ...item, completed: true } : item
    );
    const allDone = updatedMissions.length > 0 && updatedMissions.every((item) => item.completed);
    const newPoints = snapshotRef.current.profile.points + 50;
    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      missions: updatedMissions,
      profile: {
        ...snapshotRef.current.profile,
        points: newPoints,
        level: levelFromPoints(newPoints),
        streak: allDone ? snapshotRef.current.profile.streak + 1 : snapshotRef.current.profile.streak,
      },
    };
    void persistAll(next, { immediateCloud: true });
    return true;
  }, [persistAll]);

  const resetMissions = () => {
    const generated = buildDailyMissions(snapshotRef.current.profile);
    void persistAll({ ...snapshotRef.current, missions: generated });
  };

  const syncMissions = useCallback((catalog?: CatalogBundle) => {
    const profile = snapshotRef.current.profile;
    const generated = buildDailyMissions(profile, catalog, snapshotRef.current.completedLessonIds);
    const nextPlan = profile.goal ? planNameForGoal(profile.goal) : profile.planName;
    const missionsChanged = missionsNeedRefresh(snapshotRef.current.missions, generated);
    const planChanged = Boolean(nextPlan && nextPlan !== profile.planName);
    if (!missionsChanged && !planChanged) return;
    void persistAll({
      ...snapshotRef.current,
      missions: missionsChanged ? mergeMissionCompletion(snapshotRef.current.missions, generated) : snapshotRef.current.missions,
      profile: planChanged ? { ...profile, planName: nextPlan } : profile,
    });
  }, [persistAll]);

  const completeOnboarding = (profileUpdates: Partial<UserProfile>) => {
    const name =
      profileUpdates.name ||
      snapshotRef.current.profile.name ||
      (user ? `${user.firstName} ${user.lastName}`.trim() : '');
    const profile = {
      ...snapshotRef.current.profile,
      ...profileUpdates,
      name,
      planName: profileUpdates.planName || planNameForGoal(snapshotRef.current.profile.goal || profileUpdates.goal || ''),
    };
    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      profile,
      missions: buildDailyMissions(profile),
      onboardingCompleted: true,
    };
    void persistAll(next, { immediateCloud: true });
  };

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
    void persistAll(next);
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

    if (completed && !wasCompleted) {
      watchNext = { ...watchNext, [lessonId]: Math.max(watchNext[lessonId] ?? 0, 100) };
      const newPoints = profileNext.points + 25;
      profileNext = { ...profileNext, points: newPoints, level: levelFromPoints(newPoints) };
    }

    const next: MemberProgressSnapshot = {
      ...snapshotRef.current,
      completedLessonIds: completedLessonIdsNext,
      lessonWatchProgress: watchNext,
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

  const missionsCompleted = missions.filter((m) => m.completed).length;
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
        syncReady,
        updateProfile,
        completeMission,
        resetMissions,
        syncMissions,
        completeOnboarding,
        setLessonComplete,
        setLessonWatchProgress,
        toggleSavedCourse,
        setLastViewedLesson,
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
