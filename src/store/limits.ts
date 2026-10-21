import type { Activity, DateKey } from '../engine';

/** Free plan (Plan §10, TR-68). Frequencies are never paid; only the number of active activities is limited. */
export const FREE_ACTIVE_LIMIT = 5;

/** What counts against the limit: an activity that is not archived and has not passed its end date. */
export function isActive(a: Activity, today: DateKey): boolean {
  return !a.archived && !(a.end && a.end < today);
}

/**
 * Whether saving `next` would make one activity more active than the limit allows: a new activity, an
 * archived one brought back, or an ended one given a later end date. Every path that makes an activity
 * active asks this, not only "Create" (Unarchive in Settings used to skip it and left 6 active).
 * One that was already active never trips it, so someone already over the limit (a backup merged in)
 * can still edit and archive.
 */
export function passesActiveLimit(activities: readonly Activity[], next: Activity, today: DateKey): boolean {
  if (!isActive(next, today)) return false;
  const before = activities.find((a) => a.id === next.id);
  if (before && isActive(before, today)) return false;
  return activities.filter((a) => a.id !== next.id && isActive(a, today)).length >= FREE_ACTIVE_LIMIT;
}

/**
 * Whether the app may talk about TraceRoutine Pro on this platform (TR-69). The first iOS release sells
 * nothing (owner decision, 2026-10-19): no Pro card, no "Let me know when it's ready" capture, no Pro
 * way out of the limit and no line that implies a paid tier, until the purchase exists (TR-96).
 * Android keeps what is live on Google Play.
 * Callers pass `Platform.OS`; this module stays free of React Native so it is covered by tests.
 */
export function showsPro(os: string): boolean {
  return os !== 'ios';
}

/**
 * The texts that talk about Pro, the free plan or paying, and so may only be shown where `showsPro(os)`.
 * src/store/limits.test.ts fails when any other string in the dictionaries reads like an upsell, so new
 * purchase copy has to be listed here, and gated, before it can ship.
 */
export const PRO_ONLY_KEYS = [
  'settings.pro',
  'settings.proBody',
  'settings.freeLimit',
  'settings.notifyMe',
  'settings.proNotified',
  'settings.freeLimitTitle',
  'settings.freeLimitBody',
  'settings.freeLimitPro',
  'freq.neverPaid',
] as const;

/**
 * iOS: at the limit, the editor says so as it opens for a new activity, instead of letting the whole form
 * be filled in and refusing it on Create (simulator QA, 2026-10-19). Create still checks. Android keeps the
 * alert on Create only, as live on Google Play.
 */
export function warnsAtLimitOnOpen(os: string): boolean {
  return os === 'ios';
}

/** Where a button of the limit alert leads; `null` closes the alert and leaves the editor as it is. */
export type LimitRoute = '/(tabs)/settings' | '/(tabs)/month' | null;

export interface FreeLimitPrompt {
  /** i18n keys; the title takes `{limit}`. */
  title: string;
  body: string;
  /** In display order; the one with no route is the cancel button. */
  buttons: { label: string; goTo: LimitRoute }[];
}

/**
 * The alert shown when saving a new activity would pass the limit. Android keeps the alert live on Google
 * Play: "See archived" and "About Pro", both to Settings. On iOS it states the limit with no upsell, and its
 * one way forward goes to Month, which lists every active activity; archiving is in each one's editor.
 */
export function freeLimitPrompt(os: string): FreeLimitPrompt {
  const cancel = { label: 'editor.cancel', goTo: null };
  return showsPro(os)
    ? {
        title: 'settings.freeLimitTitle',
        body: 'settings.freeLimitBody',
        buttons: [cancel, { label: 'settings.freeLimitArchive', goTo: '/(tabs)/settings' }, { label: 'settings.freeLimitPro', goTo: '/(tabs)/settings' }],
      }
    : { title: 'settings.activeLimitTitle', body: 'settings.activeLimitBody', buttons: [cancel, { label: 'settings.activeLimitSee', goTo: '/(tabs)/month' }] };
}

/** The help line under the editor's "Frequency" heading: "never a paid feature" implies a paid tier, so not on iOS v1. */
export function frequencyHelp(os: string): (typeof PRO_ONLY_KEYS)[number] | null {
  return showsPro(os) ? 'freq.neverPaid' : null;
}
