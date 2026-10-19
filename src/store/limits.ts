/** Free plan (Plan §10, TR-68). Frequencies are never paid; only the number of active activities is limited. */
export const FREE_ACTIVE_LIMIT = 5;

/**
 * Whether the app may talk about TraceRoutine Pro on this platform (TR-69). The first iOS release sells
 * nothing (owner decision, 2026-10-19): no Pro card, no "Let me know when it's ready" capture and no Pro
 * way out of the limit, until the purchase exists (TR-96). Android keeps what is live on Google Play.
 * Callers pass `Platform.OS`; this module stays free of React Native so it is covered by tests.
 */
export function showsPro(os: string): boolean {
  return os !== 'ios';
}

export interface FreeLimitPrompt {
  /** i18n keys; the title takes `{limit}`. */
  title: string;
  body: string;
  /** Whether the alert carries the "About Pro" button. */
  offersPro: boolean;
}

/** The alert shown when saving a new activity would pass the limit. On iOS it states the limit, with no upsell. */
export function freeLimitPrompt(os: string): FreeLimitPrompt {
  return showsPro(os)
    ? { title: 'settings.freeLimitTitle', body: 'settings.freeLimitBody', offersPro: true }
    : { title: 'settings.activeLimitTitle', body: 'settings.activeLimitBody', offersPro: false };
}
