# Publicar TraceRoutine en el App Store (iOS)

Guía para la primera versión en iOS (1.0.0). Decisiones del dueño del producto, 19 de octubre de 2026:

- **Cuenta de Apple**: membresía de organización **MORDOBO TECHNOLOGIES LLC**, Team ID **CTC5PRH3D3**. Ese nombre legal exacto va en el copyright y en los textos legales.
- **Compilación**: los builds de tienda se hacen con **EAS** (imagen iOS fijada en `sdk-57`). No hay build local con Xcode.
- **Solo iPhone** (`ios.supportsTablet: false`): no hay capturas ni diseño de iPad. Aun así, el App Store deja instalar las apps de iPhone en un iPad (modo de compatibilidad) y Apple suele revisar en iPad, así que la app se prueba también ahí (§4, paso 8).
- **Sin compras en iOS v1**: ni tarjeta Pro, ni precios, ni "Avísame cuando esté listo", ni la línea "nunca será de pago" del editor. Al llegar al límite de 5 actividades activas se muestra un mensaje neutro, sin venta. Las compras llegan en una versión posterior (TR-96). Android no cambia.
- **Sin analítica en iOS v1**: PostHog y Sentry no arrancan en iOS aunque el build lleve claves, y Ajustes no muestra el interruptor "Compartir estadísticas de uso anónimas" (§5). Android no cambia.
- **Correo público de soporte**: `support@mordobo.com` (Angelo tiene que crearlo, ver §1).

No hay guía de publicación de Android en este repo; esta guía sigue el orden real del proceso en App Store Connect. Lo que hay introducido en App Store Connect se anota campo por campo en [`store/app-store/APP-STORE-CONNECT.md`](../store/app-store/APP-STORE-CONNECT.md), y lo declarado en Google Play en [`store/google-play/GOOGLE-PLAY-CONSOLE.md`](../store/google-play/GOOGLE-PLAY-CONSOLE.md).

---

## 0. Qué ya está hecho en el código

