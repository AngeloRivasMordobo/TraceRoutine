/**
 * App Store declarations match the build. store/app-store/app-store-declarations.json holds what is (or will
 * be) declared in App Store Connect for iOS; store/app-store/APP-STORE-CONNECT.md is the record, field by
 * field. Every value is derived again here from the real code and config: the app config as Expo resolves it
 * for `eas build --profile production --platform ios`, the shipped dependencies, the platform flags
 * (`analyticsAllowed`, `showsPro`), the app's languages, the public links, the business-rule numbers the
 * listing quotes and the screenshots in the repo. When one diverges, the failure says which App Store Connect
 * fields to change before the next build is submitted, and that the record and the JSON change in the same PR.
 * It also checks that every "no account" / "your data stays on your device" line in the listing, the policy,
 * the support page, the docs and the app's own strings is still there while it is true and gone once it is not,
 * that the record's status lines agree with the JSON, and that none of the public files carries a secret.
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
const LISTING = 'store/app-store/LISTING.md';
const PLAY_RECORD = 'store/google-play/GOOGLE-PLAY-CONSOLE.md';
const recordMd = read(RECORD);
const listingMd = read(LISTING);
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

/** Code that talks to a server: fetch and friends, and the expo-file-system transfers. */
const NETWORK_CODE = /\bfetch\s*\(|\bXMLHttpRequest\b|\bnew WebSocket\b|\bEventSource\b|\bsendBeacon\b|\buploadAsync\b|\bdownloadAsync\b|\bcreateUploadTask\b|\bcreateDownloadResumable\b|\bdownloadFileAsync\b/;
/** The in-app browser (SFSafariViewController / Custom Tabs) from expo-web-browser. */
const WEB_BROWSER_CODE = /['"]expo-web-browser['"]|\bopenBrowserAsync\b|\bopenAuthSessionAsync\b/;
const PUSH_TOKEN_CODE = /getExpoPushTokenAsync|getDevicePushTokenAsync|registerForRemoteNotifications/;
const AGE_CODE = /\b(?:MIN(?:IMUM)?_AGE|AGE_GATE|ageGate|minimumAge|minAge|birth(?:date|year|day)|dateOfBirth)\b/i;
/** A route whose file name is about an account. */
const AUTH_ROUTE = /(?:^|[/(_-])(?:log-?in|log-?out|sign-?in|sign-?out|sign-?up|auth|account|register|password|profile)/i;
/** What only a login has, wherever the screen lives: a password field, an auth session, a sign-in call. */
const LOGIN_CODE = /\bsecureTextEntry\b|\btextContentType=\{?\s*['"](?:password|newPassword|username)['"]|\bautoComplete=\{?\s*['"](?:password|current-password|new-password|username)['"]|\bopenAuthSessionAsync\b|\bsignInAsync\b|\bsignInWith[A-Z]\w*/;
/** What only a sign-up has: a route for it, a new-password field, an account-creation call. */
const SIGN_UP_ROUTE = /(?:^|[/(_-])(?:sign-?up|register|create-?account)/i;
const SIGN_UP_CODE = /\btextContentType=\{?\s*['"]newPassword['"]|\bautoComplete=\{?\s*['"]new-password['"]|\bcreateUserWith\w+|\bsignUp\s*\(/;
const PARENTAL_CODE = /\bFamilyControls\b|\bFamilyActivityPicker\b|\bparental\s*controls?\b|\bparentalControls?\b/i;

const list = (items: string[], none: string) => (items.length ? items.join('; ') : none);

// ---------------------------------------------------------------------------------------------------------
// Facts several declarations share
// ---------------------------------------------------------------------------------------------------------

const signUpHits = [...routes.filter((r) => SIGN_UP_ROUTE.test(r)).map((r) => `route ${r}`), ...codeMatching(SIGN_UP_CODE).map((f) => `account creation in ${f}`)];
const loginHits = [
  ...new Set([
    ...depsMatching(SDKS.auth).map((d) => `${d} in dependencies`),
    ...routes.filter((r) => AUTH_ROUTE.test(r)).map((r) => `route ${r}`),
    ...codeMatching(LOGIN_CODE).map((f) => `password field or sign-in call in ${f}`),
    ...signUpHits,
  ]),
];
const browserCalls = codeMatching(WEB_BROWSER_CODE);
const webViewDeps = depsMatching(SDKS.webView);
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
const parentalHits = [
  ...depsMatching(/family-?controls|screen-?time|parental/).map((d) => `${d} in dependencies`),
  ...codeMatching(PARENTAL_CODE),
  ...(ios.entitlements && 'com.apple.developer.family-controls' in ios.entitlements ? ['Family Controls entitlement'] : []),
];
/**
 * The age-rating answers as the build gives them. Two are the owner's to give and are taken from the JSON:
 * "Health or wellness topics" (forced to Yes once the app reads health data) and "Unrestricted web access"
 * while the only browser is expo-web-browser (forced to Yes by a WebView).
 */
function ageRatingAnswersNow(declared: Record<string, unknown>) {
  const owner = (answer: string) => (typeof declared[answer] === 'boolean' ? declared[answer] : 'true or false (owner decision)');
  return {
    parentalControls: parentalHits.length > 0,
    ageAssurance: minimumAgeInCode !== null,
    unrestrictedWebAccess: webViewDeps.length > 0 ? true : browserCalls.length > 0 ? owner('unrestrictedWebAccess') : false,
    userGeneratedContent: backendHits.length > 0,
    messagingAndChat: depsMatching(SDKS.chat).length > 0,
    socialMedia: backendHits.length > 0,
    advertising: adsHits.length > 0,
    healthOrWellnessTopics: healthHits.length > 0 ? true : owner('healthOrWellnessTopics'),
  };
}
const RATINGS = ['4+', '9+', '13+', '16+', '18+'];
/** Entries of ageRating.raisedBy that are Step 2 content answers, given by hand (the code cannot check them). */
const STATED_CONTENT = /^content: /;

interface SignIn {
  mode: string;
  gate: { file: string; constant: string } | null;
}
const SIGN_IN_MODES = ['none', 'optional', 'required'];
/** signIn.gate points at `export const <constant> = true | false`: true makes the login required, false optional. */
function readGate(gate: SignIn['gate']): { value: boolean } | { error: string } {
  if (!gate || typeof gate.file !== 'string' || typeof gate.constant !== 'string' || !/^[A-Za-z_$][\w$]*$/.test(gate.constant)) {
    return { error: 'signIn.gate must be { "file": "<path>", "constant": "<NAME>" }: the exported boolean that makes the login required (true) or optional (false), read by the route guard' };
  }
  if (!existsSync(join(root, gate.file))) return { error: `${gate.file} (signIn.gate.file) does not exist: the login gate moved or was removed` };
  const m = new RegExp(`export const ${gate.constant.replace(/\$/g, '\\$')}\\b(?:\\s*:\\s*boolean)?\\s*=\\s*(true|false)\\b`).exec(read(gate.file));
  return m ? { value: m[1] === 'true' } : { error: `no "export const ${gate.constant} = true | false" in ${gate.file}: the login gate was renamed, moved or is no longer a plain boolean` };
}
/** Both screenshot sets live in the repo: the 6.9-inch originals and the 6.3-inch copies App Store Connect takes. */
const SCREENSHOT_SETS: Record<string, { width: number; height: number }> = {
  'store/app-store/screenshots': { width: 1320, height: 2868 },
  'store/app-store/screenshots-6.3': { width: 1206, height: 2622 },
};
/** How the 6.3-inch copies were made (byte for byte with sips on macOS 26.6). */
const RESIZE_COMMAND = 'for f in store/app-store/screenshots/*/*.png; do o="store/app-store/screenshots-6.3/${f#store/app-store/screenshots/}"; mkdir -p "$(dirname "$o")"; sips -z 2622 1206 "$f" --out "$o"; done';
function screenshotsIn(dir: string) {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((locale) => statSync(join(abs, locale)).isDirectory())
    .sort()
    .map((locale) => ({ locale, files: readdirSync(join(abs, locale)).filter((f) => f.endsWith('.png')).sort() }));
}
/** Width, height and transparency from the PNG header and chunk list. */
function pngInfo(path: string) {
  const b = readFileSync(path);
  if (b.toString('latin1', 1, 4) !== 'PNG') return { width: 0, height: 0, alpha: false };
  const chunks: string[] = [];
  for (let at = 8; at + 8 <= b.length; ) {
    const type = b.toString('latin1', at + 4, at + 8);
    chunks.push(type);
    if (type === 'IEND') break;
    at += 12 + b.readUInt32BE(at);
  }
  const colorType = b[25];
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), alpha: colorType === 4 || colorType === 6 || chunks.includes('tRNS') };
}
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
  signIn: {
    verify: (declared) => {
      const d = (declared ?? {}) as SignIn;
      const evidence = list(loginHits, 'no sign-in SDK in dependencies, no account route in app/, and no password field or sign-in call in app/ or src/');
      if (!SIGN_IN_MODES.includes(d.mode)) return { now: 'mode "none", "optional" or "required"', evidence: `signIn.mode is ${JSON.stringify(d.mode)}` };
      if (!loginHits.length) return d.mode === 'none' && d.gate === null ? null : { now: { mode: 'none', gate: null }, evidence };
      if (d.mode === 'none') {
        return { now: { mode: 'optional or required', gate: { file: '<file>', constant: '<NAME>' } }, evidence: `${evidence}. The build has a login now: declare whether it is optional or required, and point signIn.gate at the constant that decides it` };
      }
      const gate = readGate(d.gate);
      if ('error' in gate) return { now: { mode: d.mode, gate: 'missing' }, evidence: gate.error };
      const now = gate.value ? 'required' : 'optional';
      return now === d.mode ? null : { now: { mode: now, gate: d.gate }, evidence: `${d.gate?.constant} is ${gate.value} in ${d.gate?.file}: the login went from ${d.mode} to ${now}` };
    },
    asc: 'App Review Information → Sign-In Information: "Sign-in required" and a demo account (its credentials only in App Store Connect, never in the repo). An optional login still needs the demo account for the features behind it (guideline 2.1); a required login needs real account-based features to justify it (guideline 5.1.1(v)) and a line in the review Notes saying why. App Privacy → the data the account holds (Contact Info, Identifiers → User ID, linked to the user). In-app account deletion if accounts can be created (guideline 5.1.1(v)). Sign in with Apple if a third-party login is offered (guideline 4.8).',
    also: 'every "no account" line, word for word in CLAIMS below: LISTING.md (header, Promotional text and Description in every locale, App Privacy, App Review information, review Notes), docs/privacy.html, docs/support.html, docs/RELEASE-IOS.md §5 and §7, README.md, CLAUDE.md, and the Settings footer settings.localData (src/i18n/*.json, screenshot 08); on Google Play (store/google-play/GOOGLE-PLAY-CONSOLE.md), App access, Data safety and account deletion.',
  },
  accountCreation: {
    verify: (declared) => {
      if (typeof declared !== 'boolean') return { now: 'true or false', evidence: 'accountCreation must be a boolean' };
      if (signUpHits.length && !declared) return { now: true, evidence: list(signUpHits, '') };
      if ((declarations.signIn as SignIn).mode === 'none' && declared) return { now: false, evidence: 'signIn.mode is "none": nobody can create an account' };
      return null; // with a login and no sign-up in code (accounts made elsewhere), it is stated by hand in the record
    },
    asc: 'the account-deletion path in the app and in App Review Information → Notes (guideline 5.1.1(v)); App Privacy → the data the account holds.',
    also: 'docs/privacy.html (what the account stores, how to delete it), every "no account" line (see signIn), and Google Play Data safety and account deletion URL (store/google-play/GOOGLE-PLAY-CONSOLE.md).',
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
    asc: 'App Privacy → Get Started → "Yes, we collect data from this app", then every data type with its purpose, linkage and tracking (RELEASE-IOS.md §5 has the expected answers for PostHog and Sentry); App Privacy → User Privacy Choices URL, now that there is something to opt out of.',
    also: 'every "no data" and "your data stays on your device" line, word for word in CLAIMS below: docs/privacy.html ("La versión actual no transmite ningún dato"), LISTING.md (header, Description "TUS DATOS…", captions 8, App Privacy, review Notes "the app sends no data"), docs/support.html, docs/RELEASE-IOS.md §5, CLAUDE.md, and the Settings footer settings.localData (src/i18n/*.json), plus the usage-stats switch that then shows in Settings (screenshot 08).',
  },
  networkCalls: {
    verify: same(() => ({ now: codeMatching(NETWORK_CODE), evidence: 'fetch / XMLHttpRequest / WebSocket / EventSource / sendBeacon / expo-file-system uploads and downloads in app/ and src/' })),
    asc: 'App Privacy: decide whether what that code sends is collected (and dataCollected with it); then list the file in "networkCalls" and record the decision in APP-STORE-CONNECT.md.',
    also: 'docs/privacy.html and the LISTING.md "App Privacy" section ("No network code").',
  },
  inAppBrowserCalls: {
    verify: same(() => ({ now: browserCalls, evidence: 'expo-web-browser (openBrowserAsync, openAuthSessionAsync) in app/ and src/' })),
    asc: 'App Information → Age Rating → Unrestricted Web Access: decide whether that in-app browser lets people browse the web freely (Yes raises the rating) and set ageRatingAnswers.unrestrictedWebAccess to the answer; then list the file in "inAppBrowserCalls" and record the decision in APP-STORE-CONNECT.md. openAuthSessionAsync is also a login: see "signIn".',
    also: 'LISTING.md → Age rating ("No in-app browser") and §4 of the record.',
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
      const d = (declared ?? {}) as { rating?: string; raisedBy?: string[] };
      const raisedBy = Array.isArray(d.raisedBy) ? d.raisedBy : [];
      const fromBuild = Object.entries(ageRatingAnswersNow(record.declarations.ageRatingAnswers)).filter(([, yes]) => yes === true).map(([answer]) => `${answer} = Yes`).sort();
      const recorded = raisedBy.filter((r) => !STATED_CONTENT.test(r)).sort();
      const problems = [
        ...(typeof d.rating === 'string' && RATINGS.includes(d.rating) ? [] : [`rating ${JSON.stringify(d.rating)} is not one of ${RATINGS.join(', ')}`]),
        ...(Array.isArray(d.raisedBy) ? [] : ['raisedBy must list what raised the rating ([] when every answer is No / None)']),
        ...(isDeepStrictEqual(recorded, fromBuild) ? [] : [`the rating was calculated with ${list(recorded, 'every answer No / None')}; the build and the owner's answers now give ${list(fromBuild, 'every answer No / None')}`]),
        ...(raisedBy.length === 0 && d.rating !== '4+' ? ['nothing raised the rating, so the questionnaire gives 4+ (a higher one needs its reason in raisedBy; an override goes in ageRatingOverride)'] : []),
      ];
      return problems.length ? { now: { rating: 're-run the questionnaire', raisedBy: [...fromBuild, ...raisedBy.filter((r) => STATED_CONTENT.test(r))] }, evidence: problems.join('; ') } : null;
    },
    asc: 'App Information → Age Rating: answer the questionnaire again, then record the calculated rating in ageRating.rating and the answers that raised it in ageRating.raisedBy (Step 2 content answers by hand, as "content: <question> = <answer>").',
    also: 'docs/privacy.html ("Menores" / "Children"), LISTING.md → Age rating, and the IARC content rating in store/google-play/GOOGLE-PLAY-CONSOLE.md.',
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
    verify: (declared) => {
      const now = ageRatingAnswersNow((declared ?? {}) as Record<string, unknown>);
      return isDeepStrictEqual(now, declared)
        ? null
        : {
            now,
            evidence: 'parentalControls ← Family Controls / parental-control code; ageAssurance ← an age check in code; unrestrictedWebAccess ← react-native-webview (owner decision with expo-web-browser in inAppBrowserCalls); userGeneratedContent and socialMedia ← a backend or chat SDK; messagingAndChat ← a chat SDK; advertising ← ads SDKs; healthOrWellnessTopics ← owner decision, Yes once the app reads health data',
          };
    },
    asc: 'App Information → Age Rating: change the answers that moved (Parental Controls, Age Assurance, Unrestricted Web Access, User-Generated Content, Messaging and Chat, Social Media, Advertising, Health or Wellness Topics), then record the calculated rating in ageRating.',
    also: 'LISTING.md → Age rating, docs/RELEASE-IOS.md §6, and the IARC questionnaire in store/google-play/GOOGLE-PLAY-CONSOLE.md.',
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
      const sets = Object.keys(SCREENSHOT_SETS).map((dir) => ({ dir, locales: screenshotsIn(dir) }));
      const counts = [...new Set(sets.flatMap((s) => s.locales.map((l) => l.files.length)))];
      const sameFiles = sets.every((s) => isDeepStrictEqual(s.locales, sets[0].locales));
      return {
        now: counts.length === 1 && sameFiles && sets[0].locales.length ? counts[0] : Object.fromEntries(sets.map((s) => [s.dir, Object.fromEntries(s.locales.map((l) => [l.locale, l.files]))])),
        evidence: 'PNG files per locale in store/app-store/screenshots/ (6.9-inch originals) and store/app-store/screenshots-6.3/ (the 6.3-inch copies that are uploaded), with the same locales and file names in both',
      };
    }),
    asc: 'Version → screenshots in every localization: upload the new set (store/app-store/screenshots-6.3/, 1206 × 2622) in number order; screenshots only change with a new version.',
    also: `the LISTING.md "Screenshots" table and the captions, store/app-store/screenshots/README.md, and both sets (regenerate the 6.3-inch copies with: ${RESIZE_COMMAND}).`,
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

// ---------------------------------------------------------------------------------------------------------
// What the texts claim: every line that says what a declaration says, word for word
// ---------------------------------------------------------------------------------------------------------

type Holds = 'signIn' | 'accountCreation' | 'dataCollected' | 'networkCalls';
const HOLDS: Record<Holds, { holds: boolean; stops: string }> = {
  signIn: { holds: (declarations.signIn as SignIn).mode === 'none', stops: 'signIn.mode is no longer "none"' },
  accountCreation: { holds: declarations.accountCreation === false, stops: 'accountCreation is true' },
  dataCollected: { holds: declarations.dataCollected === false, stops: 'dataCollected is true' },
  networkCalls: { holds: (declarations.networkCalls as string[]).length === 0, stops: 'networkCalls is not empty' },
};
const NO_ACCOUNT: Holds[] = ['signIn', 'accountCreation'];
/** "Your data stays on your device" stops being true with an account (sync, a server) or with data collection. */
const ON_DEVICE: Holds[] = ['signIn', 'accountCreation', 'dataCollected'];
const NO_DATA: Holds[] = ['dataCollected', 'networkCalls'];

/**
 * Each quote must be in its file while every declaration it depends on holds, and gone once one stops
 * holding. A reworded line fails too, so this list (and the rows of the record that name these lines) stays
 * the exact list of what to rewrite when a declaration changes.
 */
const CLAIMS: { file: string; quote: string; while: Holds[]; where?: string }[] = [
  { file: LISTING, quote: 'iPhone only, no account', while: NO_ACCOUNT, where: 'header' },
  { file: LISTING, quote: 'Sin cuenta y sin rachas', while: NO_ACCOUNT, where: 'es-MX Promotional text' },
  { file: LISTING, quote: 'Sin cuenta ni rachas', while: NO_ACCOUNT, where: 'es-ES Promotional text' },
  { file: LISTING, quote: 'No account, no streaks', while: NO_ACCOUNT, where: 'en-US Promotional text' },
  { file: LISTING, quote: 'Sin cuenta ni registro', while: NO_ACCOUNT, where: 'es-MX and es-ES Description' },
  { file: LISTING, quote: 'No account, no sign-up', while: NO_ACCOUNT, where: 'en-US Description' },
  { file: LISTING, quote: 'No account, no sign-in, no server', while: NO_ACCOUNT, where: 'App Privacy' },
  { file: LISTING, quote: '| Sign-in required | **No**', while: NO_ACCOUNT, where: 'App Review information' },
  { file: LISTING, quote: 'There is no account or sign-in, so no demo account is needed', while: NO_ACCOUNT, where: 'review Notes' },
  { file: RECORD, quote: '| ¿Requiere iniciar sesión? | **No**', while: NO_ACCOUNT, where: '§9' },
  { file: 'docs/privacy.html', quote: 'La app no tiene cuentas de usuario, no requiere registro', while: NO_ACCOUNT },
  { file: 'docs/privacy.html', quote: 'The app has no user accounts, requires no sign-up', while: NO_ACCOUNT },
  { file: 'docs/support.html', quote: 'TraceRoutine no tiene cuentas ni servidores', while: NO_ACCOUNT },
  { file: 'docs/support.html', quote: 'TraceRoutine has no accounts and no servers', while: NO_ACCOUNT },
  { file: 'docs/RELEASE-IOS.md', quote: 'No hay cuenta ni registro', while: NO_ACCOUNT, where: '§5' },
  { file: 'docs/RELEASE-IOS.md', quote: '**¿Requiere inicio de sesión?** No', while: NO_ACCOUNT, where: '§7' },
  { file: 'README.md', quote: 'Local-first, no account', while: NO_ACCOUNT },
  { file: 'CLAUDE.md', quote: 'Local-first: SQLite, no account', while: NO_ACCOUNT },

  { file: 'src/i18n/es.json', quote: '"localData": "Tus datos viven en tu dispositivo"', while: ON_DEVICE, where: 'Settings footer, seen in screenshot 08' },
  { file: 'src/i18n/en.json', quote: '"localData": "Your data lives on your device"', while: ON_DEVICE, where: 'Settings footer, seen in screenshot 08' },
  { file: LISTING, quote: '8. Tus datos viven en tu dispositivo', while: ON_DEVICE, where: 'es-MX caption 8' },
  { file: LISTING, quote: '8. Tus datos se quedan en tu móvil', while: ON_DEVICE, where: 'es-ES caption 8' },
  { file: LISTING, quote: '8. Your data lives on your device', while: ON_DEVICE, where: 'en-US caption 8' },
  { file: LISTING, quote: 'TUS DATOS, EN TU TELÉFONO', while: ON_DEVICE, where: 'es-MX Description' },
  { file: LISTING, quote: 'TUS DATOS, EN TU MÓVIL', while: ON_DEVICE, where: 'es-ES Description' },
  { file: LISTING, quote: 'YOUR DATA STAYS ON YOUR PHONE', while: ON_DEVICE, where: 'en-US Description' },
  { file: 'store/app-store/screenshots/README.md', quote: '"Tus datos viven en tu dispositivo" / "Your data lives on your device" footer', while: ON_DEVICE, where: 'screenshot 08' },
  { file: 'docs/privacy.html', quote: '<h2>Tus datos viven en tu dispositivo</h2>', while: ON_DEVICE },
  { file: 'docs/privacy.html', quote: '<h2>Your data lives on your device</h2>', while: ON_DEVICE },
  { file: 'docs/privacy.html', quote: 'no sube tus datos a ningún servidor', while: ON_DEVICE },
  { file: 'docs/privacy.html', quote: 'uploads nothing to any server', while: ON_DEVICE },
  { file: 'docs/support.html', quote: 'la app no los envía a ningún sitio', while: ON_DEVICE },
  { file: 'docs/support.html', quote: 'the app sends them nowhere', while: ON_DEVICE },

  { file: LISTING, quote: 'no analytics or crash reporting', while: NO_DATA, where: 'header' },
  { file: LISTING, quote: '**No, we do not collect data from this app**', while: NO_DATA, where: 'App Privacy' },
  { file: LISTING, quote: '**No network code.**', while: ['networkCalls'], where: 'App Privacy' },
  { file: LISTING, quote: 'the app sends no data (App Privacy: Data Not Collected)', while: NO_DATA, where: 'review Notes' },
  { file: RECORD, quote: '**No, no recopilamos datos de esta app**', while: NO_DATA, where: '§7' },
  { file: 'docs/privacy.html', quote: 'La versión actual no transmite ningún dato', while: NO_DATA },
  { file: 'docs/privacy.html', quote: 'The current version transmits no data', while: NO_DATA },
  { file: 'docs/RELEASE-IOS.md', quote: 'el build de producción no envía ningún dato', while: NO_DATA, where: '§5' },
  { file: 'docs/RELEASE-IOS.md', quote: '**No, no recopilamos datos de esta app**', while: NO_DATA, where: '§5' },
  { file: 'CLAUDE.md', quote: 'iOS v1 collects nothing ("Data Not Collected" on the App Store)', while: NO_DATA },
];

describe('App Store declarations: what the texts claim', () => {
  it('keeps every "no account" and "your data stays on your device" line in step with the declarations', () => {
    const problems: string[] = [];
    for (const claim of CLAIMS) {
      const text = read(claim.file);
      const broken = claim.while.filter((h) => !HOLDS[h].holds);
      const where = `${claim.file}${claim.where ? ` (${claim.where})` : ''}`;
      if (!broken.length && !text.includes(claim.quote)) {
        problems.push(`${where} no longer says "${claim.quote}" word for word. If it was reworded, quote the new words in CLAIMS (src/release/appStoreDeclarations.test.ts) and in the row that names it in ${RECORD}; if the line is gone, drop it from both.`);
      }
      if (broken.length && text.includes(claim.quote)) {
        const store = claim.file === LISTING ? ' and in App Store Connect (Promotional text at any time, the rest with the next version)' : claim.file.startsWith('src/i18n/') ? ', and retake screenshot 08 in both sets' : '';
        problems.push(`${where} still says "${claim.quote}", but ${broken.map((h) => HOLDS[h].stops).join(' and ')}: rewrite it in this PR${store}.`);
      }
    }
    expect(problems, 'texts that no longer match the declarations').toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The record itself
// ---------------------------------------------------------------------------------------------------------

/** Every file in this public repo that talks about the store accounts. */
const PUBLIC_FILES = [RECORD, JSON_FILE, LISTING, PLAY_RECORD, 'store/app-store/screenshots/README.md', 'docs/RELEASE-IOS.md', 'docs/privacy.html', 'docs/support.html', 'README.md', 'CLAUDE.md', 'AGENTS.md'];
/** MORDOBO TECHNOLOGIES LLC's Team ID: public (it signs every binary) and quoted in LISTING.md and RELEASE-IOS.md. */
const PUBLIC_APPLE_IDS = ['CTC5PRH3D3'];

describe('App Store declarations: the record', () => {
  it(`checks every declaration in ${JSON_FILE}, and each one has its row in ${RECORD}`, () => {
    expect(Object.keys(declarations).sort()).toEqual(Object.keys(CHECKS).sort());
    const missing = Object.keys(declarations).filter((key) => !recordMd.includes(`| \`${key}\``));
    expect(missing, `add a row to "Qué depende de qué" in ${RECORD} for`).toEqual([]);
  });

  it('says which version it describes, and its status lines agree with the JSON', () => {
    const { status, enteredOn, build, updatedOn } = record.record as { status: string; enteredOn: string | null; build: string | null; updatedOn: string };
    expect(recordMd, `${RECORD} must say "**Versión que describe**: ${record.declarations.version}"`).toContain(`**Versión que describe**: ${record.declarations.version}`);
    expect(['pendiente de introducir', 'parcialmente introducido', 'introducido']).toContain(status);
    expect(recordMd, `${RECORD} must say "**Estado del registro**: \`${status}\`" (record.status in ${JSON_FILE})`).toContain(`**Estado del registro**: \`${status}\``);
    expect(updatedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const entered = [...recordMd.matchAll(/\|\s*introducido (\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]).sort();
    const pending = recordMd.match(/\|\s*pendiente de introducir/g)?.length ?? 0;
    if (status === 'pendiente de introducir') {
      expect(entered, `fields marked "introducido" in ${RECORD} while record.status is "pendiente de introducir"`).toEqual([]);
      expect(enteredOn, 'record.enteredOn must be null while nothing is entered').toBeNull();
      expect(build, 'record.build must be null while nothing is entered').toBeNull();
      expect(pending, `${RECORD} has no field "pendiente de introducir"`).toBeGreaterThan(0);
    } else {
      expect(entered.length, `record.status is "${status}" but no field in ${RECORD} is marked "introducido AAAA-MM-DD"`).toBeGreaterThan(0);
      expect(enteredOn, 'record.enteredOn is the date of the first entry in the record').toBe(entered[0]);
      expect(build, 'record.build is the build the entries describe').toMatch(/\S/);
      if (status === 'introducido') expect(pending, `record.status is "introducido" but fields in ${RECORD} are still "pendiente de introducir"`).toBe(0);
      else expect(pending, `record.status is "parcialmente introducido" but nothing in ${RECORD} is pending: set it to "introducido"`).toBeGreaterThan(0);
    }
    const history = recordMd.slice(recordMd.indexOf('## Historial'));
    expect([...new Set(entered)].filter((date) => !history.includes(`| ${date} |`)), `every entry date needs its line in the Historial of ${RECORD}`).toEqual([]);
    expect(entered.filter((date) => date > updatedOn), `record.updatedOn in ${JSON_FILE} is older than an entry`).toEqual([]);
  });

  it('points at the Google Play record', () => {
    expect(existsSync(join(root, PLAY_RECORD)), `${PLAY_RECORD} is missing`).toBe(true);
    expect(recordMd, `${RECORD} must name ${PLAY_RECORD}`).toContain(PLAY_RECORD);
    expect(read('CLAUDE.md'), `CLAUDE.md must name ${PLAY_RECORD}`).toContain(PLAY_RECORD);
  });

  it('keeps both screenshot sets in the repo at their App Store sizes, without transparency', () => {
    const wrong: string[] = [];
    for (const [dir, size] of Object.entries(SCREENSHOT_SETS)) {
      const locales = screenshotsIn(dir);
      if (!locales.length) wrong.push(`${dir}/ is missing`);
      for (const { locale, files } of locales) {
        for (const file of files) {
          const png = pngInfo(join(root, dir, locale, file));
          if (png.width !== size.width || png.height !== size.height || png.alpha) wrong.push(`${dir}/${locale}/${file} is ${png.width} × ${png.height}${png.alpha ? ' with transparency' : ''}, not ${size.width} × ${size.height} without it`);
        }
      }
    }
    expect(wrong, `App Store Connect takes the 6.3-inch set (store/app-store/screenshots-6.3/, 1206 × 2622). Regenerate it from the 6.9-inch originals with: ${RESIZE_COMMAND}`).toEqual([]);
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

  it('holds no secrets in the public files: the repo is public', () => {
    for (const file of PUBLIC_FILES) {
      const text = read(file);
      expect(text, `${file}: a UUID looks like an issuer ID or a key`).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      expect(text, `${file}: an App Store Connect API key file or a private key`).not.toMatch(/AuthKey_|-----BEGIN|\.p8\b/);
      const appleIds = [...text.matchAll(/\b(?=[A-Z0-9]*\d)(?=[A-Z0-9]*[A-Z])[A-Z0-9]{10}\b/g)].map((m) => m[0]).filter((id) => !PUBLIC_APPLE_IDS.includes(id));
      expect(appleIds, `${file}: 10-character Apple identifiers (an API key ID, a certificate or another team); only the Team ID may appear`).toEqual([]);
      expect(text, `${file}: a phone number`).not.toMatch(/\+\d[\d ()-]{8,}\d/);
      expect(text, `${file}: a phone number`).not.toMatch(/\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/);
    }
  });
});
