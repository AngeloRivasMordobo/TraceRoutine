import { describe, expect, it } from 'vitest';
import { addDays, type Activity, type LogLookup } from '../engine';
import { fireDate, planReminders } from './planner';

const TODAY = '2026-08-27';
const T = (o: number) => addDays(TODAY, o);
const texts = { dueToday: (n: string, s: string | null) => (s ? `${n} · ${s}` : n), summaryTitle: (n: number) => `${n} due`, summaryBody: (names: string[]) => names.join(', ') };
const mk = (id: string, freq: Activity['freq'], reminder: string, extra: Partial<Activity> = {}): Activity => ({ id, name: id, icon: 'star', color: 'accent', record: 'check', start: T(-10), end: null, reminder, freq, ...extra });
const NONE: LogLookup = () => null;

describe('reminder planner', () => {
  it('schedules one notification per due day and never on off days', () => {
    const a = mk('water', { type: 'everyN', n: 2, anchor: 'calendar' }, '18:00');
    const plan = planReminders([a], TODAY, NONE, { days: 4, morningSummary: false, morningTime: '08:00', texts });
    expect(plan.map((p) => p.date)).toEqual([TODAY, T(2)]);
    expect(plan[0].id).toBe(`act:water:${TODAY}`);
  });
  it('skips today when already logged and skips archived or reminder-less activities', () => {
    const a = mk('gym', { type: 'daily' }, '07:00');
    const b = mk('old', { type: 'daily' }, '07:00', { archived: true });
    const c = mk('silent', { type: 'daily' }, null as unknown as string);
    const L: LogLookup = (id, d) => (id === 'gym' && d === TODAY ? 'done' : null);
    const plan = planReminders([a, b, c], TODAY, L, { days: 2, morningSummary: false, morningTime: '08:00', texts });
    expect(plan.map((p) => `${p.activityId}:${p.date}`)).toEqual([`gym:${T(1)}`]);
  });
  it('folds early reminders into the morning summary and keeps later ones individual', () => {
    const gym = mk('gym', { type: 'daily' }, '06:30');
    const read = mk('read', { type: 'daily' }, '21:30');
    const plan = planReminders([gym, read], TODAY, NONE, { days: 1, morningSummary: true, morningTime: '08:00', texts });
    expect(plan.map((p) => p.kind)).toEqual(['summary', 'activity']);
    expect(plan[0].body).toBe('gym');
    expect(plan[1].activityId).toBe('read');
  });
  it('includes the cycle step in the text and projects relative rules', () => {
    const gym = mk('gym', { type: 'cycle', anchor: 'relative', steps: [{ label: 'Push' }, { label: 'Pull' }, { label: 'Rest', rest: true }] }, '06:30', { start: T(-1) });
    const L: LogLookup = (id, d) => (id === 'gym' && d === T(-1) ? 'done' : null);
    const plan = planReminders([gym], TODAY, L, { days: 3, morningSummary: false, morningTime: '08:00', texts });
    expect(plan.map((p) => `${p.date}:${p.title}`)).toEqual([`${TODAY}:gym · Pull`, `${T(2)}:gym · Push`]);
  });
  it('drops notifications already in the past today and never fires with nothing due', () => {
    const a = mk('gym', { type: 'daily' }, '06:30');
    const plan = planReminders([a], TODAY, NONE, { days: 1, morningSummary: true, morningTime: '08:00', now: { date: TODAY, time: '09:00' }, texts });
    expect(plan).toEqual([]);
    const off = mk('sat', { type: 'weekdays', days: [6] }, '09:00');
    expect(planReminders([off], TODAY, NONE, { days: 1, morningSummary: true, morningTime: '08:00', texts })).toEqual([]);
  });
  it('fireDate builds a local date', () => {
    const d = fireDate({ id: 'x', date: '2026-08-27', time: '08:05', kind: 'summary', title: '', body: '' });
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 7, 27, 8, 5]);
  });
});
