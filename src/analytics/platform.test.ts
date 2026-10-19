/**
 * TR-77 on the first iOS release (owner decision, 2026-10-19): the App Store label is "Data Not
 * Collected", so PostHog and Sentry must stay off on iOS even when a key reaches the build. EAS
 * variables are per environment, not per platform, and the same `production` environment builds the
 * Google Play app, so a key added for Android would otherwise switch analytics on in the next iOS binary.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { analyticsAllowed } from './policy';

(globalThis as Record<string, unknown>).__DEV__ = false;

const os = vi.hoisted(() => ({ OS: 'ios' }));
const posthog = vi.hoisted(() => ({ created: [] as string[] }));
const sentry = vi.hoisted(() => ({ init: vi.fn() }));

vi.mock('react-native', () => ({ Platform: os }));
vi.mock('posthog-react-native', () => ({
  PostHog: class {
    constructor(key: string) { posthog.created.push(key); }
    register() { return Promise.resolve(); }
    capture() {}
    optIn() { return Promise.resolve(); }
    optOut() { return Promise.resolve(); }
    flush() { return Promise.resolve(); }
  },
}));
vi.mock('@sentry/react-native', () => ({ init: sentry.init, wrap: (c: unknown) => c, captureException: () => {} }));

const KEYS = ['EXPO_PUBLIC_POSTHOG_KEY', 'EXPO_PUBLIC_SENTRY_DSN'] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

/** A build that carries both keys, as one would if they were added to the EAS `production` environment. */
function buildWithKeys() {
  process.env.EXPO_PUBLIC_POSTHOG_KEY = 'phc_test';
  process.env.EXPO_PUBLIC_SENTRY_DSN = 'https://key@o0.ingest.sentry.io/0';
}

beforeEach(() => {
  vi.resetModules(); // posthog.ts keeps its client per module instance
  posthog.created.length = 0;
  sentry.init.mockClear();
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('analytics and crash reporting per platform', () => {
  it('are off on iOS and allowed elsewhere', () => {
    expect(analyticsAllowed('ios')).toBe(false);
    expect(analyticsAllowed('android')).toBe(true);
    expect(analyticsAllowed('web')).toBe(true);
  });
  it('never start PostHog on iOS, even with a key in the build', async () => {
    os.OS = 'ios';
    buildWithKeys();
    const { initPostHog } = await import('./posthog');
    expect(initPostHog()).toBeNull();
    expect(posthog.created).toEqual([]);
  });
  it('initialise Sentry disabled and with no DSN on iOS, even with one in the build', async () => {
    os.OS = 'ios';
    buildWithKeys();
    const { initSentry } = await import('./sentry');
    initSentry();
    expect(sentry.init).toHaveBeenCalledTimes(1);
    expect(sentry.init.mock.calls[0][0]).toMatchObject({ dsn: undefined, enabled: false });
  });
  it('still start both on Android when the keys are configured, as before', async () => {
    os.OS = 'android';
    buildWithKeys();
    const { initPostHog } = await import('./posthog');
    const { initSentry } = await import('./sentry');
    expect(initPostHog()).not.toBeNull();
    expect(posthog.created).toEqual(['phc_test']);
    initSentry();
    expect(sentry.init.mock.calls[0][0]).toMatchObject({ dsn: 'https://key@o0.ingest.sentry.io/0', enabled: true });
  });
  it('send nothing on Android either while no key is configured', async () => {
    os.OS = 'android';
    for (const k of KEYS) delete process.env[k];
    const { initPostHog } = await import('./posthog');
    const { initSentry } = await import('./sentry');
    expect(initPostHog()).toBeNull();
    initSentry();
    expect(sentry.init.mock.calls[0][0]).toMatchObject({ enabled: false });
  });
});
