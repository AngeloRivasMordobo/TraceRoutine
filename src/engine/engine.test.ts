import { describe, expect, it } from 'vitest';
import {
  activePreset,
  addDays,
  aggregate,
  applyPreset,
  cellState,
  consistency,
  cycleStep,
  daysBetween,
  daysInMonth,
  defaultRule,
  describeFrequency,
  dueToday,
  futureState,
  isDue,
  isEditable,
  isValidKey,
  makeKey,
  nextDue,
  nextLogState,
  pendingSince,
  PRESET_IDS,
  projectedLookup,
  signature,
  simulatePerfect,
  startOfWeek,
  todayKey,
  validateRule,
  weekday,
  type Activity,
  type DateKey,
  type FrequencyRule,
  type LogLookup,
  type LogState,
} from './index';

/** Fixed "today": Thursday 27 August 2026. Nothing here reads the real clock. */
const TODAY: DateKey = '2026-08-27';
const T = (offset: number) => addDays(TODAY, offset);

function mk(freq: FrequencyRule, startOffset: number, endOffset?: number, extra: Partial<Activity> = {}): Activity {
  return {
    id: 'a',
    name: 'Test',
    icon: 'x',
    color: 'accent',
    record: 'check',
    start: T(startOffset),
    end: endOffset === undefined ? null : T(endOffset),
    freq,
    ...extra,
  };
}

function logs(map: Record<DateKey, LogState>): LogLookup {
  return (_id, date) => map[date] ?? null;
}
const NONE: LogLookup = () => null;
const PUL: FrequencyRule['steps'] = [{ label: 'Push' }, { label: 'Pull' }, { label: 'Legs' }, { label: 'Rest', rest: true }];

describe('dates', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31');
  });
  it('counts days across a year boundary', () => {
    expect(daysBetween('2025-12-30', '2026-01-02')).toBe(3);
  });
  it('handles February 29 in leap years only', () => {
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });
  it('weeks start on Monday', () => {
    expect(weekday(TODAY)).toBe(4);
    expect(startOfWeek(TODAY)).toBe('2026-08-24');
    expect(startOfWeek('2026-08-30')).toBe('2026-08-24');
    expect(startOfWeek('2026-08-24')).toBe('2026-08-24');
  });
  it('validates keys strictly', () => {
    expect(isValidKey('2026-08-27')).toBe(true);
    expect(isValidKey('2026-02-30')).toBe(false);
    expect(isValidKey('27-08-2026')).toBe(false);
  });
  it('todayKey uses the injected local clock, not UTC', () => {
    expect(todayKey(new Date(2026, 7, 27, 23, 59))).toBe('2026-08-27');
    expect(makeKey(2026, 1, 5)).toBe('2026-01-05');
  });
});

describe('isDue: daily, weekdays and window (TR-21)', () => {
  it('daily is due every day inside the window and never before the start', () => {
    const a = mk({ type: 'daily' }, -3);
    expect(isDue(a, TODAY, NONE)).toBe(true);
    expect(isDue(a, T(-3), NONE)).toBe(true);
    expect(isDue(a, T(-4), NONE)).toBe(false);
  });
  it('an end date is inclusive', () => {
    const a = mk({ type: 'daily' }, -5, 2);
    expect(isDue(a, T(2), NONE)).toBe(true);
    expect(isDue(a, T(3), NONE)).toBe(false);
  });
  it('M-W-F is due only on those days for 4 weeks', () => {
    const a = mk({ type: 'weekdays', days: [1, 3, 5] }, -30);
    expect(isDue(a, '2026-08-24', NONE)).toBe(true); // Monday
    expect(isDue(a, '2026-08-25', NONE)).toBe(false); // Tuesday
    let count = 0;
    for (let d = '2026-08-03'; d <= '2026-08-30'; d = addDays(d, 1)) if (isDue(a, d, NONE)) count++;
    expect(count).toBe(12);
  });
  it('weekdays with no days is never due', () => {
    expect(isDue(mk({ type: 'weekdays', days: [] }, -10), TODAY, NONE)).toBe(false);
  });
});

