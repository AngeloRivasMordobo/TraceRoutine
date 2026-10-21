# App Store screenshots · TraceRoutine iOS 1.0

6.9-inch iPhone set: 1320 × 2868 px, portrait, RGB PNG without alpha. Raw app screens with no frames or caption overlays. They were captured on the iOS Simulator (iPhone 18 Pro Max, iOS 27.0) from a Release build of `origin/main` at `b623f1f`, in the default dark theme, with the status bar overridden to 9:41, full Wi-Fi and cellular bars and a full battery. Today in the app is Tuesday, October 20, 2026.

The order and captions come from [`../LISTING.md`](../LISTING.md) ("Screenshot captions" and "Screenshots"). Upload the files in number order. If only 5 are uploaded, use 1, 2, 4, 5 and 6.

- `es-MX/`: the app in Spanish, for Spanish (Mexico) and also for Spanish (Spain). The app has a single Spanish, so es-ES uses the same files with its own captions.
- `en-US/`: the app in English, for English (U.S.).

**The set that is uploaded is the 6.3-inch copy** in [`../screenshots-6.3/`](../screenshots-6.3/): the same files, 1206 × 2622 px, RGB PNG without alpha. App Store Connect asked TracePhysique for the 6.3-inch "iPhone with Dynamic Island (medium display)" class on 2026-10-21, not 6.9-inch (lesson 1 in [`../APP-STORE-CONNECT.md`](../APP-STORE-CONNECT.md)). The copies are made from this set with `sips`; on macOS 26.6 the command below reproduces the committed files byte for byte. Run it from the repo root after retaking any screenshot, and commit both sets together:

```bash
for f in store/app-store/screenshots/*/*.png; do o="store/app-store/screenshots-6.3/${f#store/app-store/screenshots/}"; mkdir -p "$(dirname "$o")"; sips -z 2622 1206 "$f" --out "$o"; done
```

`src/release/appStoreDeclarations.test.ts` checks both sets: their size, that they have no transparency, and that they have the same locales and file names (`screenshotsPerLocale`).

The sample data is made up. Five activities (the LISTING sample set) were created in the editor with start dates from September 24 to 29, and their past days were filled in by tapping cells in Month. The English set has the same activities and logs with English names, brought in with Settings → "Import backup".

| File | Screen | es-MX caption | es-ES caption | en-US caption |
|---|---|---|---|---|
| `01-today.png` | Today: pending first, "2 de 4 hechas" / "2 of 4 done" | Solo lo que te toca hoy | Solo lo que te toca hoy | Only what's due today |
| `02-frequency.png` | Editor of Leer / Read: Frequency with "Semana" / "Weekly", 3 times a week, and the month preview | Tu frecuencia real, no solo diaria | Tu frecuencia real, no solo diaria | Your real frequency, not just daily |
| `03-miss-a-day.png` | Editor of Regar plantas / Water plants: every 3 days, "Si un día no lo haces" / "If you miss a day" set to "Cuenta desde la última vez" / "Counts from the last time", with the month preview | Si fallas un día, tú decides qué pasa | Si fallas un día, tú decides qué pasa | Miss a day? You decide what happens |
| `04-minimum.png` | Today: Entrenar / Gym logged as the minimum by long-press, "3 de 4 hechas" / "3 of 4 done" | Los días malos también cuentan | Los días malos también cuentan | Bad days count too |
| `05-month.png` | Month: October grid with done, minimum, skipped, not done and off days, today marked, 90% overall | Tu mes en una cuadrícula | Tu mes en una cuadrícula | Your month in one grid |
| `06-stats.png` | Stats: 90% for October, per activity, best month, best and worst weekday, 12-week trend | Constancia, no rachas | Constancia, no rachas | Consistency, not streaks |
| `07-reminders.png` | Settings on a fresh install: "Activar avisos" / "Turn on reminders" tapped, with the explanation "Un aviso, solo los días que toca" / "One heads-up, only on due days" | Un aviso, solo los días que toca | Un aviso, solo los días que toca | One heads-up, only on due days |
| `08-settings.png` | Settings: language, theme, reminders on, morning summary, export, backup, privacy and the "Tus datos viven en tu dispositivo" / "Your data lives on your device" footer | Tus datos viven en tu dispositivo | Tus datos se quedan en tu móvil | Your data lives on your device |
