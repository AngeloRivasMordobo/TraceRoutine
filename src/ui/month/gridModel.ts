/**
 * Pure model of the month grid (TR-48 … TR-53): one row per day, one column per
 * activity, cell states from the engine, projection for relative rules.
 */
import { addDays, aggregate, cellState, consistency, cycleLetters, cycleStep, daysInMonth, futureState, isBefore, isEditable, makeKey, monthRange, projectedLookup, weekday, type Activity, type CellState, type Consistency, type DateKey, type LogLookup } from '../../engine';

export interface GridColumn { activity: Activity; consistency: Consistency }
export interface GridCell { activityId: string; state: CellState; letter: string; editable: boolean }
export interface GridDay { date: DateKey; day: number; weekday: number; isToday: boolean; isWeekStart: boolean; isWeekend: boolean; isFuture: boolean; cells: GridCell[] }
export interface MonthGrid { columns: GridColumn[]; days: GridDay[]; overall: Consistency; todayIndex: number }

export function buildMonthGrid(activities: Activity[], y: number, m: number, today: DateKey, L: LogLookup): MonthGrid {
  const active = activities.filter((a) => !a.archived);
  const { first, last } = monthRange(y, m);
  const columns: GridColumn[] = active.map((a) => ({ activity: a, consistency: consistency(a, first, last, today, L) }));
  const projections = new Map<string, LogLookup>();
  const letters = new Map<string, string[]>();
  for (const a of active) {
    if (a.freq.type !== 'perWeek') projections.set(a.id, projectedLookup(a, today, last, L));
    if (a.freq.type === 'cycle') letters.set(a.id, cycleLetters(a.freq.steps ?? []));
  }
  const n = daysInMonth(y, m);
  const days: GridDay[] = [];
  let todayIndex = -1;
  for (let d = 1; d <= n; d++) {
    const date = makeKey(y, m, d);
    const wd = weekday(date);
    const isFuture = isBefore(today, date);
    const isToday = date === today;
    if (isToday) todayIndex = d - 1;
    const cells: GridCell[] = active.map((a) => {
      const PL = projections.get(a.id);
      const state = isFuture && PL ? futureState(a, date, PL) : cellState(a, date, today, L);
      let letter = '';
      if (a.freq.type === 'cycle' && state !== 'none') {
        const steps = a.freq.steps ?? [];
        const step = cycleStep(a, date, isFuture && PL ? PL : L);
        letter = step && !step.rest ? (letters.get(a.id)?.[steps.indexOf(step)] ?? '') : '';
      }
      return { activityId: a.id, state, letter, editable: isEditable(a, date, today, L) };
    });
    days.push({ date, day: d, weekday: wd, isToday, isWeekStart: wd === 1, isWeekend: wd === 0 || wd === 6, isFuture, cells });
  }
  return { columns, days, overall: aggregate(columns.map((c) => c.consistency)), todayIndex };
}

export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const idx = y * 12 + (m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

/** Row index the grid should scroll to on open: today, if in this month; otherwise the top. */
export function initialRow(grid: MonthGrid): number {
  return Math.max(0, grid.todayIndex - 2);
}

export { addDays };
