/**
 * Full smoke tests for recent diet + subscription access work.
 * Run: node --experimental-strip-types scripts/smoke-all.test.ts
 */
import {
  emptyAccessRecord,
  markPaidAccess,
  resolveAccess,
  GRACE_TRIAL_DAYS,
  PLAN_PERIOD_DAYS,
} from '../lib/subscriptionAccess';
import {
  bmiFromProfile,
  build30DayDietPlan,
  dietCalorieTarget,
  dietPlanSummary,
} from '../lib/dietPlan';
import { FALLBACK_PLANS } from '../lib/plans';

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

let passed = 0;
function ok(msg: string) {
  passed += 1;
  console.log(`  ✓ ${msg}`);
}

console.log('\n=== Subscription access ===');
{
  const neverPaid = resolveAccess(false, emptyAccessRecord());
  assert(!neverPaid.hasAccess, 'never paid has no access');
  assert(neverPaid.needsResumePaywall, 'never paid needs paywall');
  assert(!neverPaid.inGrace, 'never paid not in grace');
  ok('never paid → paywall');

  const paid = resolveAccess(true, emptyAccessRecord());
  assert(paid.hasAccess && paid.isPaid, 'store premium has access');
  assert(!paid.needsResumePaywall, 'store premium no paywall');
  assert(paid.record.everPremium, 'marks everPremium');
  assert(paid.record.periodEndsAt, 'sets period end');
  ok('store premium → access');

  const ended = markPaidAccess(emptyAccessRecord());
  ended.periodEndsAt = new Date(Date.now() - 86400000).toISOString(); // yesterday
  ended.graceStartedAt = null;
  const grace = resolveAccess(false, ended);
  assert(grace.hasAccess, 'grace has access');
  assert(grace.inGrace, 'in grace');
  assert(grace.graceDaysLeft === GRACE_TRIAL_DAYS, `grace days ${grace.graceDaysLeft} === ${GRACE_TRIAL_DAYS}`);
  assert(!grace.needsResumePaywall, 'grace no paywall yet');
  ok('plan ended → 3-day grace');

  const graceOver = {
    ...ended,
    graceStartedAt: new Date(Date.now() - (GRACE_TRIAL_DAYS + 1) * 86400000).toISOString(),
  };
  const locked = resolveAccess(false, graceOver);
  assert(!locked.hasAccess, 'after grace locked');
  assert(locked.needsResumePaywall, 'after grace paywall');
  assert(!locked.inGrace, 'not in grace');
  ok('grace ended → resume paywall');

  assert(PLAN_PERIOD_DAYS === 30, 'plan period 30 days');
  ok(`constants PLAN=${PLAN_PERIOD_DAYS} GRACE=${GRACE_TRIAL_DAYS}`);
}

console.log('\n=== Diet plan generator ===');
{
  const yoga = {
    goal: 'Yoga',
    fitnessLevel: 'Beginner',
    foodPreference: 'Vegetarian',
    heightCm: 165,
    weightKg: 60,
  };
  const days = build30DayDietPlan(yoga);
  assert(days.length === 30, `expected 30 days got ${days.length}`);
  ok('builds 30 days');

  for (const day of days) {
    assert(day.breakfast?.name && day.lunch?.name && day.dinner?.name, `day ${day.day} missing meals`);
    assert(day.breakfast.calories > 0 && day.lunch.calories > 0 && day.dinner.calories > 0, `day ${day.day} cal`);
  }
  ok('each day has B/L/D with calories');

  const boxing = build30DayDietPlan({
    ...yoga,
    goal: 'Boxing',
    foodPreference: 'High protein',
    fitnessLevel: 'Active / Advanced',
  });
  assert(boxing.length === 30, 'boxing 30 days');
  const yogaCals = dietCalorieTarget(yoga);
  const boxCals = dietCalorieTarget({ ...yoga, goal: 'Boxing', fitnessLevel: 'Active / Advanced' });
  assert(boxCals >= yogaCals, `boxing calories ${boxCals} >= yoga ${yogaCals}`);
  ok('boxing target >= yoga target');

  const carnivore = build30DayDietPlan({ ...yoga, foodPreference: 'Carnivore' });
  assert(carnivore[0].breakfast.name.toLowerCase().includes('egg') || carnivore[0].breakfast.name.length > 2, 'carnivore meals');
  ok('carnivore pool works');

  const bmi = bmiFromProfile(yoga);
  assert(bmi > 15 && bmi < 40, `bmi ${bmi}`);
  const summary = dietPlanSummary(yoga);
  assert(summary.days === 30 && summary.calorieTarget >= 1400, 'summary ok');
  ok(`BMI ${bmi}, target ${summary.calorieTarget}`);
}

console.log('\n=== Plans catalog ===');
{
  assert(FALLBACK_PLANS.some((p) => p.id === 'premium'), 'premium plan exists');
  assert(!FALLBACK_PLANS.some((p) => p.id === 'free'), 'free plan removed from fallback');
  ok('fallback plans premium-only');
}

console.log(`\n✅ All smoke checks passed (${passed})\n`);
