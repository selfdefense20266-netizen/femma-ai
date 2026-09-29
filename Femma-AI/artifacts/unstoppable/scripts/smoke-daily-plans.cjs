/* eslint-disable no-console */
/** Smoke tests for daily plan matching (plain Node, mirrors lib/dailyPlans.ts logic). */

function intensityFromProfile(fitnessLevel) {
  const v = String(fitnessLevel || '').toLowerCase();
  if (v.includes('active') || v.includes('advanced')) return 'active';
  if (v.includes('intermediate')) return 'intermediate';
  return 'beginner';
}

function scorePlan(plan, userType) {
  let score = 0;
  if (plan.userType === userType) score += 100;
  else if (plan.userType === 'general' && (userType === 'general' || userType === 'all')) score += 50;
  else if (plan.userType === 'all') score += 40;
  else return -1;
  return score;
}

function resolveDailyPlanMeta(plans, profile, assignedPlanId) {
  if (!plans.length) return null;
  if (assignedPlanId) {
    const assigned = plans.find((plan) => plan.id === assignedPlanId);
    if (assigned) return assigned;
  }
  const userType = profile.goal && /yoga/i.test(profile.goal) ? 'yoga' : 'general';
  let best = null;
  let bestScore = -1;
  for (const plan of plans) {
    const s = scorePlan(plan, userType);
    if (s > bestScore) {
      bestScore = s;
      best = plan;
    }
  }
  if (best && bestScore >= 100) return best;
  return plans.find((p) => p.userType === 'general' || p.userType === 'all') || null;
}

function itemsForDay(plan, journeyDay = 1, types) {
  if (!plan?.items?.length) return [];
  const duration = Math.max(1, plan.durationDays || 7);
  const dayNumber = ((Math.max(1, journeyDay) - 1) % duration) + 1;
  const dayItems = plan.items.filter((item) => Number(item.dayNumber || 1) === dayNumber);
  const source = dayItems.length ? dayItems : plan.items.filter((item) => Number(item.dayNumber || 1) === 1);
  const filtered = !types?.length ? source : source.filter((item) => types.includes(item.itemType));
  return filtered.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const plans = [
  { id: 'activity-boxing', title: 'Boxing Plan', userType: 'boxing' },
  { id: 'activity-yoga', title: 'Yoga Plan', userType: 'yoga' },
  { id: 'activity-general', title: 'General Plan', userType: 'general' },
];

assert(resolveDailyPlanMeta(plans, { goal: 'yoga' }, null)?.id === 'activity-yoga', 'yoga match');
assert(resolveDailyPlanMeta(plans, { goal: 'yoga' }, 'activity-boxing')?.id === 'activity-boxing', 'assigned wins');
assert(
  resolveDailyPlanMeta(
    plans.filter((p) => p.userType === 'boxing'),
    { goal: 'yoga' },
    null
  ) === null,
  'no wrong activity fallback'
);
assert(intensityFromProfile('Intermediate') === 'intermediate', 'intensity');

const sample = {
  durationDays: 7,
  items: [
    { dayNumber: 1, itemType: 'exercise', title: 'Second', sortOrder: 2 },
    { dayNumber: 1, itemType: 'exercise', title: 'First', sortOrder: 0 },
  ],
};
const day = itemsForDay(sample, 1, ['exercise']);
assert(day[0].title === 'First' && day[1].title === 'Second', 'sort order');

console.log('OK: daily plan matching smoke tests passed');
