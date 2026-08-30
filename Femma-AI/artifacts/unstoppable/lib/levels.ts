export type Level = 1 | 2 | 3 | 4 | 5;

export const POINTS_PER_DAY = 10;

export const LEVEL_THRESHOLDS: Record<Level, number> = {
  1: 0,
  2: 100,
  3: 500,
  4: 1000,
  5: 3000,
};

export function levelFromPoints(points: number): Level {
  if (points >= LEVEL_THRESHOLDS[5]) return 5;
  if (points >= LEVEL_THRESHOLDS[4]) return 4;
  if (points >= LEVEL_THRESHOLDS[3]) return 3;
  if (points >= LEVEL_THRESHOLDS[2]) return 2;
  return 1;
}

export function pointsFromCompletedDays(days: number) {
  return Math.max(0, days) * POINTS_PER_DAY;
}
