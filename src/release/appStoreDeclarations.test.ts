/**
 * App Store declarations match the build. store/app-store/app-store-declarations.json holds what is (or will
 * be) declared in App Store Connect for iOS; store/app-store/APP-STORE-CONNECT.md is the record, field by
 * field. Every value is derived again here from the real code and config: the app config as Expo resolves it
 * for `eas build --profile production --platform ios`, the shipped dependencies, the platform flags
 * (`analyticsAllowed`, `showsPro`), the app's languages, the public links, the business-rule numbers the
 * listing quotes and the screenshots in the repo. When one diverges, the failure says which App Store Connect
 * fields to change before the next build is submitted, and that the record and the JSON change in the same PR.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { describe, expect, it } from 'vitest';
import easJson from '../../eas.json';
import record from '../../store/app-store/app-store-declarations.json';
import { PRIVACY_POLICY_URL, privacyPolicyUrl, SUPPORT_EMAIL } from '../about/links';
import { analyticsAllowed } from '../analytics/policy';
import { NO_LOGS, validateRule, type FrequencyRule } from '../engine';
import { LANGS, type Lang } from '../i18n';
import { MIN_DAYS_FOR_PATTERNS, MIN_WEEKS_FOR_TREND, weeklyTrend } from '../stats/statsModel';
import { FREE_ACTIVE_LIMIT, showsPro } from '../store/limits';

const root = fileURLToPath(new URL('../..', import.meta.url));
const require = createRequire(import.meta.url);
const read = (path: string) => readFileSync(join(root, path), 'utf8');

const RECORD = 'store/app-store/APP-STORE-CONNECT.md';
const JSON_FILE = 'store/app-store/app-store-declarations.json';
const recordMd = read(RECORD);
const listingMd = read('store/app-store/LISTING.md');
const privacyHtml = read('docs/privacy.html');

type Key = keyof typeof record.declarations;
const declarations = record.declarations as Record<Key, unknown>;
const localizations = record.declarations.localizations;
const langOf = (locale: string) => locale.split('-')[0];

// ---------------------------------------------------------------------------------------------------------
// What the build is made of
// ---------------------------------------------------------------------------------------------------------

interface ResolvedConfig {
  name: string;
  version?: string;
  plugins?: (string | [string, unknown])[];
  ios?: {
    bundleIdentifier?: string;
    supportsTablet?: boolean;
    config?: Record<string, unknown>;
    infoPlist?: Record<string, unknown>;
    entitlements?: Record<string, unknown>;
  };
}

/**
 * app.json through app.config.js, as EAS resolves it for the production iOS build: the profile's `env` from
 * eas.json plus the variables EAS sets. The EAS `production` environment had no variables when it was last
 * listed (docs/RELEASE-IOS.md §5); none of them would change a declaration checked here.
 */
