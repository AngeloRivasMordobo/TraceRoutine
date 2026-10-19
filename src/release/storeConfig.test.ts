/**
 * Store configuration for the iOS launch, decided on 2026-10-19: iPhone only, no export-compliance
 * prompt, Spanish and English listed on the App Store, EAS builds on the SDK 57 image and an
 * EAS Submit profile for App Store Connect. Android's live configuration must not move.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import appJson from '../../app.json';
import easJson from '../../eas.json';

const root = fileURLToPath(new URL('../..', import.meta.url));
const require = createRequire(import.meta.url);
const ios = appJson.expo.ios as Record<string, unknown> & { config?: Record<string, unknown>; infoPlist?: Record<string, unknown> };
const plugins = appJson.expo.plugins as (string | [string, unknown])[];
const pluginProps = (name: string) => (plugins.find((p) => Array.isArray(p) && p[0] === name) as [string, Record<string, string>] | undefined)?.[1];

describe('iOS app config', () => {
  it('ships for iPhone only', () => {
    expect(ios.supportsTablet).toBe(false);
    expect(ios.bundleIdentifier).toBe('app.traceroutine');
  });
  it('declares no non-exempt encryption, so builds skip the export-compliance question', () => {
    // The app only talks HTTPS through the OS (PostHog and Sentry, when configured); no crypto of its own.
    expect(ios.config?.usesNonExemptEncryption).toBe(false);
  });
  it('declares Spanish and English so the App Store lists both', () => {
    expect(ios.infoPlist?.CFBundleLocalizations).toEqual(['en', 'es']);
    const locales = pluginProps('./plugins/withIosLocales');
    expect(Object.keys(locales ?? {}).sort()).toEqual(['en', 'es']);
    for (const file of Object.values(locales ?? {})) {
      const json = JSON.parse(readFileSync(join(root, file), 'utf8')) as { ios?: Record<string, string> };
      expect(json.ios?.CFBundleDisplayName).toBe(appJson.expo.name);
    }
  });
  it('localizes iOS only: the locales plugin registers no Android mod', () => {
    const withIosLocales = require('../../plugins/withIosLocales.js') as (config: object, props: object) => { mods?: Record<string, Record<string, unknown>> };
    const out = withIosLocales({ name: 'TraceRoutine', slug: 'traceroutine' }, pluginProps('./plugins/withIosLocales') ?? {});
    expect(Object.keys(out.mods ?? {})).toEqual(['ios']);
    expect(Object.keys(out.mods?.ios ?? {})).toEqual(['xcodeproj']);
    expect((appJson.expo as Record<string, unknown>).locales).toBeUndefined();
  });
});

describe('EAS', () => {
  const build = easJson.build as Record<string, Record<string, unknown> & { ios?: Record<string, unknown> }>;
  const submit = easJson.submit.production as Record<string, Record<string, unknown>>;

  it('builds the store binary on the SDK 57 iOS image', () => {
    expect(build.production.ios?.image).toBe('sdk-57');
    expect(build.production.distribution ?? 'store').toBe('store');
  });
  it('submits to App Store Connect under the MORDOBO TECHNOLOGIES LLC team', () => {
    expect(submit.ios).toEqual({ bundleIdentifier: 'app.traceroutine', appleTeamId: 'CTC5PRH3D3', appName: 'TraceRoutine' });
  });
  it('keeps the Google Play submit profile as it was', () => {
    expect(submit.android).toEqual({ serviceAccountKeyPath: '/Users/angelorivas/.config/eas-keys/mordobo-play-eas-submit.json', track: 'internal' });
  });
});
