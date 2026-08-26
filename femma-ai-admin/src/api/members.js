import { supabase } from 'lib/supabase';

export function mapPlan(row) {
  return {
    id: row.id,
    name: row.name,
    priceMonthly: Number(row.price_monthly ?? 0),
    priceLabel: row.price_label || '$0',
    description: row.description || '',
    features: Array.isArray(row.features) ? row.features : [],
    highlighted: Boolean(row.highlighted)
  };
}

export function mapMember(row, plansById = {}) {
  const planId = row.plan_id || 'free';
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    goal: row.goal || '',
    fitnessLevel: row.fitness_level || '',
    environment: row.environment || '',
    planId,
    planName: plansById[planId]?.name || (planId === 'premium' ? 'Premium' : 'Free'),
    journeyDay: row.journey_day ?? 1,
    streak: row.streak ?? 0,
    level: row.level ?? 1,
    points: row.points ?? 0,
    cyclePhase: row.cycle_phase || 'none',
    cycleDay: row.cycle_day ?? 0,
    isPregnant: Boolean(row.is_pregnant),
    pregnancyWeek: row.pregnancy_week ?? 0,
    status: row.status || 'active',
    completedLessons: row.completed_lessons ?? 0,
    joinedAt: row.joined_at
  };
}

export function mapSubscription(row) {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status || 'active',
    renewDate: row.renew_date || null,
    startedAt: row.started_at
  };
}

export async function fetchPlans() {
  const { data, error } = await supabase.from('plans').select('*').order('price_monthly');
  if (error) throw error;
  return (data || []).map(mapPlan);
}

export async function fetchMembers(plans = []) {
  const plansById = Object.fromEntries(plans.map((p) => [p.id, p]));
  const { data, error } = await supabase.from('members').select('*').order('joined_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((row) => mapMember(row, plansById));
}

export async function fetchSubscriptions() {
  const { data, error } = await supabase.from('subscriptions').select('*').order('started_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSubscription);
}

export async function fetchMembersBundle() {
  const plans = await fetchPlans();
  const [users, subscriptions] = await Promise.all([fetchMembers(plans), fetchSubscriptions()]);
  return { plans, users, subscriptions };
}

function memberToRow(payload) {
  return {
    id: payload.id,
    name: String(payload.name || '').trim(),
    email: String(payload.email || '')
      .trim()
      .toLowerCase(),
    goal: payload.goal || null,
    fitness_level: payload.fitnessLevel || null,
    environment: payload.environment || null,
    plan_id: payload.planId || 'free',
    journey_day: Number(payload.journeyDay ?? 1),
    streak: Number(payload.streak ?? 0),
    level: Number(payload.level ?? 1),
    points: Number(payload.points ?? 0),
    cycle_phase: payload.cyclePhase || 'none',
    cycle_day: Number(payload.cycleDay ?? 0),
    is_pregnant: Boolean(payload.isPregnant),
    pregnancy_week: Number(payload.pregnancyWeek ?? 0),
    status: payload.status || 'active',
    completed_lessons: Number(payload.completedLessons ?? 0),
    joined_at: payload.joinedAt || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString()
  };
}

export async function upsertMember(payload, plans = []) {
  const plansById = Object.fromEntries(plans.map((p) => [p.id, p]));
  const row = memberToRow(payload);
  if (!row.id) delete row.id;
  if (!row.name || !row.email) throw new Error('Name and email are required');

  const { data, error } = await supabase.from('members').upsert(row, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return mapMember(data, plansById);
}

export async function updateMemberStatus(userId, status) {
  const { data, error } = await supabase
    .from('members')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return mapMember(data);
}

export async function upsertSubscription({ userId, planId, status = 'active', renewDate = null, startedAt }) {
  const { data: existingRows, error: findError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (findError) throw findError;
  const existing = existingRows?.[0] || null;

  const row = {
    id: existing?.id,
    user_id: userId,
    plan_id: planId,
    status,
    renew_date: renewDate,
    started_at: startedAt || existing?.started_at || new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString()
  };
  if (!row.id) delete row.id;

  const { data, error } = await supabase.from('subscriptions').upsert(row).select('*').single();
  if (error) throw error;
  return mapSubscription(data);
}

export async function assignMemberPlan(userId, planId, status = 'active') {
  const renewDate = planId === 'premium' ? new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10) : null;

  const { data: memberRow, error: memberError } = await supabase
    .from('members')
    .update({ plan_id: planId, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  if (memberError) throw memberError;

  const subscription = await upsertSubscription({ userId, planId, status, renewDate });
  return { member: mapMember(memberRow), subscription };
}

export async function updatePlanPrice(planId, priceMonthly) {
  const amount = Number(priceMonthly);
  if (Number.isNaN(amount) || amount < 0) throw new Error('Invalid price');
  const label = amount === 0 ? '$0/mo' : `$${amount.toFixed(2).replace(/\.00$/, '')}/mo`;

  const { data, error } = await supabase
    .from('plans')
    .update({
      price_monthly: amount,
      price_label: label,
      updated_at: new Date().toISOString()
    })
    .eq('id', planId)
    .select('*')
    .single();
  if (error) throw error;
  return mapPlan(data);
}
