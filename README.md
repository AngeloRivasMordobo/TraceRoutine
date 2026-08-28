# TraceRoutine

Any activity. Your real frequency. No guilt.

A routine tracker where the frequency is the point: daily, every other day, every N days (anchored to the calendar or counted from the last time), fixed weekdays, X times a week, or rotating cycles with rest days. Local-first, no account, ES/EN.

## Run

```bash
npm install
npx expo start          # then press i (iOS simulator) or a (Android emulator)
npm test                # engine + i18n suite (Vitest)
npm run typecheck       # tsc --noEmit
npm run lint            # expo lint
```

Analytics and crash reporting are off until you create `.env` from `.env.example` (PostHog key + host, Sentry DSN, org and project). `SENTRY_AUTH_TOKEN` goes to EAS as a secret, never in the app. Sentry adds native code: rebuild the dev client after enabling it.

## Layout

```
app/                 expo-router routes: (tabs)/{index,month,stats,settings}, editor (modal), onboarding
src/engine/          frequency engine — pure TypeScript, no React/SQLite/Intl (TR-20 … TR-30)
src/i18n/            es.json, en.json, t(), own date formatting, freqLabel (TR-18)
src/ui/              Nocturne tokens, theme provider, base components (TR-15)
src/data/            SQLite schema, migrations, driver, repositories (TR-16)
src/store/           Wave 1 in-memory store + sample data (replaced by SQLite in Wave 2)
docs/                how-we-work.md (TR-83)
```

## Engine in one minute

```ts
import { isDue, nextDue, consistency, cellState } from '@/src/engine';

isDue(activity, '2026-08-27', lookup);            // is it due today?
nextDue(activity, '2026-08-27', lookup);          // "the next one is Thursday"
consistency(activity, first, last, today, lookup); // { hits, expected, pct } over scheduled days
cellState(activity, date, today, lookup);         // done | min | skip | pending | missed | future | flex | flex-future | none
```

"Today" is always passed in explicitly, so the engine is testable and the widget (v1.1) can reuse it unchanged.

## Wave 3 status

- [x] TR-55 … TR-57 Stats: month consistency overall and per activity (tap to focus one), best month, best/worst weekday over due days only (14-day threshold), 12-week trend with a text summary
- [x] TR-58 … TR-62 Reminders: pure planner (one notification per due day, morning summary folding, today skipped when logged, projection for relative rules, past times dropped) + native service (permission pre-prompt, Android channel, Done/Minimum actions that log without opening the app, idempotent rescheduling on every store change and on foreground). Pending: BOOT_COMPLETED / background task, device verification
- [x] TR-63 … TR-69 Settings: language, theme (dark/light/auto), reminder permission state, morning summary and time, export CSV (UTF-8 BOM), JSON backup and import (replace/merge with preview), archived list with unarchive, delete all with double confirmation (typed DELETE), free limit of 5 with counter and guard in the editor, Pro section with interest capture, analytics opt-out, feedback email, version
- [x] TR-70, TR-71 Onboarding in two steps illustrated with real cells, language switch, skip; guided first activity with 4 profile suggestions that prefill the editor (lands on Month)
- [x] TR-73 empty states; TR-74 `docs/glossary.md`; TR-76 three Maestro flows as a starting point
- [x] TR-77 analytics and crash reporting: PostHog sink (named events only, whitelisted properties, anonymous user properties) and Sentry (crashes only, no PII, no tracing), both behind the same opt-out; configured through `.env` (see `.env.example`), source maps through `metro.config.js` + `app.config.js`. Without keys the app sends nothing.
- [ ] TR-75 accessibility audit on device; TR-78 performance measurements; native date/time pickers

## Wave 2 status

- [x] TR-31 … TR-38 Activity editor: fields, minimum, presets, 5 frequency types, calendar vs. since-last-time cards with live examples, month preview from the engine, dates with duration shortcuts, reminder, inline validation, edit/archive/delete
- [x] TR-39 … TR-47 Today: pending-first order, tap = done, long-press = minimum, swipe left = skip with reason, value sheet for minutes/amounts, gesture hint, contextual subtitles, Free day + Coming up, accessible menu and actions
- [x] TR-48 … TR-54 Month grid: days down / activities across, sticky header with icon + % + name, 9 cell states (style A), today row, month navigation, edit the past by tapping, long-press full edit, cycle letters (P/U/L) and projection, overall consistency, header opens the editor
- [x] TR-72 Logo (direction "Trace"): app icon, Android adaptive + monochrome, splash, favicon, SVG sources in `/brand`
- [x] Persistence: SQLite on device (memory on web), write-through store, dev-only sample seed
- [ ] Device review on iOS and Android; native date/time pickers (text inputs for now); Inter font loading

## Wave 1 status

- [x] TR-14 Expo project (SDK 57, TypeScript strict, expo-router)
- [x] TR-15 Nocturne tokens, light theme, base components (Inter font loading pending)
- [x] TR-16 SQLite schema v1, migrations, repositories (device test pending)
- [x] TR-17 Navigation: 4 tabs, editor modal, onboarding gate, `traceroutine://` scheme
- [x] TR-18 ES/EN dictionaries, hot switch, own date formatting
- [x] TR-19 CI workflow (lint, typecheck, tests) + EAS preview job (needs `EXPO_TOKEN`)
- [x] TR-20 … TR-30 Frequency engine with a 49-case suite (56 with i18n)
- [ ] TR-83 … TR-86, TR-90: team decisions, landing, interviews, name check — human tasks
