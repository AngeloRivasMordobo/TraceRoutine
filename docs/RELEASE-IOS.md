# Publicar TraceRoutine en el App Store (iOS)

Guía para la primera versión en iOS (1.0.0). Decisiones del dueño del producto, 19 de octubre de 2026:

- **Cuenta de Apple**: membresía de organización **MORDOBO TECHNOLOGIES LLC**, Team ID **CTC5PRH3D3**. Ese nombre legal exacto va en el copyright y en los textos legales.
- **Compilación**: los builds de tienda se hacen con **EAS** (imagen iOS fijada en `sdk-57`). No hay build local con Xcode.
- **Solo iPhone** (`ios.supportsTablet: false`). No hay que preparar nada para iPad.
- **Sin compras en iOS v1**: ni tarjeta Pro, ni precios, ni "Avísame cuando esté listo". Al llegar al límite de 5 actividades activas se muestra un mensaje neutro, sin venta. Las compras llegan en una versión posterior (TR-96). Android no cambia.
- **Correo público de soporte**: `support@mordobo.com` (Angelo tiene que crearlo, ver §1).

No hay guía de publicación de Android en este repo; esta guía sigue el orden real del proceso en App Store Connect.

---

## 0. Qué ya está hecho en el código

| Qué | Dónde | Lo protege |
|---|---|---|
| Solo iPhone, bundle `app.traceroutine`, `usesNonExemptEncryption: false` (no aparece "Missing Compliance" en TestFlight), `CFBundleLocalizations` en/es | `app.json` | `src/release/storeConfig.test.ts` |
| Carpetas `en.lproj` / `es.lproj` para que el App Store muestre Español e Inglés, solo en iOS | `plugins/withIosLocales.js`, `locales/*.json` | `storeConfig.test.ts` |
| Perfil `production` con imagen `sdk-57`, `submit.production.ios` (bundle, equipo CTC5PRH3D3, nombre TraceRoutine); el perfil de Google Play queda igual | `eas.json` | `storeConfig.test.ts` |
| Enlace a la política de privacidad en Ajustes y "Enviar comentarios" a `support@mordobo.com` (ambas plataformas) | `src/about/links.ts` | `src/about/links.test.ts` |
| La app arranca en el idioma del dispositivo (ambas plataformas) | `src/i18n/device.ts` | `device.test.ts`, `appStore.test.ts` |
| **Solo iOS**: las hojas inferiores suben sobre el teclado (valor con teclado decimal, confirmación escribiendo BORRAR/DELETE); el editor desplaza el campo enfocado por encima del teclado | `src/ui/controls.tsx` (`Sheet`), `app/editor.tsx` | revisión en iPhone real (no se puede probar en Vitest ni en web) |
| **Solo iOS**: sin tarjeta Pro en Ajustes; alerta neutra al llegar a 5 actividades activas | `src/store/limits.ts` (`showsPro`, `freeLimitPrompt`), `app/(tabs)/settings.tsx`, `app/editor.tsx` | `src/store/limits.test.ts` |

Antes de cada build: `npm test`, `npm run typecheck` y `npm run lint` en verde.

---

## 1. Configuración única (compartida con las demás apps de Mordobo)

Se hace una sola vez por cuenta; TraceCosts, TracePhysique y las siguientes apps reutilizan lo mismo.

- [ ] **Acuerdos**: en developer.apple.com y en App Store Connect → Negocio, aceptar los acuerdos pendientes con el usuario Account Holder. Para apps gratuitas basta el acuerdo de apps gratuitas. El acuerdo de apps de pago, los datos bancarios y fiscales solo hacen falta cuando haya compras (TR-96).
- [ ] **Ley de Servicios Digitales (UE)**: en App Store Connect → Negocio, declarar el estado de **comerciante** (trader) de MORDOBO TECHNOLOGIES LLC con dirección, teléfono y correo, que se muestran en la ficha de la UE. Sin esta declaración la app no se distribuye en la UE, y España es mercado objetivo.
- [ ] **Correo de soporte**: crear `support@mordobo.com` y probar que recibe correo. Lo usan la app ("Enviar comentarios"), la política de privacidad, la ficha y las notas para la revisión.
- [ ] **URL de soporte**: App Store Connect pide una **URL**, no un correo. Hace falta una página pública con el contacto, por ejemplo una página de soporte en el mismo GitHub Pages que la política. Está pendiente de decidir y de crear.
- [ ] **Política de privacidad en línea**: `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html` (español; inglés en `#en`). La versión que nombra a MORDOBO TECHNOLOGIES LLC y a `support@mordobo.com` está en esta rama, y la página publicada solo cambia cuando llegue a la rama que sirve GitHub Pages. Hay que comprobarlo antes de enviar a revisión.
- [ ] **Expo / EAS**: cuenta `angeloleonelrivas` (dueña del proyecto en `app.json`). Usar Node 22, porque EAS CLI ya avisa de que Node 20 está obsoleto. Iniciar sesión con `npx eas-cli@latest login`.
- [ ] **Credenciales de equipo en EAS** (se crean en el primer build y el primer envío interactivos, §3):
  - *Certificado de distribución (Apple Distribution)*: si EAS ofrece uno existente del equipo, **reutilizarlo**. **No revocar nunca** un certificado: los perfiles de las otras apps dependen de él.
  - *Clave de API de App Store Connect* para EAS Submit: se crea una por equipo con rol Admin y sirve para todas las apps.
  - *Clave de notificaciones push (APNs)*: **no** hace falta, porque TraceRoutine solo usa notificaciones locales.

