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

## Wave 1 status

- [x] TR-14 Expo project (SDK 57, TypeScript strict, expo-router)
- [x] TR-15 Nocturne tokens, light theme, base components (Inter font loading pending)
- [x] TR-16 SQLite schema v1, migrations, repositories (device test pending)
- [x] TR-17 Navigation: 4 tabs, editor modal, onboarding gate, `traceroutine://` scheme
- [x] TR-18 ES/EN dictionaries, hot switch, own date formatting
- [x] TR-19 CI workflow (lint, typecheck, tests) + EAS preview job (needs `EXPO_TOKEN`)
- [x] TR-20 … TR-30 Frequency engine with a 49-case suite (56 with i18n)
- [ ] TR-83 … TR-86, TR-90: team decisions, landing, interviews, name check — human tasks
