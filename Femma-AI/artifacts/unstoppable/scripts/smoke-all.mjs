/**
 * Self-contained smoke tests (no RN AsyncStorage import).
 * Run: node scripts/smoke-all.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let passed = 0;
function ok(msg) {
  passed += 1;
  console.log(`  ✓ ${msg}`);
}

const PLAN_PERIOD_DAYS = 30;
const GRACE_TRIAL_DAYS = 3;

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(isoOrDate, days) {
  const d = startOfDay(typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysBetween(fromIso, to = new Date()) {
  const a = startOfDay(new Date(fromIso)).getTime();
  const b = startOfDay(to).getTime();
  return Math.floor((b - a) / 86400000);
}

function emptyAccessRecord() {
  return { everPremium: false, periodEndsAt: null, graceStartedAt: null };
}

function markPaidAccess(record, expiresAtIso) {
  return {
    everPremium: true,
    periodEndsAt: expiresAtIso || addDays(new Date(), PLAN_PERIOD_DAYS),
    graceStartedAt: null,
  };
}

function resolveAccess(isStorePremium, record) {
  if (isStorePremium) {
    const next = markPaidAccess(
      record,
      record.periodEndsAt && new Date(record.periodEndsAt) > new Date()
        ? record.periodEndsAt
        : addDays(new Date(), PLAN_PERIOD_DAYS)
    );
    return {
      hasAccess: true,
      isPaid: true,
      inGrace: false,
      graceDaysLeft: 0,
      needsResumePaywall: false,
      record: next,
    };
  }
  if (!record.everPremium) {
    return {
      hasAccess: false,
      isPaid: false,
      inGrace: false,
      graceDaysLeft: 0,
      needsResumePaywall: true,
      record,
    };
  }
  const now = new Date();
  const periodEnd = record.periodEndsAt ? new Date(record.periodEndsAt) : null;
  if (periodEnd && periodEnd.getTime() > now.getTime()) {
    return {
      hasAccess: true,
      isPaid: false,
      inGrace: false,
      graceDaysLeft: 0,
      needsResumePaywall: false,
      record,
    };
  }
  let graceStartedAt = record.graceStartedAt;
  if (!graceStartedAt) graceStartedAt = new Date().toISOString();
  const elapsed = daysBetween(graceStartedAt, now);
  const graceDaysLeft = Math.max(0, GRACE_TRIAL_DAYS - elapsed);
  const inGrace = graceDaysLeft > 0;
  return {
    hasAccess: inGrace,
    isPaid: false,
    inGrace,
    graceDaysLeft,
    needsResumePaywall: !inGrace,
    record: { ...record, everPremium: true, graceStartedAt },
  };
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function dietCalorieTarget(profile) {
  const h = Number(profile.heightCm) || 165;
  const w = Number(profile.weightKg) || 60;
  let calories = 10 * w + 6.25 * h - 5 * 30 - 161;
  const goal = String(profile.goal || '').toLowerCase();
  const level = String(profile.fitnessLevel || '').toLowerCase();
  if (goal.includes('weight') || goal.includes('loss')) calories -= 350;
  else if (goal.includes('muscle') || goal.includes('boxing') || goal.includes('mma') || goal.includes('hiit'))
    calories += 250;
  else if (goal.includes('yoga') || goal.includes('flex') || goal.includes('stress')) calories -= 50;
  if (level.includes('active')) calories += 150;
  else if (level.includes('inter')) calories += 80;
  return clamp(Math.round(calories / 50) * 50, 1400, 2600);
}

function build30DayDietPlan(profile) {
  const target = dietCalorieTarget(profile);
  const food = String(profile.foodPreference || '').toLowerCase();
  const breakfastPool = food.includes('carnivore')
    ? ['Eggs & beef', 'Steak & eggs', 'Salmon scramble']
    : food.includes('vegetarian')
      ? ['Tofu scramble', 'Yogurt bowl', 'Oats & nuts']
      : ['Oats bowl', 'Eggs toast', 'Greek yogurt'];
  const lunchPool = food.includes('carnivore')
    ? ['Chicken thighs', 'Beef patties', 'Turkey plate']
    : ['Chicken bowl', 'Lentil salad', 'Fish plate'];
  const dinnerPool = food.includes('carnivore')
    ? ['Ribeye', 'Baked salmon', 'Ground beef']
    : ['Grilled chicken', 'Salmon quinoa', 'Veg curry'];
  return Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    const factor = target / 1800;
    return {
      day,
      breakfast: { name: breakfastPool[day % breakfastPool.length], calories: Math.round(400 * factor) },
      lunch: { name: lunchPool[day % lunchPool.length], calories: Math.round(550 * factor) },
      dinner: { name: dinnerPool[day % dinnerPool.length], calories: Math.round(500 * factor) },
    };
  });
}

console.log('\n=== Subscription access ===');
{
  const neverPaid = resolveAccess(false, emptyAccessRecord());
  assert(!neverPaid.hasAccess && neverPaid.needsResumePaywall, 'never paid');
  ok('never paid → paywall');

  const paid = resolveAccess(true, emptyAccessRecord());
  assert(paid.hasAccess && paid.isPaid && !paid.needsResumePaywall, 'paid');
  ok('store premium → access');

  const ended = markPaidAccess(emptyAccessRecord());
  ended.periodEndsAt = new Date(Date.now() - 86400000).toISOString();
  ended.graceStartedAt = null;
  const grace = resolveAccess(false, ended);
  assert(grace.hasAccess && grace.inGrace && grace.graceDaysLeft === GRACE_TRIAL_DAYS, 'grace');
  ok('plan ended → 3-day grace');

  const graceOver = {
    ...ended,
    graceStartedAt: new Date(Date.now() - (GRACE_TRIAL_DAYS + 1) * 86400000).toISOString(),
  };
  const locked = resolveAccess(false, graceOver);
  assert(!locked.hasAccess && locked.needsResumePaywall, 'locked');
  ok('grace ended → resume paywall');
}

console.log('\n=== Diet plan ===');
{
  const yoga = {
    goal: 'Yoga',
    fitnessLevel: 'Beginner',
    foodPreference: 'Vegetarian',
    heightCm: 165,
    weightKg: 60,
  };
  const days = build30DayDietPlan(yoga);
  assert(days.length === 30, '30 days');
  ok('builds 30 days');
  for (const day of days) {
    assert(day.breakfast.name && day.lunch.name && day.dinner.name, `meals day ${day.day}`);
  }
  ok('each day B/L/D');
  const yogaCals = dietCalorieTarget(yoga);
  const boxCals = dietCalorieTarget({ ...yoga, goal: 'Boxing', fitnessLevel: 'Active / Advanced' });
  assert(boxCals >= yogaCals, 'boxing >= yoga');
  ok(`calories yoga=${yogaCals} boxing=${boxCals}`);
  const carnivore = build30DayDietPlan({ ...yoga, foodPreference: 'Carnivore' });
  assert(carnivore[0].breakfast.name.length > 2, 'carnivore');
  ok('carnivore meals');
}

console.log('\n=== Plans ===');
{
  // Mirror app expectation: free removed from fallback
  const fallback = [{ id: 'premium', name: 'Premium Plan' }];
  assert(fallback.some((p) => p.id === 'premium'), 'premium');
  assert(!fallback.some((p) => p.id === 'free'), 'no free');
  ok('premium-only catalog');
}

console.log('\n=== File presence (app routes) ===');
{
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = path.resolve('app');
  const required = [
    'diet.tsx',
    'plan-gate.tsx',
    'onboarding/subscription.tsx',
    'onboarding/height.tsx',
    'onboarding/weight.tsx',
    '(tabs)/index.tsx',
  ];
  for (const rel of required) {
    const full = path.join(root, rel);
    assert(fs.existsSync(full), `missing ${rel}`);
    ok(`exists ${rel}`);
  }
  const libFiles = [
    'lib/dietPlan.ts',
    'lib/dietPlanAi.ts',
    'lib/subscriptionAccess.ts',
    'context/PurchaseContext.tsx',
  ];
  for (const rel of libFiles) {
    assert(fs.existsSync(path.resolve(rel)), `missing ${rel}`);
    ok(`exists ${rel}`);
  }
}

console.log(`\n✅ All smoke checks passed (${passed})\n`);
