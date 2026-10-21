/**
 * The app's public contact points: the privacy policy (App Store guideline 5.1.1(i) and
 * Google Play's User Data policy both ask for a link inside the app) and the support inbox.
 * Pure, so the addresses are covered by tests.
 */
import type { Lang } from '../i18n';

/** docs/privacy.html, served by GitHub Pages. Spanish comes first; English starts at `#en`. */
export const PRIVACY_POLICY_URL = 'https://angelorivasmordobo.github.io/TraceRoutine/privacy.html';

/** Public support inbox of MORDOBO TECHNOLOGIES LLC, the publisher. */
export const SUPPORT_EMAIL = 'support@mordobo.com';

/** The policy in the reader's language: the page holds both, English under `#en`. */
export function privacyPolicyUrl(lang: Lang): string {
  return lang === 'en' ? `${PRIVACY_POLICY_URL}#en` : PRIVACY_POLICY_URL;
}

/** "Send feedback": a mail to support with the app version and platform under the message. */
export function feedbackMailto(subject: string, version: string, platform: string): string {
  const body = `\n\n— v${version}${platform ? ` · ${platform}` : ''}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