describe('isDue: every N days anchored to the calendar (TR-22)', () => {
  it('is due on start, start+2, start+4 and missing does not shift it', () => {
    const a = mk({ type: 'everyN', n: 2, anchor: 'calendar' }, -4);
    expect(isDue(a, T(-4), NONE)).toBe(true);
    expect(isDue(a, T(-2), NONE)).toBe(true);
    expect(isDue(a, TODAY, NONE)).toBe(true);
    expect(isDue(a, T(-1), NONE)).toBe(false);
    // missed T(-2): T(-1) is still not due
    expect(isDue(a, T(-1), logs({}))).toBe(false);
  });
  it('N = 3 with a 21-day window gives exactly 7 due days', () => {
    const a = mk({ type: 'everyN', n: 3, anchor: 'calendar' }, 0, 20);
    let count = 0;
    for (let d = T(-5); d <= T(30); d = addDays(d, 1)) if (isDue(a, d, NONE)) count++;
    expect(count).toBe(7);
  });
  it('N = 1 behaves like daily', () => {
    const a = mk({ type: 'everyN', n: 1, anchor: 'calendar' }, -2);
    expect(isDue(a, T(-1), NONE)).toBe(true);
    expect(isDue(a, TODAY, NONE)).toBe(true);
  });
});

describe('isDue: every N days since last time (TR-23)', () => {
  const a = mk({ type: 'everyN', n: 2, anchor: 'relative' }, -6);
  it('with no logs it is due every day until done', () => {
    expect(isDue(a, T(-6), NONE)).toBe(true);
    expect(isDue(a, T(-5), NONE)).toBe(true);
    expect(isDue(a, TODAY, NONE)).toBe(true);
  });
  it('done yesterday: not due today, due tomorrow', () => {
    const L = logs({ [T(-1)]: 'done' });
    expect(isDue(a, TODAY, L)).toBe(false);
    expect(isDue(a, T(1), L)).toBe(true);
  });
  it('done 2 days ago and nothing since: still due today and tomorrow', () => {
    const L = logs({ [T(-2)]: 'done' });
    expect(isDue(a, TODAY, L)).toBe(true);
    expect(isDue(a, T(1), L)).toBe(true);
  });
  it('clearing a past done shifts the later dates', () => {
    const withLog = logs({ [T(-6)]: 'done', [T(-3)]: 'done' });
    const cleared = logs({ [T(-6)]: 'done' });
    expect(isDue(a, T(-2), withLog)).toBe(false);
    expect(isDue(a, T(-2), cleared)).toBe(true);
  });
  it('skip does not restart the interval', () => {
    const L = logs({ [T(-3)]: 'done', [T(-1)]: 'skip' });
    expect(isDue(a, TODAY, L)).toBe(true);
  });
});

describe('isDue: X times per week (TR-24)', () => {
  const a = mk({ type: 'perWeek', times: 3 }, -20);
  const mon = '2026-08-24';
  it('Tuesday with 1 done is due', () => {
    expect(isDue(a, addDays(mon, 1), logs({ [mon]: 'done' }))).toBe(true);
  });
  it('after 3 done it is no longer due that week', () => {
    const L = logs({ [mon]: 'done', [addDays(mon, 1)]: 'done', [addDays(mon, 2)]: 'min' });
    expect(isDue(a, addDays(mon, 3), L)).toBe(false); // Thursday
    expect(isDue(a, addDays(mon, 5), L)).toBe(false); // Saturday
    expect(isDue(a, addDays(mon, 7), L)).toBe(true); // next Monday
  });
  it('skip does not count towards the week', () => {
    const L = logs({ [mon]: 'skip', [addDays(mon, 1)]: 'skip', [addDays(mon, 2)]: 'skip' });
    expect(isDue(a, addDays(mon, 3), L)).toBe(true);
  });
  it('7 times per week is due every day', () => {
    const b = mk({ type: 'perWeek', times: 7 }, -20);
    for (let i = 0; i < 7; i++) expect(isDue(b, addDays(mon, i), NONE)).toBe(true);
  });
});