| Qué | Dónde | Lo protege |
|---|---|---|
| Solo iPhone, bundle `app.traceroutine`, `usesNonExemptEncryption: false` (no aparece "Missing Compliance" en TestFlight), `CFBundleLocalizations` en/es | `app.json` | `src/release/storeConfig.test.ts` |
| Carpetas `en.lproj` / `es.lproj` para que el App Store muestre Español e Inglés, solo en iOS | `plugins/withIosLocales.js`, `locales/*.json` | `storeConfig.test.ts` |
| Perfil `production` con imagen `sdk-57`, `submit.production.ios` (bundle, equipo CTC5PRH3D3, nombre TraceRoutine); el perfil de Google Play queda igual | `eas.json` | `storeConfig.test.ts` |
| Enlace a la política de privacidad en Ajustes y "Enviar comentarios" a `support@mordobo.com` (ambas plataformas); la política dice en los dos idiomas que la copia de seguridad del sistema puede incluir los datos | `src/about/links.ts`, `docs/privacy.html` | `src/about/links.test.ts` (direcciones y cada mitad de la política), `src/release/iosScreens.test.ts` (la fila Privacidad está en Ajustes de iOS) |
| La app arranca en el idioma del dispositivo (ambas plataformas). **Solo iOS**: si después de elegir idioma en la app se cambia en Ajustes de iOS → TraceRoutine → Idioma, gana el de iOS | `src/i18n/device.ts`, `src/i18n/index.ts` (`resolveLang`), `src/store/appStore.ts` | `device.test.ts`, `i18n.test.ts`, `appStore.test.ts` |
| **Solo iOS**: las hojas inferiores suben sobre el teclado (valor con teclado decimal, confirmación escribiendo BORRAR/DELETE); el editor desplaza el campo enfocado por encima del teclado | `src/ui/controls.tsx` (`Sheet`), `app/editor.tsx` | revisión en iPhone real y en iPad (no se puede probar en Vitest ni en web) |
| **Solo iOS**: sin tarjeta Pro en Ajustes, sin "nunca será de pago" en el editor; al llegar a 5 actividades activas, alerta neutra con "Ver mis actividades" (abre Mes) | `src/store/limits.ts` (`showsPro`, `freeLimitPrompt`, `frequencyHelp`, `PRO_ONLY_KEYS`), `app/(tabs)/settings.tsx`, `app/editor.tsx` | `src/store/limits.test.ts` (reglas y todos los textos de los diccionarios), `src/release/iosScreens.test.ts` (Ajustes y el editor renderizados como iOS y como Android, incluido pulsar "Crear" con 5 activas) |
| **Solo iOS**: PostHog y Sentry no arrancan aunque el build lleve claves; Ajustes no muestra el interruptor de estadísticas | `src/analytics/policy.ts` (`analyticsAllowed`), `posthog.ts`, `sentry.ts`, `app/(tabs)/settings.tsx` | `src/analytics/platform.test.ts`, `iosScreens.test.ts` |
| **Solo iOS**: la explicación previa al permiso de notificaciones tiene un único botón "Continuar" que lleva a la alerta del sistema. **Ambas plataformas**: guardar una actividad con recordatorio pide el permiso si nunca se pidió | `src/reminders/prePrompt.ts`, `src/reminders/service.ts` (`askReminderPermission`, `offerReminders`), Ajustes y editor | `src/reminders/prePrompt.test.ts`, `iosScreens.test.ts` |
| "Borrar todos los datos" e "Importar respaldo → Reemplazar" conservan la exclusión de estadísticas y el resumen matinal (ambas plataformas) | `src/store/appStore.ts` | `appStore.test.ts` |
| **Solo iOS**: deslizar el editor hacia abajo con cambios hace volver la hoja y pregunta "Tienes cambios sin guardar"; con 5 actividades activas, el editor de una nueva avisa del límite al abrirse; arrastrar el formulario baja el teclado; las fechas usan el teclado de números y signos, sin autocorrección | `app/editor.tsx`, `src/store/limits.ts` (`warnsAtLimitOnOpen`) | `iosScreens.test.ts` (teclado del formulario y de las fechas), `limits.test.ts`; el gesto y el aviso al abrir solo se ven en iPhone real (§4) |
| **Ambas plataformas** (QA en simulador, 19 de octubre): "Listo" / "Done" de la hoja "¿Cuánto?" guarda al primer toque con el teclado abierto; el tema claro se lee (opciones elegidas, pestaña activa, "+", antetítulos); "Desarchivar" respeta el límite de 5 activas; una fecha imposible dice "Fecha inválida"; la vista previa semanal cuenta solo los días desde el inicio; la fila omitida no deja ver "OMITIR"; "1 vez" en vez de "1 veces"; la hoja de *Minutos* dice "min" | `app/(tabs)/index.tsx`, `src/ui/tokens.ts`, `src/store/limits.ts` (`passesActiveLimit`), `src/ui/editor/editorModel.ts`, `src/i18n` (`tCount`), `src/ui/LogSheet.tsx` | `iosScreens.test.ts`, `tokens.test.ts`, `limits.test.ts`, `appStore.test.ts`, `editorModel.test.ts`, `i18n.test.ts` |

`iosScreens.test.ts` renderiza las pantallas en Node con React Native sustituido por piezas simples (`src/test/nativeStubs.ts`): comprueba qué textos y botones hay, no el diseño, el teclado ni los gestos. Eso sigue siendo la revisión del §4.

Antes de cada build: `npm test`, `npm run typecheck` y `npm run lint` en verde.

---

## 1. Configuración única (compartida con las demás apps de Mordobo)

Se hace una sola vez por cuenta; TraceCosts, TracePhysique y las siguientes apps reutilizan lo mismo.

