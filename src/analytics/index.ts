/**
 * Minimal analytics (TR-77): named events, no PII, opt-out honored before anything is sent.
 * The sink is pluggable: console in development now, PostHog/Sentry when keys exist.
 */
export type EventName =
  | 'create_activity' | 'complete' | 'minimum' | 'skip' | 'open_grid' | 'edit_past' | 'export' | 'backup' | 'import'
  | 'free_limit_reached' | 'pro_interest' | 'onboarding_completed' | 'onboarding_skipped' | 'language' | 'theme' | 'reminders_scheduled';

export type Props = Record<string, string | number | boolean | null | undefined>;
export interface Sink { track(event: EventName, props?: Props): void }

let optOut = false;
let sink: Sink = { track: (event, props) => { if (__DEV__) console.log('[analytics]', event, props ?? ''); } };

export function setAnalyticsOptOut(value: boolean): void { optOut = value; }
export function setAnalyticsSink(s: Sink): void { sink = s; }
export function track(event: EventName, props?: Props): void {
  if (optOut) return;
  try { sink.track(event, props); } catch { /* analytics must never break the app */ }
}