---

## 2. Ficha de la app en App Store Connect

App Store Connect → Apps → **+** → Nueva app. Otra opción: dejar que `eas submit` la cree en el §3, porque usa `appName` de `eas.json`. En ese caso el idioma principal es Inglés (EE. UU.), salvo que antes se añadan `language` (por ejemplo `es-MX`) y `sku` en `submit.production.ios`, y entonces también hay que actualizar `storeConfig.test.ts`. Crearla a mano evita tocar `eas.json`.

| Campo | Valor |
|---|---|
| Plataforma | iOS |
| Nombre | `TraceRoutine` (tiene que estar libre en el App Store; si no lo está, ver TR-86) |
| Idioma principal | **Decisión del dueño**. Sugerencia: Español (México) si LATAM es el mercado principal. Es el idioma que se muestra donde no hay traducción. |
| Bundle ID | `app.traceroutine` (EAS lo registra en el primer build; si no aparece en la lista, registrarlo en developer.apple.com → Identifiers) |
| SKU | `traceroutine-ios` (interno, no se muestra) |
| Acceso de usuarios | Acceso completo |

Después, en **Información de la app**:

- [ ] **Localizaciones**: Español e Inglés, las mismas que declara el binario.
- [ ] **Subtítulo** (30 caracteres como máximo; sugerencia, la copia final es de TR-80): ES "Tu frecuencia real, sin culpa" · EN "Your real frequency. No guilt."
- [ ] **Categoría**: decisión del dueño. Sugerencia: Productividad como principal y Estilo de vida como secundaria. Evitar Medicina, por el posicionamiento no médico de TR-81.
- [ ] **Derechos de contenido**: "No contiene, muestra ni accede a contenido de terceros".
- [ ] **Clasificación por edad**: ver §6.
- [ ] **URL de la política de privacidad**: ES `…/privacy.html`, EN `…/privacy.html#en`.
- [ ] **Copyright**: `2026 MORDOBO TECHNOLOGIES LLC`.
- [ ] **Precio y disponibilidad**: Gratis. Países: decisión del dueño (todos, o LATAM + España + EE. UU.).
- [ ] Copiar el **Apple ID** numérico de la app (Información de la app → Apple ID) para el §3.

Ficha de la versión 1.0 (por idioma): descripción, palabras clave, texto promocional, URL de soporte, URL de marketing (opcional), capturas (§8), build, notas para la revisión (§7) y contacto para la revisión (nombre, teléfono y correo de Angelo).

> **Regla v1 en la ficha**: no mencionar Pro, precios, planes, "próximamente" ni funciones que no estén en el binario (widget, compartir el mes, plantillas). La app tampoco las muestra en iOS. La guía 2.1 de Apple pide quitar el contenido provisional.

---

## 3. Primer build y envío con EAS (Angelo, interactivo)

Desde un checkout con esta rama fusionada:

```bash
npm ci
npm test && npm run typecheck && npm run lint
npx eas-cli@latest env:list --environment production        # solo nombres; ver §5 antes de seguir
npx eas-cli@latest build --platform ios --profile production
```

Preguntas del primer build y qué responder:

