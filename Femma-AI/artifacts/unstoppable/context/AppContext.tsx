import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '@/constants/colors';

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
}

export interface UserProfile {
  name: string;
  goal: string;
  fitnessLevel: string;
  environment: string;
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
  name: 'Maya',
  goal: 'Build confidence',
  fitnessLevel: 'Beginner',
  environment: 'Home',
  planName: 'Confidence Builder Plan',
  journeyDay: 12,
  streak: 7,
  level: 2,
  points: 1450,
  cyclePhase: 'follicular',
  cycleDay: 8,
  isPregnant: false,
  pregnancyWeek: 0,
};

interface AppContextType {
  profile: UserProfile;
  missions: Mission[];
  onboardingCompleted: boolean;
  completedLessonIds: string[];
  savedCourseIds: string[];
  lastViewedLessonId: string | null;
  updateProfile: (updates: Partial<UserProfile>) => void;
  completeMission: (id: string) => void;
  resetMissions: () => void;
  completeOnboarding: (profile: Partial<UserProfile>) => void;
  setLessonComplete: (lessonId: string, completed: boolean) => void;
  toggleSavedCourse: (courseId: string) => void;
  setLastViewedLesson: (lessonId: string) => void;
  missionsCompleted: number;
  totalMissions: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [missions, setMissions] = useState<Mission[]>(DEFAULT_MISSIONS);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [savedCourseIds, setSavedCourseIds] = useState<string[]>([]);
  const [lastViewedLessonId, setLastViewedLessonIdState] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [savedProfile, savedMissions, completed, savedLessons, savedCourses, lastLesson] = await Promise.all([
          AsyncStorage.getItem('user_profile'),
          AsyncStorage.getItem('daily_missions'),
          AsyncStorage.getItem('onboarding_completed'),
          AsyncStorage.getItem('completed_video_lessons'),
          AsyncStorage.getItem('saved_video_courses'),
          AsyncStorage.getItem('last_viewed_video_lesson'),
        ]);
        if (savedProfile) setProfile(JSON.parse(savedProfile));
        if (savedMissions) setMissions(JSON.parse(savedMissions));
        if (completed === 'true') setOnboardingCompleted(true);
        if (savedLessons) setCompletedLessonIds(JSON.parse(savedLessons));
        if (savedCourses) setSavedCourseIds(JSON.parse(savedCourses));
        if (lastLesson) setLastViewedLessonIdState(lastLesson);
      } catch {}
    };
    load();
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem('user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const completeMission = (id: string) => {
    setMissions(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, completed: true } : m);
      AsyncStorage.setItem('daily_missions', JSON.stringify(updated));
      return updated;
    });
    setProfile(prev => {
      const newPoints = prev.points + 50;
      const newLevel: Level = newPoints >= 10000 ? 5 : newPoints >= 6000 ? 4 : newPoints >= 3000 ? 3 : newPoints >= 1000 ? 2 : 1;
      const updated = { ...prev, points: newPoints, level: newLevel };
      AsyncStorage.setItem('user_profile', JSON.stringify(updated));
      return updated;
    });
  };

  const resetMissions = () => {
    setMissions(DEFAULT_MISSIONS);
    AsyncStorage.setItem('daily_missions', JSON.stringify(DEFAULT_MISSIONS));
  };

  const completeOnboarding = (profileUpdates: Partial<UserProfile>) => {
    const updated = { ...DEFAULT_PROFILE, ...profileUpdates };
    setProfile(updated);
    setOnboardingCompleted(true);
    AsyncStorage.setItem('user_profile', JSON.stringify(updated));
    AsyncStorage.setItem('onboarding_completed', 'true');
  };

  const setLessonComplete = (lessonId: string, completed: boolean) => {
    setCompletedLessonIds(prev => {
      const wasCompleted = prev.includes(lessonId);
      const updated = completed
        ? (wasCompleted ? prev : [...prev, lessonId])
        : prev.filter(id => id !== lessonId);

      if (updated !== prev) {
        AsyncStorage.setItem('completed_video_lessons', JSON.stringify(updated));
      }

      if (completed && !wasCompleted) {
        setProfile(current => {
          const newPoints = current.points + 25;
          const newLevel: Level = newPoints >= 10000 ? 5 : newPoints >= 6000 ? 4 : newPoints >= 3000 ? 3 : newPoints >= 1000 ? 2 : 1;
          const updatedProfile = { ...current, points: newPoints, level: newLevel };
          AsyncStorage.setItem('user_profile', JSON.stringify(updatedProfile));
          return updatedProfile;
        });
      }

      return updated;
    });
  };

  const toggleSavedCourse = (courseId: string) => {
    setSavedCourseIds(prev => {
      const updated = prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId];
      AsyncStorage.setItem('saved_video_courses', JSON.stringify(updated));
      return updated;
    });
  };

  const setLastViewedLesson = (lessonId: string) => {
    setLastViewedLessonIdState(lessonId);
    AsyncStorage.setItem('last_viewed_video_lesson', lessonId);
  };

  const missionsCompleted = missions.filter(m => m.completed).length;
  const totalMissions = missions.length;

  return (
    <AppContext.Provider value={{
      profile,
      missions,
      onboardingCompleted,
      completedLessonIds,
      savedCourseIds,
      lastViewedLessonId,
      updateProfile,
      completeMission,
      resetMissions,
      completeOnboarding,
      setLessonComplete,
      toggleSavedCourse,
      setLastViewedLesson,
      missionsCompleted,
      totalMissions,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