- [x] **Acuerdos**: el acuerdo de apps gratuitas está activo desde el 19 de octubre de 2026 (aceptado por el Account Holder). Para apps gratuitas basta con él. El acuerdo de apps de pago, los datos bancarios y fiscales solo hacen falta cuando haya compras (TR-96).
- [ ] **Program License Agreement actualizado**: el 19 de octubre de 2026 quedaba por aceptar, con plazo hasta el 28 de octubre. Comprobar en developer.apple.com y en App Store Connect → Negocio que no queda ningún acuerdo pendiente (verificar).
- [x] **Ley de Servicios Digitales (UE)**: el estado de **comerciante** (trader) de MORDOBO TECHNOLOGIES LLC, con dirección, teléfono y correo, está activo desde el 19 de octubre de 2026 en los 27 países de la UE. Es de la cuenta y no se repite por app. Al crear el registro, comprobar que la ficha de TraceRoutine en la UE muestra esos datos.
- [ ] **Correo de soporte**: crear `support@mordobo.com` y probar que recibe correo. Lo usan la app ("Enviar comentarios"), la política de privacidad, la ficha y las notas para la revisión.
- [x] **URL de soporte**: App Store Connect pide una **URL**, no un correo: `https://angelorivasmordobo.github.io/TraceRoutine/support.html` (inglés en `#en`, la que se introdujo), que sale de `docs/support.html` (contacto y preguntas frecuentes: dónde están los datos, cambiar de teléfono, borrar los datos, recordatorios, actividades activas). GitHub Pages sirve `/docs` desde `main`: responde 200 desde que se fusionó el PR #2 (2026-10-21). Comprobar que sigue dando 200 antes de cada envío a revisión.
- [ ] **Política de privacidad en línea**: `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html` (español; inglés en `#en`). La página publicada ya nombra a MORDOBO TECHNOLOGIES LLC y a `support@mordobo.com` (comprobado el 20 de octubre de 2026: responde 200).
- [ ] **Expo / EAS**: cuenta `angeloleonelrivas` (dueña del proyecto en `app.json`). Usar Node 22, porque EAS CLI ya avisa de que Node 20 está obsoleto. Iniciar sesión con `npx eas-cli@latest login`.
- [ ] **Credenciales de equipo en EAS** (se crean en el primer build y el primer envío interactivos, §3):
  - *Certificado de distribución (Apple Distribution)*: si EAS ofrece uno existente del equipo, **reutilizarlo**. **No revocar nunca** un certificado: los perfiles de las otras apps dependen de él.
  - *Clave de API de App Store Connect* para EAS Submit: se crea una por equipo con rol Admin y sirve para todas las apps.
  - *Clave de notificaciones push (APNs)*: **no** hace falta, porque TraceRoutine solo usa notificaciones locales.

---

## 2. Ficha de la app en App Store Connect

**Textos listos para pegar**: `store/app-store/LISTING.md` tiene, por idioma (en-US, introducido el 21 de octubre de 2026, y los borradores es-MX y es-ES, no introducidos), el nombre, el subtítulo, el texto promocional, la descripción, las palabras clave, las novedades y los textos de las capturas, y además las categorías, las URL, App Privacy, la clasificación por edad, las notas para la revisión y el cumplimiento de exportación. `src/release/storeListing.test.ts` comprueba los límites de Apple, que ningún campo que se pega lleve emoji (App Store Connect los rechaza como "invalid characters") y que ningún texto público hable de Pro, precios, anuncios ni de la otra plataforma.

**Hecho el 21 de octubre de 2026**: el registro lo creó `eas submit` (§3), así que el idioma principal es Inglés (EE. UU.) y el SKU es el que generó EAS. La ficha va **solo en inglés**, como las otras dos apps; lo introducido, campo por campo, está en `store/app-store/APP-STORE-CONNECT.md`. Lo que sigue queda para una app nueva o por si se rehace el registro.

App Store Connect → Apps → **+** → Nueva app. Otra opción: dejar que `eas submit` la cree en el §3, porque usa `appName` de `eas.json`. En ese caso el idioma principal es Inglés (EE. UU.), salvo que antes se añadan `language` (por ejemplo `es-MX`) y `sku` en `submit.production.ios`, y entonces también hay que actualizar `storeConfig.test.ts`. Crearla a mano evita tocar `eas.json`.

| Campo | Valor |
|---|---|
| Plataforma | iOS |
| Nombre | `TraceRoutine` (tiene que estar libre en el App Store; si no lo está, ver TR-86) |
| Idioma principal | **Inglés (EE. UU.)**, el que puso `eas submit` el 21 de octubre de 2026. Es el idioma que se muestra donde no hay traducción. |
| Bundle ID | `app.traceroutine` (EAS lo registra en el primer build; si no aparece en la lista, registrarlo en developer.apple.com → Identifiers) |
| SKU | `traceroutine-ios` (interno, no se muestra) |
| Acceso de usuarios | Acceso completo |

Después, en **Información de la app**:

- [x] **Localizaciones**: solo Inglés (EE. UU.) (2026-10-21). Español (México) y Español (España) quedan como borradores en `LISTING.md`; el binario declara Español e Inglés.
- [x] **Subtítulo** (30 caracteres como máximo): EN "Habits at your real frequency" (en `store/app-store/LISTING.md`; el de los borradores es "Hábitos con tu frecuencia real")
- [x] **Categoría**: Productividad como principal y Estilo de vida como secundaria. Evitar Medicina y Salud y forma física, por el posicionamiento no médico de TR-81.
- [x] **Derechos de contenido**: "No contiene, muestra ni accede a contenido de terceros".
- [x] **Clasificación por edad**: ver §6 (4+).
- [x] **URL de la política de privacidad**: EN `…/privacy.html#en` (la ES `…/privacy.html`, si algún día se añade una localización en español).
- [x] **Copyright**: `2026 MORDOBO TECHNOLOGIES LLC`.
- [x] **Precio y disponibilidad**: Gratis. Países: todos menos China continental. Mac con Apple silicon y Apple Vision Pro desmarcados.
- [ ] Copiar el **Apple ID** numérico de la app (Información de la app → Apple ID) para el §3: todavía no está anotado (`appleId` es `null` en `store/app-store/app-store-declarations.json`).

Ficha de la versión 1.0 (por idioma): descripción, palabras clave, texto promocional, URL de soporte, URL de marketing (opcional), capturas (§8), build, notas para la revisión (§7) y contacto para la revisión (nombre, teléfono y correo de Angelo).

> **Registro**: después de introducir cada campo de esta sección, anotarlo el mismo día en [`store/app-store/APP-STORE-CONNECT.md`](../store/app-store/APP-STORE-CONNECT.md) (§2, §3, §6 y §8.1 del registro: valor exacto, `introducido AAAA-MM-DD · build 1.0.0 (N)` y una línea en su historial) y actualizar `record` en `store/app-store/app-store-declarations.json`.

> **Regla v1 en la ficha**: no mencionar Pro, precios, planes, "próximamente" ni funciones que no estén en el binario (widget, compartir el mes, plantillas). La app tampoco las muestra en iOS. La guía 2.1 de Apple pide quitar el contenido provisional. Y sin emoji: App Store Connect los rechaza (lección de TraceCosts del 21 de octubre de 2026).

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
- **Hecho el 21 de octubre de 2026**: build 1.0.0 (1) compilado y subido con `npx eas-cli@latest submit -p ios --profile production --latest`, que creó el registro de la app. Falta añadir `ascAppId` (el Apple ID todavía no está anotado).

> **Registro**: después de introducir cada campo de esta sección, anotarlo el mismo día en [`store/app-store/APP-STORE-CONNECT.md`](../store/app-store/APP-STORE-CONNECT.md) (§8.2 y §11 del registro: valor exacto, `introducido AAAA-MM-DD · build 1.0.0 (N)` y una línea en su historial) y actualizar `record` en `store/app-store/app-store-declarations.json`. Aquí eso es el número de build, la fecha de envío y, después del primer envío, el Apple ID (también en `appleId` del JSON).

> CI: el job `preview-build` de `.github/workflows/ci.yml` ya no corre en cada push a `main`: se lanza a mano (*Actions › CI › Run workflow*) eligiendo la plataforma, `android` por defecto. En iOS el perfil `preview` es distribución interna (ad hoc), que necesita dispositivos registrados y credenciales ad hoc: no elegir `ios` hasta tenerlas. Requiere el secreto `EXPO_TOKEN` en el repo (hoy no está, y por eso fallaba el job).

---

## 4. TestFlight

- [x] **Pruebas internas**: el grupo interno "Team (Expo)" ya existe (lo creó EAS al subir el build 1.0.0 (1), 2026-10-21; hasta 100 usuarios con acceso a App Store Connect, sin revisión). Falta comprobar quién está en él y que el build les aparece (verificar; los correos no se escriben en el repo). Instalar desde la app TestFlight en el iPhone.
- [ ] **Pruebas externas** (opcional, beta cerrada): requieren la revisión de beta de Apple y la información de prueba (descripción de la beta, correo de comentarios `support@mordobo.com`, URL de la política).

Revisión en iPhone real (la definición de hecho del repo la exige):

