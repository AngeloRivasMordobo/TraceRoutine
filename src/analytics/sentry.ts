/**
 * Sentry (TR-77): crashes and unhandled errors, nothing else. No PII, no performance tracing
 * (saves the free quota), and the same opt-out switch as analytics. Off on iOS v1 (`analyticsAllowed`).
 */
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
import { isAnalyticsOptedOut } from './index';
import { analyticsAllowed } from './policy';

export function initSentry(): void {
  const dsn = analyticsAllowed(Platform.OS) ? process.env.EXPO_PUBLIC_SENTRY_DSN : undefined;
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