describe('cycle with steps and rest (TR-25)', () => {
  it('calendar mode: every day is a step, done or not', () => {
    const a = mk({ type: 'cycle', steps: PUL, anchor: 'calendar' }, -3);
    expect(cycleStep(a, T(-3), NONE)?.label).toBe('Push');
    expect(cycleStep(a, T(1), NONE)?.label).toBe('Push'); // start + 4
    expect(isDue(a, TODAY, NONE)).toBe(false); // start + 3 = Rest
    expect(isDue(a, T(4), NONE)).toBe(false); // start + 7 = Rest
  });
  it('wait mode: miss Legs and tomorrow is still Legs', () => {
    const a = mk({ type: 'cycle', steps: PUL, anchor: 'relative' }, -3);
    const L = logs({ [T(-3)]: 'done', [T(-2)]: 'done' });
    expect(cycleStep(a, T(-1), L)?.label).toBe('Legs');
    expect(cycleStep(a, TODAY, L)?.label).toBe('Legs');
    expect(cycleStep(a, T(1), L)?.label).toBe('Legs');
  });
  it('wait mode: skip Legs and tomorrow is Rest, then Push', () => {
    const a = mk({ type: 'cycle', steps: PUL, anchor: 'relative' }, -3);
    const L = logs({ [T(-3)]: 'done', [T(-2)]: 'done', [T(-1)]: 'skip' });
    expect(cycleStep(a, TODAY, L)?.rest).toBe(true);
    expect(isDue(a, TODAY, L)).toBe(false);
    expect(cycleStep(a, T(1), L)?.label).toBe('Push');
  });
  it('two consecutive rest days are both consumed on their own', () => {
    const steps = [{ label: 'A' }, { label: 'R1', rest: true }, { label: 'R2', rest: true }];
    const a = mk({ type: 'cycle', steps, anchor: 'relative' }, -3);
    const L = logs({ [T(-3)]: 'done' });
    expect(isDue(a, T(-2), L)).toBe(false);
    expect(isDue(a, T(-1), L)).toBe(false);
    expect(cycleStep(a, TODAY, L)?.label).toBe('A');
  });
  it('a cycle with only rest steps is never due', () => {
    const a = mk({ type: 'cycle', steps: [{ label: 'R', rest: true }], anchor: 'calendar' }, -3);
    expect(isDue(a, TODAY, NONE)).toBe(false);
  });
});

describe('nextDue, projection and pendingSince (TR-26)', () => {
  it('relative N = 3: done today → in 3 days; not done → tomorrow', () => {
    const a = mk({ type: 'everyN', n: 3, anchor: 'relative' }, -10);
    expect(nextDue(a, TODAY, logs({ [TODAY]: 'done' }))).toBe(T(3));
    expect(nextDue(a, TODAY, logs({ [T(-3)]: 'done' }))).toBe(T(1)); // due today and not done: still due tomorrow
  });
  it('returns null when the window has ended', () => {
    const a = mk({ type: 'daily' }, -10, -1);
    expect(nextDue(a, TODAY, NONE)).toBeNull();
  });
  it('wait-mode cycle projects P, U, L, rest instead of "due every day"', () => {
    const a = mk({ type: 'cycle', steps: PUL, anchor: 'relative' }, -1);
    const L = logs({ [T(-1)]: 'done' }); // Push done yesterday, Pull pending today
    const PL = projectedLookup(a, TODAY, T(6), L);
    expect(cycleStep(a, TODAY, L)?.label).toBe('Pull');
    expect(futureState(a, T(1), PL)).toBe('future');
    expect(cycleStep(a, T(1), PL)?.label).toBe('Legs');
    expect(futureState(a, T(2), PL)).toBe('none'); // Rest
    expect(cycleStep(a, T(3), PL)?.label).toBe('Push');
  });
  it('simulatePerfect gives the editor preview rhythm', () => {
    const a = mk({ type: 'everyN', n: 3, anchor: 'relative' }, 0);
    const PL = simulatePerfect(a, T(30));
    expect(isDue(a, TODAY, PL)).toBe(true);
    expect(isDue(a, T(1), PL)).toBe(false);
    expect(isDue(a, T(3), PL)).toBe(true);
  });
  it('pendingSince reports the start of the pending run for relative rules', () => {
    const a = mk({ type: 'everyN', n: 2, anchor: 'relative' }, -10);
    expect(pendingSince(a, TODAY, logs({ [T(-4)]: 'done' }))).toBe(T(-2));
    expect(pendingSince(a, TODAY, logs({ [T(-2)]: 'done' }))).toBeNull(); // due only from today
    expect(pendingSince(a, TODAY, logs({ [T(-1)]: 'done' }))).toBeNull(); // not due
    expect(pendingSince(mk({ type: 'daily' }, -5), TODAY, NONE)).toBeNull(); // not relative
  });
});

