import AsyncStorage from '@react-native-async-storage/async-storage';

export const PLAN_PERIOD_DAYS = 30;
export const GRACE_TRIAL_DAYS = 3;

export type SubscriptionAccessRecord = {
  everPremium: boolean;
  /** ISO date when the paid 30-day period ends (or ended). */
  periodEndsAt: string | null;
  /** ISO date when the 3-day grace trial started after payment lapse. */
  graceStartedAt: string | null;
};

export type AccessSnapshot = {
  hasAccess: boolean;
  isPaid: boolean;
  inGrace: boolean;
  graceDaysLeft: number;
  needsResumePaywall: boolean;
  record: SubscriptionAccessRecord;
};

function storageKey(email: string) {
  return `subscription_access_v1:${email.trim().toLowerCase()}`;
}

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(isoOrDate: string | Date, days: number) {
  const d = startOfDay(typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function daysBetween(fromIso: string, to = new Date()) {
  const a = startOfDay(new Date(fromIso)).getTime();
  const b = startOfDay(to).getTime();
  return Math.floor((b - a) / 86400000);
}

export function emptyAccessRecord(): SubscriptionAccessRecord {
  return { everPremium: false, periodEndsAt: null, graceStartedAt: null };
}

export async function loadAccessRecord(email?: string | null): Promise<SubscriptionAccessRecord> {
  if (!email) return emptyAccessRecord();
  try {
    const raw = await AsyncStorage.getItem(storageKey(email));
    if (!raw) return emptyAccessRecord();
    const parsed = JSON.parse(raw) as Partial<SubscriptionAccessRecord>;
    return {
      everPremium: Boolean(parsed.everPremium),
      periodEndsAt: parsed.periodEndsAt || null,
      graceStartedAt: parsed.graceStartedAt || null,
    };
  } catch {
    return emptyAccessRecord();
  }
}

export async function saveAccessRecord(email: string | null | undefined, record: SubscriptionAccessRecord) {
  if (!email) return;
  try {
    await AsyncStorage.setItem(storageKey(email), JSON.stringify(record));
  } catch {
    // ignore
  }
}

/** Call when a purchase / restore succeeds. */
export function markPaidAccess(record: SubscriptionAccessRecord, expiresAtIso?: string | null): SubscriptionAccessRecord {
  return {
    everPremium: true,
    periodEndsAt: expiresAtIso || addDays(new Date(), PLAN_PERIOD_DAYS),
    graceStartedAt: null,
  };
}

/**
 * Resolve access when store entitlement is known.
 * Paid plan lasts ~30 days; if payment fails / entitlement drops, start a 3-day grace trial,
 * then require pay-to-resume.
 */
export function resolveAccess(isStorePremium: boolean, record: SubscriptionAccessRecord): AccessSnapshot {
  if (isStorePremium) {
    const next = markPaidAccess(record, record.periodEndsAt && new Date(record.periodEndsAt) > new Date()
      ? record.periodEndsAt
      : addDays(new Date(), PLAN_PERIOD_DAYS));
    return {
      hasAccess: true,
      isPaid: true,
      inGrace: false,
      graceDaysLeft: 0,
      needsResumePaywall: false,
      record: next,
    };
  }

  // Never paid → must subscribe (no free plan).
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
  const stillInPaidWindow = Boolean(periodEnd && periodEnd.getTime() > now.getTime());
  if (stillInPaidWindow) {
    // Local period not ended yet (e.g. store lag) — keep access briefly.
    return {
      hasAccess: true,
      isPaid: false,
      inGrace: false,
      graceDaysLeft: 0,
      needsResumePaywall: false,
      record,
    };
  }

  // Paid period ended / card not charged → 3-day grace trial.
  let graceStartedAt = record.graceStartedAt;
  if (!graceStartedAt) {
    graceStartedAt = new Date().toISOString();
  }
  const elapsed = daysBetween(graceStartedAt, now);
  const graceDaysLeft = Math.max(0, GRACE_TRIAL_DAYS - elapsed);
  const inGrace = graceDaysLeft > 0;

  return {
    hasAccess: inGrace,
    isPaid: false,
    inGrace,
    graceDaysLeft,
    needsResumePaywall: !inGrace,
    record: {
      ...record,
      everPremium: true,
      graceStartedAt,
    },
  };
}
