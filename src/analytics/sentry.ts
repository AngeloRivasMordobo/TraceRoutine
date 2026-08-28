/**
 * Sentry (TR-77): crashes and unhandled errors, nothing else. No PII, no performance tracing
 * (saves the free quota), and the same opt-out switch as analytics.
 */
import * as Sentry from '@sentry/react-native';
import { isAnalyticsOptedOut } from './index';

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  Sentry.init({
    dsn,
    enabled: !!dsn,
    environment: __DEV__ ? 'development' : 'production',
    sendDefaultPii: false,
    tracesSampleRate: 0,
    attachScreenshot: false,
    maxBreadcrumbs: 30,
    beforeSend: (event) => (isAnalyticsOptedOut() ? null : event),
    // console breadcrumbs could carry activity names from our own dev logs
    beforeBreadcrumb: (crumb) => (crumb.category === 'console' ? null : crumb),
  });
}

export const wrapRoot = Sentry.wrap;
export const captureException = Sentry.captureException;