describe('consistency over scheduled days (TR-27)', () => {
  it('14 of 15 every-other-day → 93 %', () => {
    const a = mk({ type: 'everyN', n: 2, anchor: 'calendar' }, -30);
    const map: Record<DateKey, LogState> = {};
    for (let i = -30; i <= -2; i += 2) map[T(i)] = 'done';
    delete map[T(-10)];
    expect(consistency(a, T(-30), T(-1), TODAY, logs(map))).toEqual({ hits: 14, expected: 15, pct: 93 });
  });
  it('minimum counts as a hit and today pending is not expected', () => {
    const a = mk({ type: 'daily' }, -4);
    const L = logs({ [T(-4)]: 'done', [T(-3)]: 'min', [T(-2)]: 'done', [T(-1)]: 'done' });
    expect(consistency(a, T(-30), T(10), TODAY, L)).toEqual({ hits: 4, expected: 4, pct: 100 });
  });
  it('relative: a run of pending days is one opportunity', () => {
    const a = mk({ type: 'everyN', n: 2, anchor: 'relative' }, -6);
    // done -6, due -4, missed -4 and -3, done -2, due today (pending)
    const L = logs({ [T(-6)]: 'done', [T(-2)]: 'done' });
    expect(consistency(a, T(-30), TODAY, TODAY, L)).toEqual({ hits: 2, expected: 2, pct: 100 });
  });
  it('flexible: closed week 2 of 3 → 67 %; current week never penalizes', () => {
    const a = mk({ type: 'perWeek', times: 3 }, -14);
    const prevMon = '2026-08-17';
    const L = logs({ [prevMon]: 'done', [addDays(prevMon, 2)]: 'done', ['2026-08-25']: 'done' });
    expect(consistency(a, prevMon, '2026-08-23', TODAY, L)).toEqual({ hits: 2, expected: 3, pct: 67 });
    expect(consistency(a, '2026-08-24', '2026-08-30', TODAY, L)).toEqual({ hits: 1, expected: 1, pct: 100 });
  });
  it('skip is a miss on calendar rules', () => {
    const a = mk({ type: 'daily' }, -2);
    const L = logs({ [T(-2)]: 'done', [T(-1)]: 'skip' });
    expect(consistency(a, T(-2), T(-1), TODAY, L)).toEqual({ hits: 1, expected: 2, pct: 50 });
  });
  it('respects the end date and returns null when nothing was expected', () => {
    const a = mk({ type: 'daily' }, -10, -8);
    expect(consistency(a, T(-10), TODAY, TODAY, logs({ [T(-10)]: 'done', [T(-9)]: 'done', [T(-8)]: 'done' }))).toEqual({ hits: 3, expected: 3, pct: 100 });
    expect(consistency(mk({ type: 'daily' }, 5), T(-10), TODAY, TODAY, NONE)).toEqual({ hits: 0, expected: 0, pct: null });
  });
  it('aggregates across activities', () => {
    expect(aggregate([{ hits: 3, expected: 4, pct: 75 }, { hits: 1, expected: 4, pct: 25 }])).toEqual({ hits: 4, expected: 8, pct: 50 });
    expect(aggregate([])).toEqual({ hits: 0, expected: 0, pct: null });
  });
});

