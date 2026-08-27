# How we work (TR-83)

**Board**: Jira project `TR`. Every ticket carries a phase label (`mvp`, `v1-1`, `v2`), a wave label (`wave-1` … `wave-6`) and an area label. Titles are prefixed `[Wn]` so the wave is visible on every card.

**Waves and sprints (2 weeks each)**

| Wave | Content | Sprints |
|---|---|---|
| 1 · Foundations & engine | E1, E2, validation tasks, design decisions (TR-90) | S1–S2 |
| 2 · Core screens | Editor, Today, Month grid, logo | S2–S4 |
| 3 · Complete the MVP | Stats, reminders, settings/Free-Pro, onboarding, E2E, analytics, performance | S4–S5 |
| 4 · Beta & launch | Closed beta, store listings, privacy, launch, pricing, niche, metrics | S6–S7 |
| 5 · v1.1 | Widget, sharing, templates, Pro purchase, guided routine | after launch |
| 6 · v2 | Account & sync, shared routines, Health, voice, push | after retention proves out |

**Definition of done**: acceptance criteria met · `npm run lint`, `npm run typecheck`, `npm test` green · reviewed on a real device (iOS and Android) · every visible string in `es.json` and `en.json`.

**Gate**: Wave 2 does not start until TR-90 (design decisions) is closed with the interview findings (TR-85).

**Ritual**: end-of-sprint review with a demo on a phone; 15-minute weekly look at the metrics dashboard once the beta starts (TR-89).
