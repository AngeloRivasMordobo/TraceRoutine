import { describe, expect, it } from 'vitest';
import { defaultRule } from '../../engine/presets';
import { addCycleStep, anchorExamples, applyDuration, isValidTime, newDraft, previewSummary, removeCycleStep, toggleWeekday, validateDraft } from './editorModel';

const TODAY = '2026-08-27';

describe('editor model', () => {
  it('a new draft is "every other day", anchored to the calendar, starting today', () => {
    const d = newDraft('x', TODAY);
    expect(d.freq.type).toBe('everyN');
    expect(d.freq.n).toBe(2);
    expect(d.freq.anchor).toBe('calendar');
    expect(d.start).toBe(TODAY);
    expect(validateDraft(d)).toEqual(['name']);
  });
  it('validates name, unit, dates, time and rule', () => {
    const d = { ...newDraft('x', TODAY), name: 'Read', record: 'amount' as const, unit: '', end: '2026-08-01', reminder: '25:99' };
    expect(validateDraft(d)).toEqual(['unit', 'end', 'time']);
    expect(validateDraft({ ...newDraft('x', TODAY), name: 'A', start: '2026-02-30' })).toEqual(['start']);
    expect(validateDraft({ ...newDraft('x', TODAY), name: 'A', freq: { ...defaultRule(), type: 'weekdays', days: [] } })).toEqual(['days']);
    expect(isValidTime('07:30')).toBe(true);
    expect(isValidTime('7:30')).toBe(false);
  });
  it('anchor examples follow N', () => {
    expect(anchorExamples(2)).toEqual({ b: 3, c: 5, d: 4, e: 6 });
    expect(anchorExamples(3)).toEqual({ b: 4, c: 7, d: 5, e: 8 });
  });
  it('duration shortcuts compute an inclusive end date', () => {
    expect(applyDuration('2026-08-27', '21d')).toBe('2026-09-16');
    expect(applyDuration('2026-08-27', '4w')).toBe('2026-09-23');
    expect(applyDuration('2026-08-27', '3m')).toBe('2026-11-24');
  });
  it('preview summary counts due days in the month with perfect completion', () => {
    const d = { ...newDraft('x', TODAY), name: 'A' }; // every other day from today
    const s = previewSummary(d, 2026, 8, TODAY);
    expect(s.count).toBe(3); // 27, 29, 31
    expect(s.dueToday).toBe(true);
    expect(s.next).toBe('2026-08-29');
    expect([...s.dueDays]).toEqual(['2026-08-27', '2026-08-29', '2026-08-31']);
    const flex = { ...d, freq: { ...defaultRule(), type: 'perWeek' as const, times: 3 } };
    expect(previewSummary(flex, 2026, 9, TODAY)).toMatchObject({ flexible: true, count: 13, next: null });
  });
  it('edits cycle steps and weekdays immutably', () => {
    const r = defaultRule();
    const added = addCycleStep(r, '  Cardio  ');
    expect(added.steps?.at(-1)).toEqual({ label: 'Cardio', rest: false });
    expect(addCycleStep(r, '   ')).toBe(r);
    expect(removeCycleStep(added, 0).steps?.length).toBe(4);
    expect(toggleWeekday({ ...r, days: [1] }, 1).days).toEqual([]);
    expect(toggleWeekday({ ...r, days: [1] }, 5).days).toEqual([1, 5]);
  });
});
