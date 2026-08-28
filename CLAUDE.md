# TraceRoutine — project guide for Claude Code

Routine tracker with real frequencies (React Native + Expo SDK 57, TypeScript strict, expo-router). Local-first: SQLite, no account. ES/EN. Design system: Nocturne (dark default, accent #9184d9, outlined buttons, 0.7× density).

## Commands
- `npm test` (Vitest, 83 tests: engine, i18n, editor/grid models, stats, reminders, backup, analytics) · `npm run typecheck` · `npm run lint`
- All three must be green before any commit. Definition of done also requires a review on a real iOS and Android device.
- Dev build: `npx eas build --profile development --platform android|ios` (needed after native changes: notifications, Sentry).

## Where things live
- `src/engine/` — frequency engine, pure TypeScript, no React/SQLite/Intl. "Today" is always passed in explicitly. Every rule has a test in `engine.test.ts`; keep it that way.
- `src/i18n/` — `es.json` / `en.json` (every visible string), `t()`, own date formatting, `freqLabel`. A test fails if a key is missing in one language. Glossary of the 7 states: `docs/glossary.md`.
- `src/ui/` — tokens (never hard-code colors), `Cell` (9 grid states), controls, editor model (`ui/editor/editorModel.ts`), month grid model (`ui/month/gridModel.ts`).
- `src/store/appStore.ts` — external store with write-through persistence (`src/data/persistence.ts`: SQLite on device, memory on web). `FREE_ACTIVE_LIMIT` in `store/limits.ts`.
- `src/reminders/` — pure planner + native service (expo-notifications). `src/stats/` — pure stats. `src/analytics/` — events with whitelisted properties and opt-out; PostHog/Sentry configured through `.env` (see `.env.example`, never commit `.env`).
- `app/` — routes: `(tabs)/{index,month,stats,settings}`, `editor` (modal, accepts `id` or prefill params), `onboarding`, `first-activity`.

## Product rules that must not be broken
- Frequencies are never paywalled. Only the number of active activities is limited (5 on the free plan).
- Consistency is measured over scheduled days: the minimum counts as a hit, off days never hurt, today pending never counts. No streak drama anywhere in the UI.
- Never send activity names or free text to analytics (`sanitize()` enforces it; the test in `src/analytics/analytics.test.ts` guards it).
- No jargon on screen: say "follows the calendar" / "counts from the last time", never "anchored" / "relative".
- Texts go through i18n in both languages, in the product voice: "3 due today", never "no excuses!".

## Backlog
- Jira project TR (mordobo.atlassian.net). Titles carry `[Wn]` for the wave; labels `wave-1..6`, phase `mvp`/`v1-1`/`v2`, area. Index: `docs/backlog.md`. Rhythm and definition of done: `docs/how-we-work.md`.
- Waves 1–3 are implemented (61 tickets in code, pending device QA). Open design decisions live in TR-90 and gate changes to cell style, Today layout and grid orientation — all of which are pure functions, so changing them is small.
- When a ticket is finished: tests green, commit referencing the key (e.g. `TR-63: ...`), then move it in Jira.
