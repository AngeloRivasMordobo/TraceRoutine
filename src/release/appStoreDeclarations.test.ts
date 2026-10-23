/**
 * App Store declarations match the build. store/app-store/app-store-declarations.json holds what is (or will
 * be) declared in App Store Connect for iOS; store/app-store/APP-STORE-CONNECT.md is the record, field by
 * field. Every value is derived again here from the real code and config: the app config as Expo resolves it
 * for `eas build --profile production --platform ios`, the shipped dependencies, the platform flags
 * (`analyticsAllowed`, `showsPro`), the app's languages, the public links, the business-rule numbers the
 * listing quotes and the screenshots in the repo. When one diverges, the failure says which App Store Connect
 * fields to change before the next build is submitted, and that the record and the JSON change in the same PR.
 * The features the listing describes (frequencies, the minimum, consistency, reminders, export, Delete all data,
 * the end-date shortcuts, themes) are derived the same way, from the screens that offer them or by running the
 * engine, the planner and the backup code, so a business-rule change fails here with the store fields to change.
 * STATEMENTS then checks that LISTING.md and the support page say each of them, with those numbers; a number in an
 * entered text (or the review notes) that no declaration derives fails, and so does a label quoted in the notes that
 * the app's English strings no longer have. KNOWN_ISSUES holds the lines build 1.0.0 (1) does not make true, each one
 * a row of "Fallos conocidos" in the record, until the code does.
 * It also checks that every "no account" / "your data stays on your device" line in the listing, the policy,
 * the support page, the docs and the app's own strings is still there while it is true and gone once it is not,
 * that the record says what the JSON says (status, dates, build, Apple ID, version, language, localizations entered
 * and not entered, age rating, sign-in and demo account, and every field still "(verificar)" listed in record.pending),
 * and that none of the public files carries a secret.
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
import { parseBackup, toBackup } from '../data/backup';
import { addDays, consistency, daysBetween, defaultRule, dueToday, isDue, NO_LOGS, validateRule, weekday, type Activity, type FrequencyRule, type LogLookup } from '../engine';
import { LANGS, localizedCycleSteps, t, type Lang } from '../i18n';
import { planReminders } from '../reminders/planner';
import { weekdayPattern, weeklyTrend } from '../stats/statsModel';
import { FREE_ACTIVE_LIMIT, showsPro } from '../store/limits';
import { applyDuration, newDraft, type DurationKind } from '../ui/editor/editorModel';

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
const sorted = (xs: readonly string[]) => [...new Set(xs)].sort();

/**
 * The "## <locale> · …" sections of LISTING.md. A section entered in App Store Connect says "· entered AAAA-MM-DD";
 * one kept ready but not entered says "· draft, not entered" (TraceCosts, 2026-10-21: a draft must never count as
 * entered). Drafts are still checked by storeListing.test.ts, so they stay true in case they are entered later.
 */
const DRAFT_MARK = '· draft, not entered';
const ENTERED_MARK = /· entered (\d{4}-\d{2}-\d{2})\b/;
const listingSections = [...listingMd.matchAll(/^## ([a-z]{2}-[A-Z]{2}) · (.*)$/gm)].map((m) => ({
  locale: m[1],
  heading: m[0],
  draft: m[2].includes(DRAFT_MARK),
  enteredOn: ENTERED_MARK.exec(m[2])?.[1] ?? null,
}));
/** The review notes block of LISTING.md, pasted as is into App Review Information → Notes. */
const reviewNotes = /\*\*Notes\*\* \(paste as is\):\n\n```text\n([\s\S]*?)\n```/.exec(listingMd)?.[1] ?? '';
/** What the notes say about signing in when there is no demo account. */
const NO_DEMO_NOTE = 'There is no account or sign-in, so no demo account is needed';

/** A string of the app's dictionaries (src/i18n/*.json), as the app shows it. */
const ui = (lang: Lang, key: string) => t(key, undefined, lang);
/** The `value`s of `<Seg<Type> options={[…]}>` (or PillSeg) in a screen: what the user can pick there. */
function segValues(file: string, type: string): string[] {
  const block = new RegExp(`<(?:Pill)?Seg<${type.replace(/[|'.*+?^${}()[\]\\]/g, '\\$&')}>\\s*options=\\{\\[([\\s\\S]*?)\\]\\}`).exec(read(file))?.[1];
  return block ? [...block.matchAll(/value: '(\w+)'/g)].map((m) => m[1]) : [];
}
/**
 * The "every N days" stepper in the editor: the `<Stepper … />` whose onChange sets `n`, with its `min` and `max`
 * props in any order. null when there is none (or it has no numeric min and max): the check then fails, it never
 * falls back to validateRule alone.
 */
