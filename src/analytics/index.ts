/**
 * Minimal analytics (TR-77): named events, no PII, opt-out honored before anything is sent.
 * Sinks are pluggable: console in development, PostHog when a key is configured.
 * `sanitize` is the guarantee that no event ever carries free text or activity names.
 */
export type EventName =
  | 'create_activity' | 'complete' | 'minimum' | 'skip' | 'open_grid' | 'edit_past' | 'export' | 'backup' | 'import'
  | 'free_limit_reached' | 'pro_interest' | 'onboarding_completed' | 'onboarding_skipped' | 'language' | 'theme' | 'reminders_scheduled';

export type Props = Record<string, string | number | boolean | null | undefined>;
export interface Sink {
  track(event: EventName, props?: Props): void;
  setOptOut?(value: boolean): void;
  setUserProperties?(props: Props): void;
}

/** Only these property keys leave the app. Anything else is dropped. */
export const ALLOWED_PROPS: Record<EventName, readonly string[]> = {
  create_activity: ['type', 'anchor', 'first_activity'],
  complete: ['type', 'source'],
  minimum: ['type', 'source'],
  skip: ['reason'],
  open_grid: [],
  edit_past: ['state'],
  export: ['activities', 'logs'],
  backup: [],
  import: ['mode', 'logs'],
  free_limit_reached: ['active'],
  pro_interest: [],
  onboarding_completed: [],
  onboarding_skipped: [],
  language: ['lang'],
  theme: ['theme'],
  reminders_scheduled: ['count'],
};

const MAX_STRING = 24;

/** Drops unknown keys and anything that looks like free text. */
export function sanitize(event: EventName, props?: Props): Props | undefined {
  if (!props) return undefined;
  const allowed = ALLOWED_PROPS[event] ?? [];
  const out: Props = {};
  for (const key of allowed) {
    const v = props[key];
    if (v === undefined) continue;
    if (typeof v === 'string' && (v.length > MAX_STRING || /\s/.test(v))) continue;
    out[key] = v;
  }
  return out;
}

let optOut = false;
const consoleSink: Sink = { track: (event, props) => { if (__DEV__) console.log('[analytics]', event, props ?? ''); } };
let sink: Sink = consoleSink;

export function setAnalyticsOptOut(value: boolean): void {
  optOut = value;
  sink.setOptOut?.(value);
}
export function isAnalyticsOptedOut(): boolean {
  return optOut;
}
export function setAnalyticsSink(s: Sink): void {
  sink = s;
  sink.setOptOut?.(optOut);
}
export function track(event: EventName, props?: Props): void {
  if (optOut) return;
  try { sink.track(event, sanitize(event, props)); } catch { /* analytics must never break the app */ }
}
/** Anonymous, aggregate properties (counts, types, language). Never names. */
export function setUserProperties(props: Props): void {
  if (optOut) return;
  try { sink.setUserProperties?.(props); } catch { /* ignore */ }
}
