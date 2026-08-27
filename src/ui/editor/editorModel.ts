/**
 * Pure editor logic (TR-31 … TR-38): drafts, validation, anchor examples,
 * duration shortcuts and the preview summary. No React here so it is testable.
 */
import { addDays, daysInMonth, isBefore, isDue, isValidKey, monthRange, nextDue, simulatePerfect, type Activity, type DateKey, type FrequencyRule } from '../../engine';
import { defaultRule, validateRule } from '../../engine/presets';

export type DraftError = 'name' | 'days' | 'cycle' | 'end' | 'start' | 'unit' | 'time' | 'everyN' | 'perWeek';

export function newDraft(id: string, today: DateKey): Activity {
  return {
    id, name: '', icon: 'star', color: 'accent', record: 'check', unit: '', minimal: '',
    start: today, end: null, reminder: '08:00', archived: false,
    freq: { ...defaultRule(), type: 'everyN', n: 2, anchor: 'calendar' },
  };
}

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isValidTime = (s: string): boolean => TIME_RE.test(s);

export function validateDraft(a: Activity): DraftError[] {
  const errors: DraftError[] = [];
  if (!a.name.trim()) errors.push('name');
  if (a.record === 'amount' && !(a.unit ?? '').trim()) errors.push('unit');
  if (!isValidKey(a.start)) errors.push('start');
  if (a.end && (!isValidKey(a.end) || (isValidKey(a.start) && isBefore(a.end, a.start)))) errors.push('end');
  if (a.reminder && !isValidTime(a.reminder)) errors.push('time');
  for (const e of validateRule(a.freq)) {
    if (e === 'weekdays.empty') errors.push('days');
    else if (e === 'cycle.noActiveStep') errors.push('cycle');
    else if (e === 'everyN.range') errors.push('everyN');
    else if (e === 'perWeek.range') errors.push('perWeek');
  }
  return errors;
}

/** Numbers for the "if you miss a day" cards, recalculated from N. */
export function anchorExamples(n: number): { b: number; c: number; d: number; e: number } {
  return { b: 1 + n, c: 1 + 2 * n, d: 2 + n, e: 2 + 2 * n };
}

export type DurationKind = '21d' | '4w' | '3m';
export function applyDuration(start: DateKey, kind: DurationKind): DateKey {
  const days = kind === '21d' ? 20 : kind === '4w' ? 27 : 89;
  return addDays(start, days);
}

export interface PreviewSummary {
  count: number;
  dueToday: boolean;
  next: DateKey | null;
  flexible: boolean;
  dueDays: Set<DateKey>;
}

/** What the mini calendar shows for a month, assuming perfect completion from the start date. */
export function previewSummary(a: Activity, y: number, m: number, today: DateKey): PreviewSummary {
  const { first, last } = monthRange(y, m);
  const flexible = a.freq.type === 'perWeek';
  const horizon = isBefore(last, addDays(today, 130)) ? addDays(today, 130) : last;
  const PL = simulatePerfect(a, horizon);
  const dueDays = new Set<DateKey>();
  let count = 0;
  if (flexible) {
    count = Math.round((daysInMonth(y, m) / 7) * (a.freq.times ?? 1));
  } else {
    for (let d = first; !isBefore(last, d); d = addDays(d, 1)) if (isDue(a, d, PL)) { dueDays.add(d); count++; }
  }
  const dueToday = !flexible && isDue(a, today, PL);
  return { count, dueToday, next: flexible ? null : nextDue(a, today, PL), flexible, dueDays };
}

export function addCycleStep(rule: FrequencyRule, label: string, rest = false): FrequencyRule {
  const trimmed = label.trim().slice(0, 14);
  if (!rest && !trimmed) return rule;
  return { ...rule, steps: [...(rule.steps ?? []), { label: rest ? label : trimmed, rest }] };
}

export function removeCycleStep(rule: FrequencyRule, index: number): FrequencyRule {
  return { ...rule, steps: (rule.steps ?? []).filter((_, i) => i !== index) };
}

export function toggleWeekday(rule: FrequencyRule, day: number): FrequencyRule {
  const days = rule.days ?? [];
  return { ...rule, days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] };
}