describe('cell state and edit rules (TR-28)', () => {
  it('covers the 9 states', () => {
    const a = mk({ type: 'everyN', n: 2, anchor: 'calendar' }, -4);
    const L = logs({ [T(-4)]: 'done', [T(-2)]: 'min', [T(-6)]: 'skip' });
    expect(cellState(a, T(-4), TODAY, L)).toBe('done');
    expect(cellState(a, T(-2), TODAY, L)).toBe('min');
    expect(cellState(a, T(-6), TODAY, L)).toBe('skip'); // a log wins even outside the window
    expect(cellState(a, TODAY, TODAY, L)).toBe('pending');
    expect(cellState(a, T(-1), TODAY, L)).toBe('none');
    expect(cellState(a, T(2), TODAY, L)).toBe('future');
    expect(cellState(a, T(-3), TODAY, logs({}))).toBe('none');
    const missed = mk({ type: 'daily' }, -3);
    expect(cellState(missed, T(-1), TODAY, NONE)).toBe('missed');
    const flex = mk({ type: 'perWeek', times: 3 }, -10);
    expect(cellState(flex, T(-1), TODAY, NONE)).toBe('flex');
    expect(cellState(flex, T(1), TODAY, NONE)).toBe('flex-future');
  });
  it('the future is never editable; flexible and logged days are', () => {
    const a = mk({ type: 'everyN', n: 2, anchor: 'calendar' }, -4);
    expect(isEditable(a, T(2), TODAY, NONE)).toBe(false);
    expect(isEditable(a, TODAY, TODAY, NONE)).toBe(true);
    expect(isEditable(a, T(-1), TODAY, NONE)).toBe(false); // not due
    expect(isEditable(a, T(-1), TODAY, logs({ [T(-1)]: 'done' }))).toBe(true);
    expect(isEditable(mk({ type: 'perWeek', times: 2 }, -10), T(-3), TODAY, NONE)).toBe(true);
  });
  it('taps cycle empty → done → minimum → skipped → empty', () => {
    expect(nextLogState(null)).toBe('done');
    expect(nextLogState('done')).toBe('min');
    expect(nextLogState('min')).toBe('skip');
    expect(nextLogState('skip')).toBeNull();
  });
});

describe('presets and descriptions (TR-29)', () => {
  it('apply and detect are inverses for every preset', () => {
    for (const id of PRESET_IDS) expect(activePreset(applyPreset(defaultRule(), id))).toBe(id);
  });
  it('changing a parameter unselects the preset', () => {
    const r = applyPreset(defaultRule(), 'everyOtherDay');
    expect(activePreset({ ...r, n: 3 })).toBeNull();
  });
  it('localized cycle steps still match the cycle preset', () => {
    const es = applyPreset(defaultRule(), 'pushPullLegs', {
      cycleSteps: [{ label: 'Empuje' }, { label: 'Jalón' }, { label: 'Pierna' }, { label: 'Descanso', rest: true }],
    });
    expect(activePreset(es)).toBe('pushPullLegs');
    expect(signature(es)).toBe('cycle:xxxr');
  });
  it('applying a preset keeps the anchor and other parameters', () => {
    const r = applyPreset({ ...defaultRule(), anchor: 'relative', times: 5 }, 'everyOtherDay');
    expect(r.anchor).toBe('relative');
    expect(r.times).toBe(5);
    expect(r.n).toBe(2);
  });
  it('describes rules structurally (N = 1 is daily)', () => {
    expect(describeFrequency({ type: 'everyN', n: 1 })).toEqual({ kind: 'daily' });
    expect(describeFrequency({ type: 'everyN', n: 3, anchor: 'relative' })).toEqual({ kind: 'everyN', n: 3, relative: true });
    expect(describeFrequency({ type: 'cycle', steps: PUL, anchor: 'relative' })).toEqual({ kind: 'cycle', steps: PUL, relative: true });
  });
  it('validates editor rules', () => {
    expect(validateRule({ type: 'weekdays', days: [] })).toEqual(['weekdays.empty']);
    expect(validateRule({ type: 'cycle', steps: [{ label: 'R', rest: true }] })).toEqual(['cycle.noActiveStep']);
    expect(validateRule({ type: 'everyN', n: 40 })).toEqual(['everyN.range']);
    expect(validateRule({ type: 'perWeek', times: 0 })).toEqual(['perWeek.range']);
    expect(validateRule(applyPreset(defaultRule(), 'mwf'))).toEqual([]);
  });
});

describe('today list', () => {
  it('excludes archived activities and ones that start in the future', () => {
    const list = [
      mk({ type: 'daily' }, -1, undefined, { id: 'active' }),
      mk({ type: 'daily' }, -1, undefined, { id: 'archived', archived: true }),
      mk({ type: 'daily' }, 3, undefined, { id: 'later' }),
    ];
    expect(dueToday(list, TODAY, NONE).map((a) => a.id)).toEqual(['active']);
  });
});
