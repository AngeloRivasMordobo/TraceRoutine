import { describe, expect, it } from 'vitest';
import { defaultRule } from '../../engine/presets';
import { LANGS, t } from '../../i18n';
import { addCycleStep, anchorExamples, applyDuration, cycleLegend, dateToTime, DRAFT_ERROR_TEXT, isValidTime, newDraft, previewSummary, removeCycleStep, timeToDate, toggleWeekday, validateDraft } from './editorModel';

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
  it('the cycle legend names only the steps that carry a letter (TR-90)', () => {
    expect(cycleLegend([{ label: 'Push' }, { label: 'Pull' }, { label: 'Legs' }, { label: 'Rest', rest: true }])).toBe('P=Push · U=Pull · L=Legs');
    expect(cycleLegend([{ label: 'A' }, { label: 'Rest', rest: true }, { label: 'B' }, { label: 'Rest', rest: true }])).toBe('A=A · B=B');
    expect(cycleLegend([])).toBe('');
  });
  it('a reminder time survives the round trip through the time picker, for every minute of the day (TR-107)', () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        expect(dateToTime(timeToDate(time))).toBe(time);
      }
    }
    expect(dateToTime(timeToDate('08:00g'))).toBe('08:00');
    expect(dateToTime(timeToDate(''))).toBe('08:00');
  });
  it('the picker time never depends on the device time zone or a daylight-saving change (TR-107)', () => {
    expect(timeToDate('02:30').toISOString()).toBe('2000-01-01T02:30:00.000Z');
    expect(dateToTime(new Date('2000-01-01T00:00:00Z'))).toBe('00:00');
    expect(dateToTime(new Date('2000-01-01T23:59:00Z'))).toBe('23:59');
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
  it('tells an impossible end date apart from one before the start', () => {
    const d = { ...newDraft('x', TODAY), name: 'A' };
    expect(validateDraft({ ...d, end: '2026-02-30' })).toEqual(['endDate']);
    expect(validateDraft({ ...d, end: '2026-8-1' })).toEqual(['endDate']);
    expect(validateDraft({ ...d, end: '2026-08-01' })).toEqual(['end']);
    expect(validateDraft({ ...d, end: TODAY })).toEqual([]);
    expect(t(DRAFT_ERROR_TEXT.endDate, undefined, 'en')).toBe(t('editor.errDate', undefined, 'en'));
    expect(t(DRAFT_ERROR_TEXT.end, undefined, 'en')).toBe("The end date can't be before the start.");
  });
  it('has a message for every error, in both languages (an invalid start showed the key "editor.errStart")', () => {
    for (const key of Object.values(DRAFT_ERROR_TEXT)) {
      for (const lang of LANGS) expect(t(key, undefined, lang), `${key} (${lang})`).not.toBe(key);
    }
    expect(t(DRAFT_ERROR_TEXT.start, undefined, 'es')).toBe('Fecha inválida (AAAA\u2011MM\u2011DD).');
  });
  it('writes the date format with non-breaking hyphens, so "YYYY-" and "MM-DD" never land on two lines', () => {
    for (const lang of LANGS) {
      for (const key of ['editor.dateHelp', 'editor.errDate']) {
        const text = t(key, undefined, lang);
        expect(text).toMatch(/\u2011MM\u2011DD/);
        expect(text).not.toContain('-');
      }
    }
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
  it('counts weekly sessions only over the days of the month the activity runs', () => {
    const flex = { ...newDraft('x', '2026-10-19'), name: 'Read', freq: { ...defaultRule(), type: 'perWeek' as const, times: 3 } };
    // 19–31 October is 13 days: about 6 sessions (the preview said "About 13 times in October").
    expect(previewSummary(flex, 2026, 10, '2026-10-19').count).toBe(6);
    expect(previewSummary(flex, 2026, 11, '2026-10-19').count).toBe(13); // a whole month: 30 / 7 × 3
    expect(previewSummary({ ...flex, end: '2026-11-07' }, 2026, 11, '2026-10-19').count).toBe(3); // 1–7 November
    expect(previewSummary({ ...flex, end: '2026-10-25' }, 2026, 11, '2026-10-19').count).toBe(0); // over before November
    expect(previewSummary(flex, 2026, 9, '2026-10-19').count).toBe(0); // not started yet
    expect(previewSummary({ ...flex, freq: { ...flex.freq, times: 7 }, end: '2026-10-20' }, 2026, 10, '2026-10-19').count).toBe(2); // one a day at most
    expect(previewSummary({ ...flex, start: '2026-10-' }, 2026, 10, '2026-10-19').count).toBe(13); // a start still being typed
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