| Pregunta de EAS | Respuesta |
|---|---|
| Iniciar sesión en la cuenta de Apple | Sí, con el Apple ID de rol Account Holder o Admin del equipo (2FA) |
| Equipo | MORDOBO TECHNOLOGIES LLC (CTC5PRH3D3) |
| Registrar el bundle `app.traceroutine` | Sí |
| Certificado de distribución | Reutilizar el existente del equipo; si no hay ninguno, crearlo. No revocar. |
| Perfil de aprovisionamiento | Generar uno nuevo |
| Configurar notificaciones push | No (solo hay notificaciones locales) |

- El número de build lo lleva EAS (`appVersionSource: remote`, `autoIncrement`). El primer build de iOS empieza en su propio contador, separado del `versionCode` de Android. La versión visible (1.0.0) sale de `app.json`.
- El build suele tardar entre 15 y 30 min más la espera en la cola de EAS. El enlace aparece en expo.dev.

Envío a App Store Connect:

```bash
npx eas-cli@latest submit --platform ios --profile production --latest
```

- La primera vez pide la clave de API de App Store Connect (crearla o elegir la del equipo) y, si la app no existe todavía, ofrece crearla.
- Apple procesa el build en 5–30 min. Llega un correo y el build aparece en TestFlight. No debería pedir cumplimiento de exportación.
- Si Apple envía un aviso **ITMS-91053** (motivos de API en el manifiesto de privacidad), hay que añadir `ios.privacyManifests` en `app.json` con los motivos que indique el correo y volver a compilar.
- **Después del primer envío**: añadir `"ascAppId": "<Apple ID>"` en `eas.json` → `submit.production.ios`, para que los siguientes envíos no sean interactivos. Va en un commit aparte que también actualice `storeConfig.test.ts`.
- **Enviar a revisión**: lo pulsa Angelo en App Store Connect cuando la ficha esté completa (§2, §5–§8).

> CI: el job `preview-build` de `.github/workflows/ci.yml` ejecuta `eas build --profile preview --platform all --non-interactive`. En iOS ese perfil es distribución interna (ad hoc), que necesita dispositivos registrados y credenciales ad hoc, así que fallará en modo no interactivo. Decisión pendiente: limitarlo a `--platform android` o preparar credenciales ad hoc.

---

## 4. TestFlight

- [ ] **Pruebas internas**: crear un grupo interno (hasta 100 usuarios con acceso a App Store Connect). No pasa por revisión. Instalar desde la app TestFlight en el iPhone.
- [ ] **Pruebas externas** (opcional, beta cerrada): requieren la revisión de beta de Apple y la información de prueba (descripción de la beta, correo de comentarios `support@mordobo.com`, URL de la política).

Revisión en iPhone real (la definición de hecho del repo la exige):

1. **Teclado sobre hojas inferiores**
   - Crear una actividad con "Tipo de registro" *Minutos* o *Una cantidad* y tocar su círculo en Hoy. Aparece la hoja "¿Cuánto?" / "How much?". Al tocar el campo, la hoja sube sobre el teclado decimal, el número se ve y "Listo" / "Done" se puede pulsar sin cerrar el teclado.
   - Ajustes → "Borrar todos los datos" → "Borrar de todas formas". Al escribir en el campo de "Escribe BORRAR para confirmar", el campo y el botón quedan sobre el teclado. Cerrar tocando fuera, **sin borrar**.
   - Editor: con el teclado abierto, al enfocar los campos de abajo (unidad, "Versión mínima", paso del ciclo, fechas de inicio y fin), cada uno queda visible sobre el teclado.
   - Probar en un iPhone pequeño (SE o mini) si es posible.
2. **Sin Pro en iOS**: Ajustes no muestra la tarjeta "TraceRoutine Pro" ni "Avísame cuando esté listo". Con 5 actividades activas, crear una sexta muestra la alerta "Tienes 5 actividades activas" / "You have 5 active activities" con "Cancelar" y "Ver archivadas", y sin "Conocer Pro".
3. **Idioma**: con el iPhone en español la app abre en español. En Ajustes de iOS → TraceRoutine → Idioma aparecen Español e Inglés.
4. **Recordatorios**: el aviso previo y luego el permiso del sistema. La notificación llega solo los días que toca, con las acciones "Hecha" / "Mínima" (EN "Done" / "Minimum").
5. **Datos**: Exportar CSV y Guardar respaldo (JSON) abren la hoja de compartir. Importar respaldo abre Archivos. Privacidad abre la política. "Enviar comentarios" abre Mail con `support@mordobo.com`; si Mail no está instalado, aparece la dirección en una alerta.
6. **Temas** oscuro, claro y automático.
7. **Android**: nada de esto cambia el build de Google Play. Si se sube un build nuevo de Android, hacer una prueba rápida de la tarjeta Pro, la alerta del límite (con "Conocer Pro") y las hojas.