const editorStepper = (() => {
  const stepper = [...read('app/editor.tsx').matchAll(/<Stepper\b([\s\S]*?)\/>/g)].map((m) => m[1]).find((props) => /onChange=\{[\s\S]*\bn: v\b/.test(props));
  const prop = (name: string) => (stepper ? new RegExp(`\\b${name}=\\{(\\d+)\\}`).exec(stepper)?.[1] : undefined);
  const [min, max] = [prop('min'), prop('max')];
  return min !== undefined && max !== undefined ? { min: Number(min), max: Number(max) } : null;
})();
const STEPPER_NOT_FOUND = 'every-N-days Stepper not found in app/editor.tsx (a <Stepper … /> whose onChange sets n, with numeric min and max): find where the editor sets the range now and update editorStepper in this test';
const everyNValid = (n: number) => validateRule({ type: 'everyN', n } as FrequencyRule).length === 0;
/** A plain activity for the behaviour checks, starting on a Monday. */
const FIXTURE_START = '2026-01-05';
const fixture = (id: string, freq: Partial<FrequencyRule>, reminder: string | null = null): Activity => ({ ...newDraft(id, FIXTURE_START), name: id, reminder, freq: { ...defaultRule(), anchor: 'calendar', ...freq } as FrequencyRule });
/** Days a label like "21 days", "4 weeks", "3 meses" stands for (a month is 30 days, as applyDuration counts it). */
const UNIT_DAYS: Record<string, number> = { day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30, 'día': 1, 'días': 1, semana: 7, semanas: 7, mes: 30, meses: 30 };
const labelDays = (label: string) => {
  const m = /^(\d+) (\S+)$/.exec(label);
  return m && UNIT_DAYS[m[2]] ? Number(m[1]) * UNIT_DAYS[m[2]] : null;
};
/** The end-date chips of the editor: each label key with the DurationKind it applies. */
const durationChips = [...read('app/editor.tsx').matchAll(/<Chip label=\{t\('(editor\.duration\w+)'\)\} on=\{draft\.end === applyDuration\(draft\.start, '(\w+)'\)\}/g)].map((m) => ({ key: m[1], kind: m[2] as DurationKind }));
/** The Today screen, whose rows the listing describes ("Tap the circle…", "Pending first", "Free day"). */
const todayScreen = read('app/(tabs)/index.tsx');
/** The Stats screen: the trend it asks for and the weekday pattern it shows. */
const statsScreen = read('app/(tabs)/stats.tsx');
/** The arguments of the `weeklyTrend(…)` call in Stats (null when there is none). */
const statsTrendArgs = /\bweeklyTrend\(([^)]*)\)/.exec(statsScreen)?.[1].split(',').map((arg) => arg.trim()) ?? null;
/** A string of the "stats" block of a dictionary, as written (placeholders not filled in). */
const statsString = (lang: Lang, key: string) => ((JSON.parse(read(`src/i18n/${lang}.json`)) as { stats: Record<string, string> }).stats[key] ?? '');
const statsStrings = (lang: Lang) => Object.entries((JSON.parse(read(`src/i18n/${lang}.json`)) as { stats: Record<string, string> }).stats);
/** Small numbers as the listing and the app write them in words ("after two weeks of logs", "Con dos semanas"). */
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const NUMBER_WORDS_ES = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
const numberWord = (lang: Lang, n: number) => (lang === 'es' ? NUMBER_WORDS_ES : NUMBER_WORDS)[n] ?? String(n);
/** The Stats checks run on a daily activity that started `days` days before STATS_TODAY (a Monday). */
const STATS_TODAY = addDays(FIXTURE_START, 140);
const dailySince = (days: number): Activity => ({ ...fixture('s', { type: 'daily' }), start: addDays(STATS_TODAY, -days) });
const EVERY_DAY_DONE: LogLookup = () => 'done';
/** The first number of past due days (1 to 120) at which `test` holds for that daily activity, or null. */
function firstDay(test: (a: Activity) => boolean): number | null {
  for (let days = 1; days <= 120; days++) if (test(dailySince(days))) return days;
  return null;
}
/** The state a Today row handler (`const <name> = () => …`) logs last: tap → 'done', minimum → 'min'. */
function todayHandler(name: string | undefined): string | null {
  const start = name ? todayScreen.indexOf(`const ${name} = () =>`) : -1;
  if (start < 0) return null;
  const end = todayScreen.indexOf('\n  const ', start + 1);
  return [...todayScreen.slice(start, end < 0 ? undefined : end).matchAll(/appStore\.setLog\(a\.id, today, '(\w+)'/g)].map((m) => m[1]).at(-1) ?? null;
}

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
const LISTING_FEATURES = 'Version → Description (and Promotional text if it names it) in every entered localization, and App Review Information → Notes where they describe it; a description and screenshots only change with a new version, the promotional text at any time.';

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
      const primaryHeadings = listingSections.filter((s) => /primary language/.test(s.heading)).map((s) => s.locale);
      const ok =
        typeof declared === 'string' &&
        localizations[0] === declared &&
        (LANGS as string[]).includes(langOf(declared)) &&
        isDeepStrictEqual(primaryHeadings, [declared]) &&
        listingSections.some((s) => s.locale === declared && !s.draft);
      return ok
        ? null
        : { now: { appLanguages: LANGS, localizations, primaryLanguageHeadingsInListing: primaryHeadings }, evidence: 'LANGS in src/i18n/index.ts, localizations[0] (the primary goes first), and the one "primary language" heading of LISTING.md, which must be an entered section' };
    },
    asc: 'App Information → Primary Language (it can only be one of the entered localizations; `eas submit` creates the record in English (U.S.)).',
    also: 'the "primary language" heading in LISTING.md and the "Idioma principal" rows of the record (§2 and §3).',
  },
  localizations: {
    verify: (declared) => {
      const locales = declared as string[];
      const now = {
        enteredInListing: listingSections.filter((s) => !s.draft).map((s) => s.locale),
        notAnAppLanguage: locales.filter((l) => !(LANGS as string[]).includes(langOf(l))),
        appLanguageWithoutListing: LANGS.filter((lang) => !listingSections.some((s) => langOf(s.locale) === lang)),
        sectionsNeitherEnteredNorDraft: listingSections.filter((s) => s.draft === (s.enteredOn !== null)).map((s) => s.heading),
        enteredAfterTheRecord: listingSections.filter((s) => s.enteredOn && s.enteredOn > record.record.updatedOn).map((s) => s.heading),
      };
      const ok =
        isDeepStrictEqual(now.enteredInListing, locales) &&
        !now.notAnAppLanguage.length &&
        !now.appLanguageWithoutListing.length &&
        !now.sectionsNeitherEnteredNorDraft.length &&
        !now.enteredAfterTheRecord.length;
      return ok
        ? null
        : { now, evidence: `the "## <locale> · …" sections of LISTING.md: entered ones say "· entered AAAA-MM-DD", the rest "${DRAFT_MARK}" and never count; each must be in a language of the app (LANGS), and each app language needs a section (entered or draft)` };
    },
    asc: 'App Information → add or remove the localization (name, subtitle) and its Privacy Policy URL in App Privacy, then its product page in the version (screenshots, promotional text, description, keywords, support URL). Adding a draft means pasting its LISTING.md blocks and its screenshots, then changing its heading from "draft, not entered" to "entered AAAA-MM-DD".',
    also: 'the "## <locale>" heading in LISTING.md, the "Información localizable" table of the record (§3) and §8.1, supportUrl and privacyPolicyUrl (one per entered localization), docs/privacy.html and docs/support.html in that language.',
  },
  uiLanguages: {
    verify: same(() => {
      const app = sorted(LANGS);
      const plist = sorted((infoPlist.CFBundleLocalizations as string[] | undefined) ?? []);
      const plugin = sorted(Object.keys(pluginProps('./plugins/withIosLocales') ?? {}));
      const ok = isDeepStrictEqual(plist, app) && isDeepStrictEqual(plugin, app);
      return { now: ok ? app : { LANGS: app, CFBundleLocalizations: plist, withIosLocales: plugin }, evidence: 'LANGS in src/i18n/index.ts, app.json ios.infoPlist.CFBundleLocalizations and plugins/withIosLocales + locales/*.json (the .lproj folders App Store reads the "Languages" line from)' };
    }),
    asc: 'nothing to type: the "Languages" line of the App Store page comes from the binary and changes with the next build. Version → Description ("English and Spanish.") and App Review Information → Notes ("language (ES/EN)") quote these languages; change them with the next version.',
    also: 'the LISTING.md Description blocks ("English and Spanish." / "En español e inglés."), a LISTING.md section (entered or draft) per language, docs/privacy.html and docs/support.html in each language, and the Google Play listing languages.',
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
  demoAccountProvided: {
    verify: (declared) => {
      const mode = (declarations.signIn as SignIn).mode;
      if (typeof declared !== 'boolean') return { now: 'true or false', evidence: 'demoAccountProvided must be a boolean' };
      const problems = [
        ...(mode === 'required' && !declared ? ['signIn.mode is "required": App Review cannot get past the login without a demo account (TraceCosts lesson, 2026-10-21)'] : []),
        ...(mode === 'none' && declared ? ['signIn.mode is "none": there is no account to give App Review'] : []),
        ...(declared && reviewNotes.includes(NO_DEMO_NOTE) ? [`the review notes in LISTING.md still say "${NO_DEMO_NOTE}"`] : []),
        ...(declared && !/demo account/i.test(reviewNotes.replace(NO_DEMO_NOTE, '')) ? ['the review notes in LISTING.md do not say there is a demo account (its credentials go only in App Store Connect)'] : []),
        ...(!declared && !reviewNotes.includes(NO_DEMO_NOTE) ? [`the review notes in LISTING.md no longer say "${NO_DEMO_NOTE}"`] : []),
        ...(!declared && !listingMd.includes('| Sign-in required | **No**, unchecked, and no demo account') ? ['LISTING.md → App Review information no longer says "| Sign-in required | **No**, unchecked, and no demo account"'] : []),
      ];
      const expected = mode === 'required' ? true : mode === 'none' ? false : declared;
      return problems.length ? { now: expected, evidence: problems.join('; ') } : null;
    },
    asc: 'App Review Information → Sign-In Information: "Sign-in required" and the demo account (username and password only in App Store Connect, never in the repo or in the notes), and App Review Information → Notes, which say whether there is a demo account.',
    also: 'the LISTING.md App Review information table and review Notes, §9 of the record (the row "¿Requiere iniciar sesión?" names `demoAccountProvided`), and App access in Google Play (store/google-play/GOOGLE-PLAY-CONSOLE.md).',
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
  everyNMin: {
    verify: same(() => {
      let n = 0;
      while (n < 1000 && !everyNValid(n)) n += 1;
      const now = !editorStepper ? STEPPER_NOT_FOUND : editorStepper.min !== n ? { validateRule: n, editorStepper: editorStepper.min } : n;
      return { now, evidence: 'validateRule in src/engine/presets.ts (everyN.range) and the "every N days" Stepper min in app/editor.tsx, which must agree' };
    }),
    asc: LISTING_NUMBERS,
    also: LISTING_NUMBERS_ALSO,
  },
  everyNMax: {
    verify: same(() => {
      let n = 1;
      while (n < 1000 && everyNValid(n + 1)) n += 1;
      const now = !editorStepper ? STEPPER_NOT_FOUND : editorStepper.max !== n ? { validateRule: n, editorStepper: editorStepper.max } : n;
      return { now, evidence: 'validateRule in src/engine/presets.ts (everyN.range) and the "every N days" Stepper max in app/editor.tsx, which must agree' };
    }),
    asc: LISTING_NUMBERS,
    also: LISTING_NUMBERS_ALSO,
  },
  patternsAfterScheduledDays: {
    verify: same(() => {
      const days = firstDay((a) => weekdayPattern([a], STATS_TODAY, EVERY_DAY_DONE).enough);
      const stringsWithAnotherNumber = LANGS.filter((l) => !statsString(l, 'tooEarlyPatterns').includes(String(days)));
      return {
        now: stringsWithAnotherNumber.length ? { days, stringsWithAnotherNumber: stringsWithAnotherNumber.map((l) => `stats.tooEarlyPatterns (${l})`) } : days,
        evidence: 'weekdayPattern in src/stats/statsModel.ts run on a daily activity with every day done: the due days it takes to have enough data (MIN_DAYS_FOR_PATTERNS); stats.tooEarlyPatterns in src/i18n/*.json quotes the same number (it is not shown in build 1.0.0 (1))',
      };
    }),
    asc: 'App Review Information → Notes (step 3: "patterns appear after … scheduled days") with the next version. Stats names a weekday only later (weekdayPatternShownAfterDays): the entered line already overstates it (fallo 6 of "Fallos conocidos").',
    also: 'the LISTING.md review Notes and stats.tooEarlyPatterns in src/i18n/*.json.',
  },
  weekdayPatternShownAfterDays: {
    verify: same(() => {
      const pattern = (a: Activity) => weekdayPattern([a], STATS_TODAY, EVERY_DAY_DONE);
      return {
        now: { best: firstDay((a) => pattern(a).best !== null), worst: firstDay((a) => pattern(a).worst !== null) },
        evidence: 'weekdayPattern in src/stats/statsModel.ts run on a daily activity with every day done: the due days it takes for Stats to name the best weekday and the day you miss most (enough data, a weekday due at least 3 times, and two such weekdays for the worst)',
      };
    }),
    asc: 'App Review Information → Notes (step 3: when the patterns appear) with the next version; the Description ("your best weekday, the day you miss most") quotes no number. Screenshot 06 (Stats) shows both weekdays.',
    also: 'the LISTING.md review Notes, fallo 6 of "Fallos conocidos" in the record, and screenshot 06 in both sets if what Stats shows changes.',
  },
  trendWeeks: {
    verify: same(() => {
      const arg = statsTrendArgs?.[3];
      if (!statsTrendArgs || (arg !== undefined && !/^\d+$/.test(arg))) {
        return { now: `the weeks Stats asks for: ${statsTrendArgs ? `weeklyTrend(${statsTrendArgs.join(', ')})` : 'no weeklyTrend(…) call'}`, evidence: 'the weeklyTrend(…) call in app/(tabs)/stats.tsx, with no week count or a number literal' };
      }
      const weeks = weeklyTrend([], STATS_TODAY, NO_LOGS, arg === undefined ? undefined : Number(arg)).points.length;
      const stringsWithAnotherCount = LANGS.flatMap((l) =>
        statsStrings(l)
          .filter(([, text]) => [...text.matchAll(/(\d+)\s*(?:weeks?|wk|semanas?|sem)\b/gi)].some((m) => Number(m[1]) !== weeks))
          .map(([key]) => `stats.${key} (${l})`),
      );
      return {
        now: stringsWithAnotherCount.length ? { weeks, stringsWithAnotherCount } : weeks,
        evidence: 'the weeks Stats draws: the weeklyTrend(…) call in app/(tabs)/stats.tsx (its week count, or the default of weeklyTrend in src/stats/statsModel.ts), and every stats.* string of src/i18n/*.json that quotes a number of weeks (stats.trend, stats.trendAgo, stats.trendSummary)',
      };
    }),
    asc: 'Version → Description ("the trend over the last 12 weeks") and App Review Information → Notes ("the 12-week trend") with the next version; screenshot 06 (Stats: "Trend · 12 weeks", "12 wk ago").',
    also: 'the LISTING.md Description in every locale ("las últimas 12 semanas" in the drafts) and the review Notes, stats.trend, stats.trendAgo and stats.trendSummary in src/i18n/*.json, and screenshot 06 in both sets.',
  },
  trendAfterWeeks: {
    verify: same(() => {
      const days = firstDay((a) => weeklyTrend([a], STATS_TODAY, EVERY_DAY_DONE).enough);
      const weeks = days === null ? null : weeklyTrend([dailySince(days)], STATS_TODAY, EVERY_DAY_DONE).points.filter((p) => p.pct !== null).length;
      const stringsWithAnotherNumber = LANGS.filter((l) => weeks === null || !statsString(l, 'tooEarlyTrend').toLowerCase().includes(numberWord(l, weeks)));
      return {
        now: stringsWithAnotherNumber.length ? { weeks, stringsWithAnotherNumber: stringsWithAnotherNumber.map((l) => `stats.tooEarlyTrend (${l})`) } : weeks,
        evidence: 'weeklyTrend in src/stats/statsModel.ts run on a daily activity: how many weeks with a due day it takes for the trend to show (MIN_WEEKS_FOR_TREND), and stats.tooEarlyTrend in src/i18n/*.json, which says it in words',
      };
    }),
    asc: 'App Review Information → Notes (step 3: "after two weeks of logs") with the next version. The trend shows with no logs at all (fallo 7 of "Fallos conocidos").',
    also: 'the LISTING.md review Notes and stats.tooEarlyTrend in src/i18n/*.json ("Two weeks of logs and the trend will appear.").',
  },
  frequencyTypes: {
    verify: same(() => {
      const offered = segValues('app/editor.tsx', 'FrequencyType');
      const rejected = offered.filter((type) => validateRule({ ...defaultRule(), type } as FrequencyRule).length > 0);
      return { now: rejected.length ? { offered, rejectedByValidateRule: rejected } : offered, evidence: 'the frequency types the editor offers (<Seg<FrequencyType>> in app/editor.tsx), each one accepted by validateRule with its defaults' };
    }),
    asc: LISTING_FEATURES,
    also: 'the LISTING.md Description "REAL FREQUENCIES" (every day, every other day, every N days, fixed weekdays, a number of times a week, cycles with rest days) and the Promotional text examples in every locale, the review Notes, docs/support.html, screenshot 02 (Editor · Frequency) in both sets, and the Google Play description.',
  },
  missedDayOptions: {
    verify: same(() => ({ now: segValues('app/editor.tsx', "'calendar' | 'relative'"), evidence: 'the "If you miss a day" choice in app/editor.tsx (anchor: follows the calendar or counts from the last time)' })),
    asc: LISTING_FEATURES,
    also: 'the LISTING.md Description ("Miss a day and you decide what happens: the activity follows the calendar or counts from the last time") in every locale, screenshot 03 in both sets, docs/glossary.md and the Google Play description.',
  },
  logTypes: {
    verify: same(() => ({ now: segValues('app/editor.tsx', 'RecordType'), evidence: 'the "How do you log it" choice in app/editor.tsx (<Seg<RecordType>>)' })),
    asc: LISTING_FEATURES,
    also: 'the LISTING.md Description ("Just a check, or log minutes or an amount: pages, km, reps") in every locale, screenshot 04 (the "How much?" sheet) and the Google Play description.',
  },
  minimumVersion: {
    verify: same(() => {
      const field = /<Input value=\{draft\.minimal \?\? ''\} onChangeText=\{\(v\) => patch\(\{ minimal: v \}\)\}/.test(read('app/editor.tsx'));
      const logged = /appStore\.setLog\(a\.id, today, 'min'/.test(todayScreen);
      return { now: field && logged, evidence: 'the "Minimum version" field of app/editor.tsx (draft.minimal) and the minimum Today logs (appStore.setLog(…, \'min\') in app/(tabs)/index.tsx); that it counts as done is "consistency"' };
    }),
    asc: LISTING_FEATURES,
    also: 'the LISTING.md Description ("BAD DAYS COUNT TOO": "Every activity can have a minimum version") in every locale, the review Notes (step 2: "log the minimum version", "I did the minimum"), caption and screenshot 04 in both sets, docs/support.html and the Google Play description.',
  },
  todayGestures: {
    verify: same(() => {
      const button = /testID=\{`check-\$\{a\.id\}`\}([\s\S]*?)<\/Pressable>/.exec(todayScreen)?.[1] ?? '';
      const swipeSheet = /if \(g\.dx < -\d+\) setSheet\('(\w+)'\)/.exec(todayScreen)?.[1] ?? null;
      const sheetStartsAs = (mode: string | null) => (mode && new RegExp(`mode === '${mode}' \\? '(\\w+)'`).exec(read('src/ui/LogSheet.tsx'))?.[1]) || null;
      return {
        now: { tap: todayHandler(/onPress=\{(\w+)\}/.exec(button)?.[1]), longPress: todayHandler(/onLongPress=\{(\w+)\}/.exec(button)?.[1]), swipeLeft: sheetStartsAs(swipeSheet) },
        evidence: 'the check circle of each Today row (onPress / onLongPress in app/(tabs)/index.tsx and the state their handler logs) and the swipe left, which opens the LogSheet in the mode that logs a skip (src/ui/LogSheet.tsx)',
      };
    }),
    asc: LISTING_FEATURES,
    also: 'the LISTING.md Description ("TODAY AT A GLANCE": "Tap the circle to complete, long-press for the minimum, or swipe left to skip") in every locale, the review Notes (step 2), screenshots 01 and 04 in both sets, and the Google Play description.',
  },
  skipWithOptionalReason: {
    verify: same(() => {
      const sheet = read('src/ui/LogSheet.tsx');
      const reasons = /const REASONS = \[([^\]]*)\] as const/.exec(sheet)?.[1].match(/'\w+'/g) ?? [];
      const optional = sheet.includes('setReason(reason === r ? null : r)') && sheet.includes("reason: state === 'skip' ? reason : null");
      const offered = todayScreen.includes("setSheet('skip')");
      return { now: reasons.length > 0 && optional && offered, evidence: 'the skip sheet of Today (setSheet(\'skip\') in app/(tabs)/index.tsx) and its REASONS chips in src/ui/LogSheet.tsx, which can be left unselected (the skip is saved with reason null)' };
    }),
    asc: LISTING_FEATURES,
    also: 'the LISTING.md Description ("Can\'t do it today? Skip it, with an optional reason") in every locale, the review Notes (step 2: "skip it with an optional reason"), and the Google Play description.',
  },
  consistency: {
    verify: same(() => {
      const a = fixture('c', { type: 'everyN', n: 2 }); // due on days 0, 2, 4…; day 1 is an off day
      const day = (n: number) => addDays(FIXTURE_START, n);
      const only = (date: string, state: 'done' | 'min'): LogLookup => (_, d) => (d === date ? state : null);
      const minimum = consistency(a, day(0), day(0), day(1), only(day(0), 'min'));
      const offDay = consistency(a, day(0), day(1), day(2), only(day(0), 'done'));
      const todayPending = consistency(a, day(0), day(0), day(0), NO_LOGS);
      return {
        now: { minimumCountsAsDone: minimum.hits === 1 && minimum.expected === 1, offDaysCount: offDay.expected > 1, todayPendingCounts: todayPending.expected > 0 },
        evidence: 'consistency() in src/engine/consistency.ts on an every-2-days activity: a minimum on a due day, an off day after a done one, and today still pending',
      };
    }),
    asc: 'Version → Description ("BAD DAYS COUNT TOO": the minimum counts as done; "CONSISTENCY, NOT STREAKS": measured over the days that were due, off days never hurt, today doesn\'t count while it\'s pending) and App Review Information → Notes ("Stats shows consistency over scheduled days only"); screenshot 06 (Stats) if what it shows changes.',
    also: 'the LISTING.md Description in every locale, docs/support.html, docs/glossary.md, the Stats texts in src/i18n/*.json, CLAUDE.md ("Product rules") and the Google Play description.',
  },
  reminders: {
    verify: same(() => {
      const acts = [fixture('a', { type: 'everyN', n: 2 }, '07:00'), fixture('b', { type: 'weekdays', days: [1, 3, 5] }, '07:30')];
      const texts = { dueToday: (name: string) => name, summaryTitle: (n: number) => String(n), summaryBody: (names: string[]) => names.join(',') };
      const days = 14;
      const plan = (morningSummary: boolean) => planReminders(acts, FIXTURE_START, NO_LOGS, { days, morningSummary, morningTime: '08:00', texts });
      const dates = Array.from({ length: days }, (_, i) => addDays(FIXTURE_START, i));
      const due = acts.flatMap((a) => dates.filter((d) => isDue(a, d, NO_LOGS)).map((d) => `${a.id}|${d}`)).sort();
      const one = plan(false);
      const folded = plan(true);
      const service = read('src/reminders/service.ts');
      const category = /setNotificationCategoryAsync\(CATEGORY, \[([\s\S]*?)\]\);/.exec(service)?.[1] ?? '';
      const handled = /appStore\.setLog\(data\.activityId, data\.date, action\)/.test(service);
      return {
        now: {
          onlyOnDueDays: one.every((n) => n.kind === 'activity') && isDeepStrictEqual(one.map((n) => `${n.activityId}|${n.date}`).sort(), due),
          morningSummary: folded.every((n) => n.kind === 'summary' && n.time === '08:00') && isDeepStrictEqual(folded.map((n) => n.date), sorted(due.map((k) => k.split('|')[1]))),
          notificationActions: [...category.matchAll(/\{ identifier: '(\w+)'[^}]*opensAppToForeground: false/g)].map((m) => m[1]).filter((action) => handled && service.includes(`action === '${action}'`)),
        },
        evidence: 'planReminders in src/reminders/planner.ts for two activities over 14 days (one notification per activity, only on its due days; with the morning summary, one notification a day with what is due), and the notification actions in src/reminders/service.ts that log without opening the app',
      };
    }),
    asc: 'Version → Description ("REMINDERS WITHOUT NAGGING": one heads-up per activity, only on the days it\'s due; the morning summary; mark it done or minimum from the notification without opening the app) and App Review Information → Notes (step 5); screenshot 07 if the reminder texts change.',
    also: 'the LISTING.md Description and caption 7 in every locale, docs/privacy.html ("Recordatorios"), docs/support.html, the reminder texts in src/i18n/*.json, and the Google Play description.',
  },
  defaultReminderTime: {
    verify: same(() => ({ now: newDraft('x', FIXTURE_START).reminder ?? null, evidence: 'newDraft in src/ui/editor/editorModel.ts: the reminder a new activity starts with' })),
    asc: 'App Review Information → Notes (step 5: "new activities have one at 08:00 by default").',
    also: 'the LISTING.md review Notes.',
  },
  durationShortcuts: {
    verify: same(() => {
      const chips = durationChips.map(({ key, kind }) => ({
        kind,
        days: daysBetween(FIXTURE_START, applyDuration(FIXTURE_START, kind)) + 1,
        labels: Object.fromEntries(LANGS.map((l) => [l, ui(l, key)])),
      }));
      const wrong = chips.filter((c) => Object.values(c.labels).some((label) => labelDays(label) !== c.days)).map((c) => c.kind);
      return {
        now: chips.length && !wrong.length ? chips.map((c) => c.labels.en) : { chips, labelsThatDoNotMatchTheirLength: wrong },
        evidence: 'the end-date chips in app/editor.tsx: their labels (editor.duration* in src/i18n/*.json) and the end each one sets (applyDuration in src/ui/editor/editorModel.ts, counting the start day; a month is 30 days)',
      };
    }),
    asc: LISTING_NUMBERS,
    also: LISTING_NUMBERS_ALSO,
  },
  exportFormats: {
    verify: same(() => {
      const formats = sorted([...read('app/(tabs)/settings.tsx').matchAll(/shareText\(`[^`]*\.(\w+)`/g)].map((m) => m[1]));
      const backup = parseBackup(toBackup([fixture('x', {})], [{ activityId: 'x', date: FIXTURE_START, state: 'done' }], {}));
      const importsBack = backup.ok && backup.backup.activities.length === 1 && backup.backup.logs.length === 1;
      return { now: importsBack ? formats : { formats, jsonBackupImportsBack: false }, evidence: 'the files Settings shares (shareText in app/(tabs)/settings.tsx) and the JSON backup read back by parseBackup (src/data/backup.ts), which "Import backup" uses' };
    }),
    asc: 'Version → Description ("Export to CSV, which opens in Excel or Sheets, or save a JSON backup to switch phones") and App Review Information → Notes (step 4: "Export CSV", "Save backup (JSON)", "Import backup").',
    also: 'the LISTING.md Description in every locale and the review Notes, docs/privacy.html and docs/support.html, screenshot 08 (the export and backup rows) in both sets, and the Google Play description.',
  },
  deleteAllConfirmWord: {
    verify: same(() => {
      const gated = read('app/(tabs)/settings.tsx').includes("typed.trim().toUpperCase() !== t('settings.deleteWord')");
      const words = Object.fromEntries(LANGS.map((l) => [l, ui(l, 'settings.deleteWord')]));
      const promptsWithoutTheWord = LANGS.filter((l) => !ui(l, 'settings.deleteType').includes(words[l]));
      return {
        now: gated && !promptsWithoutTheWord.length ? words : { words, buttonWaitsForTheWord: gated, promptsWithoutTheWord },
        evidence: 'settings.deleteWord in src/i18n/*.json, which the "Delete all data" button in app/(tabs)/settings.tsx waits for, and the prompt settings.deleteType that names it',
      };
    }),
    asc: 'App Review Information → Notes (step 4: "asks to type DELETE, or BORRAR in Spanish").',
    also: 'the LISTING.md review Notes; the Description ("Delete all your data from Settings whenever you like") changes only if Delete all data goes away.',
  },
  themes: {
    verify: same(() => ({ now: segValues('app/(tabs)/settings.tsx', 'ThemeMode'), evidence: 'the Theme choice in app/(tabs)/settings.tsx (<PillSeg<ThemeMode>>)' })),
    asc: LISTING_FEATURES,
    also: 'the LISTING.md Description ("Dark, light or automatic theme.") in every locale, the review Notes (step 4: "theme"), and the Google Play description. The screenshots are all in the default dark theme.',
  },
  screenshotsPerLocale: {
    verify: same(() => {
      const sets = Object.keys(SCREENSHOT_SETS).map((dir) => ({ dir, locales: screenshotsIn(dir) }));
      const counts = [...new Set(sets.flatMap((s) => s.locales.map((l) => l.files.length)))];
      const sameFiles = sets.every((s) => isDeepStrictEqual(s.locales, sets[0].locales));
      // every entered localization has its set (es-ES would use the es-MX one: the app has one Spanish)
      const uploaded = screenshotsIn('store/app-store/screenshots-6.3').map((l) => l.locale);
      const enteredWithoutScreenshots = localizations.filter((l) => !uploaded.includes(l) && !(l === 'es-ES' && uploaded.includes('es-MX')));
      if (enteredWithoutScreenshots.length) return { now: { enteredWithoutScreenshots }, evidence: 'store/app-store/screenshots-6.3/<locale>/ for every entered localization' };
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
  { file: LISTING, quote: 'Sin cuenta y sin rachas', while: NO_ACCOUNT, where: 'es-MX Promotional text, draft' },
  { file: LISTING, quote: 'Sin cuenta ni rachas', while: NO_ACCOUNT, where: 'es-ES Promotional text, draft' },
  { file: LISTING, quote: 'No account, no streaks', while: NO_ACCOUNT, where: 'en-US Promotional text' },
  { file: LISTING, quote: 'Sin cuenta ni registro', while: NO_ACCOUNT, where: 'es-MX and es-ES Description, drafts' },
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
  { file: LISTING, quote: '8. Tus datos viven en tu dispositivo', while: ON_DEVICE, where: 'es-MX caption 8, draft' },
  { file: LISTING, quote: '8. Tus datos se quedan en tu móvil', while: ON_DEVICE, where: 'es-ES caption 8, draft' },
  { file: LISTING, quote: '8. Your data lives on your device', while: ON_DEVICE, where: 'en-US caption 8' },
  { file: LISTING, quote: 'TUS DATOS, EN TU TELÉFONO', while: ON_DEVICE, where: 'es-MX Description, draft' },
  { file: LISTING, quote: 'TUS DATOS, EN TU MÓVIL', while: ON_DEVICE, where: 'es-ES Description, draft' },
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
// What the listing says the app does: every feature line and every number, from the declarations above
// ---------------------------------------------------------------------------------------------------------

/** The ```text block under "### <field>" in the "## <locale> · …" section of LISTING.md ('' when there is none). */
function listingBlock(locale: string, field: string): string {
  const section = listingMd.split(/^## /m).find((s) => s.startsWith(`${locale} · `)) ?? '';
  const at = section.search(new RegExp(`^### ${field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: \\(max [^)]*\\))?$`, 'm'));
  return at < 0 ? '' : (/```text\n([\s\S]*?)\n```/.exec(section.slice(at))?.[1] ?? '');
}
const sectionState = (locale: string) => {
  const s = listingSections.find((x) => x.locale === locale);
  return !s ? 'no section' : s.draft ? 'draft, not entered' : `entered ${s.enteredOn}`;
};
const [supportEs = '', supportEn = ''] = read('docs/support.html').split('<hr id="en">');

/** The texts that make the claims: the listing blocks pasted (or ready to paste) into App Store Connect and the Support URL page. */
type Where = 'enPromo' | 'enDescription' | 'mxPromo' | 'mxDescription' | 'esPromo' | 'esDescription' | 'notes' | 'supportEs' | 'supportEn';
const TEXTS: Record<Where, { text: string; place: string }> = {
  enPromo: { text: listingBlock('en-US', 'Promotional text'), place: `LISTING.md → en-US → Promotional text (${sectionState('en-US')})` },
  enDescription: { text: listingBlock('en-US', 'Description'), place: `LISTING.md → en-US → Description (${sectionState('en-US')})` },
  mxPromo: { text: listingBlock('es-MX', 'Promotional text'), place: `LISTING.md → es-MX → Promotional text (${sectionState('es-MX')})` },
  mxDescription: { text: listingBlock('es-MX', 'Description'), place: `LISTING.md → es-MX → Description (${sectionState('es-MX')})` },
  esPromo: { text: listingBlock('es-ES', 'Promotional text'), place: `LISTING.md → es-ES → Promotional text (${sectionState('es-ES')})` },
  esDescription: { text: listingBlock('es-ES', 'Description'), place: `LISTING.md → es-ES → Description (${sectionState('es-ES')})` },
  notes: { text: reviewNotes, place: 'LISTING.md → App Review information → Notes (App Review Information → Notes)' },
  supportEs: { text: supportEs, place: 'docs/support.html, Spanish half' },
  supportEn: { text: supportEn, place: 'docs/support.html, English half (#en, the Support URL entered in App Store Connect)' },
};

interface Statement {
  /** The declaration (key of app-store-declarations.json) that makes the phrases true. */
  claim: string;
  holds: boolean;
  phrases: [Where, string][];
}
const has =(xs: readonly string[], ...wanted: string[]) => wanted.every((w) => xs.includes(w));
const andList = (xs: string[], and: string) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} ${and} ${xs.at(-1)}` : (xs[0] ?? ''));
const cycleExample = (lang: Lang) => localizedCycleSteps(lang).map((s) => s.label.toLowerCase()).join(' · ');

/**
 * Every line of the listing that says what the app does, with the declaration that makes it true. The numbers
 * are written from the declarations, which the checks above derive from the code, so a business-rule change
 * fails twice: first the declaration (with the App Store Connect fields to change), then these lines until
 * they are rewritten. A line whose declaration stops holding must go.
 */
function STATEMENTS(d: typeof record.declarations): Statement[] {
  const n = d.activeActivityLimit;
  const shortcutsEn = d.durationShortcuts.map((label) => label.replace(/^(\d+) (\w+?)s?$/, '$1-$2'));
  const shortcutsEs = durationChips.map((c) => ui('es', c.key));
  const word = (k: 'en' | 'es') => (d.deleteAllConfirmWord as Record<string, string>)[k];
  const consistencyRule = d.consistency.minimumCountsAsDone && !d.consistency.offDaysCount && !d.consistency.todayPendingCounts;
  return [
    {
      claim: `activeActivityLimit (${n})`,
      holds: true,
      phrases: [
        ['enDescription', `Up to ${n} active activities at a time`],
        ['mxDescription', `Hasta ${n} actividades activas a la vez`],
        ['esDescription', `Hasta ${n} actividades activas a la vez`],
        ['notes', `The app allows up to ${n} active activities at a time`],
        ['notes', `With ${n} active activities, opening the editor for a new one shows a message`],
        ['supportEs', `Hasta ${n} activas`],
        ['supportEn', `Up to ${n} active`],
      ],
    },
    {
      claim: `everyNMin and everyNMax (${d.everyNMin} to ${d.everyNMax})`,
      holds: true,
      phrases: [
        ['enDescription', `every N days, from ${d.everyNMin} to ${d.everyNMax}`],
        ['mxDescription', `cada N días, de ${d.everyNMin} a ${d.everyNMax}`],
        ['esDescription', `cada N días, de ${d.everyNMin} a ${d.everyNMax}`],
      ],
    },
    { claim: `patternsAfterScheduledDays (${d.patternsAfterScheduledDays})`, holds: true, phrases: [['notes', `patterns appear after ${d.patternsAfterScheduledDays} scheduled days`]] },
    {
      claim: `trendWeeks (${d.trendWeeks}) and trendAfterWeeks (${d.trendAfterWeeks})`,
      holds: true,
      phrases: [
        ['enDescription', `the trend over the last ${d.trendWeeks} weeks`],
        ['mxDescription', `la tendencia de las últimas ${d.trendWeeks} semanas`],
        ['esDescription', `la tendencia de las últimas ${d.trendWeeks} semanas`],
        ['notes', `the ${d.trendWeeks}-week trend after ${NUMBER_WORDS[d.trendAfterWeeks] ?? d.trendAfterWeeks} weeks of logs`],
      ],
    },
    {
      claim: `durationShortcuts (${d.durationShortcuts.join(', ')})`,
      holds: d.durationShortcuts.length > 0,
      phrases: [
        ['enDescription', `with ${andList(shortcutsEn, 'and')} shortcuts`],
        ['mxDescription', `con atajos de ${andList(shortcutsEs, 'o')}`],
        ['esDescription', `con atajos de ${andList(shortcutsEs, 'o')}`],
      ],
    },
    { claim: `defaultReminderTime (${d.defaultReminderTime})`, holds: d.defaultReminderTime !== null, phrases: [['notes', `new activities have one at ${d.defaultReminderTime} by default`]] },
    {
      claim: `deleteAllConfirmWord (${word('en')} / ${word('es')})`,
      holds: !!word('en') && !!word('es'),
      phrases: [
        ['enDescription', 'Delete all your data from Settings whenever you like'],
        ['mxDescription', 'Borra todos tus datos cuando quieras desde Ajustes'],
        ['esDescription', 'Borra todos tus datos cuando quieras desde Ajustes'],
        ['notes', `"${ui('en', 'settings.deleteAll')}" (asks to type ${word('en')}, or ${word('es')} in Spanish)`],
      ],
    },
    { claim: 'frequencyTypes has "daily"', holds: d.frequencyTypes.includes('daily'), phrases: [['enDescription', '• Every day'], ['mxDescription', '• Todos los días'], ['esDescription', '• Todos los días']] },
    {
      claim: 'frequencyTypes has "everyN"',
      holds: d.frequencyTypes.includes('everyN'),
      phrases: [
        ['enDescription', 'every other day, or every N days'],
        ['mxDescription', 'día por medio o cada N días'],
        ['esDescription', 'en días alternos o cada N días'],
        ['enPromo', 'Train every other day'],
        ['notes', `"${ui('en', 'firstActivity.train')}"`],
      ],
    },
    {
      claim: 'frequencyTypes has "weekdays"',
      holds: d.frequencyTypes.includes('weekdays'),
      phrases: [['enDescription', 'Fixed weekdays, like Monday, Wednesday and Friday'], ['mxDescription', 'Días fijos de la semana, como lunes, miércoles y viernes'], ['esDescription', 'Días fijos de la semana, como lunes, miércoles y viernes'], ['enPromo', 'physio M-W-F']],
    },
    {
      claim: 'frequencyTypes has "perWeek"',
      holds: d.frequencyTypes.includes('perWeek'),
      phrases: [['enDescription', 'A number of times a week, and you pick the days'], ['mxDescription', 'Un número de veces por semana, y tú eliges qué días'], ['esDescription', 'Un número de veces por semana, y tú eliges qué días']],
    },
    {
      claim: 'frequencyTypes has "cycle" (the example is the localized Push / Pull / Legs / Rest preset)',
      holds: d.frequencyTypes.includes('cycle'),
      phrases: [['enDescription', `Cycles with rest days, like ${cycleExample('en')}`], ['mxDescription', `Ciclos con días de descanso, como ${cycleExample('es')}`], ['esDescription', 'Ciclos con días de descanso']],
    },
    {
      claim: 'missedDayOptions ("calendar" and "relative")',
      holds: has(d.missedDayOptions, 'calendar', 'relative'),
      phrases: [['enDescription', 'the activity follows the calendar or counts from the last time'], ['mxDescription', 'la actividad sigue el calendario o cuenta desde la última vez'], ['esDescription', 'la actividad sigue el calendario o cuenta desde la última vez']],
    },
    {
      claim: 'logTypes ("check", "minutes" and "amount")',
      holds: has(d.logTypes, 'check', 'minutes', 'amount'),
      phrases: [['enDescription', 'Just a check, or log minutes or an amount'], ['mxDescription', 'Solo marca, o anota minutos o una cantidad'], ['esDescription', 'Solo marcar, o apuntar minutos o una cantidad']],
    },
    {
      claim: 'minimumVersion',
      holds: d.minimumVersion,
      phrases: [['enDescription', 'Every activity can have a minimum version'], ['mxDescription', 'Cada actividad puede tener una versión mínima'], ['esDescription', 'Cada actividad puede tener una versión mínima']],
    },
    {
      claim: 'consistency.minimumCountsAsDone',
      holds: d.consistency.minimumCountsAsDone,
      phrases: [['enDescription', 'The minimum counts as done and never breaks your consistency'], ['mxDescription', 'La mínima cuenta como cumplida y no rompe tu constancia'], ['esDescription', 'La mínima cuenta como cumplida y no rompe tu constancia']],
    },
    {
      claim: 'consistency (minimum counts, off days and today pending do not)',
      holds: consistencyRule,
      phrases: [
        ['enDescription', "Consistency is measured over the days that were due: the minimum counts, off days never hurt, and today doesn't count while it's pending"],
        ['mxDescription', 'La constancia se mide sobre los días que tocaban: la mínima cuenta, los días que no tocan no restan y lo de hoy no cuenta mientras esté pendiente'],
        ['esDescription', 'La constancia se mide sobre los días que tocaban: la mínima cuenta, los días que no tocan no restan y lo de hoy no cuenta mientras esté pendiente'],
        ['notes', 'Stats shows consistency over scheduled days only'],
      ],
    },
    {
      claim: 'todayGestures (tap done, long-press minimum, swipe left skip)',
      holds: isDeepStrictEqual(d.todayGestures, { tap: 'done', longPress: 'min', swipeLeft: 'skip' }),
      phrases: [
        ['enDescription', 'Tap the circle to complete, long-press for the minimum, or swipe left to skip'],
        ['mxDescription', 'Toca el círculo para completar, mantén presionado para la mínima o desliza para omitir'],
        ['esDescription', 'Toca el círculo para completar, mantenlo pulsado para la mínima o desliza para omitir'],
        ['notes', 'tap the circle to mark an activity done, long-press it to log the minimum version, or swipe the row left to skip it'],
      ],
    },
    {
      claim: 'skipWithOptionalReason',
      holds: d.skipWithOptionalReason,
      phrases: [['enDescription', 'Skip it, with an optional reason'], ['mxDescription', 'omítela con un motivo opcional'], ['esDescription', 'omítela con un motivo opcional'], ['notes', 'skip it with an optional reason']],
    },
    {
      claim: 'reminders.onlyOnDueDays',
      holds: d.reminders.onlyOnDueDays,
      phrases: [['enDescription', "One heads-up per activity, only on the days it's due"], ['mxDescription', 'Un aviso por actividad y solo los días que toca'], ['esDescription', 'Un aviso por actividad y solo los días que toca'], ['notes', 'Notifications arrive only on the days an activity is due']],
    },
    {
      claim: 'reminders.morningSummary',
      holds: d.reminders.morningSummary,
      phrases: [['enDescription', "The morning summary folds today's list into a single notification"], ['mxDescription', 'El resumen matinal junta en una sola notificación lo que toca hoy'], ['esDescription', 'El resumen matinal reúne en una sola notificación lo que toca hoy']],
    },
    {
      claim: 'reminders.notificationActions ("done" and "min")',
      holds: has(d.reminders.notificationActions, 'done', 'min'),
      phrases: [['enDescription', "From an activity's notification you can mark it done or minimum without opening the app"], ['mxDescription', 'Desde el aviso de una actividad puedes marcarla como hecha o mínima sin abrir la app'], ['esDescription', 'Desde el aviso de una actividad puedes marcarla como hecha o mínima sin abrir la app']],
    },
    {
      claim: 'exportFormats ("csv" and "json")',
      holds: has(d.exportFormats, 'csv', 'json'),
      phrases: [
        ['enDescription', 'Export to CSV, which opens in Excel or Sheets, or save a JSON backup'],
        ['mxDescription', 'Exporta a CSV, que se abre en Excel o Sheets, o guarda un respaldo JSON'],
        ['esDescription', 'Exporta a CSV, que se abre en Excel o Sheets, o guarda una copia de seguridad en JSON'],
        ['notes', `"${ui('en', 'settings.exportCsv')}" and "${ui('en', 'settings.backupExport')}" through the share sheet, "${ui('en', 'settings.backupImport')}" from Files`],
      ],
    },
    {
      claim: 'themes ("dark", "light" and "auto")',
      holds: isDeepStrictEqual(d.themes, ['dark', 'light', 'auto']),
      phrases: [['enDescription', 'Dark, light or automatic theme.'], ['mxDescription', 'Tema oscuro, claro o automático.'], ['esDescription', 'Tema oscuro, claro o automático.'], ['notes', '(ES/EN), theme,']],
    },
    {
      claim: 'uiLanguages ("en" and "es")',
      holds: isDeepStrictEqual(sorted(d.uiLanguages), ['en', 'es']),
      phrases: [['enDescription', 'English and Spanish.'], ['mxDescription', 'En español e inglés.'], ['esDescription', 'En español e inglés.'], ['notes', 'language (ES/EN)']],
    },
    { claim: 'supportsTablet is false', holds: d.supportsTablet === false, phrases: [['notes', 'routine tracker for iPhone'], ['notes', 'The app is for iPhone; on iPad it runs in iPhone compatibility mode.']] },
    { claim: 'pushNotifications is false', holds: d.pushNotifications === false, phrases: [['notes', 'reminders (local notifications only)']] },
    { claim: 'permissions has "notifications"', holds: d.permissions.includes('notifications'), phrases: [['notes', 'the notification permission is requested after a short explanation']] },
    { claim: 'inAppPurchases and containsAds are false', holds: !d.inAppPurchases && !d.containsAds, phrases: [['notes', 'This version has no in-app purchases, no subscriptions and no ads']] },
    { claim: 'readsHealthData is false', holds: !d.readsHealthData, phrases: [['notes', 'reads no health data (no HealthKit)']] },
    {
      claim: 'the "Free day" screen of Today (today.freeDay)',
      holds: todayScreen.includes("t('today.freeDay')"),
      phrases: [['enDescription', `Nothing due today? ${ui('en', 'today.freeDay')}.`], ['mxDescription', `¿Hoy no toca nada? ${ui('es', 'today.freeDay')}.`], ['esDescription', `¿Hoy no toca nada? ${ui('es', 'today.freeDay')}.`]],
    },
    {
      claim: `supportEmail (${d.supportEmail})`,
      holds: true,
      phrases: [['enDescription', `Write to ${d.supportEmail}.`], ['mxDescription', `Escríbenos a ${d.supportEmail}.`], ['esDescription', `Escríbenos a ${d.supportEmail}.`], ['notes', `opens Mail to ${d.supportEmail}`], ['notes', `Support: ${d.supportEmail}`]],
    },
  ];
}

/**
 * Numbers in the entered texts that are examples of what a user can set up, not rules of the app. Each one
 * must still be possible in the build.
 */
const EXAMPLES: { phrases: string[]; possible: boolean; as: string }[] = [
  { phrases: ['read 3 times a week', 'leer 3 veces por semana', 'lees 3 veces por semana'], possible: validateRule({ ...defaultRule(), type: 'perWeek', times: 3 }).length === 0, as: 'a "times a week" rule with times: 3 (validateRule)' },
  { phrases: ['every 4 days', 'cada 4 días'], possible: everyNValid(4), as: 'an "every N days" rule with n: 4 (validateRule)' },
  {
    phrases: ['run 5 km on a normal day, walk 10 minutes on a bad one', 'correr 5 km un día normal, caminar 10 minutos un día malo'],
    possible: record.declarations.minimumVersion && record.declarations.logTypes.includes('amount'),
    as: 'an amount activity (km) with a minimum version',
  },
];
/** Words that are numbers ("one" is left out: "one heads-up", "one grid"). */
const NUMBER = /\d|\b(?:zero|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty|hundred)\b/i;
/** The review notes quote the app's English labels in double quotes; these quotes are not labels. */
const NOT_A_LABEL = ['+'];
const flat = (o: unknown): string[] => (typeof o === 'string' ? [o] : o && typeof o === 'object' ? Object.values(o).flatMap(flat) : []);
const EN_STRINGS = new Set(flat(JSON.parse(read('src/i18n/en.json'))));

describe('App Store declarations: what the listing says the app does', () => {
  it('says in LISTING.md and on the support page what the code does, with the numbers the code uses', () => {
    const problems = STATEMENTS(record.declarations).flatMap(({ claim, holds, phrases }) =>
      phrases.flatMap(([where, phrase]) => {
        const { text, place } = TEXTS[where];
        const found = text.includes(phrase);
        if (holds && !found) return [`${place} no longer says "${phrase}" (${claim})`];
        if (!holds && found) return [`${place} still says "${phrase}", but ${claim} no longer holds`];
        return [];
      }),
    );
    expect(
      problems,
      `LISTING.md and docs/support.html no longer say what the build does. Rewrite the line (or, if it was only reworded, its phrase in STATEMENTS); for an entered localization paste it again in App Store Connect (Description and Notes with the next version, Promotional text at any time) and record it in ${RECORD} the same day; a draft only changes in LISTING.md.`,
    ).toEqual([]);
  });

  it('derives from the code every number the entered texts and the review notes quote', () => {
    const phrases = STATEMENTS(record.declarations)
      .filter((s) => s.holds)
      .flatMap((s) => s.phrases.map(([, phrase]) => phrase));
    const known = [...phrases, ...EXAMPLES.flatMap((e) => e.phrases)];
    const entered = listingSections.filter((s) => !s.draft).map((s) => s.locale);
    const texts = [
      ...entered.flatMap((locale) => ['Name', 'Subtitle', 'Promotional text', 'Description', 'Keywords'].map((field) => ({ place: `LISTING.md → ${locale} → ${field}`, text: listingBlock(locale, field) }))),
      { place: TEXTS.notes.place, text: reviewNotes.replace(/^\d+\. /gm, '') },
    ];
    const unexplained = texts.flatMap(({ place, text }) => {
      // blank out every occurrence of a known phrase (they may overlap), then look for numbers left over
      const covered = new Array<boolean>(text.length).fill(false);
      for (const phrase of known) for (let i = text.indexOf(phrase); i >= 0; i = text.indexOf(phrase, i + 1)) covered.fill(true, i, i + phrase.length);
      const rest = text
        .split('')
        .map((ch, i) => (covered[i] ? ' ' : ch))
        .join('');
      return rest
        .split(/(?<=[.:;!?])\s+|\n/)
        .filter((sentence) => NUMBER.test(sentence))
        .map((sentence) => `${place}: "${sentence.trim()}"`);
    });
    expect(unexplained, 'numbers that no declaration derives from the code: add the line to STATEMENTS with the declaration (and code check) that makes it true, or to EXAMPLES if it is only an example').toEqual([]);
    expect(EXAMPLES.filter((e) => !e.possible).map((e) => `"${e.phrases[0]}" is no longer possible: ${e.as}`), 'examples in the listing the build can no longer do').toEqual([]);
    // every example is still in a text, so a stale one does not silently excuse a number
    const allTexts = [...Object.values(TEXTS).map((x) => x.text), ...texts.map((x) => x.text)].join('\n');
    expect(EXAMPLES.flatMap((e) => e.phrases).filter((phrase) => !allTexts.includes(phrase)), 'EXAMPLES no text quotes any more: drop them').toEqual([]);
    expect(entered.length, 'no LISTING.md section is entered').toBeGreaterThan(0);
  });

  it('quotes in the review notes only labels the app shows in English', () => {
    const quoted = [...reviewNotes.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(quoted.length).toBeGreaterThan(0);
    expect(
      quoted.filter((q) => !NOT_A_LABEL.includes(q) && !EN_STRINGS.has(q)),
      'App Review Information → Notes quote labels that src/i18n/en.json no longer has: fix the notes in LISTING.md, paste them again in App Store Connect and record it',
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------
// What the listing says and build 1.0.0 (1) does not do: "Fallos conocidos" of the record
// ---------------------------------------------------------------------------------------------------------

/** Rows of a "| N | … |" table in a section of the record, by their number. */
function numberedRows(heading: string, next: string): Map<number, string> {
  const section = recordMd.slice(recordMd.indexOf(heading), recordMd.indexOf(next));
  return new Map((tables(section)[0]?.rows ?? []).filter((row) => /^\d+$/.test(row[0])).map((row) => [Number(row[0]), row.join(' | ')]));
}
/** Today lists dueToday(…) as it comes, so its order is the order dueToday gives. */
const todayListsDueToday = /const due = useMemo\(\s*\(\) => dueToday\(activities, today, L\),/.test(todayScreen) && todayScreen.includes('data={due}');
/** dueToday with a done activity before a pending one: does the pending one come first? */
const pendingFirstInDueToday = (() => {
  const [done, pending] = [fixture('done', { type: 'daily' }), fixture('pending', { type: 'daily' })];
  const L: LogLookup = (id, d) => (id === 'done' && d === STATS_TODAY ? 'done' : null);
  return dueToday([done, pending], STATS_TODAY, L)[0]?.id === 'pending';
})();
/** A "3 times a week" activity done every Monday, Wednesday and Friday: October 2026 starts on a Thursday. */
const perWeekFullAtMonthStart = (() => {
  const a = fixture('w', { type: 'perWeek', times: 3 } as Partial<FrequencyRule>);
  const L: LogLookup = (_, d) => ([1, 3, 5].includes(weekday(d)) ? 'done' : null);
  return consistency(a, '2026-10-01', '2026-10-31', '2026-11-01', L).pct === 100;
})();

/**
 * Lines of the listing that build 1.0.0 (1) does not make true, each one a numbered row of "Fallos conocidos" in
 * the record (the drafts too, for the bug that only shows in Spanish). They stay in App Store Connect until the next
 * version, so they cannot simply be fixed in LISTING.md. The line must still be in its text and its row must quote
 * it; `holdsNow` is derived from the code where a check can tell (null: only on a device), and once it is true the
 * row moves to the history and the entry goes.
 */
function KNOWN_ISSUES(d: typeof record.declarations): { fallo: number; where: Where; phrase: string; holdsNow: boolean | null; check: string }[] {
  const shown = d.weekdayPatternShownAfterDays;
  return [
    { fallo: 1, where: 'enDescription', phrase: 'Tap a past cell to edit the past, no drama.', holdsNow: null, check: 'tap targets of the Month grid (src/ui/month/MonthGrid.tsx), only on a device' },
    { fallo: 1, where: 'notes', phrase: 'tap a past cell to change it', holdsNow: null, check: 'tap targets of the Month grid, only on a device' },
    { fallo: 2, where: 'mxDescription', phrase: 'Ciclos con días de descanso, como empuje · jalón · pierna · descanso', holdsNow: null, check: 'the steps a new cycle starts with in the Spanish editor (DEFAULT_CYCLE_STEPS in src/engine/presets.ts), only on a device' },
    { fallo: 3, where: 'enDescription', phrase: "While you set it up, the month shows which days it's due.", holdsNow: null, check: 'previewSummary in src/ui/editor/editorModel.ts, which does not read the logs' },
    { fallo: 4, where: 'enDescription', phrase: "Stats shows the month's consistency and each activity's", holdsNow: perWeekFullAtMonthStart, check: 'consistency() of a 3-times-a-week activity done every week, over a month that starts on a Thursday, must be 100%' },
    { fallo: 5, where: 'enDescription', phrase: 'Pending first.', holdsNow: !todayListsDueToday || pendingFirstInDueToday, check: todayListsDueToday ? 'dueToday in src/engine/rules.ts keeps the order the activities were created in' : 'app/(tabs)/index.tsx no longer lists dueToday(…) as it comes: check the order and update this entry' },
    { fallo: 6, where: 'notes', phrase: `patterns appear after ${d.patternsAfterScheduledDays} scheduled days`, holdsNow: shown.best <= d.patternsAfterScheduledDays && shown.worst <= d.patternsAfterScheduledDays, check: `weekdayPatternShownAfterDays: Stats names the best weekday after ${shown.best} due days and the day you miss most after ${shown.worst}` },
    { fallo: 7, where: 'notes', phrase: `after ${NUMBER_WORDS[d.trendAfterWeeks] ?? d.trendAfterWeeks} weeks of logs`, holdsNow: !weeklyTrend([dailySince(21)], STATS_TODAY, NO_LOGS).enough, check: 'weeklyTrend shows the trend with no logs at all, once two weeks have a due day' },
  ];
}

describe('App Store declarations: what build 1.0.0 (1) does not do', () => {
  it(`lists in "Fallos conocidos" of ${RECORD} every line of the listing the build does not make true, until the code does`, () => {
    const rows = numberedRows('## Fallos conocidos', '## Historial');
    const issues = KNOWN_ISSUES(record.declarations);
    const problems = issues.flatMap(({ fallo, where, phrase, holdsNow, check }) => {
      const { text, place } = TEXTS[where];
      const row = rows.get(fallo);
      return [
        ...(text.includes(phrase) ? [] : [`${place} no longer says "${phrase}": if the line was reworded or removed (in App Store Connect too), drop it from KNOWN_ISSUES and update fallo ${fallo} of "Fallos conocidos"`]),
        ...(!row ? [`"Fallos conocidos" has no row ${fallo}`] : row.includes(`"${phrase}"`) ? [] : [`row ${fallo} of "Fallos conocidos" does not quote "${phrase}"`]),
        ...(holdsNow === true ? [`fallo ${fallo}: the code now makes "${phrase}" true (${check}). Move its row of "Fallos conocidos" to the history, with the build that ships the fix, and drop it from KNOWN_ISSUES`] : []),
      ];
    });
    const listed = new Set(issues.map((i) => i.fallo));
    problems.push(...[...rows.keys()].filter((n) => !listed.has(n)).map((n) => `row ${n} of "Fallos conocidos" has no line in KNOWN_ISSUES (the listing line it makes untrue)`));
    expect(rows.size, `${RECORD} has no numbered "Fallos conocidos" table`).toBeGreaterThan(0);
    expect(problems, `"Fallos conocidos" of ${RECORD} and the listing disagree`).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The record itself
// ---------------------------------------------------------------------------------------------------------

/** Every file in this public repo that talks about the store accounts. */
const PUBLIC_FILES = [RECORD, JSON_FILE, LISTING, PLAY_RECORD, 'store/app-store/screenshots/README.md', 'docs/RELEASE-IOS.md', 'docs/privacy.html', 'docs/support.html', 'README.md', 'CLAUDE.md', 'AGENTS.md'];
/** MORDOBO TECHNOLOGIES LLC's Team ID: public (it signs every binary) and quoted in LISTING.md and RELEASE-IOS.md. */
const PUBLIC_APPLE_IDS = ['CTC5PRH3D3'];

/** A build as App Store Connect shows it, "version (number)": "1.0.0 (1)" (TraceCosts lesson, 2026-10-21). */
const BUILD = /^(\d+\.\d+\.\d+) \((\d+)\)$/;
/** < 0, 0 or > 0, comparing "x.y.z" by number. */
function compareVersions(a: string, b: string): number {
  const [pa, pb] = [a.split('.').map(Number), b.split('.').map(Number)];
  return pa.map((n, i) => n - pb[i]).find((diff) => diff !== 0) ?? 0;
}
/** Builds "x.y.z (n)" in order: by version, then by number. */
function compareBuilds(a: string, b: string): number {
  const [, va = '0.0.0', na = '0'] = BUILD.exec(a) ?? [];
  const [, vb = '0.0.0', nb = '0'] = BUILD.exec(b) ?? [];
  return compareVersions(va, vb) || Number(na) - Number(nb);
}
/** What the Estado column of the record may say. */
const STATUS_CELL = /^(?:pendiente de introducir|no aplica|\(verificar\)|activo en la cuenta|introducido (\d{4}-\d{2}-\d{2}) · build (\d+\.\d+\.\d+ \(\d+\)))/;
/** App Store Connect's name for each locale, as the record writes it. */
const ASC_LANGUAGE_NAMES: Record<string, string> = { 'en-US': 'Inglés (EE. UU.)', 'es-MX': 'Español (México)', 'es-ES': 'Español (España)' };

/** The Markdown tables of a text: header and rows, split on "|" but not on an escaped "\|". */
function tables(md: string): { header: string[]; rows: string[][] }[] {
  const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).map((c) => c.trim());
  const lines = md.split('\n');
  const out: { header: string[]; rows: string[][] }[] = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].startsWith('|') || !/^\|\s*:?-{3,}/.test(lines[i + 1])) continue;
    const table = { header: cells(lines[i]), rows: [] as string[][] };
    for (i += 2; i < lines.length && lines[i].startsWith('|'); i++) table.rows.push(cells(lines[i]));
    out.push(table);
  }
  return out;
}
/** §1–§11 of the record: what is (or is not) in App Store Connect, before "Qué depende de qué". */
const recordFields = recordMd.slice(recordMd.indexOf('\n## 1. '), recordMd.indexOf('\n## Qué depende de qué'));
const statusTables = tables(recordFields).filter((tb) => tb.header[tb.header.length - 1] === 'Estado');
const statusCells = statusTables.flatMap((tb) => tb.rows.map((row) => row[row.length - 1]));
const statusRows = statusTables.flatMap((tb) => tb.rows);

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
    expect(statusTables.length, `${RECORD} §1–§11 has no table that ends in an "Estado" column`).toBeGreaterThan(0);
    expect(
      statusCells.filter((cell) => !STATUS_CELL.test(cell)),
      `Estado cells of ${RECORD} start with "pendiente de introducir", "no aplica", "(verificar)", "activo en la cuenta" (§1) or "introducido AAAA-MM-DD · build <version> (<number>)"`,
    ).toEqual([]);
    const enteredCells = statusCells.map((cell) => STATUS_CELL.exec(cell)).filter((m): m is RegExpExecArray => !!m?.[1]);
    const entered = enteredCells.map((m) => m[1]).sort();
    const pending = statusCells.filter((cell) => cell.startsWith('pendiente de introducir')).length;
    expect(recordMd.match(/\|\s*introducido \d{4}/g)?.length ?? 0, `every "introducido" of ${RECORD} is in the Estado column of a table in §1–§11`).toBe(entered.length);
    if (status === 'pendiente de introducir') {
      expect(entered, `fields marked "introducido" in ${RECORD} while record.status is "pendiente de introducir"`).toEqual([]);
      expect(enteredOn, 'record.enteredOn must be null while nothing is entered').toBeNull();
      expect(build, 'record.build must be null while nothing is entered').toBeNull();
      expect(pending, `${RECORD} has no field "pendiente de introducir"`).toBeGreaterThan(0);
    } else {
      expect(entered.length, `record.status is "${status}" but no field in ${RECORD} is marked "introducido AAAA-MM-DD"`).toBeGreaterThan(0);
      expect(enteredOn, 'record.enteredOn is the date of the first entry in the record').toBe(entered[0]);
      // "version (number)" as App Store Connect shows it, of this version or an earlier one, and the latest one entered
      expect(build, `record.build in ${JSON_FILE} is "version (number)", e.g. "1.0.0 (1)"`).toMatch(BUILD);
      const [, buildVersion = '', buildNumber = '0'] = BUILD.exec(build ?? '') ?? [];
      expect(Number(buildNumber), 'record.build: build numbers start at 1').toBeGreaterThan(0);
      expect(compareVersions(buildVersion, record.declarations.version), `record.build "${build}" is of a later version than "version" (${record.declarations.version}, app.json)`).toBeLessThanOrEqual(0);
      const builds = [...new Set(enteredCells.map((m) => m[2]))].sort(compareBuilds);
      expect(builds.at(-1), `record.build must be the latest build named by the "introducido … · build …" cells of ${RECORD}`).toBe(build);
      expect(recordMd, `${RECORD} must say "**Build**: ${build}" at the top`).toContain(`**Build**: ${build}`);
      if (status === 'introducido') expect(pending, `record.status is "introducido" but fields in ${RECORD} are still "pendiente de introducir"`).toBe(0);
      else expect(pending, `record.status is "parcialmente introducido" but nothing in ${RECORD} is pending: set it to "introducido"`).toBeGreaterThan(0);
    }
    const history = recordMd.slice(recordMd.indexOf('## Historial'));
    expect([...new Set(entered)].filter((date) => !history.includes(`| ${date} |`)), `every entry date needs its line in the Historial of ${RECORD}`).toEqual([]);
    expect(entered.filter((date) => date > updatedOn), `record.updatedOn in ${JSON_FILE} is older than an entry`).toEqual([]);
  });

  it('writes the same values as the JSON: Apple ID, version, build, language, localizations, URLs, age rating, sign-in', () => {
    const d = record.declarations;
    const { build, pending = [] } = record.record as { build: string | null; pending?: string[] };
    const problems: string[] = [];
    /** Every row of §1–§11 labelled `label` says `text` (and there is at least one). The label is the first cell, or the second in §4, whose first column is the step ("| 3 | Calculated rating | …"). */
    const expectRow = (label: string, text: string, key: string) => {
      const rows = statusRows.filter((row) => row[0] === label || (/^\d+$/.test(row[0]) && row[1] === label)).map((row) => row.join(' | '));
      if (!rows.length) problems.push(`no row "| ${label} |" in §1–§11 (for "${key}")`);
      else if (!rows.every((row) => row.includes(text))) problems.push(`the row "| ${label} |" does not say ${text} ("${key}")`);
    };

    // Apple ID: the row names it once known; until then it is "(verificar)" and record.pending says how to get it
    const appleIdPending = pending.some((p) => p.startsWith('appleId:'));
    if (typeof d.appleId === 'string') {
      expectRow('Apple ID', `\`${d.appleId}\` (\`appleId\`)`, 'appleId');
      if (appleIdPending) problems.push('appleId is set: drop its line from record.pending');
    } else {
      expectRow('Apple ID', '(`appleId`)', 'appleId');
      if (!appleIdPending) problems.push(`appleId is null: record.pending in ${JSON_FILE} must say how Angelo gets it ("appleId: …")`);
    }
    // every pending item is "(verificar)" in the row of §1–§11 that names it
    for (const item of pending) {
      const key = item.split(':')[0];
      const rows = statusRows.filter((row) => row.some((cell) => cell.includes(`\`${key}\``)));
      if (!rows.length || !rows.every((row) => row[row.length - 1].startsWith('(verificar)'))) problems.push(`record.pending lists "${key}": a row of §1–§11 names \`${key}\` and its Estado starts with "(verificar)"`);
    }
    // and the other way round: every field of this app still "(verificar)" in §2–§11 is a line of record.pending
    // (the account-level checks of §1 and Google Play are only in "Pendiente de verificar")
    const pendingKeys = pending.map((item) => item.split(':')[0]);
    const appFields = recordMd.slice(recordMd.indexOf('\n## 2. '), recordMd.indexOf('\n## Qué depende de qué'));
    for (const row of tables(appFields).filter((tb) => tb.header[tb.header.length - 1] === 'Estado').flatMap((tb) => tb.rows)) {
      if (row[row.length - 1].startsWith('(verificar)') && !pendingKeys.some((key) => row.some((cell) => cell.includes(`\`${key}\``)))) {
        problems.push(`the row "| ${row.slice(0, /^\d+$/.test(row[0]) ? 2 : 1).join(' | ')} |" of §2–§11 is "(verificar)" but names no key of record.pending: add a line "<key>: …" to record.pending in ${JSON_FILE} and name \`<key>\` in that row`);
      }
    }
    expectRow('Número de versión', `\`${d.version}\` (\`version\`)`, 'version');
    if (build) expectRow('Build', `**${build}**`, 'build');
    const language = ASC_LANGUAGE_NAMES[d.primaryLanguage];
    if (!language) problems.push(`primaryLanguage "${d.primaryLanguage}" has no name in ASC_LANGUAGE_NAMES`);
    else expectRow('Idioma principal', `${language} (\`primaryLanguage\`)`, 'primaryLanguage');
    // §3 "Información localizable": the entered rows are the entered localizations; a draft is "no aplica"
    const localizable = statusTables.find((tb) => tb.header[0] === 'Localización');
    if (!localizable) problems.push('no "| Localización | …" table in §3');
    else {
      const rows = localizable.rows.map((row) => ({ name: row[0].replace(/, principal$/, ''), primary: row[0].endsWith(', principal'), status: row[row.length - 1] }));
      const enteredNames = rows.filter((r) => r.status.startsWith('introducido')).map((r) => r.name).sort();
      const expected = d.localizations.map((l) => ASC_LANGUAGE_NAMES[l] ?? l).sort();
      if (!isDeepStrictEqual(enteredNames, expected)) problems.push(`§3 marks ${list(enteredNames, 'no localization')} as entered; localizations is ${expected.join(', ')}`);
      const drafts = listingSections.filter((s) => s.draft).map((s) => ASC_LANGUAGE_NAMES[s.locale] ?? s.locale);
      const draftsNotApplicable = rows.filter((r) => drafts.includes(r.name) && !r.status.startsWith('no aplica')).map((r) => r.name);
      if (draftsNotApplicable.length) problems.push(`§3: ${draftsNotApplicable.join(', ')} is a draft in LISTING.md, so its Estado is "no aplica" (a draft never counts as entered)`);
      const primary = rows.filter((r) => r.primary).map((r) => r.name);
      if (!isDeepStrictEqual(primary, [language])) problems.push(`§3 marks ${list(primary, 'no localization')} as ", principal"; primaryLanguage is ${language}`);
    }
    for (const [locale, url] of Object.entries(d.privacyPolicyUrl)) expectRow(`URL de la política de privacidad · ${locale}`, `\`${url}\``, 'privacyPolicyUrl');
    for (const url of Object.values(d.supportUrl)) expectRow('URL de soporte', `\`${url}\``, 'supportUrl');
    expectRow('Clasificación por edad', `**${d.ageRating.rating}**`, 'ageRating');
    expectRow('Calculated rating', `**${d.ageRating.rating}**`, 'ageRating');
    expectRow('Age categories and override', d.ageRatingOverride === null ? 'Not Applicable' : String(d.ageRatingOverride), 'ageRatingOverride');
    expectRow('¿Requiere iniciar sesión?', `\`signIn\` = \`${d.signIn.mode}\``, 'signIn');
    expectRow('¿Requiere iniciar sesión?', `\`demoAccountProvided: ${d.demoAccountProvided}\``, 'demoAccountProvided');
    expect(problems, `${RECORD} and ${JSON_FILE} disagree: fix the one that is not what App Store Connect holds (the same day, with its Estado, date and a line in the Historial)`).toEqual([]);
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
