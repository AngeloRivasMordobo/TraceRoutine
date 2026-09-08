import { describe, expect, it } from 'vitest';
import { addDays, type Activity, type LogLookup } from '../../engine';
import { buildMonthGrid, shiftMonth } from './gridModel';

const TODAY = '2026-08-27';
const T = (o: number) => addDays(TODAY, o);
const base = (id: string, freq: Activity['freq'], startOffset: number, extra: Partial<Activity> = {}): Activity => ({
  id, name: id, icon: 'star', color: 'accent', record: 'check', start: T(startOffset), end: null, freq, ...extra,
});
const logs = (map: Record<string, 'done' | 'min' | 'skip'>): LogLookup => (id, date) => map[`${id}|${date}`] ?? null;

describe('month grid model', () => {
  const gym = base('gym', { type: 'cycle', anchor: 'relative', steps: [{ label: 'Push' }, { label: 'Pull' }, { label: 'Legs' }, { label: 'Rest', rest: true }] }, -1);
  const water = base('water', { type: 'daily' }, -10);
  const archived = base('old', { type: 'daily' }, -10, { archived: true });
  const L = logs({ [`gym|${T(-1)}`]: 'done', [`water|${T(-1)}`]: 'min' });

  it('builds one row per active activity and one day column per day', () => {
    const g = buildMonthGrid([gym, water, archived], 2026, 8, TODAY, L);
    expect(g.rows.map((r) => r.activity.id)).toEqual(['gym', 'water']);
    expect(g.days).toHaveLength(31);
    expect(g.rows[0].cells).toHaveLength(31);
    expect(g.todayIndex).toBe(26);
    expect(g.days[26].isToday).toBe(true);
    expect(g.days[29].isWeekEnd).toBe(true); // Sunday 30 closes the week
  });
  it('labels day 1, every fifth day, today and the last day', () => {
    const g = buildMonthGrid([water], 2026, 8, TODAY, L);
    const labelled = g.days.filter((d) => d.label).map((d) => d.day);
    expect(labelled).toEqual([1, 5, 10, 15, 20, 25, 27, 30, 31]);
  });
  it('projects relative cycles into the future with letters', () => {
    const g = buildMonthGrid([gym], 2026, 8, TODAY, L);
    const cell = (day: number) => g.rows[0].cells[day - 1];
    expect(cell(26)).toMatchObject({ state: 'done', letter: 'P' });
    expect(cell(27)).toMatchObject({ state: 'pending', letter: 'U', editable: true, isToday: true });
    expect(cell(28)).toMatchObject({ state: 'future', letter: 'L', editable: false });
    expect(cell(29)).toMatchObject({ state: 'none', letter: '' });
    expect(cell(30)).toMatchObject({ state: 'future', letter: 'P' });
  });
  it('carries consistency per row and overall', () => {
    const g = buildMonthGrid([water], 2026, 8, TODAY, L);
    expect(g.rows[0].consistency).toEqual({ hits: 1, expected: 10, pct: 10 });
    expect(g.overall.pct).toBe(10);
  });
  it('shifts months across years', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ y: 2025, m: 12 });
    expect(shiftMonth(2026, 8, -8)).toEqual({ y: 2025, m: 12 });
  });
});