---

## 5. Privacidad de la app (App Privacy)

### Comprobación (19 de octubre de 2026)

- `npx eas-cli env:list` (solo nombres, sin leer valores) en los entornos `production`, `preview` y `development` del proyecto, y en `production` de la cuenta: **no hay ninguna variable**. No existen en EAS `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`, `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` ni `SENTRY_AUTH_TOKEN`.
- `app.config.js` solo añade el plugin de Sentry si existen `SENTRY_ORG` y `SENTRY_PROJECT`, así que en producción no se añade y no se suben source maps.
- `src/analytics/posthog.ts` no crea el cliente sin `EXPO_PUBLIC_POSTHOG_KEY`, y `src/analytics/sentry.ts` arranca con `enabled: !!dsn`, que da `false`.
- `.env` está en `.gitignore`, así que EAS no lo sube, y en este checkout no existe.
- Los SDK de Sentry (nativo) y PostHog (JS) quedan dentro del binario, pero inactivos: sin clave ni DSN no hacen ninguna petición de red.

**Conclusión**: el build de producción no envía ningún dato.

### Respuesta en App Store Connect

App Privacy → Empezar → "¿Usted o sus socios externos recopilan datos de esta app?" → **No, no recopilamos datos de esta app** → Publicar. La etiqueta queda en **"Datos no recopilados"**.

Por qué es correcto:

- No hay cuenta ni registro. Todo se guarda en SQLite en el dispositivo.
- Los recordatorios son notificaciones locales, sin servidor.
- "Enviar comentarios" abre la app de correo del usuario, que es quien envía el mensaje. La app no transmite nada.
- Exportar y respaldar usa la hoja de compartir, y el usuario elige el destino.
- No hay publicidad, ni IDFA, ni rastreo, así que no hace falta el aviso de App Tracking Transparency.
- Coincide con la política publicada: "La versión actual no transmite ningún dato".

### Si más adelante se activan PostHog o Sentry

Antes de enviar **ese** build hay que actualizar App Privacy y la política de privacidad, porque la etiqueta debe coincidir con el binario. Respuestas previstas, que habrá que confirmar entonces:

- **Datos de uso → Interacción con el producto**: analítica; no vinculados a la identidad; sin rastreo.
- **Diagnóstico → Datos de fallos** (y "Otros datos de diagnóstico" si se envían): funcionalidad de la app y analítica; no vinculados; sin rastreo.
- **Identificadores**: PostHog genera un ID anónimo por instalación. Hay que decidir si se declara como "ID del dispositivo".

Comprobación rápida antes de cada build: `npx eas-cli@latest env:list --environment production`. Si aparecen nombres de PostHog o Sentry, la respuesta de este apartado ya no vale.

---

## 6. Clasificación por edad

Cuestionario de App Store Connect (Información de la app → Clasificación por edad). Respuesta: **Ninguno / No** en todo.

| Bloque | Pregunta | Respuesta |
|---|---|---|
| Controles en la app | Controles parentales · Verificación de edad | No · No |
| Capacidades | Acceso web sin restricciones · Contenido generado por usuarios · Mensajería o chat · Publicidad | No · No · No · No (la app solo abre su política en Safari) |
| Temas para adultos | Lenguaje soez o humor grosero · Terror o miedo · Alcohol, tabaco o drogas | Ninguno |
| Médico o bienestar | Información médica o de tratamiento · Temas de salud o bienestar | Ninguno · No (*) |
| Sexualidad o desnudez | — | Ninguno |
| Violencia | Animada o fantástica · Realista · Prolongada o gráfica · Armas | Ninguno |
| Actividades de azar | Apuestas simuladas · Apuestas · Concursos · Cajas de botín | Ninguno · No · No · No |
| Hecha para niños | — | No |

Resultado esperado: **4+**.

(*) Decisión del dueño: TraceRoutine registra rutinas (incluida la sugerencia "Tratamiento cada 2 días") pero no da información médica ni de bienestar, y la política lo deja claro en "Aviso no médico". Si se prefiere declarar algo aquí, revisar cómo cambia la clasificación.

---

## 7. Notas para la revisión (App Review Information)

- **¿Requiere inicio de sesión?** No. No hace falta cuenta de demostración.
- **Contacto**: Angelo Rivas, teléfono de Angelo, `support@mordobo.com`.
- **Notas** (en inglés, para pegar tal cual):

