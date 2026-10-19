/** Free plan (Plan §10, TR-68). Frequencies are never paid; only the number of active activities is limited. */
export const FREE_ACTIVE_LIMIT = 5;

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
