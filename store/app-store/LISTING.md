# TraceRoutine · App Store Connect listing (iOS 1.0)

Everything App Store Connect asks for the first iOS release, ready to paste. Each text box below goes into the App Store Connect field with the same name, exactly as written (App Store Connect does not render Markdown).

- **Seller**: MORDOBO TECHNOLOGIES LLC (Organization, Team ID `CTC5PRH3D3`). Bundle ID `app.traceroutine`, SKU `traceroutine-ios`.
- **iOS 1.0 ships**: iPhone only, no account, no in-app purchases, no subscriptions, no ads, no analytics or crash reporting. See [`docs/RELEASE-IOS.md`](../../docs/RELEASE-IOS.md) for the build and submission runbook.
- **Rule for every public text** (name, subtitle, promotional text, description, keywords, What's New, screenshot captions): never mention the other platform or its store, prices, paid plans, ads, or features the iOS build does not show (widget, month sharing, templates, sync). `src/release/storeListing.test.ts` enforces this and Apple's limits: `npm test`.
- **Languages**: Spanish (Mexico) is the primary language. Spanish (Spain) and English (U.S.) are localizations. The app itself has one Spanish (`src/i18n/es.json`), so in-app labels quoted below are the same in both Spanish listings; the es-ES copy only changes the prose around them.

---

## es-MX · Spanish (Mexico), primary language

### Name (max 30)

```text
TraceRoutine
```

### Subtitle (max 30)

```text
Hábitos con tu frecuencia real
```

### Promotional text (max 170)

```text
Entrenar día por medio, fisio L-X-V, leer 3 veces por semana: TraceRoutine sigue tu frecuencia real y solo te pide cuentas los días que tocan. Sin cuenta y sin rachas.
```

### Description (max 4000)

```text
No todo es diario. Entrenas día por medio, vas a fisio lunes, miércoles y viernes, lees 3 veces por semana o riegas las plantas cada 4 días. TraceRoutine registra cualquier actividad con su frecuencia real y solo te pide cuentas los días que tocan.

FRECUENCIAS DE VERDAD
• Todos los días, día por medio o cada N días, de 1 a 30.
• Días fijos de la semana, como lunes, miércoles y viernes.
• Un número de veces por semana, y tú eliges qué días.
• Ciclos con días de descanso, como empuje · jalón · pierna · descanso.
• Si un día no lo haces, tú decides qué pasa: la actividad sigue el calendario o cuenta desde la última vez.
• Mientras la configuras, ves en el mes qué días te toca.

LOS DÍAS MALOS TAMBIÉN CUENTAN
Cada actividad puede tener una versión mínima: correr 5 km un día normal, caminar 10 minutos un día malo. La mínima cuenta como cumplida y no rompe tu constancia. Si hoy no puedes, omítela con un motivo opcional.

HOY, EN UN VISTAZO
• Primero lo pendiente. Toca el círculo para completar, mantén presionado para la mínima o desliza para omitir.
• Solo marca, o anota minutos o una cantidad: páginas, km, repeticiones.
• ¿Hoy no toca nada? Día libre. No te inventamos tareas.

TU MES EN UNA CUADRÍCULA
Todas tus actividades, día por día: hechas, mínimas, omitidas y los días que no tocaban. Toca una celda pasada para corregir el pasado, sin drama.

CONSTANCIA, NO RACHAS
La constancia se mide sobre los días que tocaban: la mínima cuenta, los días que no tocan no restan y lo de hoy no cuenta mientras esté pendiente. En Estadísticas ves la constancia del mes y de cada actividad, tu mejor mes, tu mejor día de la semana, el día que más fallas y la tendencia de las últimas 12 semanas.

RECORDATORIOS SIN INSISTIR
Un aviso por actividad y solo los días que toca. El resumen matinal junta en una sola notificación lo que toca hoy. Desde el aviso de una actividad puedes marcarla como hecha o mínima sin abrir la app.

TUS DATOS, EN TU TELÉFONO
• Sin cuenta ni registro: todo se guarda en tu dispositivo.
• Exporta a CSV, que se abre en Excel o Sheets, o guarda un respaldo JSON para cambiar de teléfono sin perder nada.
• Borra todos tus datos cuando quieras desde Ajustes.

ADEMÁS
• En español e inglés.
• Tema oscuro, claro o automático.
• Fechas de inicio y fin para lo que dura un tiempo, con atajos de 21 días, 4 semanas o 3 meses.
• Hasta 5 actividades activas a la vez. Archiva las que ya no uses: su historial se conserva.

TraceRoutine no es un dispositivo médico y no diagnostica, trata, cura ni previene ninguna condición. Los recordatorios de medicación o tratamiento son solo organizativos; consulta siempre a un profesional de la salud.

¿Dudas o ideas? Escríbenos a support@mordobo.com.
```

### Keywords (max 100 bytes)

```text
rutina,constancia,recordatorio,seguimiento,tracker,metas,objetivos,diario,entreno,gimnasio,ciclo
```

### What's New (max 4000)

```text
Gracias por usar TraceRoutine. Esta versión corrige errores y mejora la estabilidad.

¿Algo no funciona como esperas? Escríbenos a support@mordobo.com.
```

### Screenshot captions

```text
1. Solo lo que te toca hoy
2. Tu frecuencia real, no solo diaria
3. Si fallas un día, tú decides qué pasa
4. Los días malos también cuentan
5. Tu mes en una cuadrícula
6. Constancia, no rachas
7. Un aviso, solo los días que toca
8. Tus datos viven en tu dispositivo
```

---

## es-ES · Spanish (Spain)

### Name (max 30)

```text
TraceRoutine
```

### Subtitle (max 30)

```text
Hábitos con tu frecuencia real
```

### Promotional text (max 170)

```text
Entrenar en días alternos, fisio L-X-V, leer 3 veces por semana: TraceRoutine sigue tu frecuencia real y solo te pide cuentas los días que tocan. Sin cuenta ni rachas.
```

### Description (max 4000)

```text
No todo es diario. Entrenas un día sí y otro no, vas al fisio lunes, miércoles y viernes, lees 3 veces por semana o riegas las plantas cada 4 días. TraceRoutine registra cualquier actividad con su frecuencia real y solo te pide cuentas los días que tocan.

FRECUENCIAS DE VERDAD
• Todos los días, en días alternos o cada N días, de 1 a 30.
• Días fijos de la semana, como lunes, miércoles y viernes.
• Un número de veces por semana, y tú eliges qué días.
• Ciclos con días de descanso, como A/B/descanso para entrenar.
• Si un día no lo haces, tú decides qué pasa: la actividad sigue el calendario o cuenta desde la última vez.
• Mientras la configuras, ves en el mes qué días te toca.

LOS DÍAS MALOS TAMBIÉN CUENTAN
Cada actividad puede tener una versión mínima: correr 5 km un día normal, caminar 10 minutos un día malo. La mínima cuenta como cumplida y no rompe tu constancia. Si hoy no puedes, omítela con un motivo opcional.

HOY, DE UN VISTAZO
• Primero lo pendiente. Toca el círculo para completar, mantenlo pulsado para la mínima o desliza para omitir.
• Solo marcar, o apuntar minutos o una cantidad: páginas, km, repeticiones.
• ¿Hoy no toca nada? Día libre. No te inventamos tareas.

TU MES EN UNA CUADRÍCULA
Todas tus actividades, día a día: hechas, mínimas, omitidas y los días que no tocaban. Toca una celda pasada para corregir el pasado, sin dramas.

CONSTANCIA, NO RACHAS
La constancia se mide sobre los días que tocaban: la mínima cuenta, los días que no tocan no restan y lo de hoy no cuenta mientras esté pendiente. En Estadísticas ves la constancia del mes y de cada actividad, tu mejor mes, tu mejor día de la semana, el día que más fallas y la tendencia de las últimas 12 semanas.

RECORDATORIOS SIN AGOBIAR
Un aviso por actividad y solo los días que toca. El resumen matinal reúne en una sola notificación lo que toca hoy. Desde el aviso de una actividad puedes marcarla como hecha o mínima sin abrir la app.

TUS DATOS, EN TU MÓVIL
• Sin cuenta ni registro: todo se guarda en tu dispositivo.
• Exporta a CSV, que se abre en Excel o Sheets, o guarda una copia de seguridad en JSON para cambiar de móvil sin perder nada.
• Borra todos tus datos cuando quieras desde Ajustes.

ADEMÁS
• En español e inglés.
• Tema oscuro, claro o automático.
• Fechas de inicio y fin para lo que dura un tiempo, con atajos de 21 días, 4 semanas o 3 meses.
• Hasta 5 actividades activas a la vez. Archiva las que ya no uses: su historial se conserva.

TraceRoutine no es un dispositivo médico y no diagnostica, trata, cura ni previene ninguna condición. Los recordatorios de medicación o tratamiento son solo organizativos; consulta siempre a un profesional sanitario.

¿Dudas o ideas? Escríbenos a support@mordobo.com.
```

### Keywords (max 100 bytes)

```text
rutina,constancia,recordatorio,seguimiento,tracker,metas,objetivos,diario,entrenar,gimnasio,ciclo
```

### What's New (max 4000)

```text
Gracias por usar TraceRoutine. Esta versión corrige errores y mejora la estabilidad.

¿Algo no funciona como esperas? Escríbenos a support@mordobo.com.
```

### Screenshot captions

```text
1. Solo lo que te toca hoy
2. Tu frecuencia real, no solo diaria
3. Si fallas un día, tú decides qué pasa
4. Los días malos también cuentan
5. Tu mes en una cuadrícula
6. Constancia, no rachas
7. Un aviso, solo los días que toca
8. Tus datos se quedan en tu móvil
```

---

## en-US · English (U.S.)

### Name (max 30)

```text
TraceRoutine
```

### Subtitle (max 30)

```text
Habits at your real frequency
```

### Promotional text (max 170)

```text
Train every other day, physio M-W-F, read 3 times a week: TraceRoutine follows your real frequency and only checks in on the days that count. No account, no streaks.
```

### Description (max 4000)

```text
Not everything is daily. You train every other day, go to physio Monday, Wednesday and Friday, read 3 times a week, or water the plants every 4 days. TraceRoutine tracks any activity at its real frequency and only checks in on the days that count.

REAL FREQUENCIES
• Every day, every other day, or every N days, from 1 to 30.
• Fixed weekdays, like Monday, Wednesday and Friday.
• A number of times a week, and you pick the days.
• Cycles with rest days, like push · pull · legs · rest.
• Miss a day and you decide what happens: the activity follows the calendar or counts from the last time.
• While you set it up, the month shows which days it's due.

BAD DAYS COUNT TOO
Every activity can have a minimum version: run 5 km on a normal day, walk 10 minutes on a bad one. The minimum counts as done and never breaks your consistency. Can't do it today? Skip it, with an optional reason.

TODAY AT A GLANCE
• Pending first. Tap the circle to complete, long-press for the minimum, or swipe left to skip.
• Just a check, or log minutes or an amount: pages, km, reps.
• Nothing due today? Free day. We don't invent tasks.

YOUR MONTH IN ONE GRID
All your activities, day by day: done, minimum, skipped, and the days that weren't due. Tap a past cell to edit the past, no drama.

CONSISTENCY, NOT STREAKS
Consistency is measured over the days that were due: the minimum counts, off days never hurt, and today doesn't count while it's pending. Stats shows the month's consistency and each activity's, your best month, your best weekday, the day you miss most, and the trend over the last 12 weeks.

REMINDERS WITHOUT NAGGING
One heads-up per activity, only on the days it's due. The morning summary folds today's list into a single notification. From an activity's notification you can mark it done or minimum without opening the app.

YOUR DATA STAYS ON YOUR PHONE
• No account, no sign-up: everything is stored on your device.
• Export to CSV, which opens in Excel or Sheets, or save a JSON backup to switch phones without losing anything.
• Delete all your data from Settings whenever you like.

ALSO
• English and Spanish.
• Dark, light or automatic theme.
• Start and end dates for things that last a while, with 21-day, 4-week and 3-month shortcuts.
• Up to 5 active activities at a time. Archive the ones you no longer use: their history is kept.

TraceRoutine is not a medical device and does not diagnose, treat, cure or prevent any condition. Medication or treatment reminders are organizational only; always consult a healthcare professional.

Questions or ideas? Write to support@mordobo.com.
```

### Keywords (max 100 bytes)

```text
routine,tracker,reminder,consistency,goals,daily,planner,schedule,workout,gym,checklist,cycle,log
```

### What's New (max 4000)

```text
Thanks for using TraceRoutine. This version fixes bugs and improves stability.

Something not working as you expect? Write to support@mordobo.com.
```

### Screenshot captions

```text
1. Only what's due today
2. Your real frequency, not just daily
3. Miss a day? You decide what happens
4. Bad days count too
5. Your month in one grid
6. Consistency, not streaks
7. One heads-up, only on due days
8. Your data lives on your device
```

---

## Character counts

Characters are Unicode code points; keywords are UTF-8 bytes, which is how App Store Connect counts them (an accented letter takes 2). `src/release/storeListing.test.ts` recomputes every row and fails if one drifts from the texts above.

| Locale | Field | Used | Limit |
|---|---|---|---|
| es-MX | Name | 12 | 30 |
| es-MX | Subtitle | 30 | 30 |
| es-MX | Promotional text | 167 | 170 |
| es-MX | Description | 2716 | 4000 |
| es-MX | Keywords | 96 | 100 bytes |
| es-MX | What's New | 151 | 4000 |
| es-ES | Name | 12 | 30 |
| es-ES | Subtitle | 30 | 30 |
| es-ES | Promotional text | 167 | 170 |
| es-ES | Description | 2724 | 4000 |
| es-ES | Keywords | 97 | 100 bytes |
| es-ES | What's New | 151 | 4000 |
| en-US | Name | 12 | 30 |
| en-US | Subtitle | 29 | 30 |
| en-US | Promotional text | 165 | 170 |
| en-US | Description | 2599 | 4000 |
| en-US | Keywords | 97 | 100 bytes |
| en-US | What's New | 146 | 4000 |

**What's New** only appears from the first update on: App Store Connect does not show it for 1.0.0. The text above is ready for the first 1.x update (1.0.1 or 1.1); replace the middle sentence with that release's real changes before submitting it.

---

## App information (App Store Connect → App Information)

| Field | Value |
|---|---|
| Name / Subtitle | Per locale, above |
| Primary language | Spanish (Mexico). Set it when creating the app record by hand (App Store Connect → Apps → + → New App); if `eas submit` creates the record it uses English (U.S.), see RELEASE-IOS.md §2. |
| Localizations | Spanish (Mexico), Spanish (Spain), English (U.S.) |
| Bundle ID / SKU | `app.traceroutine` / `traceroutine-ios` |
| Primary category | Productivity |
| Secondary category | Lifestyle |
| Content rights | **No**, it does not contain, show, or access third-party content. Everything on screen is what the user types on the device; the bundled Inter font (SIL Open Font License) and Phosphor icons (MIT) are licensed assets, not third-party content. |
| Age rating | **4+**, questionnaire below |
| Privacy Policy URL | es-MX and es-ES: `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html` · en-US: `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html#en` |
| User Privacy Choices URL | Leave empty (there is nothing to opt out of) |
| License agreement | Apple's standard EULA (no custom agreement) |

Health & Fitness and Medical are avoided on purpose: TraceRoutine tracks any activity and keeps a non-medical position (TR-81).

## Version information (iOS app → 1.0 Prepare for Submission)

| Field | Value |
|---|---|
| Version | 1.0.0 (from `app.json`; EAS sets the build number) |
| Support URL | es-MX and es-ES: `https://angelorivasmordobo.github.io/TraceRoutine/support.html` · en-US: `https://angelorivasmordobo.github.io/TraceRoutine/support.html#en` |
| Marketing URL | Leave empty (optional). There is no product page today: `https://angelorivasmordobo.github.io/TraceRoutine/` has no index (404) and `mordobo.com` does not present the app. |
| Copyright | `2026 MORDOBO TECHNOLOGIES LLC` |
| Routing App Coverage File | None |
| Version release | Manually release this version (Angelo releases it after approval) |

**URL check (2026-10-20, `curl -sI`)**: `privacy.html` → **200**, and the published page already names MORDOBO TECHNOLOGIES LLC and `support@mordobo.com`. `support.html` is created by this branch (`docs/support.html`); GitHub Pages serves `/docs` from `main`, so it returns 404 until this branch is merged. Check it returns 200 before filling in the Support URL:

```bash
curl -sI https://angelorivasmordobo.github.io/TraceRoutine/support.html | head -1
```

## Pricing and availability

| Field | Value |
|---|---|
| Price | Free (no in-app purchases in this version) |
| Availability | All countries or regions **except China mainland** |
| Apple silicon Mac / Apple Vision Pro | Owner decision. Suggested: uncheck both for 1.0, since the app was only tested on iPhone (and iPad compatibility mode). |

Before the app can be distributed in the EU (Spain is a target market), the EU Digital Services Act trader status of MORDOBO TECHNOLOGIES LLC has to be declared in App Store Connect → Business (RELEASE-IOS.md §1).

---

## App Privacy

**Answer**: App Privacy → Get Started → "Do you or your third-party partners collect data from this app?" → **No, we do not collect data from this app** → Publish. The label reads **Data Not Collected**.

| Question | Answer |
|---|---|
| Data types collected | None |
| Data linked to the user | None (no data is collected) |
| Data used to track the user | None. Tracking: **No**. No App Tracking Transparency prompt, no IDFA, no `NSUserTrackingUsageDescription`. |

Re-derived from the code on 2026-10-20 (`origin/main` at `3a7d662`), not copied from older notes:

- **No network code.** `app/` and `src/` contain no `fetch`, `XMLHttpRequest` or `WebSocket`. The only outbound paths are the two SDKs below, both off on iOS.
- **PostHog is never created on iOS**: `initPostHog()` returns before building the client when `analyticsAllowed(Platform.OS)` is false (`src/analytics/posthog.ts`, `src/analytics/policy.ts`), whatever keys the build carries. Settings hides the usage-stats switch on iOS (`app/(tabs)/settings.tsx`). Guarded by `src/analytics/platform.test.ts`.
- **Sentry starts with no DSN on iOS**: `initSentry()` passes `dsn: undefined` and `enabled: false` when `analyticsAllowed` is false (`src/analytics/sentry.ts`), so nothing is sent. The native Sentry SDK is still linked into the binary, and its own privacy manifest (sentry-cocoa `PrivacyInfo.xcprivacy`) lists Crash Data, Performance Data and Other Diagnostic Data, not linked and not tracking. That describes what the SDK collects when it is configured; this build never configures it, so it does not change the answer. Xcode's privacy report may still list those types.
- **Storage is on the device**: SQLite through `expo-sqlite` (`src/data/`). No account, no sign-in, no server. An iCloud or computer backup of the phone may include the database; that copy is in the user's own account and the developer cannot reach it (as `docs/privacy.html` says), so it is not collection.
- **Reminders are local notifications** (`src/reminders/service.ts`): no push token is ever requested (`getExpoPushTokenAsync` / `getDevicePushTokenAsync` are not called) and there is no APNs key.
- **No over-the-air updates**: `expo-updates` is not installed, so the app never contacts an update server. Fonts (`@expo-google-fonts/inter`) are bundled files, not downloaded.
- **User-initiated hand-offs only**: "Export CSV", "Save backup (JSON)" use the system share sheet and "Import backup" uses the Files picker (`src/data/files.ts`); "Privacy" opens the policy in Safari; "Send feedback" opens the user's own mail app with a draft to `support@mordobo.com` (app version and platform in the body). The app transmits none of this itself; the user chooses where it goes.
- **Bundled SDK privacy manifests** (Expo modules and React Native in `node_modules`): none declares collected data types; all declare no tracking.

If a later iOS version turns on PostHog or Sentry, App Privacy and `docs/privacy.html` change before that build is submitted (RELEASE-IOS.md §5 has the expected answers).

---

## Age rating (App Store Connect → App Information → Age Rating)

Apple's current questionnaire (the 2025 update with the 4+ / 9+ / 13+ / 16+ / 18+ ratings).

**Step 1 · In-app controls and capabilities**

| Question | Answer | Why |
|---|---|---|
| Parental controls | No | None in the app |
| Age assurance | No | No age check |
| Unrestricted web access | No | No in-app browser; "Privacy" opens one page in Safari |
| User-generated content | No | What users type stays on their own device; no one else can see it |
| Messaging and chat | No | No communication between users |
| Social media | No | No profiles, feed, followers or sharing between users |
| Advertising | No | No ads of any kind |

**Step 2 · Content**

| Section | Question | Answer |
|---|---|---|
| Mature themes | Profanity or crude humor · Horror or fear themes · Alcohol, tobacco, or drug use or references | None · None · None |
| Medical or wellness | Medical or treatment information | None |
| Medical or wellness | Health or wellness topics | No (*) |
| Sexuality or nudity | Mature or suggestive themes · Sexual content or nudity · Graphic sexual content and nudity | None · None · None |
| Violence | Cartoon or fantasy violence · Realistic violence · Prolonged graphic or sadistic realistic violence · Guns or other weapons | None · None · None · None |
| Chance-based activities | Simulated gambling · Contests | None · None |
| Chance-based activities | Gambling · Loot boxes | No · No |

**Step 3 · Additional information**

| Field | Answer |
|---|---|
| Calculated rating | **4+** |
| Age categories and override | Not Applicable (not Made for Kids, no override) |
| Age Suitability URL | Leave empty |

**Resulting rating: 4+** (App Store Connect shows each region's equivalent label).

(*) Owner decision (also in RELEASE-IOS.md §6). TraceRoutine tracks any routine; its built-in examples include training, physio and a "Treatment every 2 days" suggestion, but it gives no health or medical content and reads no health data. Answering **Yes** to Health or wellness topics raises the rating to **9+**; nothing else changes.

---

## App Review information

| Field | Value |
|---|---|
| Sign-in required | **No** (leave the demo account empty) |
| Contact | Angelo Rivas · Angelo's phone · `support@mordobo.com` |
| Attachment | None |

**Notes** (paste as is):

```text
TraceRoutine is a local-first routine tracker for iPhone. There is no account or sign-in, so no demo account is needed: all data is stored on the device (SQLite). This version has no in-app purchases, no subscriptions and no ads, and no analytics or crash-reporting service is active, so the app sends no data (App Privacy: Data Not Collected). The app allows up to 5 active activities at a time.

How to review:
1. On first launch, the onboarding can be skipped ("Skip"). Then pick a suggestion such as "Train every other day": the activity editor opens prefilled; tap "Create activity". "Something else" opens an empty editor, and the "+" button in the middle of the tab bar creates more activities.
2. Today: tap the circle to mark an activity done, long-press it to log the minimum version, or swipe the row left to skip it with an optional reason. Tapping the activity name opens a menu with the same actions ("I did the minimum", "Skip", "Edit"), also available to VoiceOver.
3. Month shows the month grid; tap a past cell to change it. Stats shows consistency over scheduled days only; patterns appear after 14 scheduled days and the 12-week trend after two weeks of logs.
4. Settings: language (ES/EN), theme, reminders (local notifications only), "Export CSV" and "Save backup (JSON)" through the share sheet, "Import backup" from Files, "Privacy" (privacy policy in Safari), "Send feedback" (opens Mail to support@mordobo.com) and "Delete all data" (asks to type DELETE, or BORRAR in Spanish).
5. Reminders: the notification permission is requested after a short explanation, either from Settings ("Turn on reminders") or the first time an activity with a reminder is saved (new activities have one at 08:00 by default). Notifications arrive only on the days an activity is due.
6. With 5 active activities, opening the editor for a new one shows a message; "See my activities" opens Month, and an activity's editor has "Archive".

Non-medical notice: TraceRoutine is a general-purpose routine tracker. Some example activities mention training, physiotherapy or a treatment, but the app gives no medical advice, does not diagnose or treat anything and reads no health data (no HealthKit). Reminders are organizational only; the privacy policy carries the same notice. The app handles no money and gives no financial advice.

The app is for iPhone; on iPad it runs in iPhone compatibility mode.

Support: support@mordobo.com
```

---

## Export compliance

Already declared in the binary: `app.json` → `ios.config.usesNonExemptEncryption: false` writes `ITSAppUsesNonExemptEncryption = NO` to Info.plist (guarded by `src/release/storeConfig.test.ts`), so App Store Connect and TestFlight do not ask. If a build ever asks anyway, the answer is that the app uses no encryption beyond what iOS itself provides: "None of the algorithms mentioned above". No export compliance documents or French declaration are needed.

---

## Screenshots (6.9-inch iPhone, 1320 × 2868 px, portrait)

Produced separately. Capture them from the TestFlight build on a real iPhone (RELEASE-IOS.md §8), with the app in the screenshot's language and the default dark theme. The es-MX and es-ES sets can use the same Spanish screenshots with their own captions; en-US needs the app in English.

**Sample data** (create it before capturing; at most 5 active activities). Set each activity's "Empieza" / "Starts" date 3 to 4 weeks back and fill the past by tapping cells in Month, so Stats has numbers and a trend. Avoid medication or treatment activities in the screenshots.

| Spanish | English | Frequency | Log type and minimum |
|---|---|---|---|
| Entrenar | Gym | Cycle Empuje · Jalón · Pierna · Descanso / Push · Pull · Legs · Rest, counts from the last time | Check · "20 min de movilidad" / "20 min mobility" |
| Leer | Read | 3 times a week | Amount in "páginas" / "pages" · "1 página" / "1 page" |
| Guitarra | Guitar | Monday, Wednesday and Friday | Minutes · "5 min" |
| Regar plantas | Water plants | Every 3 days, counts from the last time | Check |
| Meditar | Meditate | Every day | Minutes · "2 min" |

**Screens, in order** (captions per locale are in each locale's "Screenshot captions" box above; if only 5 are uploaded, use 1, 2, 4, 5 and 6):

| # | Screen | What it shows |
|---|---|---|
| 1 | Today | Pending activities first, one already done, the "2 de 4 hechas" / "2 of 4 done" line |
| 2 | Editor · Frequency | "Cada N" / "Every N" (or "Semana" / "Weekly") selected, with the month preview below |
| 3 | Editor · "Si un día no lo haces" / "If you miss a day" | The two cards, "Sigue el calendario" and "Cuenta desde la última vez" / "Follows the calendar" and "Counts from the last time" |
| 4 | Today · minimum | A row logged as the minimum (long-press), or the "¿Cuánto?" / "How much?" sheet for minutes |
| 5 | Month | The grid with done, minimum, skipped and off days, and today marked |
| 6 | Stats | Month consistency, per activity, best month, best and worst weekday, 12-week trend |
| 7 | Reminders | Settings → "Activar avisos" / "Turn on reminders" with the explanation "Un aviso, solo los días que toca" / "One heads-up, only on due days" on screen (it only shows before the permission is answered, so capture it on a fresh install) |
| 8 | Settings | Language, theme, reminders, export and backup rows and the "Tus datos viven en tu dispositivo" / "Your data lives on your device" footer |

No screenshot may show prices, a paid plan or anything marked as coming later. An optional app preview video (the 20-second grid video of TR-80) can go with the screenshots.