1. **Teclado sobre hojas inferiores**
   - Crear una actividad con "Tipo de registro" *Minutos* o *Una cantidad* y tocar su círculo en Hoy. Aparece la hoja "¿Cuánto?" / "How much?" (con *Minutos*, la ayuda termina en "· min"). Al tocar el campo, la hoja sube sobre el teclado decimal, el número se ve y **un solo toque** en "Listo" / "Done" guarda el valor y cierra la hoja, sin cerrar antes el teclado.
   - Ajustes → "Borrar todos los datos" → "Borrar de todas formas". Al escribir en el campo de "Escribe BORRAR para confirmar", el campo y el botón quedan sobre el teclado. Cerrar tocando fuera, **sin borrar**.
   - Editor: con el teclado abierto, al enfocar los campos de abajo (unidad, "Versión mínima", paso del ciclo, fechas de inicio y fin), cada uno queda visible sobre el teclado. Arrastrar el formulario baja el teclado. "Empieza" y "Termina" abren el teclado de números y signos, sin sugerencias.
   - Editor: escribir un nombre y deslizar la hoja hacia abajo. La hoja vuelve a su sitio y aparece "Tienes cambios sin guardar" / "You have unsaved changes" con "Seguir editando" y "Descartar". Sin cambios, deslizar cierra el editor.
   - Probar en un iPhone pequeño (SE o mini) si es posible.
2. **Sin Pro ni analítica en iOS**: Ajustes no muestra la tarjeta "TraceRoutine Pro", ni "Avísame cuando esté listo", ni "Compartir estadísticas de uso anónimas". El editor no muestra "Tu frecuencia real — nunca será de pago" bajo "Frecuencia". Con 5 actividades activas, tocar "+" muestra la alerta "Tienes 5 actividades activas" / "You have 5 active activities" en cuanto se abre el editor, con "Cancelar" (cierra el editor) y "Ver mis actividades" / "See my activities", sin "Conocer Pro"; "Crear actividad" la vuelve a mostrar. "Ver mis actividades" abre Mes; al tocar el nombre de una actividad se abre su editor con "Archivar". Con 5 activas y una archivada, Ajustes → Archivadas → "Desarchivar" muestra la misma alerta y la actividad sigue archivada.
3. **Idioma**: con el iPhone en español la app abre en español. En Ajustes de iOS → TraceRoutine → Idioma aparecen Español e Inglés. Con el iPhone en inglés, elegir EN en la app (onboarding o Ajustes) y después, en Ajustes de iOS → TraceRoutine → Idioma, elegir Español: iOS reinicia la app y abre en español. Al volver a elegir EN en la app, se queda en inglés.
4. **Recordatorios**: Ajustes → "Activar avisos" muestra el aviso previo con un solo botón, "Continuar" / "Continue", y luego el permiso del sistema. En una instalación nueva, crear una actividad con recordatorio (vienen activados por defecto) también muestra el aviso previo y el permiso, y no lo vuelve a pedir después de responder. La notificación llega solo los días que toca. **Con los valores por defecto** (recordatorio a las 08:00 y "Resumen matinal" a las 08:00) cada recordatorio a la hora del resumen o antes se agrupa en un único aviso "Hoy tocan N" / "N due today", que **no lleva acciones** porque reúne varias actividades. Las acciones "Hecha" / "Mínima" (EN "Done" / "Minimum") solo aparecen en el aviso de una actividad: para probarlas, poner su recordatorio después de la "Hora del resumen" o desactivar el "Resumen matinal". Dar acciones al resumen cuando solo trae una actividad sería un cambio de producto (decisión del dueño).
5. **Datos**: Exportar CSV y Guardar respaldo (JSON) abren la hoja de compartir. Importar respaldo abre Archivos. Privacidad abre la política. "Enviar comentarios" abre Mail con `support@mordobo.com`; si Mail no está instalado, aparece la dirección en una alerta.
6. **Temas** oscuro, claro y automático. En claro: las opciones elegidas de "Idioma" y "Tema" se leen sobre un fondo lila claro, la pestaña activa, el "+" y los antetítulos ("HOY · LUNES") se distinguen de la barra y del fondo.
7. **Android**: las reglas de iOS no cambian el build de Google Play. Varios arreglos sí llegan a Android con el próximo build: guardar una actividad con recordatorio pide el permiso de notificaciones si nunca se pidió (Android 13+), "Borrar todos los datos" o "Reemplazar" conservan la exclusión de estadísticas, y los de la QA del 19 de octubre que valen para las dos plataformas (§0: "Listo" al primer toque, tema claro, "Desarchivar" con el límite, que en Android muestra la alerta del plan gratuito, fechas imposibles, vista previa semanal, fila omitida, singulares, "min"). Si se sube un build nuevo de Android, hacer una prueba rápida de la tarjeta Pro, el interruptor de estadísticas, la alerta del límite (con "Ver archivadas" y "Conocer Pro"), el aviso previo ("Ahora no" / "Activar avisos") y las hojas.
8. **iPad (modo de compatibilidad)**: instalar el build de TestFlight en un iPad. Apple instala las apps de iPhone en iPad y suele revisar ahí. Comprobar con el teclado abierto: el editor (campos de abajo), la hoja "¿Cuánto?" y la de "Escribe BORRAR para confirmar"; y que las alertas (límite, recordatorios) se leen completas.

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

