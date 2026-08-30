export type ActivityKind = 'workout' | 'nutrition' | 'recipe';

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  at: string;
  ref?: string;
};

function eventKey(event: Pick<ActivityEvent, 'kind' | 'id' | 'ref'>) {
  return event.ref ? `${event.kind}:${event.ref}` : event.id;
}

export function asActivityLog(value: unknown): ActivityEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const kind = row.kind === 'workout' || row.kind === 'nutrition' || row.kind === 'recipe' ? row.kind : null;
      const id = String(row.id || '').trim();
      const at = String(row.at || '').trim();
      if (!kind || !id || !at) return null;
      const ref = typeof row.ref === 'string' && row.ref.trim() ? row.ref.trim() : undefined;
      return { id, kind, at, ref } satisfies ActivityEvent;
    })
    .filter((item): item is ActivityEvent => Boolean(item))
    .slice(-400);
}

export function mergeActivityLogs(local: ActivityEvent[], remote: ActivityEvent[]): ActivityEvent[] {
  const byKey = new Map<string, ActivityEvent>();
  for (const event of [...remote, ...local]) {
    byKey.set(eventKey(event), event);
  }
  return Array.from(byKey.values())
    .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))
    .slice(-400);
}

export function logActivity(
  log: ActivityEvent[],
  event: { kind: ActivityKind; at?: string; ref?: string; id?: string }
): ActivityEvent[] {
  if (event.ref && log.some((item) => item.kind === event.kind && item.ref === event.ref)) {
    return log;
  }
  return mergeActivityLogs(log, [
    {
      id: event.id || `${event.kind}-${event.ref || Date.now()}`,
      kind: event.kind,
      at: event.at || new Date().toISOString(),
      ref: event.ref,
    },
  ]);
}

export function startOfWeek(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + mondayOffset);
  return next;
}

export function weekStarts(weeks = 8, now = new Date()): Date[] {
  const current = startOfWeek(now);
  return Array.from({ length: weeks }, (_, index) => {
    const start = new Date(current);
    start.setDate(current.getDate() - (weeks - 1 - index) * 7);
    return start;
  });
}

export function countInRange(events: ActivityEvent[], kind: ActivityKind, start: Date, end: Date) {
  const from = start.getTime();
  const to = end.getTime();
  return events.filter((event) => {
    if (event.kind !== kind) return false;
    const time = Date.parse(event.at);
    return Number.isFinite(time) && time >= from && time < to;
  }).length;
}

export function weeklyCounts(events: ActivityEvent[], kind: ActivityKind, weeks = 8, now = new Date()): number[] {
  const starts = weekStarts(weeks, now);
  return starts.map((start) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return countInRange(events, kind, start, end);
  });
}

export function journeyDayFromStart(planStartedAt?: string | null, now = new Date()) {
  if (!planStartedAt) return 1;
  const start = new Date(planStartedAt);
  if (Number.isNaN(start.getTime())) return 1;
  start.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
  return Math.min(84, Math.max(1, days));
}

export function startedAtFromJourney(journeyDay: number, now = new Date()) {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - Math.max(0, (journeyDay || 1) - 1));
  return start.toISOString();
}

export function earlierIso(a?: string, b?: string) {
  const aTime = a ? Date.parse(a) : NaN;
  const bTime = b ? Date.parse(b) : NaN;
  if (!Number.isFinite(aTime)) return b || '';
  if (!Number.isFinite(bTime)) return a || '';
  return aTime <= bTime ? a! : b!;
}
