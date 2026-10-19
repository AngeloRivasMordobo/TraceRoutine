import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocales } from 'expo-localization';
import { deviceLocaleTags } from './device';
import { langFromLocales } from './index';

vi.mock('expo-localization', () => ({ getLocales: vi.fn() }));

const locales = (...tags: string[]) => tags.map((languageTag) => ({ languageTag })) as unknown as ReturnType<typeof getLocales>;

describe('device language', () => {
  afterEach(() => vi.mocked(getLocales).mockReset());

  it('reads the preferred languages from expo-localization, in the user order', () => {
    vi.mocked(getLocales).mockReturnValue(locales('fr-FR', 'es-MX', 'en-US'));
    expect(deviceLocaleTags()).toEqual(['fr-FR', 'es-MX', 'en-US']);
    expect(langFromLocales(deviceLocaleTags())).toBe('es');
  });
  it('falls back to the JS engine locale when the native module is missing', () => {
    vi.mocked(getLocales).mockImplementation(() => { throw new Error('Cannot find native module ExpoLocalization'); });
    expect(deviceLocaleTags()).toEqual([Intl.DateTimeFormat().resolvedOptions().locale]);
  });
});
