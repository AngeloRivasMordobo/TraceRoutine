/**
 * TraceRoutine frequency engine — shared types.
 * Pure TypeScript: no React, no SQLite, no Intl. Dates are `YYYY-MM-DD` keys.
 */

/** Calendar date as `YYYY-MM-DD` (local calendar day, never a timestamp). */
export type DateKey = string;

export type RecordType = 'check' | 'minutes' | 'amount';

export type FrequencyType = 'daily' | 'everyN' | 'weekdays' | 'perWeek' | 'cycle';

/**
 * What happens when you miss a day.
 * - `calendar`: the schedule is anchored to the start date (due 1, 3, 5… no matter what).
 * - `relative`: the schedule counts from the last time you did it.
 */
export type Anchor = 'calendar' | 'relative';

export type LogState = 'done' | 'min' | 'skip';

export interface CycleStep {
  label: string;
  /** A rest step is never due and is consumed on its own as the day passes. */
  rest?: boolean;
}

export interface FrequencyRule {
  type: FrequencyType;
  /** everyN: interval in days (1–30). */
  n?: number;
  /** weekdays: JS weekday numbers, Sunday = 0 … Saturday = 6. */
  days?: number[];
  /** perWeek: how many times per week (1–7). */
  times?: number;
  /** cycle: ordered steps, e.g. Push / Pull / Legs / Rest. */
  steps?: CycleStep[];
  /** everyN and cycle only. Defaults to `calendar`. */
  anchor?: Anchor;
}

export interface Activity {
  id: string;
  name: string;
  icon: string;
  color: string;
  record: RecordType;
  unit?: string | null;
  /** Minimum version for bad days, e.g. "Walk 10 min". */
  minimal?: string | null;
  start: DateKey;
  end?: DateKey | null;
  /** Local time "HH:MM" or null when reminders are off. */
  reminder?: string | null;
  archived?: boolean;
  freq: FrequencyRule;
}

export interface Log {
  activityId: string;
  date: DateKey;
  state: LogState;
  value?: number | null;
  note?: string | null;
  reason?: string | null;
}

/** How the engine reads logs. Decouples it from the database. */
export type LogLookup = (activityId: string, date: DateKey) => LogState | null;

/** Visual state of one grid cell. */
export type CellState =
  | 'done'
  | 'min'
  | 'skip'
  | 'pending' // today, due, no log yet
  | 'missed' // past, was due, no log
  | 'future' // due on a future day
  | 'flex' // flexible (perWeek), available in the past/today
  | 'flex-future' // flexible, available in the future
  | 'none'; // not due

export interface Consistency {
  hits: number;
  expected: number;
  /** Rounded percentage, or null when nothing was expected. */
  pct: number | null;
}

/** Lookup that always returns null: "no logs". */
export const NO_LOGS: LogLookup = () => null;

export const isHit = (state: LogState | null | undefined): boolean =>
  state === 'done' || state === 'min';
