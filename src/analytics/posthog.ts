/**
 * PostHog sink (TR-77). Configured through EXPO_PUBLIC_POSTHOG_KEY / EXPO_PUBLIC_POSTHOG_HOST;
 * with no key the app keeps the console sink and sends nothing.
 */
import { PostHog } from 'posthog-react-native';
import { Platform } from 'react-native';
import { setAnalyticsSink, type Props, type Sink } from './index';

let client: PostHog | null = null;

/** PostHog rejects `undefined` values; drop them. */
const json = (props?: Props): Record<string, string | number | boolean | null> | undefined =>
  props ? Object.fromEntries(Object.entries(props).filter(([, v]) => v !== undefined)) as Record<string, string | number | boolean | null> : undefined;

export function initPostHog(): PostHog | null {
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';
  if (!key || client) return client;
  client = new PostHog(key, {
    host,
    captureAppLifecycleEvents: false, // we only send our named events
    disableGeoip: true,
    flushAt: 10,
    flushInterval: 30_000,
    defaultOptIn: true,
  });
  void client.register({ platform: Platform.OS });
  const sink: Sink = {
    track: (event, props) => { client?.capture(event, json(props)); },
    setOptOut: (value) => { void (value ? client?.optOut() : client?.optIn()); },
    setUserProperties: (props) => { void client?.register(json(props) ?? {}); },
  };
  setAnalyticsSink(sink);
  return client;
}

export function flushAnalytics(): Promise<void> {
  return client?.flush() ?? Promise.resolve();
}