**Hecho el 21 de octubre de 2026**: Data Not Collected, publicado, con la URL de la política `…/privacy.html#en` (registro, §7).

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

Desde el 19 de octubre la app también lo garantiza en el código: en iOS, `analyticsAllowed` (`src/analytics/policy.ts`) impide que PostHog y Sentry arranquen aunque el build lleve claves, y Ajustes no muestra el interruptor de estadísticas (`src/analytics/platform.test.ts` lo comprueba). Hacía falta porque las variables de EAS son por entorno, no por plataforma, y el mismo entorno `production` compila la app de Google Play: una clave añadida para Android acabaría en el siguiente binario de iOS.

Comprobación rápida antes de cada build (segunda barrera): `npx eas-cli@latest env:list --environment production`. Si aparecen nombres de PostHog o Sentry, en iOS siguen sin usarse, pero conviene saber por qué están. Activar la analítica en iOS es una decisión de versión: primero App Privacy y la política, luego `analyticsAllowed`.

> **Registro**: después de introducir cada campo de esta sección, anotarlo el mismo día en [`store/app-store/APP-STORE-CONNECT.md`](../store/app-store/APP-STORE-CONNECT.md) (§7 del registro: valor exacto, `introducido AAAA-MM-DD · build 1.0.0 (N)` y una línea en su historial) y actualizar `record` en `store/app-store/app-store-declarations.json`.

---

## 6. Clasificación por edad

Cuestionario de App Store Connect (Información de la app → Clasificación por edad). Respuesta: **Ninguno / No** en todo.

| Bloque | Pregunta | Respuesta |
|---|---|---|
| Controles en la app | Controles parentales · Verificación de edad | No · No |
| Capacidades | Acceso web sin restricciones · Contenido generado por usuarios · Mensajería o chat · Redes sociales · Publicidad | No · No · No · No · No (la app solo abre su política en Safari) |
| Temas para adultos | Lenguaje soez o humor grosero · Terror o miedo · Alcohol, tabaco o drogas | Ninguno |
| Médico o bienestar | Información médica o de tratamiento · Temas de salud o bienestar | Ninguno · No (*) |
| Sexualidad o desnudez | — | Ninguno |
| Violencia | Animada o fantástica · Realista · Prolongada o gráfica · Armas | Ninguno |
| Actividades de azar | Apuestas simuladas · Apuestas · Concursos · Cajas de botín | Ninguno · No · No · No |
| Hecha para niños | — | No |

Resultado esperado: **4+**.

(*) Decisión del dueño, tomada e introducida el 21 de octubre de 2026: **No** (4+). TraceRoutine registra rutinas (incluida la sugerencia "Tratamiento cada 2 días") pero no da información médica ni de bienestar, y la política lo deja claro en "Aviso no médico". Responder **Sí** a "Temas de salud o bienestar" sube la clasificación a **9+**. Ojo: en Google Play la app declara la función de salud "Medication and Treatment Management" (`store/google-play/GOOGLE-PLAY-CONSOLE.md`, conflicto 1); la decisión se toma para las dos tiendas. Las respuestas en inglés, con los nombres que muestra App Store Connect, están en `store/app-store/LISTING.md`.

