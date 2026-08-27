/**
 * One-tap presets and a language-neutral description of any rule.
 * Text lives in i18n (`freqLabel`); the engine only describes structure.
 */
import type { CycleStep, FrequencyRule } from './types';

export type PresetId = 'daily' | 'everyOtherDay' | 'mwf' | 'threePerWeek' | 'weekends' | 'pushPullLegs';

export const PRESET_IDS: PresetId[] = ['daily', 'everyOtherDay', 'mwf', 'threePerWeek', 'weekends', 'pushPullLegs'];

/** Default step labels (English). The i18n layer passes localized ones. */
export const DEFAULT_CYCLE_STEPS: CycleStep[] = [
  { label: 'Push' },
  { label: 'Pull' },
  { label: 'Legs' },
  { label: 'Rest', rest: true },
];

export const MONDAY = 1;
export const WEDNESDAY = 3;
export const FRIDAY = 5;
export const SATURDAY = 6;
export const SUNDAY = 0;

/** A rule with every parameter filled, so switching types never loses values. */
export function defaultRule(): FrequencyRule {
  return {
    type: 'everyN',
    n: 2,
    days: [MONDAY, WEDNESDAY, FRIDAY],
    times: 3,
    steps: DEFAULT_CYCLE_STEPS.map((s) => ({ ...s })),
    anchor: 'calendar',
  };
}

/** Applies a preset, keeping the parameters it does not touch (e.g. the anchor). */
export function applyPreset(
  rule: FrequencyRule,
  id: PresetId,
  opts: { cycleSteps?: CycleStep[] } = {},
): FrequencyRule {
  const r: FrequencyRule = { ...defaultRule(), ...rule };
  switch (id) {
    case 'daily':
      return { ...r, type: 'daily' };
    case 'everyOtherDay':
      return { ...r, type: 'everyN', n: 2 };
    case 'mwf':
      return { ...r, type: 'weekdays', days: [MONDAY, WEDNESDAY, FRIDAY] };
    case 'threePerWeek':
      return { ...r, type: 'perWeek', times: 3 };
    case 'weekends':
      return { ...r, type: 'weekdays', days: [SATURDAY, SUNDAY] };
    case 'pushPullLegs':
      return { ...r, type: 'cycle', steps: (opts.cycleSteps ?? DEFAULT_CYCLE_STEPS).map((s) => ({ ...s })) };
  }
}

/** Structural signature: ignores cycle labels so ES/EN presets both match. */
export function signature(rule: FrequencyRule): string {
  switch (rule.type) {
    case 'daily':
      return 'daily';
    case 'everyN':
      return `everyN:${rule.n ?? 1}`;
    case 'weekdays':
      return `weekdays:${[...(rule.days ?? [])].sort((a, b) => a - b).join(',')}`;
    case 'perWeek':
      return `perWeek:${rule.times ?? 1}`;
    case 'cycle':
      return `cycle:${(rule.steps ?? []).map((s) => (s.rest ? 'r' : 'x')).join('')}`;
  }
}

/** Which preset the rule currently matches, if any. */
export function activePreset(rule: FrequencyRule): PresetId | null {
  const sig = signature(rule);
  for (const id of PRESET_IDS) {
    if (signature(applyPreset(rule, id)) === sig) return id;
  }
  return null;
}

/** Language-neutral description of a rule, ready for the i18n layer. */
export type FrequencyDescriptor =
  | { kind: 'daily' }
  | { kind: 'everyN'; n: number; relative: boolean }
  | { kind: 'weekdays'; days: number[] }
  | { kind: 'perWeek'; times: number }
  | { kind: 'cycle'; steps: CycleStep[]; relative: boolean };

export function describeFrequency(rule: FrequencyRule): FrequencyDescriptor {
  switch (rule.type) {
    case 'daily':
      return { kind: 'daily' };
    case 'everyN': {
      const n = Math.max(1, rule.n ?? 1);
      return n === 1 ? { kind: 'daily' } : { kind: 'everyN', n, relative: rule.anchor === 'relative' };
    }
    case 'weekdays':
      return { kind: 'weekdays', days: [...(rule.days ?? [])] };
    case 'perWeek':
      return { kind: 'perWeek', times: Math.max(1, rule.times ?? 1) };
    case 'cycle':
      return { kind: 'cycle', steps: rule.steps ?? [], relative: rule.anchor === 'relative' };
  }
}

/** Editor validation, language-neutral error codes. */
export type RuleError = 'weekdays.empty' | 'cycle.noActiveStep' | 'everyN.range' | 'perWeek.range';

export function validateRule(rule: FrequencyRule): RuleError[] {
  const errors: RuleError[] = [];
  if (rule.type === 'weekdays' && !(rule.days ?? []).length) errors.push('weekdays.empty');
  if (rule.type === 'cycle' && !(rule.steps ?? []).some((s) => !s.rest)) errors.push('cycle.noActiveStep');
  if (rule.type === 'everyN' && ((rule.n ?? 1) < 1 || (rule.n ?? 1) > 30)) errors.push('everyN.range');
  if (rule.type === 'perWeek' && ((rule.times ?? 1) < 1 || (rule.times ?? 1) > 7)) errors.push('perWeek.range');
  return errors;
}

/**
 * One letter per cycle step for grid cells. First letter, or the second one when it
 * collides with an earlier step (Push / Pull / Legs → P / U / L, as in the design).
 */
export function cycleLetters(steps: CycleStep[]): string[] {
  const used = new Set<string>();
  return steps.map((s) => {
    if (s.rest) return '';
    const chars = s.label.replace(/\s+/g, '').toUpperCase();
    let letter = chars.charAt(0);
    for (let i = 1; used.has(letter) && i < chars.length; i++) letter = chars.charAt(i);
    used.add(letter);
    return letter;
  });
}
