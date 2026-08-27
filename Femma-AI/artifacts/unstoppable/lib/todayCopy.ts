import type { UserProfile } from '@/context/AppContext';

/** Motivational quote on the Today tab — avoids "yesterday" copy on day 1 / zero streak. */
export function getTodayMotivational(
  profile: UserProfile,
  missionsCompleted: number,
  totalMissions: number
): string {
  const day = Math.max(1, profile.journeyDay || 1);
  const streak = Math.max(0, profile.streak || 0);
  const allDone = totalMissions > 0 && missionsCompleted === totalMissions;

  if (day === 1 && streak === 0) {
    if (allDone) {
      return 'Great start — you finished day one. That is how unstoppable habits begin.';
    }
    if (profile.goal) {
      return `Day 1 of your ${profile.goal.toLowerCase()} journey. One mission at a time.`;
    }
    if (profile.planName) {
      return `Welcome to ${profile.planName}. Your first missions are ready.`;
    }
    return 'Welcome — your Fema AI journey starts today.';
  }

  if (streak >= 3) {
    return `${streak} days strong — keep the momentum going.`;
  }

  if (streak === 2) {
    return 'Two days in a row. You are building a real habit.';
  }

  if (streak === 1) {
    return allDone
      ? 'Day one in the books. Come back tomorrow to keep your streak alive.'
      : 'You started strong — finish today\'s missions to build your streak.';
  }

  const rotating = [
    'Small steps build unstoppable confidence.',
    'Listen to your body and move at your pace.',
    'Your next level is closer than you think.',
    "Today's mission is ready. Let's go.",
  ];

  if (streak >= 1 && day >= 2) {
    rotating.splice(1, 0, 'You are stronger than yesterday.');
  }

  return rotating[(day - 1) % rotating.length];
}

export function formatStreakValue(streak: number): string {
  return String(Math.max(0, streak));
}

export function formatStreakLabel(streak: number): string {
  if (streak <= 0) return 'Start your streak';
  if (streak === 1) return 'day streak';
  return 'day streak';
}

/** Week dots for Progress tab — derived from streak, not hardcoded. */
export function buildWeekActivity(streak: number): boolean[] {
  const today = new Date().getDay();
  const mondayIndex = today === 0 ? 6 : today - 1;
  const active = Array.from({ length: 7 }, () => false);
  const days = Math.min(Math.max(0, streak), 7);

  for (let i = 0; i < days; i++) {
    const idx = mondayIndex - i;
    if (idx >= 0) active[idx] = true;
  }

  return active;
}
