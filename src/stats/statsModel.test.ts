import { describe, expect, it } from 'vitest';
import { addDays, type Activity, type LogLookup, type LogState } from '../engine';
import { bestMonth, monthStats, weekdayPattern, weeklyTrend } from './statsModel';

const TODAY = '2026-08-27';
const T = (o: number) => addDays(TODAY, o);
const daily = (id: string, start: number): Activity => ({ id, name: id, icon: 'star', color: 'accent', record: 'check', start: T(start), end: null, freq: { type: 'daily' } });
const logs = (fn: (id: string, date: string) => LogState | null): LogLookup => fn;

describe('stats model', () => {
  it('month stats match the engine and skip archived activities without data', () => {
    const a = daily('a', -10);
    const L = logs((_, d) => (d < TODAY ? 'done' : null));
    const s = monthStats([a, { ...daily('old', -100), archived: true, end: T(-60) }], 2026, 8, TODAY, L);
    expect(s.rows.map((r) => r.activity.id)).toEqual(['a']);
    expect(s.overall).toEqual({ hits: 10, expected: 10, pct: 100 });
  });
  it('finds the best month among months with enough expected days', () => {
    const a = daily('a', -70);
    const L = logs((_, d) => (d >= '2026-07-01' && d <= '2026-07-31' ? 'done' : d < TODAY && d.endsWith('1') ? 'done' : null));
    const best = bestMonth([a], TODAY, L);
    expect(best).toMatchObject({ y: 2026, m: 7, pct: 100 });
  });
  it('weekday pattern counts only due days and needs 14 of them', () => {
    const a: Activity = { ...daily('a', -60), freq: { type: 'weekdays', days: [6, 0] } }; // weekends only
    const L = logs((_, d) => (new Date(d).getUTCDay() === 6 ? 'done' : null)); // Saturdays done, Sundays missed
    const p = weekdayPattern([a], TODAY, L, 60);
    expect(p.enough).toBe(true);
    expect(p.perDay[1].expected).toBe(0); // Monday never counts
    expect(p.best).toBe(6);
    expect(p.worst).toBe(0);
    const few = weekdayPattern([daily('b', -5)], TODAY, L, 60);
    expect(few.enough).toBe(false);
    expect(few.best).toBeNull();
  });
  it('weekly trend has 12 points, marks the current week partial and reports first/last/best', () => {
    const a = daily('a', -90);
    const L = logs((_, d) => (d < '2026-08-01' ? (d.endsWith('3') ? null : 'done') : d < TODAY ? 'done' : null));
    const t = weeklyTrend([a], TODAY, L);
    expect(t.points).toHaveLength(12);
    expect(t.points[11].partial).toBe(true);
    expect(t.points[11].weekStart).toBe('2026-08-24');
    expect(t.enough).toBe(true);
    expect(t.last).toBe(100);
    expect(t.first).not.toBeNull();
    expect(t.bestWeek).not.toBeNull();
  });
});