function productionConfig(): ResolvedConfig {
  const { getConfig } = require('expo/config') as typeof import('expo/config');
  const profileEnv = (easJson.build.production as { env?: Record<string, string> }).env ?? {};
  const env: Record<string, string> = { ...profileEnv, EAS_BUILD: 'true', EAS_BUILD_PROFILE: 'production', EAS_BUILD_PLATFORM: 'ios' };
  const before = Object.fromEntries(Object.keys(env).map((k) => [k, process.env[k]]));
  Object.assign(process.env, env);
  try {
    return getConfig(root, { skipSDKVersionRequirement: true, isPublicConfig: false }).exp as unknown as ResolvedConfig;
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const config = productionConfig();
const ios = config.ios ?? {};
const infoPlist = ios.infoPlist ?? {};
const plugins = config.plugins ?? [];
const pluginNames = plugins.map((p) => (Array.isArray(p) ? p[0] : p));
const pluginProps = (name: string) => (plugins.find((p) => Array.isArray(p) && p[0] === name) as [string, Record<string, unknown>] | undefined)?.[1];
const submitIos = easJson.submit.production.ios as Record<string, unknown>;

/** Only `dependencies` ship in the binary; dev tools do not. */
const deps = Object.keys((JSON.parse(read('package.json')) as { dependencies: Record<string, string> }).dependencies);
const depsMatching = (re: RegExp) => deps.filter((d) => re.test(d)).sort();

/** SDK families that change an App Store declaration as soon as they ship. */
const SDKS = {
  auth: /auth|sign-?in|apple-authentication|fbsdk|@clerk\/|@supabase\/|firebase|amplify/,
  backend: /^axios$|apollo|graphql|socket\.io|@supabase\/|firebase|pusher|^ably$|amplify|realm/,
  collecting: /firebase|amplitude|mixpanel|@segment\/|datadog|bugsnag|instabug|appsflyer|onesignal|^expo-updates$|newrelic|appcenter|logrocket|smartlook|braze|clevertap|intercom|zendesk/,
  ads: /mobile-ads|admob|applovin|unity-ads|ironsource|fbads|audience-network|appodeal|chartboost|vungle|inmobi/,
  iap: /react-native-iap|expo-iap|react-native-purchases|in-app-purchase|revenuecat|adapty|qonversion|superwall|glassfy/,
  tracking: /tracking-transparency|appsflyer|react-native-adjust|react-native-branch|kochava|singular|fbsdk|react-native-facebook/,
  push: /onesignal|firebase\/messaging|notifee|pushwoosh|airship/,
  chat: /stream-chat|sendbird|twilio|cometchat|agora|getstream/,
  health: /health|fitness|googlefit/,
  crypto: /crypto|sodium|openssl|tweetnacl|forge|jose|sqlcipher/,
  webView: /react-native-webview/,
};

/** Packages that bring a system permission prompt, and the name used in the record. */
const PERMISSION_PACKAGES: Record<string, string> = {
  'expo-notifications': 'notifications',
  'expo-camera': 'camera',
  'expo-image-picker': 'photos',
  'expo-media-library': 'photos',
  'expo-location': 'location',
  'expo-contacts': 'contacts',
  'expo-calendar': 'calendar',
  'expo-audio': 'microphone',
  'expo-av': 'microphone',
  'expo-tracking-transparency': 'tracking',
  'expo-local-authentication': 'faceId',
  'expo-sensors': 'motion',
  'expo-speech-recognition': 'speech',
  'react-native-ble-plx': 'bluetooth',
};

/** The app's own code (routes and src), tests and test helpers left out. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'test' ? [] : sourceFiles(path);
    return /\.(tsx?|jsx?)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}
const SOURCES = [...sourceFiles(join(root, 'app')), ...sourceFiles(join(root, 'src'))].map((path) => ({ file: relative(root, path), text: readFileSync(path, 'utf8') }));
const codeMatching = (re: RegExp) => SOURCES.filter((s) => re.test(s.text)).map((s) => s.file).sort();
const routes = SOURCES.filter((s) => s.file.startsWith('app/')).map((s) => s.file);

const NETWORK_CODE = /\bfetch\s*\(|\bXMLHttpRequest\b|\bnew WebSocket\b|\bEventSource\b|\bsendBeacon\b/;
const PUSH_TOKEN_CODE = /getExpoPushTokenAsync|getDevicePushTokenAsync|registerForRemoteNotifications/;
const AGE_CODE = /\b(?:MIN(?:IMUM)?_AGE|AGE_GATE|ageGate|minimumAge|minAge|birth(?:date|year|day)|dateOfBirth)\b/i;
const AUTH_ROUTE = /(?:^|[/(_-])(?:log-?in|sign-?in|sign-?up|auth|account|register|password)/i;

const list = (items: string[], none: string) => (items.length ? items.join('; ') : none);

// ---------------------------------------------------------------------------------------------------------
// Facts several declarations share
// ---------------------------------------------------------------------------------------------------------

const authHits = [...depsMatching(SDKS.auth).map((d) => `${d} in dependencies`), ...routes.filter((r) => AUTH_ROUTE.test(r)).map((r) => `route ${r}`)];
const backendHits = [...depsMatching(SDKS.backend), ...depsMatching(SDKS.chat)].map((d) => `${d} in dependencies`);
const adsHits = [
  ...depsMatching(SDKS.ads).map((d) => `${d} in dependencies`),
  ...pluginNames.filter((p) => SDKS.ads.test(p)).map((p) => `plugin ${p}`),
  ...('GADApplicationIdentifier' in infoPlist ? ['GADApplicationIdentifier in Info.plist'] : []),
  ...(ios.config && 'googleMobileAdsAppId' in ios.config ? ['ios.config.googleMobileAdsAppId'] : []),
];
const healthHits = [
  ...depsMatching(SDKS.health).map((d) => `${d} in dependencies`),
  ...Object.keys(infoPlist).filter((k) => /^NSHealth/.test(k)).map((k) => `${k} in Info.plist`),
  ...(ios.entitlements && 'com.apple.developer.healthkit' in ios.entitlements ? ['HealthKit entitlement'] : []),
];
const ageHits = codeMatching(AGE_CODE);
const minimumAgeInCode = (() => {
  if (!ageHits.length) return null;
  const n = SOURCES.map((s) => /export const MIN(?:IMUM)?_AGE\s*=\s*(\d+)/.exec(s.text)?.[1]).find(Boolean);
  return n ? Number(n) : `age check in ${ageHits.join(', ')}`;
})();
const ageRatingAnswersNow = {
  advertising: adsHits.length > 0,
  unrestrictedWebAccess: depsMatching(SDKS.webView).length > 0,
  userGeneratedContent: backendHits.length > 0,
  messagingAndChat: depsMatching(SDKS.chat).length > 0,
  ageAssurance: minimumAgeInCode !== null,
};
const pagesBase = PRIVACY_POLICY_URL.slice(0, PRIVACY_POLICY_URL.lastIndexOf('/') + 1);
const perLocale = <T,>(fn: (lang: Lang, locale: string) => T) => Object.fromEntries(localizations.map((l) => [l, fn(langOf(l) as Lang, l)]));

// ---------------------------------------------------------------------------------------------------------
// One check per declaration: what the build says now, and what changes in App Store Connect if it moves
// ---------------------------------------------------------------------------------------------------------

interface Finding {
  now: unknown;
  evidence: string;
}
interface Check {
  /** null when the declaration still holds. */
  verify: (declared: unknown) => Finding | null;
  /** The App Store Connect fields to change before the next build is submitted. */
  asc: string;
  /** Other places that say the same thing (listing, policy, support page, Play). */
  also?: string;
}
const same = (derive: () => Finding) => (declared: unknown) => {
  const finding = derive();
  return isDeepStrictEqual(finding.now, declared) ? null : finding;
};
const LISTING_NUMBERS = 'Version → Description in every localization and App Review Information → Notes, which quote this number (a description only changes with a new version).';
const LISTING_NUMBERS_ALSO = 'the LISTING.md blocks that quote it (Description in every locale, the review "Notes") and docs/support.html.';

const CHECKS: Record<Key, Check> = {
  bundleId: {
    verify: same(() => ({
      now: ios.bundleIdentifier === submitIos.bundleIdentifier ? ios.bundleIdentifier : { appJson: ios.bundleIdentifier, easSubmit: submitIos.bundleIdentifier },
      evidence: 'app.json ios.bundleIdentifier and eas.json submit.production.ios.bundleIdentifier',
    })),
    asc: 'a bundle ID cannot change on an existing app record: a new one means a new app in App Store Connect (new record, new Apple ID, every field entered again).',
  },
  appleId: {
    verify: same(() => ({ now: submitIos.ascAppId ?? null, evidence: 'eas.json submit.production.ios.ascAppId' })),
    asc: 'copy the Apple ID from App Information. The same number goes in app-store-declarations.json (appleId) and in eas.json (ascAppId), and src/release/storeConfig.test.ts expects the submit profile exactly.',
  },
  version: {
    verify: same(() => ({ now: config.version, evidence: 'app.json expo.version (CFBundleShortVersionString)' })),
    asc: 'create that version (iOS app → + Version, same number as the build), fill in What\'s New from the LISTING.md "What\'s New" blocks, attach the new build, and give it its own section in APP-STORE-CONNECT.md.',
  },
  name: {
    verify: same(() => {
      const names = [...new Set([config.name, ...Object.values(pluginProps('./plugins/withIosLocales') ?? {}).map((file) => (JSON.parse(read(String(file))) as { ios?: { CFBundleDisplayName?: string } }).ios?.CFBundleDisplayName ?? config.name)])];
      return { now: names.length === 1 ? names[0] : names, evidence: 'app.json expo.name and CFBundleDisplayName in locales/*.json (the name under the icon)' };
    }),
    asc: 'App Information → Name in every localization (it has to stay close to the name under the icon, guideline 2.3.8); check it is not "already being used" in each localization.',
    also: 'the LISTING.md "Name" blocks and storeListing.test.ts ("keeps the brand name the same in every locale").',
  },
  primaryLanguage: {
    verify: (declared) => {
      const ok = typeof declared === 'string' && localizations.includes(declared) && (LANGS as string[]).includes(langOf(declared)) && new RegExp(`^## ${declared} · .*primary language`, 'm').test(listingMd);
      return ok ? null : { now: { appLanguages: LANGS, localizations }, evidence: 'LANGS in src/i18n/index.ts, the localizations and the "primary language" heading in LISTING.md' };
    },
    asc: 'App Information → Primary Language.',
    also: 'the "primary language" heading in LISTING.md.',
  },
  localizations: {
    verify: (declared) => {
      const locales = declared as string[];
      const sorted = (xs: readonly string[]) => [...new Set(xs)].sort();
      const now = {
        appLanguages: sorted(LANGS),
        CFBundleLocalizations: sorted((infoPlist.CFBundleLocalizations as string[] | undefined) ?? []),
        withIosLocales: sorted(Object.keys(pluginProps('./plugins/withIosLocales') ?? {})),
        storeLanguages: sorted(locales.map(langOf)),
        missingInListing: locales.filter((l) => !new RegExp(`^## ${l} · `, 'm').test(listingMd)),
      };
      const ok = isDeepStrictEqual(now.storeLanguages, now.appLanguages) && isDeepStrictEqual(now.CFBundleLocalizations, now.appLanguages) && isDeepStrictEqual(now.withIosLocales, now.appLanguages) && !now.missingInListing.length;
      return ok ? null : { now, evidence: 'LANGS in src/i18n/index.ts, app.json CFBundleLocalizations, plugins/withIosLocales + locales/*.json, the "## <locale>" sections of LISTING.md' };
    },
    asc: 'App Information → add or remove the localization (name, subtitle) and its Privacy Policy URL in App Privacy, then its product page in the version (screenshots, promotional text, description, keywords, support URL).',
    also: 'a "## <locale>" section in LISTING.md, CFBundleLocalizations in app.json and locales/<lang>.json for withIosLocales, docs/privacy.html and docs/support.html in that language.',
  },
  supportsTablet: {
    verify: same(() => ({ now: ios.supportsTablet ?? false, evidence: 'app.json ios.supportsTablet' })),
    asc: 'Version → iPad screenshots (13-inch) become required, and App Review Information → Notes loses the "iPhone compatibility mode" line.',
    also: 'LISTING.md (storeListing.test.ts forbids "iPad" in public texts while the app is iPhone only) and RELEASE-IOS.md §8.',
  },
  usesNonExemptEncryption: {
    verify: (declared) => {
      const flag = infoPlist.ITSAppUsesNonExemptEncryption ?? ios.config?.usesNonExemptEncryption;
      if (flag !== declared) return { now: flag ?? null, evidence: 'app.json ios.config.usesNonExemptEncryption (ITSAppUsesNonExemptEncryption in Info.plist)' };
      const sqlcipher = pluginProps('expo-sqlite')?.useSQLCipher ? ['expo-sqlite with useSQLCipher'] : [];
      const reviewed = record.declarations.encryptionLibraries as string[];
      const unreviewed = [...depsMatching(SDKS.crypto), ...sqlcipher].filter((d) => !reviewed.includes(d));
      return unreviewed.length ? { now: `not reviewed: ${unreviewed.join(', ')}`, evidence: 'encryption libraries in dependencies or plugins' } : null;
    },
    asc: 'export compliance for the build (App Store Connect asks when the flag is missing or true): answer the encryption questions and upload documentation if required. If the new library is exempt, list it in "encryptionLibraries" and say why in the record.',
  },
  encryptionLibraries: {
    verify: same(() => ({
      now: [...depsMatching(SDKS.crypto), ...(pluginProps('expo-sqlite')?.useSQLCipher ? ['expo-sqlite with useSQLCipher'] : [])],
      evidence: 'encryption libraries in package.json dependencies and the expo-sqlite plugin',
    })),
    asc: 'export compliance: confirm each library only uses exempt encryption (or set usesNonExemptEncryption to true and answer the questions for the build).',
  },
  signInRequired: {
    verify: same(() => ({ now: authHits.length > 0, evidence: list(authHits, 'no sign-in SDK in dependencies and no sign-in route in app/') })),
    asc: 'App Review Information → "Sign-in required" = Yes and a demo account (its credentials only in App Store Connect, never in the repo); App Privacy → the account data (Contact Info, Identifiers → User ID, linked to the user); in-app account deletion (guideline 5.1.1(v)), shown in the review notes; Sign in with Apple if a third-party login is offered (guideline 4.8).',
    also: 'every "no account" line: LISTING.md (Promotional text and Description in every locale, review Notes, storeListing.test.ts), docs/privacy.html, docs/support.html; on Google Play, Data safety and the account-deletion link.',
  },
  accountCreation: {
    verify: same(() => ({ now: authHits.length > 0, evidence: list(authHits, 'no sign-in SDK in dependencies and no sign-in route in app/') })),
    asc: 'the account-deletion path in the app and in App Review Information → Notes (guideline 5.1.1(v)); App Privacy → the data the account holds.',
    also: 'docs/privacy.html (what the account stores, how to delete it) and Google Play Data safety (account deletion URL).',
  },
  dataCollected: {
    verify: same(() => {
      const hits = [
        ...(analyticsAllowed('ios') ? ['analyticsAllowed("ios") is true (src/analytics/policy.ts): PostHog and Sentry start on iOS'] : []),
        ...depsMatching(SDKS.collecting).map((d) => `${d} in dependencies`),
        ...backendHits,
      ];
      return { now: hits.length > 0, evidence: list(hits, 'analyticsAllowed("ios") is false and no other data-collecting SDK ships') };
    }),
    asc: 'App Privacy → Get Started → "Yes, we collect data from this app", then every data type with its purpose, linkage and tracking (RELEASE-IOS.md §5 has the expected answers for PostHog and Sentry).',
    also: 'docs/privacy.html ("La versión actual no transmite ningún dato"), LISTING.md (Description "TUS DATOS…", review Notes "the app sends no data"), and the usage-stats switch that then shows in Settings (screenshot 08).',
  },
  networkCalls: {
    verify: same(() => ({ now: codeMatching(NETWORK_CODE), evidence: 'fetch / XMLHttpRequest / WebSocket / EventSource in app/ and src/' })),
    asc: 'App Privacy: decide whether what that code sends is collected (and dataCollected with it); then list the file in "networkCalls" and record the decision in APP-STORE-CONNECT.md.',
    also: 'docs/privacy.html and the LISTING.md "App Privacy" section ("No network code").',
  },
  tracking: {
    verify: same(() => {
      const hits = [
        ...('NSUserTrackingUsageDescription' in infoPlist ? ['NSUserTrackingUsageDescription in Info.plist'] : []),
        ...('SKAdNetworkItems' in infoPlist ? ['SKAdNetworkItems in Info.plist'] : []),
        ...depsMatching(SDKS.tracking).map((d) => `${d} in dependencies`),
      ];
      return { now: hits.length > 0, evidence: list(hits, 'no ATT string, no SKAdNetwork items and no attribution SDK') };
    }),
    asc: 'App Privacy → mark every data type used for tracking; the app then needs the App Tracking Transparency prompt (NSUserTrackingUsageDescription) before tracking.',
    also: 'docs/privacy.html ("No mostramos anuncios ni usamos identificadores publicitarios").',
  },
  containsAds: {
    verify: same(() => ({ now: adsHits.length > 0, evidence: list(adsHits, 'no ads SDK, plugin or AdMob app ID in the config') })),
    asc: 'Age Rating → Advertising = Yes; App Privacy → the data used for Third-Party Advertising (and tracking with App Tracking Transparency if ads are personalised); app-ads.txt on the developer website.',
    also: 'docs/privacy.html (no ads), LISTING.md (storeListing.test.ts forbids "ads" in public texts) and Google Play "Contains ads".',
  },
  inAppPurchases: {
    verify: same(() => {
      const hits = [...(showsPro('ios') ? ['showsPro("ios") is true (src/store/limits.ts): the Pro section shows on iOS'] : []), ...depsMatching(SDKS.iap).map((d) => `${d} in dependencies`)];
      return { now: hits.length > 0, evidence: list(hits, 'showsPro("ios") is false and no purchase SDK ships') };
    }),
    asc: 'Business → Paid Apps Agreement, banking and tax; In-App Purchases / Subscriptions → create the products (TR-87) with their review screenshot and attach them to the version; App Review Information → Notes (how to reach the purchase, restore purchases).',
    also: 'LISTING.md (storeListing.test.ts forbids prices and paid plans), docs/privacy.html (purchases), RELEASE-IOS.md §9 and the Settings screenshot.',
  },
  minimumAge: {
    verify: same(() => ({ now: minimumAgeInCode, evidence: list(ageHits.map((f) => `age rule in ${f}`), 'no minimum-age constant or age check in app/ and src/') })),
    asc: 'App Information → Age Rating: Age Assurance = Yes and "Age Categories and Override" at or above that age; record the calculated rating again.',
    also: 'docs/privacy.html ("Menores" / "Children": not directed at children under 13) and the Google Play target audience.',
  },
  ageRating: {
    verify: (declared) => {
      if (declared !== '4+') return null; // anything else was entered after re-running the questionnaire
      const raises = [
        ...Object.entries(ageRatingAnswersNow).filter(([, yes]) => yes).map(([answer]) => `${answer} = Yes`),
        ...(minimumAgeInCode !== null ? ['a minimum age in code'] : []),
        ...(healthHits.length ? ['the app reads health data (Health or Wellness Topics)'] : []),
      ];
      return raises.length ? { now: 're-run the age-rating questionnaire', evidence: raises.join('; ') } : null;
    },
    asc: 'App Information → Age Rating: answer the questionnaire again and record the calculated rating.',
    also: 'docs/privacy.html ("Menores" / "Children") and the Google Play content rating.',
  },
  ageRatingOverride: {
    verify: (declared) => {
      if (minimumAgeInCode === null) return declared === null ? null : { now: null, evidence: 'no minimum age in code, so nothing to override' };
      const ok = typeof minimumAgeInCode === 'number' && typeof declared === 'string' && Number.parseInt(declared, 10) >= minimumAgeInCode;
      return ok ? null : { now: `${minimumAgeInCode}+ or higher`, evidence: `minimum age ${minimumAgeInCode} in code` };
    },
    asc: 'App Information → Age Rating → "Age Categories and Override".',
  },
  ageRatingAnswers: {
    verify: same(() => ({
      now: ageRatingAnswersNow,
      evidence: 'advertising ← ads SDKs; unrestrictedWebAccess ← react-native-webview; userGeneratedContent ← a backend or chat SDK; messagingAndChat ← a chat SDK; ageAssurance ← an age check in code',
    })),
    asc: 'App Information → Age Rating: change the answers that moved (Advertising, Unrestricted Web Access, User-Generated Content, Messaging and Chat, Age Assurance) and record the calculated rating.',
  },
  regulatedMedicalDevice: {
    verify: same(() => {
      const missing = [
        ...(privacyHtml.includes('no es un dispositivo médico') ? [] : ['docs/privacy.html (ES) lost "no es un dispositivo médico"']),
        ...(privacyHtml.includes('is not a medical device') ? [] : ['docs/privacy.html (EN) lost "is not a medical device"']),
        ...(listingMd.split('no es un dispositivo médico').length - 1 >= 2 ? [] : ['a Spanish LISTING.md Description lost the non-medical notice']),
        ...(listingMd.includes('is not a medical device') ? [] : ['the en-US LISTING.md Description lost the non-medical notice']),
        ...(listingMd.includes('Non-medical notice:') ? [] : ['the review Notes lost "Non-medical notice"']),
      ];
      return { now: missing.length ? 're-assess with the owner' : false, evidence: list(missing, 'the non-medical notice is in the privacy policy, every description and the review notes') };
    }),
    asc: 'App Information → Regulated Medical Device (re-assess with the owner; a regulated device needs its registration details) and Age Rating → Medical or Treatment Information.',
  },
  readsHealthData: {
    verify: same(() => ({ now: healthHits.length > 0, evidence: list(healthHits, 'no health SDK, no NSHealth* strings, no HealthKit entitlement') })),
    asc: 'App Privacy → Health & Fitness data types (if any leaves the device); Age Rating → Health or Wellness Topics (9+); App Review Information → Notes ("reads no health data (no HealthKit)"); re-check the Regulated Medical Device answer and the category.',
    also: 'docs/privacy.html and the LISTING.md review Notes.',
  },
  permissions: {
    verify: same(() => ({
      now: [...new Set(deps.filter((d) => d in PERMISSION_PACKAGES).map((d) => PERMISSION_PACKAGES[d]))].sort(),
      evidence: 'packages with a system permission prompt in dependencies',
    })),
    asc: 'App Review Information → Notes (how to see each permission prompt); App Privacy if what the permission gives leaves the device (location, contacts, photos).',
    also: 'docs/privacy.html and RELEASE-IOS.md §4.',
  },
  iosUsageDescriptions: {
    verify: same(() => ({ now: Object.keys(infoPlist).filter((k) => /UsageDescription$/.test(k)).sort(), evidence: 'NS*UsageDescription keys in the resolved ios.infoPlist' })),
    asc: 'App Review Information → Notes (when the prompt appears); each string must say why, in both languages (locales/*.json).',
  },
  pushNotifications: {
    verify: same(() => {
      const hits = [...codeMatching(PUSH_TOKEN_CODE).map((f) => `push token requested in ${f}`), ...depsMatching(SDKS.push).map((d) => `${d} in dependencies`)];
      return { now: hits.length > 0, evidence: list(hits, 'local notifications only: no push token is requested') };
    }),
    asc: 'an APNs key for EAS; App Privacy if the push token or an identifier reaches a server; App Review Information → Notes ("local notifications only").',
    also: 'docs/privacy.html ("Recordatorios": local notifications) and the LISTING.md "App Privacy" section.',
  },
  supportEmail: {
    verify: same(() => ({ now: SUPPORT_EMAIL, evidence: 'SUPPORT_EMAIL in src/about/links.ts' })),
    asc: 'App Review Information → contact email, TestFlight → Test Information → Feedback Email.',
    also: 'the LISTING.md Description, What\'s New and review Notes, docs/privacy.html and docs/support.html.',
  },
  supportUrl: {
    verify: same(() => {
      const page = 'docs/support.html';
      if (!existsSync(join(root, page)) || !read(page).includes('<hr id="en">')) return { now: `${page} missing or without its English half`, evidence: page };
      return { now: perLocale((lang) => `${pagesBase}support.html${lang === 'en' ? '#en' : ''}`), evidence: 'docs/support.html served by GitHub Pages next to the privacy policy (PRIVACY_POLICY_URL)' };
    }),
    asc: 'Version → Support URL in every localization; it has to answer 200 before the version is submitted.',
    also: 'the LISTING.md "Version information" table.',
  },
  privacyPolicyUrl: {
    verify: same(() => ({ now: perLocale((lang) => privacyPolicyUrl(lang)), evidence: 'privacyPolicyUrl(lang) in src/about/links.ts' })),
    asc: 'App Privacy → Privacy Policy URL in every localization, and TestFlight → Test Information → Privacy Policy URL.',
    also: 'the LISTING.md "App information" table; the in-app Settings → "Privacy" link uses the same function.',
  },
  activeActivityLimit: {
    verify: same(() => ({ now: FREE_ACTIVE_LIMIT, evidence: 'FREE_ACTIVE_LIMIT in src/store/limits.ts' })),
    asc: LISTING_NUMBERS,
    also: LISTING_NUMBERS_ALSO,
  },
  everyNMax: {
    verify: same(() => {
      let n = 1;
      while (n < 1000 && validateRule({ type: 'everyN', n: n + 1 } as FrequencyRule).length === 0) n += 1;
      return { now: n, evidence: 'validateRule in src/engine/presets.ts (everyN.range)' };
    }),
    asc: LISTING_NUMBERS,
    also: LISTING_NUMBERS_ALSO,
  },
  patternsAfterScheduledDays: {
    verify: same(() => ({ now: MIN_DAYS_FOR_PATTERNS, evidence: 'MIN_DAYS_FOR_PATTERNS in src/stats/statsModel.ts' })),
    asc: LISTING_NUMBERS,
    also: LISTING_NUMBERS_ALSO,
  },
  trendWeeks: {
    verify: same(() => ({ now: weeklyTrend([], '2026-10-21', NO_LOGS).points.length, evidence: 'weeklyTrend in src/stats/statsModel.ts (weeks shown)' })),
    asc: LISTING_NUMBERS,
    also: LISTING_NUMBERS_ALSO,
  },
  trendAfterWeeks: {
    verify: same(() => ({ now: MIN_WEEKS_FOR_TREND, evidence: 'MIN_WEEKS_FOR_TREND in src/stats/statsModel.ts' })),
    asc: LISTING_NUMBERS,
    also: LISTING_NUMBERS_ALSO,
  },
  screenshotsPerLocale: {
    verify: same(() => {
      const dir = join(root, 'store/app-store/screenshots');
      const counts = Object.fromEntries(readdirSync(dir).filter((d) => statSync(join(dir, d)).isDirectory()).map((d) => [d, readdirSync(join(dir, d)).filter((f) => f.endsWith('.png')).length]));
      const values = [...new Set(Object.values(counts))];
      return { now: values.length === 1 ? values[0] : counts, evidence: 'PNG files per locale in store/app-store/screenshots/' };
    }),
    asc: 'Version → screenshots in every localization: upload the new set (the 6.3-inch copies, 1206 × 2622) in number order; screenshots only change with a new version.',
    also: 'the LISTING.md "Screenshots" table and the captions, store/app-store/screenshots/README.md, and the 6.3-inch copies in ~/Desktop/Capturas-AppStore/TraceRoutine.',
  },
};

function report(key: Key, declared: unknown, finding: Finding, check: Check): string {
  return [
    `App Store Connect declaration "${key}" no longer matches the build.`,
    `  Declared in ${JSON_FILE}: ${JSON.stringify(declared)}`,
    `  The build now: ${JSON.stringify(finding.now)} (${finding.evidence})`,
    `  Change in App Store Connect before the next iOS build is submitted: ${check.asc}`,
    ...(check.also ? [`  Also update: ${check.also}`] : []),
    `  In the same PR: update the row \`${key}\` of "Qué depende de qué" and the field it records in ${RECORD}, set "${key}" in ${JSON_FILE}, and tell Angelo exactly which App Store Connect fields to change.`,
  ].join('\n');
}

describe('App Store declarations match the build', () => {
  for (const key of Object.keys(CHECKS) as Key[]) {
    it(key, () => {
      const finding = CHECKS[key].verify(declarations[key]);
      if (finding) throw new Error(report(key, declarations[key], finding, CHECKS[key]));
    });
  }
});

describe('App Store declarations: the record', () => {
  it(`checks every declaration in ${JSON_FILE}, and each one has its row in ${RECORD}`, () => {
    expect(Object.keys(declarations).sort()).toEqual(Object.keys(CHECKS).sort());
    const missing = Object.keys(declarations).filter((key) => !recordMd.includes(`| \`${key}\``));
    expect(missing, `add a row to "Qué depende de qué" in ${RECORD} for`).toEqual([]);
  });

  it('says which version it describes and whether anything was entered', () => {
    expect(recordMd, `${RECORD} must say "**Versión que describe**: ${record.declarations.version}"`).toContain(`**Versión que describe**: ${record.declarations.version}`);
    expect(['pendiente de introducir', 'parcialmente introducido', 'introducido']).toContain(record.record.status);
    if (record.record.status === 'pendiente de introducir') {
      expect(record.record.enteredOn).toBeNull();
      expect(recordMd).toContain('pendiente de introducir');
    }
    expect(record.record.updatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('quotes in LISTING.md and on the support page the same numbers the code uses', () => {
    const d = record.declarations;
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
    const support = read('docs/support.html');
    const quotes: [string, string, number][] = [
      [listingMd, `Hasta ${d.activeActivityLimit} actividades activas`, 2],
      [listingMd, `Up to ${d.activeActivityLimit} active activities`, 1],
      [listingMd, `up to ${d.activeActivityLimit} active activities`, 1],
      [listingMd, `de 1 a ${d.everyNMax}`, 2],
      [listingMd, `from 1 to ${d.everyNMax}`, 1],
      [listingMd, `últimas ${d.trendWeeks} semanas`, 2],
      [listingMd, `last ${d.trendWeeks} weeks`, 1],
      [listingMd, `${d.trendWeeks}-week trend after ${words[d.trendAfterWeeks]} weeks`, 1],
      [listingMd, `patterns appear after ${d.patternsAfterScheduledDays} scheduled days`, 1],
      [support, `Hasta ${d.activeActivityLimit} activas`, 1],
      [support, `Up to ${d.activeActivityLimit} active`, 1],
    ];
    for (const [text, phrase, times] of quotes) {
      expect(text.split(phrase).length - 1, `"${phrase}" should appear ${times}× (LISTING.md / docs/support.html); update the text and App Store Connect`).toBeGreaterThanOrEqual(times);
    }
  });

  it('holds no secrets: the repo is public', () => {
    for (const [file, text] of [[RECORD, recordMd], [JSON_FILE, read(JSON_FILE)]] as const) {
      expect(text, `${file}: a UUID looks like an issuer ID or a key`).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      expect(text, `${file}: App Store Connect API key file`).not.toMatch(/AuthKey_|-----BEGIN/);
      expect(text, `${file}: a phone number`).not.toMatch(/\+\d[\d ()-]{8,}\d/);
    }
  });
});
