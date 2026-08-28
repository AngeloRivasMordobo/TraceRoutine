import { afterEach, describe, expect, it, vi } from 'vitest';
import { sanitize, setAnalyticsOptOut, setAnalyticsSink, track, type Sink } from './index';

// __DEV__ is a React Native global; tests run in node.
(globalThis as Record<string, unknown>).__DEV__ = false;

describe('analytics without PII (TR-77)', () => {
  afterEach(() => setAnalyticsOptOut(false));

  it('drops unknown keys, free text and long strings', () => {
    expect(sanitize('create_activity', { type: 'everyN', anchor: 'relative', first_activity: true, name: 'Tratamiento de ansiedad' })).toEqual({ type: 'everyN', anchor: 'relative', first_activity: true });
    expect(sanitize('skip', { reason: 'no time' })).toEqual({});
    expect(sanitize('skip', { reason: 'noTime' })).toEqual({ reason: 'noTime' });
    expect(sanitize('open_grid', { anything: 1 })).toEqual({});
  });
  it('honors opt-out before reaching the sink', () => {
    const sink: Sink = { track: vi.fn(), setOptOut: vi.fn(), setUserProperties: vi.fn() };
    setAnalyticsSink(sink);
    setAnalyticsOptOut(true);
    track('complete', { type: 'daily' });
    expect(sink.track).not.toHaveBeenCalled();
    expect(sink.setOptOut).toHaveBeenCalledWith(true);
    setAnalyticsOptOut(false);
    track('complete', { type: 'daily', note: 'private' });
    expect(sink.track).toHaveBeenCalledWith('complete', { type: 'daily' });
  });
  it('never breaks the app if a sink throws', () => {
    setAnalyticsSink({ track: () => { throw new Error('network'); } });
    expect(() => track('backup')).not.toThrow();
  });
});
