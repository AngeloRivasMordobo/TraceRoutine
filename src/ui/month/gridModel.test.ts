import { describe, expect, it } from 'vitest';
import { addDays, type Activity, type LogLookup } from '../../engine';
import { buildMonthGrid, initialRow, shiftMonth } from './gridModel';

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

  it('builds one row per day and one column per active activity', () => {
    const g = buildMonthGrid([gym, water, archived], 2026, 8, TODAY, L);
    expect(g.days).toHaveLength(31);
    expect(g.columns.map((c) => c.activity.id)).toEqual(['gym', 'water']);
    expect(g.todayIndex).toBe(26);
    expect(g.days[26].isToday).toBe(true);
    expect(g.days[23].isWeekStart).toBe(true); // Monday 24
    expect(initialRow(g)).toBe(24);
  });
  it('projects relative cycles into the future with letters', () => {
    const g = buildMonthGrid([gym], 2026, 8, TODAY, L);
    const cell = (day: number) => g.days[day - 1].cells[0];
    expect(cell(26)).toMatchObject({ state: 'done', letter: 'P' });
    expect(cell(27)).toMatchObject({ state: 'pending', letter: 'U', editable: true });
    expect(cell(28)).toMatchObject({ state: 'future', letter: 'L', editable: false });
    expect(cell(29)).toMatchObject({ state: 'none', letter: '' });
    expect(cell(30)).toMatchObject({ state: 'future', letter: 'P' });
  });
  it('carries consistency per column and overall', () => {
    const g = buildMonthGrid([water], 2026, 8, TODAY, L);
    expect(g.columns[0].consistency).toEqual({ hits: 1, expected: 10, pct: 10 });
    expect(g.overall.pct).toBe(10);
  });
  it('shifts months across years', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ y: 2027, m: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ y: 2025, m: 12 });
    expect(shiftMonth(2026, 8, -8)).toEqual({ y: 2025, m: 12 });
  });
});
