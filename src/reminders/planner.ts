/**
 * Pure reminder planning (TR-59, TR-60): which local notifications should exist for the next
 * days, given the activities, the logs and the morning-summary setting. Idempotent by design:
 * the service cancels everything and schedules this list.
 */
import { addDays, cycleStep, isDue, projectedLookup, type Activity, type DateKey, type LogLookup } from '../engine';

export interface PlannedNotification {
  id: string;
  date: DateKey;
  /** local "HH:MM" */
  time: string;
  kind: 'activity' | 'summary';
  activityId?: string;
  title: string;
  body: string;
}

export interface PlanOptions {
  days?: number;
  morningSummary: boolean;
  morningTime: string;
  /** Skip notifications already in the past today. */
  now?: { date: DateKey; time: string };
  texts: {
    dueToday: (name: string, step: string | null) => string;
    summaryTitle: (n: number) => string;
    summaryBody: (names: string[]) => string;
  };
}

const timeLE = (a: string, b: string) => a <= b;

export function planReminders(activities: Activity[], today: DateKey, L: LogLookup, opts: PlanOptions): PlannedNotification[] {
  const days = opts.days ?? 14;
  const active = activities.filter((a) => !a.archived && a.reminder);
  const horizon = addDays(today, days - 1);
  const lookups = new Map(active.map((a) => [a.id, projectedLookup(a, today, horizon, L)] as const));
  const out: PlannedNotification[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i);
    const dueToday: { a: Activity; step: string | null }[] = [];
    for (const a of active) {
      const PL = lookups.get(a.id)!;
      if (date === today && L(a.id, date)) continue; // already done / minimum / skipped today
      if (!isDue(a, date, PL)) continue;
      const step = a.freq.type === 'cycle' ? (cycleStep(a, date, PL)?.label ?? null) : null;
      dueToday.push({ a, step });
    }
    if (!dueToday.length) continue;
    const folded = opts.morningSummary ? dueToday.filter(({ a }) => timeLE(a.reminder!, opts.morningTime)) : [];
    const individual = dueToday.filter((x) => !folded.includes(x));
    const notPast = (time: string) => !(opts.now && date === opts.now.date && time <= opts.now.time);
    if (folded.length && notPast(opts.morningTime)) {
      out.push({
        id: `sum:${date}`,
        date,
        time: opts.morningTime,
        kind: 'summary',
        title: opts.texts.summaryTitle(folded.length),
        body: opts.texts.summaryBody(folded.map(({ a, step }) => (step ? `${a.name} (${step})` : a.name))),
      });
    }
    for (const { a, step } of individual) {
      if (!notPast(a.reminder!)) continue;
      out.push({ id: `act:${a.id}:${date}`, date, time: a.reminder!, kind: 'activity', activityId: a.id, title: opts.texts.dueToday(a.name, step), body: step ? `${a.name} · ${step}` : a.name });
    }
  }
  return out;
}

/** Local Date for a planned notification (device time zone, so travel keeps "8:00 local"). */
export function fireDate(n: PlannedNotification): Date {
  const [y, m, d] = n.date.split('-').map(Number);
  const [hh, mm] = n.time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}
