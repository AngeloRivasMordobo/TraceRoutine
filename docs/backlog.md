# TraceRoutine · Jira backlog (project TR)

English index of the 103 tickets, grouped by wave. Every ticket in Jira carries context, scope and acceptance criteria; this file is the map. Labels: phase (`mvp`, `v1-1`, `v2`), wave (`wave-1` … `wave-6`) and area (`engine`, `editor`, `today`, `month`, `stats`, `notifications`, `settings`, `onboarding`, `infra`, `qa`, `business`, `design`, `i18n`). Titles are prefixed `[Wn]` so the wave is visible on every card.

Project: [https://mordobo.atlassian.net/browse/TR](https://mordobo.atlassian.net/browse/TR)

## Waves at a glance

| Wave | Tickets | Timing | What it covers |
|---|---|---|---|
| Wave 1 · Foundations & engine | 22 | weeks 1–3 | Expo project, Nocturne tokens, SQLite, navigation, ES/EN, CI; the whole frequency engine with its test suite; work rhythm, landing, interviews, name check and the design decisions that gate Wave 2. |
| Wave 2 · Core screens | 25 | weeks 4–7 | Activity editor with live preview, Today with its three gestures, the month grid, and the logo. |
| Wave 3 · Complete the MVP | 23 | weeks 8–10 | Stats, local reminders, Settings and the Free/Pro model, onboarding and identity, E2E tests, analytics, performance. |
| Wave 4 · Beta & launch | 7 | weeks 11–14 | Closed beta, store listings, privacy and terms, public launch, pricing, entry niche, metrics dashboard. |
| Wave 5 · v1.1 | 8 | weeks 15–20 | Widget, share the month, templates, guided routine, mood and sleep, Pro purchase, advanced stats, UI variants. |
| Wave 6 · v2 | 5 | after retention proves out | Optional account and sync, shared routines, Health integration, voice logging, push. |

**Total:** 13 epics · 90 stories and tasks · 103 tickets

## Epics

| Epic | Waves | Status |
|---|---|---|
| [TR-1](https://mordobo.atlassian.net/browse/TR-1) E1 · Technical foundations | W1 | In Progress |
| [TR-2](https://mordobo.atlassian.net/browse/TR-2) E2 · Frequency engine | W1 | In Progress |
| [TR-3](https://mordobo.atlassian.net/browse/TR-3) E3 · Activity editor | W2 | In Review |
| [TR-4](https://mordobo.atlassian.net/browse/TR-4) E4 · Today screen | W2 | In Review |
| [TR-5](https://mordobo.atlassian.net/browse/TR-5) E5 · Month grid | W2 | In Review |
| [TR-6](https://mordobo.atlassian.net/browse/TR-6) E6 · Stats | W3 | In Review |
| [TR-7](https://mordobo.atlassian.net/browse/TR-7) E7 · Local reminders | W3 | In Review |
| [TR-8](https://mordobo.atlassian.net/browse/TR-8) E8 · Settings, local data and Free/Pro model | W3 | In Review |
| [TR-9](https://mordobo.atlassian.net/browse/TR-9) E9 · Onboarding, identity and languages | W2, W3 | In Review |
| [TR-10](https://mordobo.atlassian.net/browse/TR-10) E10 · Quality, beta and launch | W3, W4 | In Progress |
| [TR-11](https://mordobo.atlassian.net/browse/TR-11) E11 · Validation, brand and business | W1, W4 | To Do |
| [TR-12](https://mordobo.atlassian.net/browse/TR-12) E12 · v1.1 — Widget, sharing, templates and Pro | W5 | To Do |
| [TR-13](https://mordobo.atlassian.net/browse/TR-13) E13 · v2 — Account, sync and integrations | W6 | To Do |

## Wave 1 · Foundations & engine — weeks 1–3

Expo project, Nocturne tokens, SQLite, navigation, ES/EN, CI; the whole frequency engine with its test suite; work rhythm, landing, interviews, name check and the design decisions that gate Wave 2.

| Key | Type | Title | Epic | Labels | Status |
|---|---|---|---|---|---|
| [TR-14](https://mordobo.atlassian.net/browse/TR-14) | Task | Create the Expo project (React Native + TypeScript) with the base structure | TR-1 | infra | Ready QA |
| [TR-15](https://mordobo.atlassian.net/browse/TR-15) | Task | Implement the Nocturne design tokens and base components | TR-1 | design, infra | Ready QA |
| [TR-16](https://mordobo.atlassian.net/browse/TR-16) | Task | Local SQLite database: schema, migrations and repositories | TR-1 | infra | Ready QA |
| [TR-17](https://mordobo.atlassian.net/browse/TR-17) | Task | Navigation: Today / Month / Stats / Settings tabs, editor modal and onboarding flow | TR-1 | infra | Ready QA |
| [TR-18](https://mordobo.atlassian.net/browse/TR-18) | Task | ES/EN language infrastructure and neutral-Spanish date formatting | TR-1 | i18n, infra | Ready QA |
| [TR-19](https://mordobo.atlassian.net/browse/TR-19) | Task | CI with GitHub Actions and EAS preview builds | TR-1 | infra | Ready QA |
| [TR-20](https://mordobo.atlassian.net/browse/TR-20) | Story | Engine data model and types (Activity, FrequencyRule, Log, Cycle) and date utilities | TR-2 | engine | Ready QA |
| [TR-21](https://mordobo.atlassian.net/browse/TR-21) | Story | isDue: daily frequency, fixed weekdays and start/end window | TR-2 | engine | Ready QA |
| [TR-22](https://mordobo.atlassian.net/browse/TR-22) | Story | isDue: every N days anchored to the calendar (every other day = N 2) | TR-2 | engine | Ready QA |
| [TR-23](https://mordobo.atlassian.net/browse/TR-23) | Story | isDue: every N days since the last time you did it | TR-2 | engine | Ready QA |
| [TR-24](https://mordobo.atlassian.net/browse/TR-24) | Story | isDue: X times per week (flexible, you pick the days) | TR-2 | engine | Ready QA |
| [TR-25](https://mordobo.atlassian.net/browse/TR-25) | Story | Rotating cycle with steps and rest days: calendar mode and "wait until you do it" mode | TR-2 | engine | Ready QA |
| [TR-26](https://mordobo.atlassian.net/browse/TR-26) | Story | nextDue and future projection assuming completion | TR-2 | engine | Ready QA |
| [TR-27](https://mordobo.atlassian.net/browse/TR-27) | Story | Consistency calculation over scheduled days (minimums count, off days never hurt) | TR-2 | engine | Ready QA |
| [TR-28](https://mordobo.atlassian.net/browse/TR-28) | Story | Cell state and rules for editing the past | TR-2 | engine | Ready QA |
| [TR-29](https://mordobo.atlassian.net/browse/TR-29) | Story | Frequency presets, active-preset detection and a readable label for any rule | TR-2 | engine | Ready QA |
| [TR-30](https://mordobo.atlassian.net/browse/TR-30) | Story | Automated engine test suite (≥ 40 cases, edge cases and properties) | TR-2 | engine, qa | Ready QA |
| [TR-83](https://mordobo.atlassian.net/browse/TR-83) | Task | Work rhythm: team, roles, 2-week sprints and definition of done | TR-11 | business | To Do |
| [TR-84](https://mordobo.atlassian.net/browse/TR-84) | Task | ES/EN landing page with waitlist, domain and analytics | TR-11 | business | To Do |
| [TR-85](https://mordobo.atlassian.net/browse/TR-85) | Task | 10 interviews with the clickable prototype (script, profiles and report) | TR-11 | business, design | To Do |
| [TR-86](https://mordobo.atlassian.net/browse/TR-86) | Task | Verify TraceRoutine availability (stores, domain, social handles) and register the trademark | TR-11 | business | To Do |
| [TR-90](https://mordobo.atlassian.net/browse/TR-90) | Task | Pending design decisions after the interviews (cells, Today layout, orientation, minimum, editor, logo) | TR-11 | business, design | To Do |

## Wave 2 · Core screens — weeks 4–7

Activity editor with live preview, Today with its three gestures, the month grid, and the logo.

| Key | Type | Title | Epic | Labels | Status |
|---|---|---|---|---|---|
| [TR-31](https://mordobo.atlassian.net/browse/TR-31) | Story | New/Edit activity screen: name, icon, color and record type | TR-3 | editor | Ready QA |
| [TR-32](https://mordobo.atlassian.net/browse/TR-32) | Story | Minimum version field with help text and suggestions | TR-3 | editor | Ready QA |
| [TR-33](https://mordobo.atlassian.net/browse/TR-33) | Story | Frequency selector: presets, types and parameters (N, days, times per week, cycle steps) | TR-3 | editor | Ready QA |
| [TR-34](https://mordobo.atlassian.net/browse/TR-34) | Story | "If you miss a day" switch: follows the calendar vs. counts from the last time | TR-3 | editor | Ready QA |
| [TR-35](https://mordobo.atlassian.net/browse/TR-35) | Story | Live month preview with summary ("Due 15 days · Next: Wed 26") | TR-3 | editor | Ready QA |
| [TR-36](https://mordobo.atlassian.net/browse/TR-36) | Story | Start and end dates (X-day treatments) and the activity reminder | TR-3 | editor | Ready QA |
| [TR-37](https://mordobo.atlassian.net/browse/TR-37) | Story | Inline validation, errors and save confirmation | TR-3 | editor | Ready QA |
| [TR-38](https://mordobo.atlassian.net/browse/TR-38) | Story | Edit, archive (without losing history) and delete an activity | TR-3 | editor | Ready QA |
| [TR-39](https://mordobo.atlassian.net/browse/TR-39) | Story | List of what is due today with header, date and counter | TR-4 | today | Ready QA |
| [TR-40](https://mordobo.atlassian.net/browse/TR-40) | Story | Mark as done with one tap (big check, animation and haptics) | TR-4 | today | Ready QA |
| [TR-41](https://mordobo.atlassian.net/browse/TR-41) | Story | Minimum version with long-press (and an accessible alternative) | TR-4 | today | Ready QA |
| [TR-42](https://mordobo.atlassian.net/browse/TR-42) | Story | Skip with a swipe and an optional reason ("the next one is Thursday") | TR-4 | today | Ready QA |
| [TR-43](https://mordobo.atlassian.net/browse/TR-43) | Story | Segmented day progress bar | TR-4 | today | Ready QA |
| [TR-44](https://mordobo.atlassian.net/browse/TR-44) | Story | Log a value on completion (minutes or amount) without breaking the one-tap flow | TR-4 | today | Ready QA |
| [TR-45](https://mordobo.atlassian.net/browse/TR-45) | Story | Contextual subtitles for each activity (cycle, week, interval, end date, pending since) | TR-4 | today | Ready QA |
| [TR-46](https://mordobo.atlassian.net/browse/TR-46) | Story | "Free day" state and "Coming up" section (7 days) | TR-4 | today | Ready QA |
| [TR-47](https://mordobo.atlassian.net/browse/TR-47) | Story | First-time gesture hint (tap / hold / swipe) | TR-4 | today | Ready QA |
| [TR-48](https://mordobo.atlassian.net/browse/TR-48) | Story | Month grid: structure, phone orientation and sticky per-activity header | TR-5 | month | Ready QA |
| [TR-49](https://mordobo.atlassian.net/browse/TR-49) | Story | Cell styles per state (style A filled by default) and legend | TR-5 | month | Ready QA |
| [TR-50](https://mordobo.atlassian.net/browse/TR-50) | Story | Today row, month navigation and auto-scroll | TR-5 | month | Ready QA |
| [TR-51](https://mordobo.atlassian.net/browse/TR-51) | Story | Edit the past by tapping cells (done → minimum → skipped → empty) | TR-5 | month | Ready QA |
| [TR-52](https://mordobo.atlassian.net/browse/TR-52) | Story | Cycle letters in cells and future projection for relative frequencies | TR-5 | month | Ready QA |
| [TR-53](https://mordobo.atlassian.net/browse/TR-53) | Story | Overall month consistency, bar and per-activity percentage | TR-5 | month | Ready QA |
| [TR-54](https://mordobo.atlassian.net/browse/TR-54) | Story | Open the editor and the quick menu from the grid header | TR-5 | month | Ready QA |
| [TR-72](https://mordobo.atlassian.net/browse/TR-72) | Task | Logo, app icon and splash: choose between Trace / Monogram / Wordmark and produce every size | TR-9 | design | To Do |

## Wave 3 · Complete the MVP — weeks 8–10

Stats, local reminders, Settings and the Free/Pro model, onboarding and identity, E2E tests, analytics, performance.

| Key | Type | Title | Epic | Labels | Status |
|---|---|---|---|---|---|
| [TR-55](https://mordobo.atlassian.net/browse/TR-55) | Story | Stats screen: month consistency, overall and per activity | TR-6 | stats | Ready QA |
| [TR-56](https://mordobo.atlassian.net/browse/TR-56) | Story | Best month, best weekday and the weekday you miss most | TR-6 | stats | Ready QA |
| [TR-57](https://mordobo.atlassian.net/browse/TR-57) | Story | 12-week trend with an accessible text summary | TR-6 | stats | Ready QA |
| [TR-58](https://mordobo.atlassian.net/browse/TR-58) | Story | Notification permission asked at the right moment and status in Settings | TR-7 | notifications | Ready QA |
| [TR-59](https://mordobo.atlassian.net/browse/TR-59) | Story | Schedule local notifications per activity only on due days (14 days, idempotent) | TR-7 | notifications | Ready QA |
| [TR-60](https://mordobo.atlassian.net/browse/TR-60) | Story | Single morning summary with what is due today | TR-7 | notifications | Ready QA |
| [TR-61](https://mordobo.atlassian.net/browse/TR-61) | Story | Quick actions from the notification (Done / Minimum) without opening the app | TR-7 | notifications | Ready QA |
| [TR-62](https://mordobo.atlassian.net/browse/TR-62) | Story | Rescheduling after reboot, time-zone change and days without opening the app | TR-7 | notifications | Ready QA |
| [TR-63](https://mordobo.atlassian.net/browse/TR-63) | Story | Settings screen: language, theme, reminders, your data, Pro and about | TR-8 | settings | Ready QA |
| [TR-64](https://mordobo.atlassian.net/browse/TR-64) | Story | Complete light theme (and automatic option following the system) | TR-8 | design, settings | Ready QA |
| [TR-65](https://mordobo.atlassian.net/browse/TR-65) | Story | Export CSV (activities and logs) through the system share sheet | TR-8 | settings | Ready QA |
| [TR-66](https://mordobo.atlassian.net/browse/TR-66) | Story | Local JSON backup and import (switch phones without losing data) | TR-8 | settings | Ready QA |
| [TR-67](https://mordobo.atlassian.net/browse/TR-67) | Story | Delete all data with double confirmation and a backup suggestion | TR-8 | settings | Ready QA |
| [TR-68](https://mordobo.atlassian.net/browse/TR-68) | Story | Free-plan limit of 5 active activities (archiving frees a slot) | TR-8 | business, settings | Ready QA |
| [TR-69](https://mordobo.atlassian.net/browse/TR-69) | Story | TraceRoutine Pro section (benefits and interest capture, no purchase in the MVP) | TR-8 | business, settings | Ready QA |
| [TR-70](https://mordobo.atlassian.net/browse/TR-70) | Story | Two-step onboarding ("Not everything is daily" and "Bad days count too") | TR-9 | onboarding | Ready QA |
| [TR-71](https://mordobo.atlassian.net/browse/TR-71) | Story | Guided first activity after onboarding (profile suggestions, "Every other day" preselected) | TR-9 | onboarding | Ready QA |
| [TR-73](https://mordobo.atlassian.net/browse/TR-73) | Story | Splash and empty states for every screen | TR-9 | design, onboarding | To Do |
| [TR-74](https://mordobo.atlassian.net/browse/TR-74) | Task | Complete ES/EN copy review and state glossary | TR-9 | design, i18n | Ready QA |
| [TR-75](https://mordobo.atlassian.net/browse/TR-75) | Story | Baseline accessibility: touch targets, screen reader, reduce motion and font scaling | TR-9 | design, qa | To Do |
| [TR-76](https://mordobo.atlassian.net/browse/TR-76) | Task | E2E tests of the 10 critical flows on iOS and Android | TR-10 | qa | To Do |
| [TR-77](https://mordobo.atlassian.net/browse/TR-77) | Task | Minimal analytics without PII (PostHog) and crash reporting (Sentry) with opt-out | TR-10 | infra, qa | Ready QA |
| [TR-78](https://mordobo.atlassian.net/browse/TR-78) | Task | Performance and size: cold start, smooth grid and app under 40 MB | TR-10 | qa | To Do |

## Wave 4 · Beta & launch — weeks 11–14

Closed beta, store listings, privacy and terms, public launch, pricing, entry niche, metrics dashboard.

| Key | Type | Title | Epic | Labels | Status |
|---|---|---|---|---|---|
| [TR-79](https://mordobo.atlassian.net/browse/TR-79) | Task | Closed beta with 50–100 users (TestFlight and Play) and findings report | TR-10 | business, qa | To Do |
| [TR-80](https://mordobo.atlassian.net/browse/TR-80) | Task | ES/EN store listings: screenshots, description and the 20-second grid video | TR-10 | business, design | To Do |
| [TR-81](https://mordobo.atlassian.net/browse/TR-81) | Task | Privacy, terms, store data declarations and non-medical positioning | TR-10 | business | To Do |
| [TR-82](https://mordobo.atlassian.net/browse/TR-82) | Task | Public launch v1.0 with checklist, staged rollout and 72-hour monitoring | TR-10 | business, qa | To Do |
| [TR-87](https://mordobo.atlassian.net/browse/TR-87) | Task | Define pricing (annual and one-time, regional) and create the products in the stores and RevenueCat | TR-11 | business | To Do |
| [TR-88](https://mordobo.atlassian.net/browse/TR-88) | Task | Entry niche and content plan for the first 1,000 users | TR-11 | business | To Do |
| [TR-89](https://mordobo.atlassian.net/browse/TR-89) | Task | Success metrics dashboard (activation, D7/D30, average consistency, Pro interest and conversion) | TR-11 | business | To Do |

## Wave 5 · v1.1 — weeks 15–20

Widget, share the month, templates, guided routine, mood and sleep, Pro purchase, advanced stats, UI variants.

| Key | Type | Title | Epic | Labels | Status |
|---|---|---|---|---|---|
| [TR-91](https://mordobo.atlassian.net/browse/TR-91) | Story | Home-screen widget with the grid (iOS WidgetKit and Android Glance) — Pro | TR-12 | month | To Do |
| [TR-92](https://mordobo.atlassian.net/browse/TR-92) | Story | Share the month as an image (viral loop) — Pro | TR-12 | business, month | To Do |
| [TR-93](https://mordobo.atlassian.net/browse/TR-93) | Story | Routine templates (push/pull/legs, skincare, medication, morning, study) — Pro | TR-12 | editor | To Do |
| [TR-94](https://mordobo.atlassian.net/browse/TR-94) | Story | Guided routine mode (ordered group of activities with a timer per step) | TR-12 | today | To Do |
| [TR-95](https://mordobo.atlassian.net/browse/TR-95) | Story | One-tap mood and sleep logging with a correlation in Stats | TR-12 | stats, today | To Do |
| [TR-96](https://mordobo.atlassian.net/browse/TR-96) | Story | TraceRoutine Pro purchase with RevenueCat (annual and one-time, restore, feature gating) | TR-12 | business | To Do |
| [TR-97](https://mordobo.atlassian.net/browse/TR-97) | Story | Advanced stats (comparison, annual heatmap) and optional streaks with grace days — Pro | TR-12 | stats | To Do |
| [TR-98](https://mordobo.atlassian.net/browse/TR-98) | Story | Configurable UI variants (cell style, Today layout, accent) and the conversational-editor experiment | TR-12 | design | To Do |

## Wave 6 · v2 — after retention proves out

Optional account and sync, shared routines, Health integration, voice logging, push.

| Key | Type | Title | Epic | Labels | Status |
|---|---|---|---|---|---|
| [TR-99](https://mordobo.atlassian.net/browse/TR-99) | Story | Optional account and cross-device sync with Supabase (lossless migration) | TR-13 | infra | To Do |
| [TR-100](https://mordobo.atlassian.net/browse/TR-100) | Story | Shared routines with a friend (accountability without ranking or pressure) | TR-13 |  | To Do |
| [TR-101](https://mordobo.atlassian.net/browse/TR-101) | Story | Apple Health and Health Connect integration to auto-complete activities | TR-13 |  | To Do |
| [TR-102](https://mordobo.atlassian.net/browse/TR-102) | Story | Voice logging ("I did legs and read 20 pages") with confirmation | TR-13 | today | To Do |
| [TR-103](https://mordobo.atlassian.net/browse/TR-103) | Story | Push notifications (only with an account and sync; reminders stay local) | TR-13 | notifications | To Do |

## Gate

Wave 2 starts only after TR-90 (design decisions) is closed with the findings of the interviews (TR-85). The code now follows the design canvas rather than the provisional defaults: cell style A (filled), list layout with the check on the **left**, rows = activities in the grid, long-press for the minimum with an accessible alternative, form editor.

## Decisions recorded while building the backlog

- **Export CSV**: free in the MVP (TR-65), behind Pro once the purchase exists (TR-96).
- **Pro purchase**: interest capture only in the MVP (TR-69); RevenueCat integration in v1.1 (TR-96); store products created in TR-87.
- **Grid orientation**: settled in favour of the design canvas — rows = activities, one column per day. The Wave 2 code had flipped it to days-down for the phone; the canvas keeps the plan's orientation and it fits (31 cells at 9.5 px plus gaps is ~349 px inside a 396 px content width), so the code now follows the design.
- **Design variations**: resolved against the canvas's own defaults — cells A "relleno suave" (filled, the minimum is the bottom half), Today "Lista" with the large check on the **left**, form editor with live preview, and the "Traza" logo. The alternatives still live in TR-98 (v1.1).
- **Today's minimum and skip**: the canvas draws them as a "Mín" chip and an arrow, and notes in its own assumptions that the real app uses long-press and swipe. The code keeps the gestures.
- **Icons**: Phosphor everywhere, as the Nocturne readme requires (`phosphor-react-native` over `react-native-svg`), replacing expo-symbols.
- **Activity palette**: the canvas's four hues (#82a7e6, #d0a976, #74c4b2, #968ae0). The earlier six-colour set maps onto them for activities already stored.
- **JSON backup** (TR-66) was added to the MVP: with no sync until v2 it is the only way to switch phones without losing data.
- **Work rhythm** (TR-83) was added because the plan leaves the team size open and the board needs defined sprints.

## Progress

- Wave 1: E1 and E2 delivered in code (TR-14 … TR-30), pending device review; TR-83 documented in `docs/how-we-work.md`; TR-84, TR-85, TR-86 and TR-90 are human tasks.
- Wave 2: editor, Today, month grid and logo delivered in code (E3, E4, E5 In Review); TR-72 assets in `/brand` and `/assets/images`.
- 2026-08-27: the UI was realigned to the design canvas (grid rows = activities, filled cells, Today's check on the left, 5-slot nav with the centre "+", three-step onboarding, Phosphor icons, Inter actually loaded). TR-49 … TR-71, TR-74 and TR-77 moved to Ready QA.
- Still open in Waves 2–3, and why: **TR-72** needs the icon approved on a real home screen and the share-month watermark, and depends on TR-86; **TR-73** has empty states on Today, Month and Stats but not on every screen; **TR-75** covers touch targets and the screen reader but not reduce-motion or font scaling; **TR-76** has 3 Maestro flows of the 10; **TR-78** has never been measured.