# TraceRoutine — project guide for Claude Code

Routine tracker with real frequencies (React Native + Expo SDK 57, TypeScript strict, expo-router). Local-first: SQLite, no account. ES/EN. Design system: Nocturne (dark default, accent #9184d9, outlined buttons, 0.7× density).

## Commands
- `npm test` (Vitest, 229 tests: engine, i18n and counts, editor/grid models, stats, reminders and the permission pre-prompt, backup, analytics and where it may run, store language and settings that survive Delete all data, contact links, policy and support page, store config, App Store listing limits and copy rules, free limit / Pro per platform and purchase copy in every string, what counts against the active limit, theme contrast, iOS screens) · `npm run typecheck` · `npm run lint`
- `src/release/iosScreens.test.ts` renders Settings, the editor, Today and the value sheet to static markup as iOS and as Android (react-dom/server; React Native replaced by `src/test/nativeStubs.ts`, which can also press buttons and tap alert buttons, and writes out keyboard props, background/text colours and opacity). Add a case there when a screen gains platform-specific UI. It checks texts, buttons and those props, not layout, effects or gestures.
- All three must be green before any commit. Definition of done also requires a review on a real iOS and Android device.
- Dev build: `npx eas build --profile development --platform android|ios` (needed after native changes: notifications, Sentry).

## Where things live
- `src/engine/` — frequency engine, pure TypeScript, no React/SQLite/Intl. "Today" is always passed in explicitly. Every rule has a test in `engine.test.ts`; keep it that way.
- `src/i18n/` — `es.json` / `en.json` (every visible string), `t()`, own date formatting, `freqLabel`. A test fails if a key is missing in one language. Glossary of the 7 states: `docs/glossary.md`.
- `src/ui/` — tokens (never hard-code colors), `Cell` (9 grid states), controls, editor model (`ui/editor/editorModel.ts`), month grid model (`ui/month/gridModel.ts`).
- `src/store/appStore.ts` — external store with write-through persistence (`src/data/persistence.ts`: SQLite on device, memory on web). `FREE_ACTIVE_LIMIT`, `isActive`, `passesActiveLimit` (every path that makes an activity active: Create, Unarchive, a later end date), `showsPro(os)`, `freeLimitPrompt(os)` (its buttons too; shown by `ui/limitAlert.ts`), `warnsAtLimitOnOpen(os)`, `frequencyHelp(os)` and `PRO_ONLY_KEYS` in `store/limits.ts`. `bootstrapStore(seed, Platform.OS)`: on iOS a language changed in iOS Settings after an in-app pick wins (`resolveLang`, saved `deviceLang`).
- `src/reminders/` — pure planner, pre-prompt buttons per platform (`prePrompt.ts`) + native service (expo-notifications; `askReminderPermission`, and `offerReminders` when an activity with a reminder is saved). `src/stats/` — pure stats. `src/analytics/` — events with whitelisted properties and opt-out; PostHog/Sentry configured through `.env` (see `.env.example`, never commit `.env`), and never started on iOS v1 (`analyticsAllowed(os)` in `policy.ts`).
- `src/about/links.ts` — privacy policy URL (per language) and the support inbox (`support@mordobo.com`).
- `store/app-store/LISTING.md` — the App Store Connect listing, ready to paste: texts per locale (es-MX primary, es-ES, en-US), categories, URLs, App Privacy, age rating, review notes, export compliance, screenshots. `src/release/storeListing.test.ts` checks Apple's limits (keywords in bytes), the counts table and that no public text mentions Pro, prices, ads, the other platform or features iOS hides. `docs/support.html` is the Support URL page (ES/EN halves like `privacy.html`; its quoted labels are checked against the dictionaries in `src/about/links.test.ts`).
- `docs/RELEASE-IOS.md` — App Store release runbook (Spanish): one-time account setup, app record, first EAS build/submit, TestFlight QA, App Privacy, age rating, review notes, screenshots.
- iOS store config — `app.json` (`ios`: iPhone only, `usesNonExemptEncryption: false`, `CFBundleLocalizations`), `plugins/withIosLocales.js` + `locales/{en,es}.json` (the .lproj folders the App Store reads its languages from) and `eas.json` (`sdk-57` image, `submit.production.ios`). Guarded by `src/release/storeConfig.test.ts`. Do not move the locales to the top-level `locales` key: it also writes Android resources, and the Play build must not change. Runtime iOS-only behaviour goes behind `Platform.OS === 'ios'`.
- `app/` — routes: `(tabs)/{index,month,stats,settings}`, `editor` (modal, accepts `id` or prefill params), `onboarding`, `first-activity`.

## Product rules that must not be broken
- Frequencies are never paywalled. Only the number of active activities is limited (5 on the free plan).
- iOS v1 sells nothing (owner decision 2026-10-19): no Pro card, no "Let me know when it's ready", no "never a paid feature", and the 5-activity limit is stated with no upsell (`showsPro`, `freeLimitPrompt`, `frequencyHelp`). Any new text about Pro, plans, prices or paying goes on `PRO_ONLY_KEYS` and behind `showsPro`, or `limits.test.ts` fails. Android keeps the Pro section that is live on Google Play.
- iOS v1 collects nothing ("Data Not Collected" on the App Store): PostHog and Sentry stay off on iOS whatever keys the build carries, and Settings hides the usage-stats switch (`analyticsAllowed`). Turning them on for iOS means updating App Privacy and `docs/privacy.html` first (RELEASE-IOS.md §5).
- Consistency is measured over scheduled days: the minimum counts as a hit, off days never hurt, today pending never counts. No streak drama anywhere in the UI.
- Never send activity names or free text to analytics (`sanitize()` enforces it; the test in `src/analytics/analytics.test.ts` guards it).
- No jargon on screen: say "follows the calendar" / "counts from the last time", never "anchored" / "relative".
- Texts go through i18n in both languages, in the product voice: "3 due today", never "no excuses!".

## Backlog
- Jira project TR (mordobo.atlassian.net). Titles carry `[Wn]` for the wave; labels `wave-1..6`, phase `mvp`/`v1-1`/`v2`, area. Index: `docs/backlog.md`. Rhythm and definition of done: `docs/how-we-work.md`.
- Waves 1–3 are implemented (61 tickets in code, pending device QA). Open design decisions live in TR-90 and gate changes to cell style, Today layout and grid orientation — all of which are pure functions, so changing them is small.
- When a ticket is finished: tests green, commit referencing the key (e.g. `TR-63: ...`), then move it in Jira.
