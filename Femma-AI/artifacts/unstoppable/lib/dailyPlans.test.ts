/**
 * Lightweight unit checks for admin daily-plan matching (no network).
 * Run: node --experimental-strip-types lib/dailyPlans.test.ts
 * or via the compiled smoke below from scripts.
 */
import {
  intensityFromProfile,
  itemsForDay,
  resolveDailyPlanMeta,
  userTypeFromProfile,
  type DailyPlan,
} from './dailyPlans';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

const plans = [
  { id: 'activity-boxing', title: 'Boxing Plan', description: '', userType: 'boxing', status: 'published', sortOrder: 0, durationDays: 30 },
  { id: 'activity-yoga', title: 'Yoga Plan', description: '', userType: 'yoga', status: 'published', sortOrder: 1, durationDays: 30 },
  { id: 'activity-general', title: 'General Plan', description: '', userType: 'general', status: 'published', sortOrder: 2, durationDays: 14 },
];

const yogaMeta = resolveDailyPlanMeta(plans, { goal: 'yoga', isPregnant: false, fitnessLevel: 'Intermediate' }, null);
assert(yogaMeta?.id === 'activity-yoga', `yoga user should get yoga plan, got ${yogaMeta?.id}`);

const assigned = resolveDailyPlanMeta(plans, { goal: 'yoga', isPregnant: false, fitnessLevel: 'Beginner' }, 'activity-boxing');
assert(assigned?.id === 'activity-boxing', 'assigned plan id must win');

const unknown = resolveDailyPlanMeta(
  plans.filter((p) => p.userType !== 'yoga' && p.userType !== 'general'),
  { goal: 'yoga', isPregnant: false, fitnessLevel: 'Beginner' },
  null
);
assert(unknown === null, 'do not fall back to boxing for yoga when no yoga/general plan');

assert(intensityFromProfile('Intermediate') === 'intermediate', 'intensity Intermediate');
assert(intensityFromProfile('Active / Advanced') === 'active', 'intensity Active');
assert(userTypeFromProfile({ goal: 'yoga flow', isPregnant: false, fitnessLevel: 'beginner' }) === 'yoga', 'userType yoga');

const sample: DailyPlan = {
  id: 'activity-yoga',
  title: 'Yoga Plan',
  description: '',
  userType: 'yoga',
  status: 'published',
  sortOrder: 0,
  durationDays: 7,
  items: [
    {
      id: 'b',
      planId: 'activity-yoga',
      dayNumber: 1,
      intensityLevel: 'intermediate',
      recoveryType: '',
      itemType: 'exercise',
      title: 'Second',
      tag: '',
      subtitle: '',
      scheduledTime: '',
      durationMinutes: 10,
      restMinutes: 1,
      mediaUrl: null,
      cue: '',
      steps: [],
      sortOrder: 2,
    },
    {
      id: 'a',
      planId: 'activity-yoga',
      dayNumber: 1,
      intensityLevel: 'intermediate',
      recoveryType: '',
      itemType: 'exercise',
      title: 'First',
      tag: '',
      subtitle: '',
      scheduledTime: '',
      durationMinutes: 10,
      restMinutes: 1,
      mediaUrl: null,
      cue: '',
      steps: [],
      sortOrder: 0,
    },
  ],
};

const day = itemsForDay(sample, 1, ['exercise']);
assert(day[0]?.title === 'First' && day[1]?.title === 'Second', 'itemsForDay must sort by sortOrder');

console.log('dailyPlans checks passed');