```text
TraceRoutine is a local-first routine tracker. There is no account or sign-in: all data is stored on the device (SQLite). This version has no in-app purchases, no ads, and no analytics or crash reporting service configured, so it sends no data. The app allows up to 5 active activities at a time.

How to review:
1. On first launch the onboarding can be skipped ("Skip"). Then pick a suggestion such as "Train every other day" to create a first activity, or tap "Something else". The "+" tab creates more activities.
2. Today: tap the circle to mark an activity done, long-press it to log the minimum version, or swipe the row left to skip it with an optional reason. Tapping the activity name opens a menu with the same actions ("I did the minimum", "Skip", "Edit"), also available to VoiceOver.
3. Month shows the month grid; tap a past cell to change it. Stats shows consistency over scheduled days only.
4. Settings: language (ES/EN), theme, reminders (local notifications only, requested after an explanation), "Export CSV" and "Save backup (JSON)" through the share sheet, "Import backup" from Files, "Privacy" (privacy policy), "Send feedback" (email) and "Delete all data" (asks to type DELETE, or BORRAR in Spanish).

The "Share anonymous usage stats" switch is an opt-out kept for future versions; no analytics service is configured in this build.

Support: support@mordobo.com
```

---

## 8. Capturas de pantalla (solo iPhone)

Como la app es solo para iPhone, **no hay que subir capturas de iPad**.

| Pantalla | Tamaños aceptados (vertical, px) | ¿Obligatoria? |
|---|---|---|
| iPhone 6,9" | 1320 × 2868 · 1290 × 2796 · 1260 × 2736 | Sí, salvo que se suban las de 6,5" |
| iPhone 6,5" | 1284 × 2778 · 1242 × 2688 | Solo si no se suben las de 6,9" |

- Entre 1 y 10 capturas por idioma (ES y EN), en PNG o JPEG sin transparencia. Apple reduce las de 6,9" a las pantallas más pequeñas.
- Conjunto sugerido (5 por idioma, con la app en ese idioma): Hoy con actividades pendientes · Mes (cuadrícula) · Editor con la frecuencia y la vista previa del mes · Estadísticas · Recordatorio o la pantalla "No todo es diario".
- **Cómo sacarlas sin Xcode**: desde el build de TestFlight en un iPhone real. Un iPhone 16 Pro Max da 1320 × 2868, y un 14/15 Pro Max o un Plus da 1290 × 2796. Con un iPhone de 6,1" (1179 × 2556) la proporción es la misma (diferencia menor de 0,1 %) y basta con escalarla: `sips -z 2796 1290 captura.png --out captura-6.9.png`.
- No usar capturas de la versión web: la tipografía, los selectores y la barra de estado no son los de iOS, y Apple pide capturas de la app en uso (guía 2.3.3).
- El vídeo de vista previa es opcional (el vídeo de 20 s de la cuadrícula de TR-80 puede ir aquí).
- Ninguna captura debe mostrar Pro, precios ni "próximamente".

---

## 9. Después de la aprobación

- **Publicación**: manual (recomendado: Angelo la publica cuando esté listo) o automática. El lanzamiento por fases de 7 días solo afecta a las actualizaciones automáticas de versiones posteriores; la 1.0 está disponible para todos desde el primer día.
- **Seguimiento de 72 h** (TR-82): sin Sentry, los fallos se ven en App Store Connect (TestFlight → Fallos y Analítica de la app) y en los comentarios de TestFlight y de `support@mordobo.com`.
- **Siguiente versión de iOS**: subir `version` en `app.json` (el número de build lo sigue llevando EAS). Las compras (TR-96) piden el acuerdo de apps de pago, los productos en App Store Connect (TR-87) y quitar la condición `showsPro` en `src/store/limits.ts`.

---

## Pendientes del dueño (resumen)

- [ ] Crear `support@mordobo.com` y decidir la **URL de soporte**.
- [ ] Declarar el estado de comerciante para la DSA de la UE.
- [ ] Llevar la política actualizada a la rama de GitHub Pages.
- [ ] Decidir el idioma principal, las categorías, los países y el subtítulo de la ficha.
- [ ] Confirmar la clasificación por edad (pregunta de salud o bienestar).
- [ ] Primer build y envío interactivo (§3), y luego `ascAppId` en `eas.json`.
- [ ] Decidir qué hacer con el build iOS de vista previa en CI.
- [ ] Revisión en iPhone real (§4) y capturas (§8).
- [ ] Pulsar "Enviar a revisión".