> **Registro**: después de introducir cada campo de esta sección, anotarlo el mismo día en [`store/app-store/APP-STORE-CONNECT.md`](../store/app-store/APP-STORE-CONNECT.md) (§4 del registro: valor exacto, `introducido AAAA-MM-DD · build 1.0.0 (N)` y una línea en su historial) y actualizar `record` en `store/app-store/app-store-declarations.json`. La clasificación calculada va también en `ageRating` del JSON, con lo que la subió en `raisedBy`.

---

## 7. Notas para la revisión (App Review Information)

- **¿Requiere inicio de sesión?** No. No hace falta cuenta de demostración.
- **Contacto**: Angelo Rivas, teléfono de Angelo, `support@mordobo.com`.
- **Notas** (en inglés, para pegar tal cual): en `store/app-store/LISTING.md` → *App Review information* (incluye el aviso no médico y el modo de compatibilidad en iPad).

> **Registro**: después de introducir cada campo de esta sección, anotarlo el mismo día en [`store/app-store/APP-STORE-CONNECT.md`](../store/app-store/APP-STORE-CONNECT.md) (§9 del registro: valor exacto, `introducido AAAA-MM-DD · build 1.0.0 (N)` y una línea en su historial) y actualizar `record` en `store/app-store/app-store-declarations.json`. El teléfono no se escribe ahí, porque el repo es público.

---

## 8. Capturas de pantalla (solo iPhone)

Como la app es solo para iPhone, **no hay que subir capturas de iPad**.

**Se suben las de 6,3"**. En TracePhysique (21 de octubre de 2026), App Store Connect exigió la clase **iPhone 6,3" ("iPhone with Dynamic Island (medium display)"), de 1206 × 2622 px**, y no la de 6,9" que se esperaba. Las dos series de TraceRoutine están en el repo:

| Serie | Carpeta | Tamaño (vertical, px) | Uso |
|---|---|---|---|
| iPhone 6,3" | `store/app-store/screenshots-6.3/en-US/` (y `es-MX/`, para una localización en español que no está introducida) | 1206 × 2622 | **Las que se suben**. El 21 de octubre de 2026 se subieron las 8 de `en-US/` en la ranura "iPhone with Dynamic Island (medium display)". |
| iPhone 6,9" | `store/app-store/screenshots/es-MX/` y `en-US/` | 1320 × 2868 | Los originales de los que salen las de 6,3". El 21 de octubre de 2026 solo se subió la serie de 6,3" y App Store Connect no pidió la de 6,9". |

- La serie de 6,3" se rehace desde la de 6,9" con la orden de `store/app-store/screenshots/README.md` (`sips -z 2622 1206`). `src/release/appStoreDeclarations.test.ts` comprueba el tamaño de las dos series, que no tienen transparencia y que tienen los mismos archivos.
- Entre 1 y 10 capturas por localización, en PNG o JPEG sin transparencia. Hoy solo hay una localización introducida, Inglés (EE. UU.), con las 8 de `en-US/`; la serie `es-MX/` queda para una localización en español.
- Conjunto: las 8 pantallas en orden, los datos de ejemplo y el texto de cada captura por idioma están en `store/app-store/LISTING.md` → *Screenshots*.
- **Cómo se sacaron las de la 1.0.0** (21 de octubre de 2026): en el simulador de iOS (iPhone 18 Pro Max, iOS 27.0) con un build Release para el simulador hecho de `b623f1f` (no el binario 1.0.0 (1) de EAS), en el tema oscuro, con la barra de estado a las 9:41 y los datos de ejemplo de `store/app-store/LISTING.md`; el detalle está en `store/app-store/screenshots/README.md`. Las próximas pueden salir igual o, sin simulador, desde el build de TestFlight en un iPhone real. Un iPhone 16 Pro Max da 1320 × 2868, y un 14/15 Pro Max o un Plus da 1290 × 2796. Con un iPhone de 6,1" (1179 × 2556) la proporción es la misma (diferencia menor de 0,1 %) y basta con escalarla: `sips -z 2796 1290 captura.png --out captura-6.9.png`.
- No usar capturas de la versión web: la tipografía, los selectores y la barra de estado no son los de iOS, y Apple pide capturas de la app en uso (guía 2.3.3).
- El vídeo de vista previa es opcional (el vídeo de 20 s de la cuadrícula de TR-80 puede ir aquí).
- Ninguna captura debe mostrar Pro, precios ni "próximamente".

> **Registro**: después de introducir cada campo de esta sección, anotarlo el mismo día en [`store/app-store/APP-STORE-CONNECT.md`](../store/app-store/APP-STORE-CONNECT.md) (§8.1 del registro: valor exacto, `introducido AAAA-MM-DD · build 1.0.0 (N)` y una línea en su historial) y actualizar `record` en `store/app-store/app-store-declarations.json`. Anotar qué serie y qué tamaño se subieron.

---

## 9. Después de la aprobación

- **Publicación**: **automática** ("Automatically release this version"), decisión del dueño del 21 de octubre de 2026 para las tres apps: la versión sale en cuanto App Review la aprueba. Para controlar la fecha de una versión, elegir "Manually release this version" antes de enviarla. El lanzamiento por fases de 7 días solo afecta a las actualizaciones automáticas de versiones posteriores; la 1.0 está disponible para todos desde el primer día.
- **Fallos conocidos del build 1.0.0 (1)**, que van en la 1.0.1: en Mes, tocar un día marca el día siguiente (la descripción y las notas dicen "tap a past cell…"); los pasos por defecto de Ciclo salen en inglés con la app en español; fechas mal en la vista previa de la frecuencia; objetivos semanales mal calculados al empezar el mes. Detalle en `store/app-store/APP-STORE-CONNECT.md` → "Fallos conocidos".
- **Seguimiento de 72 h** (TR-82): sin Sentry, los fallos se ven en App Store Connect (TestFlight → Fallos y Analítica de la app) y en los comentarios de TestFlight y de `support@mordobo.com`.
- **Siguiente versión de iOS**: subir `version` en `app.json` (el número de build lo sigue llevando EAS). Las compras (TR-96) piden el acuerdo de apps de pago, los productos en App Store Connect (TR-87) y quitar la condición `showsPro` en `src/store/limits.ts`.

---

## Pendientes del dueño (resumen)

- [ ] Crear `support@mordobo.com` y probar que recibe correo. `support.html` ya responde 200 (PR #2 fusionado el 21 de octubre de 2026).
- [x] Declarar el estado de comerciante para la DSA de la UE (activo desde el 19 de octubre de 2026; es de la cuenta).
- [ ] Comprobar que no queda pendiente el Program License Agreement actualizado (plazo 28 de octubre de 2026).
- [x] Llevar la política actualizada a la rama de GitHub Pages (publicada; 200 el 20 de octubre de 2026).
- [x] Revisar la ficha de `store/app-store/LISTING.md` e introducirla (2026-10-21: solo en inglés, idioma principal Inglés (EE. UU.), Productividad / Estilo de vida, todos los países menos China continental).
- [x] Confirmar la clasificación por edad: salud o bienestar = No → 4+ (2026-10-21).
- [x] Primer build y envío interactivo (§3), el 21 de octubre de 2026.
- [ ] Leer el Apple ID de la app y añadir `ascAppId` en `eas.json` (con `appleId` en el JSON de declaraciones y `storeConfig.test.ts`).
- [ ] Decidir qué hacer con el build iOS de vista previa en CI.
- [ ] Revisión en iPhone real y en iPad en modo de compatibilidad (§4): en iOS, la app solo se ha probado en el simulador.
- [ ] Confirmar en Play Console lo reconstruido en `store/google-play/GOOGLE-PLAY-CONSOLE.md`, y decidir la declaración de salud y el correo de contacto (sus conflictos 1 y 2).
- [ ] Confirmar que se pulsó "Enviar a revisión" (indicado el 21 de octubre de 2026; App Store Connect tiene que mostrar "Waiting for Review").
- [ ] Confirmar la licencia del repositorio: `LICENSE` pasó del MIT de la plantilla de Expo a "todos los derechos reservados" de MORDOBO TECHNOLOGIES LLC. El repositorio es público porque sirve la política en GitHub Pages; decidir si se deja público, se hace privado (y la política se publica en otro sitio) o se elige otra licencia.
- [ ] Confirmar que la base de datos sigue en la copia de seguridad de iCloud/Google (la política ya lo dice). La otra opción es excluirla, pero entonces restaurar un iPhone no recupera el historial.
