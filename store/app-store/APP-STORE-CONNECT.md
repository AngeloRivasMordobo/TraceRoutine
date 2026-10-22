# TraceRoutine · Registro de App Store Connect (iOS)

Este archivo dice qué hay introducido en App Store Connect para TraceRoutine, campo por campo, en el orden de los menús de App Store Connect y con la fecha y el build de cada cosa. Sirve para revisar lo declarado cada vez que cambia una regla de negocio o el código. Por ejemplo, si un día la app pide iniciar sesión, aquí aparece todo lo que hoy dice lo contrario y qué hay que cambiar.

- **Versión que describe**: 1.0.0 · **Build**: 1.0.0 (1), compilado en EAS y **sin enviar** a App Store Connect (verificar el número en expo.dev).
- **Estado del registro**: `pendiente de introducir` (es `record.status` en el JSON; el test exige que coincidan y que ningún campo diga `introducido` mientras sea así).
- **Estado a 21 de octubre de 2026: no hay nada introducido.** El registro de la app todavía no existe en App Store Connect. Todo lo de abajo es el **plan**, sacado de [`LISTING.md`](LISTING.md) y de [`docs/RELEASE-IOS.md`](../../docs/RELEASE-IOS.md), y cada campo está `pendiente de introducir`. Se convierte en el registro a medida que Angelo lo introduce.
- **Al introducir algo**, el mismo día: cambiar su estado a `introducido AAAA-MM-DD · build 1.0.0 (N)`, anotar el valor exacto si no es el del plan (y por qué), quitar `(verificar)` cuando esté confirmado, añadir una línea al [historial](#historial) y actualizar `record` en [`app-store-declarations.json`](app-store-declarations.json).
- **Textos largos**: no se copian aquí. Cada campo dice qué bloque de `LISTING.md` se pega: el recuadro ```` ```text ```` bajo `### <Campo>` dentro de la sección `## <idioma>` (por ejemplo `## es-MX` → `### Description`). Cuando lo introducido difiere de `LISTING.md`, se indica.
- **Lo que el código puede comprobar** está en [`app-store-declarations.json`](app-store-declarations.json). `src/release/appStoreDeclarations.test.ts` lo deriva otra vez del código (la configuración de Expo resuelta para producción, las dependencias, `analyticsAllowed`, `showsPro`, los idiomas, los enlaces, las cifras de las reglas de negocio y las dos series de capturas) y, si algo deja de coincidir, falla diciendo qué cambiar en App Store Connect y aquí. Cada clave tiene su fila en [Qué depende de qué](#qué-depende-de-qué). El mismo test comprueba, palabra por palabra (`CLAIMS`), que cada frase de "sin cuenta" y de "tus datos se quedan en tu dispositivo" sigue ahí mientras es verdad y desaparece en cuanto deja de serlo.
- **Google Play** tiene su propio registro: [`store/google-play/GOOGLE-PLAY-CONSOLE.md`](../google-play/GOOGLE-PLAY-CONSOLE.md). Cuando una fila de abajo dice "Google Play", se cambia allí y en Play Console.
- **El repositorio es público**: aquí no van IDs de claves de API, issuer IDs, IDs de certificados, contraseñas, credenciales de cuentas de demostración ni teléfonos. El test busca, en este archivo, el JSON, `LISTING.md`, el registro de Google Play, `docs/RELEASE-IOS.md`, la política, la página de soporte, `README.md`, `CLAUDE.md` y `AGENTS.md`: UUID (issuer IDs), archivos de clave de la API de App Store Connect y claves privadas, identificadores de Apple de 10 letras y números (IDs de claves de API y de certificados; solo se permite el Team ID, que es público) y teléfonos con o sin prefijo `+`. No puede reconocer cualquier secreto, así que la regla sigue valiendo aunque el test esté en verde.

Estados: `pendiente de introducir` · `introducido AAAA-MM-DD · build …` · **(verificar)**: todavía sin confirmar.

---

## Lecciones de TracePhysique

1. **Capturas de 6,3"**: en TracePhysique, App Store Connect exigió las capturas de **iPhone 6,3" ("iPhone with Dynamic Island (medium display)") de 1206 × 2622 px**. Para TraceRoutine, las que se suben están en el repo, en [`screenshots-6.3/`](screenshots-6.3/) (`es-MX/` y `en-US/`, 8 PNG por idioma, de 1206 × 2622 y sin transparencia). Salen de los originales de 6,9" (1320 × 2868, [`screenshots/`](screenshots/)) con `sips -z 2622 1206`; con sips de macOS 26.6 el resultado es idéntico byte a byte a las copias de `~/Desktop/Capturas-AppStore/TraceRoutine/` (comprobado el 21 de octubre de 2026). El test comprueba el tamaño, la transparencia, el número y los nombres de las dos series. La orden para rehacerlas está en [`screenshots/README.md`](screenshots/README.md).
2. **Nombre por localización**: App Store Connect puede rechazar un nombre localizado con "already being used". Hay que comprobar que `TraceRoutine` está libre en cada localización: es-MX al crear el registro, es-ES y en-US al añadirlas. Si alguna lo rechaza, se anota aquí el nombre que se use y se cambian también el bloque `### Name` de esa localización en `LISTING.md` y la prueba "keeps the brand name the same in every locale" de `src/release/storeListing.test.ts`.
3. **Dispositivo médico regulado**: App Store Connect pide esa declaración a las apps de Salud y forma física. TraceRoutine va en Productividad / Estilo de vida, así que puede que no aparezca (§5).
4. **DSA**: el estado de comerciante de la Ley de Servicios Digitales es de la cuenta y está activo desde el 19 de octubre de 2026. No se introduce por app (§1).

---

## 1. Negocio (Business) · cuenta MORDOBO TECHNOLOGIES LLC

| Campo | Valor | Estado |
|---|---|---|
| Acuerdo de apps gratuitas | Aceptado por el Account Holder | activo en la cuenta desde 2026-10-19 (de la cuenta, no de esta app). El 19 de octubre quedaba por aceptar el Program License Agreement actualizado (plazo 2026-10-28): verificar en Negocio → Acuerdos que no haya ninguno pendiente. |
| Acuerdo de apps de pago, datos bancarios e impuestos | No hacen falta: TraceRoutine 1.0 no vende nada (`inAppPurchases`) | no aplica a esta versión |
| Ley de Servicios Digitales (UE): estado de comerciante | Comerciante: MORDOBO TECHNOLOGIES LLC, con la dirección, el teléfono y el correo de la cuenta | activo en la cuenta desde 2026-10-19 (los 27 países de la UE), no se repite por app. Al crear el registro, comprobar que la ficha de TraceRoutine en la UE muestra los datos del comerciante (verificar). |

## 2. Nueva app (Apps → + → Nueva app)

El registro se crea **a mano**. Si lo crea `eas submit`, el idioma principal queda en Inglés (EE. UU.) (RELEASE-IOS.md §2).

| Campo | Valor | Diferencia con LISTING.md | Estado |
|---|---|---|---|
| Plataformas | iOS | — | pendiente de introducir |
| Nombre | `TraceRoutine` (bloque `## es-MX` → `### Name`) | Ninguna, salvo que lo rechacen por estar en uso (lección 2) | pendiente de introducir (verificar que está libre) |
| Idioma principal | Español (México) | — | pendiente de introducir |
| ID de paquete | `app.traceroutine` | — | pendiente de introducir. ¿Lo registró ya el build 1.0.0 (1) de EAS en developer.apple.com → Identifiers? (verificar) |
| SKU | `traceroutine-ios` | — | pendiente de introducir |
| Acceso de usuarios | Acceso completo | — | pendiente de introducir |

Después de crearlo, se copia el **Apple ID** numérico (Información de la app → Apple ID) en `appleId` de `app-store-declarations.json` y, en el mismo commit, como `ascAppId` en `eas.json` → `submit.production.ios`. Ese commit también actualiza `src/release/storeConfig.test.ts`, que espera el perfil de envío exacto. Apple ID: pendiente de introducir.

## 3. Información de la app (App Information)

### Información localizable

| Localización | Nombre | Subtítulo | Estado |
|---|---|---|---|
| Español (México), principal | `## es-MX` → `### Name`: `TraceRoutine` | `## es-MX` → `### Subtitle`: "Hábitos con tu frecuencia real" | pendiente de introducir |
| Español (España) | `## es-ES` → `### Name`: `TraceRoutine` | `## es-ES` → `### Subtitle` (el mismo que es-MX) | pendiente de introducir (verificar que el nombre está libre) |
| Inglés (EE. UU.) | `## en-US` → `### Name`: `TraceRoutine` | `## en-US` → `### Subtitle`: "Habits at your real frequency" | pendiente de introducir (verificar que el nombre está libre) |

Las localizaciones son las mismas de `LISTING.md`: Español (México), Español (España) e Inglés (EE. UU.). El binario declara `es` y `en` (`CFBundleLocalizations`), y las dos variantes de español usan el mismo español de la app.

### Información general

| Campo | Valor | Origen | Estado |
|---|---|---|---|
| ID de paquete · SKU · Apple ID | `app.traceroutine` · `traceroutine-ios` · lo asigna Apple | §2 | pendiente de introducir |
| Idioma principal | Español (México) | `LISTING.md` → *App information* | pendiente de introducir |
| Categoría principal | Productividad | ídem | pendiente de introducir |
| Categoría secundaria | Estilo de vida | ídem | pendiente de introducir |
| Derechos de contenido | No contiene, muestra ni accede a contenido de terceros | ídem. La fuente Inter (SIL OFL) y los iconos Phosphor (MIT) son recursos con licencia, no contenido de terceros. | pendiente de introducir |
| Clasificación por edad | 4+ | §4 | pendiente de introducir |
| Acuerdo de licencia | EULA estándar de Apple | `LISTING.md` → *App information* | pendiente de introducir |

Diferencia con `LISTING.md`: su tabla *App information* también lleva la URL de la política de privacidad y la de opciones de privacidad del usuario. En App Store Connect esos dos campos están en **Privacidad de la app** (§7), y el copyright está en la versión (§8.2).

## 4. Clasificación por edad (App Information → Age Rating)

Es el cuestionario de 2025 (4+ / 9+ / 13+ / 16+ / 18+), en el orden de App Store Connect. Las respuestas son las de `LISTING.md` → *Age rating*.

| Paso | Pregunta | Respuesta | Lo hace verdad | Estado |
|---|---|---|---|---|
| 1 | Parental controls | No | La app no tiene controles parentales (`ageRatingAnswers.parentalControls`) | pendiente de introducir |
| 1 | Age assurance | No | No hay edad mínima ni verificación de edad (`ageRatingAnswers.ageAssurance`, `minimumAge`) | pendiente de introducir |
| 1 | Unrestricted web access | No | "Privacidad" abre una sola página en Safari, no hay WebView y `expo-web-browser` no se usa (`ageRatingAnswers.unrestrictedWebAccess`, `inAppBrowserCalls`) | pendiente de introducir |
| 1 | User-generated content | No | Lo que escribe el usuario se queda en su dispositivo y nadie más lo ve (`ageRatingAnswers.userGeneratedContent`) | pendiente de introducir |
| 1 | Messaging and chat | No | No hay comunicación entre usuarios (`ageRatingAnswers.messagingAndChat`) | pendiente de introducir |
| 1 | Social media | No | No hay perfiles, muro ni contenido compartido entre usuarios, porque no hay cuentas ni servidor (`ageRatingAnswers.socialMedia`) | pendiente de introducir |
| 1 | Advertising | No | No hay anuncios (`ageRatingAnswers.advertising`, `containsAds`) | pendiente de introducir |
| 2 | Profanity or crude humor · Horror or fear themes · Alcohol, tobacco, or drug use or references | None · None · None | — | pendiente de introducir |
| 2 | Medical or treatment information | None | La app no da información médica | pendiente de introducir |
| 2 | Health or wellness topics | No (*) | Decisión del dueño (`ageRatingAnswers.healthOrWellnessTopics`) | pendiente de introducir (verificar la decisión) |
| 2 | Mature or suggestive themes · Sexual content or nudity · Graphic sexual content and nudity | None · None · None | — | pendiente de introducir |
| 2 | Cartoon or fantasy violence · Realistic violence · Prolonged graphic or sadistic realistic violence · Guns or other weapons | None · None · None · None | — | pendiente de introducir |
| 2 | Simulated gambling · Contests | None · None | — | pendiente de introducir |
| 2 | Gambling · Loot boxes | No · No | — | pendiente de introducir |
| 3 | Calculated rating | **4+** (`ageRating.rating`, con `ageRating.raisedBy` vacío) | Todo lo anterior en No / None | pendiente de introducir |
| 3 | Age categories and override | Not Applicable: ni override ni Made for Kids (`ageRatingOverride`) | — | pendiente de introducir |
| 3 | Age suitability URL | Vacío | — | pendiente de introducir |

(*) TraceRoutine registra cualquier rutina, y entre sus ejemplos están entrenar, ir a fisio y la sugerencia "Tratamiento cada 2 días", pero no da contenido de salud ni lee datos de salud. Si a "Health or wellness topics" se responde **Sí**, la clasificación sube a **9+** y nada más cambia. **Dato para la decisión**: en Google Play la app declara la función de salud "Medication and Treatment Management" ([registro de Google Play](../google-play/GOOGLE-PLAY-CONSOLE.md), conflicto 1). Las dos preguntas no son la misma (Play pregunta qué funciones tiene la app; Apple, qué contenido muestra), pero la decisión se toma para las dos tiendas y se anota en los dos registros.

## 5. Dispositivo médico regulado (Regulated Medical Device)

| Campo | Valor | Estado |
|---|---|---|
| ¿La app es un dispositivo médico regulado? | **No** (`regulatedMedicalDevice`) | pendiente de introducir, si aparece. Con la categoría Productividad puede que App Store Connect no lo pregunte (verificar dónde y si aparece). |

Lo hace verdad: TraceRoutine no diagnostica, trata, cura ni previene nada. El aviso no médico está en `docs/privacy.html`, en cada descripción y en las notas para la revisión, y la app no lee datos de salud (sin HealthKit, `readsHealthData`).

## 6. Precio y disponibilidad (Pricing and Availability)

| Campo | Valor | Origen | Estado |
|---|---|---|---|
| Precio | Gratis (USD 0) | `LISTING.md` → *Pricing and availability* | pendiente de introducir |
| Compras dentro de la app | Ninguna (`inAppPurchases`) | ídem | no aplica |
| Disponibilidad | Todos los países o regiones excepto China continental | ídem | pendiente de introducir |
| Mac con Apple silicon · Apple Vision Pro | Decisión del dueño. Lo sugerido es desmarcar los dos en la 1.0, porque solo se probó en iPhone y en iPad en modo de compatibilidad. | ídem | pendiente de introducir (verificar la decisión) |
| Preventa | No | — | pendiente de introducir |

Para distribuir en la UE (España es mercado objetivo) hace falta el estado de comerciante de la DSA (§1).

## 7. Privacidad de la app (App Privacy)

| Campo | Valor | Origen | Estado |
|---|---|---|---|
| URL de la política de privacidad · es-MX | `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html` | `LISTING.md` → *App information*; `privacyPolicyUrl('es')` | pendiente de introducir |
| URL de la política de privacidad · es-ES | `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html` | ídem | pendiente de introducir |
| URL de la política de privacidad · en-US | `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html#en` | ídem, `privacyPolicyUrl('en')` | pendiente de introducir |
| URL de opciones de privacidad del usuario | Vacía: no hay nada que desactivar. Deja de estar vacía si `dataCollected` pasa a `true` (por ejemplo, la página de cómo apagar las estadísticas). | `LISTING.md` → *App information* | pendiente de introducir |
| ¿Usted o sus socios externos recopilan datos de esta app? | **No, no recopilamos datos de esta app**, y luego Publicar (`dataCollected`, `networkCalls`) | `LISTING.md` → *App Privacy* | pendiente de introducir |
| Etiqueta resultante | Datos no recopilados (Data Not Collected) | — | pendiente de introducir |
| Rastreo | No. Sin aviso de App Tracking Transparency ni IDFA (`tracking`) | — | pendiente de introducir |

El SDK nativo de Sentry va dentro del binario aunque esté apagado en iOS, y su manifiesto de privacidad declara datos de fallos y de diagnóstico. El informe de privacidad de Xcode puede listarlos, pero eso no cambia la respuesta (`LISTING.md` → *App Privacy*).

## 8. Versión iOS 1.0.0 (Preparar para el envío)

### 8.1 Página de producto por idioma

| Campo | es-MX | es-ES | en-US | Diferencia con LISTING.md | Estado |
|---|---|---|---|---|---|
| Capturas iPhone 6,3" (1206 × 2622) | `store/app-store/screenshots-6.3/es-MX/`, de `01` a `08` | La misma carpeta de es-MX (la app tiene un solo español) | `store/app-store/screenshots-6.3/en-US/`, de `01` a `08` | Los originales de `LISTING.md` y `screenshots/` son de 6,9" (1320 × 2868), pero se suben las copias de 6,3" (lección 1, `screenshotsPerLocale`). Los "Screenshot captions" de `LISTING.md` no son un campo de App Store Connect: las capturas se suben tal cual, sin texto, y los captions no se pegan en ningún sitio. | pendiente de introducir. ¿Pide App Store Connect además el tamaño de 6,9" o el de 6,5"? (verificar) |
| Vista previa de la app (vídeo) | Ninguna | Ninguna | Ninguna | Opcional (el vídeo de la cuadrícula de TR-80) | no aplica |
| Texto promocional | `## es-MX` → `### Promotional text` | `## es-ES` → `### Promotional text` | `## en-US` → `### Promotional text` | Ninguna | pendiente de introducir |
| Descripción | `## es-MX` → `### Description` | `## es-ES` → `### Description` | `## en-US` → `### Description` | Ninguna | pendiente de introducir |
| Palabras clave | `## es-MX` → `### Keywords` (con `entreno`) | `## es-ES` → `### Keywords` (con `entrenar`) | `## en-US` → `### Keywords` | Ninguna | pendiente de introducir |
| URL de soporte | `https://angelorivasmordobo.github.io/TraceRoutine/support.html` | `https://angelorivasmordobo.github.io/TraceRoutine/support.html` | `https://angelorivasmordobo.github.io/TraceRoutine/support.html#en` | Ninguna. Tiene que responder 200 antes de enviar, y se publica cuando esta rama llegue a `main` (verificar). | pendiente de introducir |
| URL de marketing | Vacía | Vacía | Vacía | Ninguna (no hay página de producto) | pendiente de introducir |
| Novedades (What's New) | No aparece en la 1.0.0 | — | — | El bloque `### What's New` queda para la primera actualización | no aplica |

El texto promocional se puede cambiar en cualquier momento. La descripción, las palabras clave y las capturas solo cambian con una versión nueva.

### 8.2 Datos generales de la versión

| Campo | Valor | Diferencia con LISTING.md | Estado |
|---|---|---|---|
| Número de versión | `1.0.0` (`version`) | App Store Connect crea la primera versión como "1.0". Tiene que coincidir con la versión del build (`CFBundleShortVersionString` = 1.0.0, de `app.json`) para poder elegirlo, así que se cambia a 1.0.0 (verificar). | pendiente de introducir |
| Build | 1.0.0 (1) | Está compilado en EAS. Angelo lo envía con `eas submit` y hay que esperar a que Apple lo procese. | pendiente de introducir (verificar el número) |
| Copyright | `2026 MORDOBO TECHNOLOGIES LLC` | `LISTING.md` → *Version information* | pendiente de introducir |
| Archivo de cobertura de rutas | Ninguno | ídem | pendiente de introducir |
| Cumplimiento de exportación | No lo pregunta, porque el build lleva `ITSAppUsesNonExemptEncryption = NO` (`usesNonExemptEncryption`). Si lo preguntara: "None of the algorithms mentioned above". | `LISTING.md` → *Export compliance* | se ve al procesar el build (verificar) |
| Game Center · App Clip · iMessage | No | — | no aplica |
| Etiquetas de accesibilidad | Sin declarar | No están en `LISTING.md`. Son opcionales, y solo se declara lo que se haya probado en iPhone (ver [Lo que el código no puede comprobar](#lo-que-el-código-no-puede-comprobar)). | (verificar si App Store Connect las pide) |

## 9. Información para la revisión (App Review Information)

| Campo | Valor | Origen | Estado |
|---|---|---|---|
| ¿Requiere iniciar sesión? | **No**, con el usuario y la contraseña de demostración vacíos (`signIn` = `none`) | `LISTING.md` → *App Review information* | pendiente de introducir |
| Contacto: nombre | Angelo Rivas | ídem | pendiente de introducir |
| Contacto: teléfono | El de Angelo (no se escribe aquí porque el repo es público) | ídem | pendiente de introducir |
| Contacto: correo | `support@mordobo.com` (`supportEmail`) | ídem | pendiente de introducir |
| Notas | El bloque bajo "**Notes** (paste as is)" de `LISTING.md` → *App Review information*, tal cual y en inglés | Ninguna | pendiente de introducir |
| Archivo adjunto | Ninguno | ídem | pendiente de introducir |

## 10. Publicación de la versión (Version Release)

| Campo | Valor | Estado |
|---|---|---|
| Publicación | Manual: Angelo la publica después de la aprobación | pendiente de introducir |
| Lanzamiento por fases (7 días) | No aplica a la 1.0, solo a las actualizaciones automáticas | no aplica |
| Restablecer valoraciones | No aplica a la 1.0 | no aplica |

## 11. TestFlight

| Campo | Valor | Estado |
|---|---|---|
| Build | 1.0.0 (1), en EAS y sin subir | pendiente de introducir (Angelo, `eas submit`) |
| Cumplimiento de exportación | Automático (`usesNonExemptEncryption: false`) | (verificar al procesar el build) |
| Información de prueba: correo para comentarios | `support@mordobo.com` | pendiente de introducir |
| Información de prueba: URL de la política de privacidad | `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html` | pendiente de introducir |
| Información de prueba: descripción de la beta y URL de marketing | Solo para pruebas externas; la URL de marketing queda vacía | no aplica a la 1.0 |
| Grupo interno | Angelo y quien tenga acceso a App Store Connect (RELEASE-IOS.md §4) | pendiente de introducir |
| Pruebas externas | No previstas en la 1.0 (son opcionales y pasan por la revisión de beta) | no aplica |

---

## Qué depende de qué

Cada fila es una clave de [`app-store-declarations.json`](app-store-declarations.json). "Lo hace verdad" es el código que `src/release/appStoreDeclarations.test.ts` lee para comprobarla. Si ese código cambia, el test falla. Entonces, en el mismo PR y **antes de enviar el siguiente build**, se cambia lo que dicen las dos últimas columnas, se actualizan este registro y el JSON, y se le dice a Angelo exactamente qué campos tocar en App Store Connect (y en Play Console). "Google Play", en la última columna, es [`store/google-play/GOOGLE-PLAY-CONSOLE.md`](../google-play/GOOGLE-PLAY-CONSOLE.md) y Play Console. Las frases citadas entre comillas en esa columna son las de `CLAIMS` en el test: si una se reescribe, se cambia en los dos sitios.

### Identidad, versión y dispositivos

| Clave | Declarado | Lo hace verdad (archivo · símbolo) | Si cambia: App Store Connect | Si cambia: LISTING.md, política, soporte, Google Play |
|---|---|---|---|---|
| `bundleId` | `app.traceroutine` | `app.json` → `ios.bundleIdentifier`; `eas.json` → `submit.production.ios.bundleIdentifier` | No se puede cambiar en un registro existente. Otro ID de paquete es otra app: registro nuevo, Apple ID nuevo y todo introducido otra vez. | Cabecera de `LISTING.md` y RELEASE-IOS.md. Google Play usa `android.package`, que va aparte. |
| `appleId` | Pendiente (`null`) | `eas.json` → `submit.production.ios.ascAppId` (todavía no existe) | Lo asigna Apple al crear el registro (§2) | `src/release/storeConfig.test.ts` espera el perfil de envío exacto |
| `version` | `1.0.0` | `app.json` → `expo.version`. El número de build lo lleva EAS (`appVersionSource: remote`). | + Versión con el mismo número, Novedades, el build nuevo y las capturas si cambiaron. Además, una sección nueva en este registro. | El bloque `### What's New` de `LISTING.md`, con los cambios reales |
| `name` | `TraceRoutine` | `app.json` → `expo.name`; `CFBundleDisplayName` en `locales/en.json` y `locales/es.json` (el nombre bajo el icono) | Información de la app → Nombre en cada localización, parecido al nombre bajo el icono (guía 2.3.8). Hay que comprobar que no está "already being used". | Los bloques `### Name` de `LISTING.md` y `storeListing.test.ts`; el nombre en Google Play |
| `primaryLanguage` | `es-MX` | `LANGS` en `src/i18n/index.ts` (incluye `es`); el encabezado "primary language" de `LISTING.md` | Información de la app → Idioma principal | El encabezado de `LISTING.md` |
| `localizations` | es-MX, es-ES, en-US | `LANGS` (`src/i18n/index.ts`), `CFBundleLocalizations` en `app.json`, `plugins/withIosLocales.js` con `locales/*.json`, y las secciones `## <idioma>` de `LISTING.md` | Añadir o quitar la localización: nombre, subtítulo, URL de privacidad (§7) y su página de producto completa (§8.1) | Una sección en `LISTING.md`, y `docs/privacy.html` y `docs/support.html` en ese idioma; los idiomas de la ficha de Google Play |
| `supportsTablet` | `false` (solo iPhone) | `app.json` → `ios.supportsTablet` | Las capturas de iPad de 13" pasan a ser obligatorias, y de las notas sale la línea del modo de compatibilidad | `LISTING.md` (`storeListing.test.ts` prohíbe "iPad") y RELEASE-IOS.md §8 |
| `screenshotsPerLocale` | 8 | Los PNG por idioma de las dos series del repo, con los mismos idiomas y nombres: `store/app-store/screenshots/` (6,9", 1320 × 2868) y `store/app-store/screenshots-6.3/` (6,3", 1206 × 2622, las que se suben). El test comprueba también su tamaño y que no tienen transparencia. Lo que muestran sale de `app/(tabs)/index.tsx`, `month.tsx`, `stats.tsx`, `settings.tsx` y `app/editor.tsx`, con los textos de `src/i18n/*.json` (incluido el pie `settings.localData` de la captura 08). | Versión → capturas en cada localización, con la serie de 6,3". Solo cambian con una versión nueva. | `LISTING.md` → *Screenshots* y captions, `screenshots/README.md` (con la orden que rehace la serie de 6,3"); las capturas de Google Play |

### Cuenta, datos y permisos

| Clave | Declarado | Lo hace verdad (archivo · símbolo) | Si cambia: App Store Connect | Si cambia: LISTING.md, política, soporte, Google Play |
|---|---|---|---|---|
| `signIn` | `{ "mode": "none", "gate": null }`: no hay inicio de sesión. Los tres estados son `none` (no hay login), `optional` (hay login, pero la app se usa sin él) y `required` (sin login no se usa). | **`none`**: no hay SDK de inicio de sesión en `package.json` → `dependencies`, ni ruta de cuenta en `app/` (login, logout, signin, signup, auth, account, register, password, profile), ni campo de contraseña (`secureTextEntry`, `textContentType` o `autoComplete` de contraseña o usuario) ni llamada de inicio de sesión (`openAuthSessionAsync`, `signInAsync`, `signInWith…`) en `app/` ni en `src/`. Los datos solo están en SQLite en el dispositivo (`src/data/persistence.ts`, `src/data/sqliteDriver.ts`). **`optional` o `required`**: el código no puede distinguirlos, así que se declara a mano y `gate` apunta a la constante que lo decide: `{ "file": "src/…", "constant": "SIGN_IN_REQUIRED" }`, un `export const SIGN_IN_REQUIRED = true \| false` que lee la guarda de rutas (`true` = obligatorio). El test falla si esa constante cambia de valor, de nombre o de archivo. | **De `none` a `optional`**: Información para la revisión → Información de inicio de sesión: una cuenta de demostración para las funciones con cuenta (guía 2.1; las credenciales solo en App Store Connect, nunca en el repo). App Privacy → los datos de la cuenta (Información de contacto, Identificadores → ID de usuario, vinculados a la identidad). Borrar la cuenta desde la app si se pueden crear (guía 5.1.1(v), `accountCreation`). "Iniciar sesión con Apple" si se ofrece un login de terceros (guía 4.8). **De `optional` a `required`** (o de `none` a `required`): todo lo anterior, más "¿Requiere iniciar sesión?" = Sí y una línea en las notas sobre qué funciones necesitan la cuenta (la guía 5.1.1(v) no deja pedir login sin funciones que dependan de él). **Pasar de opcional a obligatorio es un cambio de declaración aunque el SDK y las pantallas sean los mismos.** **De `required` a `optional`**: "¿Requiere iniciar sesión?" = No y las notas. | Todo lo que dice "sin cuenta" (la lista exacta está en `CLAIMS`): en `LISTING.md`, la cabecera ("iPhone only, no account"), el texto promocional ("Sin cuenta y sin rachas" en es-MX, "Sin cuenta ni rachas" en es-ES, "No account, no streaks" en en-US), la descripción ("Sin cuenta ni registro" en es-MX y es-ES, "No account, no sign-up" en en-US), *App Privacy* ("No account, no sign-in, no server"), *App Review information* ("Sign-in required: No") y las notas ("There is no account or sign-in", que también exige `storeListing.test.ts`). El pie de Ajustes `settings.localData` ("Tus datos viven en tu dispositivo" / "Your data lives on your device", en `src/i18n/*.json`), que sale en la captura 08 de las dos series. `docs/privacy.html` ("no tiene cuentas de usuario", "no sube tus datos a ningún servidor"); `docs/support.html` ("no tiene cuentas ni servidores"); `docs/RELEASE-IOS.md` §5 ("No hay cuenta ni registro") y §7 ("¿Requiere inicio de sesión? No"); `README.md` ("Local-first, no account"); `CLAUDE.md` ("no account"); §9 de este registro. En Google Play: Acceso a la app, Seguridad de los datos y Eliminación de la cuenta. |
| `accountCreation` | `false` | Con `signIn` = `none` tiene que ser `false`. Pasa a `true` en cuanto el código tiene registro: una ruta signup, register o create-account, un campo de contraseña nueva (`newPassword`, `new-password`), `createUserWith…` o `signUp(`. Si hay login pero las cuentas se crean fuera de la app, se declara a mano. | La forma de borrar la cuenta en la app y en las notas (guía 5.1.1(v)); App Privacy → los datos que guarda la cuenta | La política (qué guarda la cuenta y cómo se borra) y las mismas frases de "sin cuenta" que `signIn`; en Google Play, la URL para borrar la cuenta y Seguridad de los datos |
| `dataCollected` | `false` (Datos no recopilados) | `analyticsAllowed('ios') === false` (`src/analytics/policy.ts`), que deja sin arrancar en iOS a PostHog (`src/analytics/posthog.ts`) y a Sentry (`src/analytics/sentry.ts`); no se envía ningún otro SDK que recopile datos o hable con un servidor | App Privacy → "Sí, recopilamos datos" y cada tipo con su finalidad, vinculación y rastreo. RELEASE-IOS.md §5 tiene las respuestas previstas: Datos de uso → Interacción con el producto, Diagnóstico → Datos de fallos y el ID anónimo de PostHog. App Privacy → URL de opciones de privacidad del usuario (§7), que deja de estar vacía porque ya hay algo que desactivar. | Todo lo que dice que no sale ningún dato o que los datos se quedan en el dispositivo (la lista exacta está en `CLAIMS`): `docs/privacy.html` ("La versión actual no transmite ningún dato", "Tus datos viven en tu dispositivo"); en `LISTING.md`, la cabecera ("no analytics or crash reporting"), *App Privacy*, la descripción ("TUS DATOS, EN TU TELÉFONO" / "TUS DATOS, EN TU MÓVIL" / "YOUR DATA STAYS ON YOUR PHONE"), los captions 8 y las notas ("the app sends no data"); `docs/support.html` ("la app no los envía a ningún sitio"); `docs/RELEASE-IOS.md` §5 (la respuesta y "el build de producción no envía ningún dato"); `CLAUDE.md` ("iOS v1 collects nothing"); el pie de Ajustes `settings.localData` y el interruptor de estadísticas que entonces aparece en Ajustes (captura 08 de las dos series); §7 de este registro. En Google Play, Seguridad de los datos, que es otra (Android sí permite la analítica; conflicto 3 del registro de Google Play). |
| `networkCalls` | Ninguno (`[]`) | No hay ningún `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` ni `sendBeacon`, ni subidas o descargas de `expo-file-system` (`uploadAsync`, `downloadAsync`, `createUploadTask`, `createDownloadResumable`, `downloadFileAsync`) en `app/` ni en `src/` | Decidir si lo que envía ese código cuenta como "recopilar" en App Privacy (y cambiar `dataCollected` con ello), anotar la decisión aquí y añadir el archivo a `networkCalls` | `LISTING.md` → *App Privacy* ("No network code") y `docs/privacy.html` |
| `inAppBrowserCalls` | Ninguno (`[]`) | `expo-web-browser` está en `dependencies`, pero ningún archivo de `app/` ni de `src/` lo importa ni llama a `openBrowserAsync` u `openAuthSessionAsync`. "Privacidad" abre Safari con `Linking.openURL`. | Clasificación por edad → Unrestricted web access: decidir si ese navegador deja navegar libremente (Sí sube la clasificación), anotarlo en `ageRatingAnswers.unrestrictedWebAccess` y añadir el archivo a `inAppBrowserCalls`. `openAuthSessionAsync` es además un inicio de sesión (`signIn`). | `LISTING.md` → *Age rating* ("No in-app browser") |
| `tracking` | `false` | No hay `NSUserTrackingUsageDescription` ni `SKAdNetworkItems` en el `infoPlist` resuelto, ni SDK de atribución | App Privacy → los datos usados para rastrear; además, el aviso de App Tracking Transparency en la app | `docs/privacy.html` ("ni usamos identificadores publicitarios"); el ID de publicidad en Google Play |
| `pushNotifications` | `false` | Los recordatorios son notificaciones locales (`src/reminders/service.ts`) y nadie llama a `getExpoPushTokenAsync` ni a `getDevicePushTokenAsync` | Una clave APNs en EAS; App Privacy si el token llega a un servidor; las notas ("local notifications only") | `docs/privacy.html` ("Recordatorios") y `LISTING.md` → *App Privacy* |
| `permissions` | `notifications` | `expo-notifications` en `dependencies`. El permiso se pide después del aviso previo (`src/reminders/prePrompt.ts`, `askReminderPermission` y `offerReminders` en `src/reminders/service.ts`). | Las notas (paso 5: cómo ver cada permiso); App Privacy si lo que da el permiso sale del dispositivo (ubicación, contactos, fotos) | `docs/privacy.html` y RELEASE-IOS.md §4; los permisos de la ficha de Google Play |
| `iosUsageDescriptions` | Ninguna (`[]`) | Las claves `NS*UsageDescription` del `infoPlist` resuelto | Las notas (cuándo aparece el permiso); cada texto en los dos idiomas (`locales/*.json`) | — |

### Compras y anuncios

| Clave | Declarado | Lo hace verdad (archivo · símbolo) | Si cambia: App Store Connect | Si cambia: LISTING.md, política, soporte, Google Play |
|---|---|---|---|---|
| `inAppPurchases` | `false`: gratis, sin compras ni suscripciones, sin acuerdo de apps de pago | `showsPro('ios') === false` (`src/store/limits.ts`: sin tarjeta Pro y con los `PRO_ONLY_KEYS` ocultos en iOS); no hay SDK de compras | Negocio → acuerdo de apps de pago, datos bancarios e impuestos. Compras dentro de la app / Suscripciones → crear los productos (TR-87) con su captura para la revisión y añadirlos a la versión. Las notas: dónde está la compra y cómo restaurarla. | `LISTING.md` (`storeListing.test.ts` prohíbe precios y planes), `docs/privacy.html`, RELEASE-IOS.md §9 y la captura 08 (Ajustes con Pro). Android ya muestra Pro en Google Play. |
| `containsAds` | `false` | No hay SDK, plugin ni ID de AdMob en la configuración resuelta | Clasificación por edad → Advertising = Sí. App Privacy → los datos para publicidad de terceros, y rastreo con App Tracking Transparency si los anuncios son personalizados. `app-ads.txt` en el sitio del desarrollador. | `docs/privacy.html` ("No mostramos anuncios") y `LISTING.md` (`storeListing.test.ts` prohíbe "anuncios"); "Contiene anuncios" en Google Play |

### Edad y salud

| Clave | Declarado | Lo hace verdad (archivo · símbolo) | Si cambia: App Store Connect | Si cambia: LISTING.md, política, soporte, Google Play |
|---|---|---|---|---|
| `minimumAge` | Ninguna (`null`) | No hay constante de edad mínima (`MIN_AGE`…) ni comprobación de edad en `app/` ni en `src/` | Clasificación por edad → Age Assurance = Sí y override a esa edad o más (como el 16+ de TracePhysique); volver a anotar la clasificación calculada | `docs/privacy.html` ("Menores": no está dirigida a menores de 13); el público objetivo en Google Play |
| `ageRating` | `{ "rating": "4+", "raisedBy": [] }` | `raisedBy` son las respuestas con Sí con las que se calculó la clasificación. El test las vuelve a sacar de `ageRatingAnswers` (lo que da el código más las decisiones del dueño) y falla si no coinciden, sea cual sea la clasificación. Con `raisedBy` vacío tiene que ser 4+. Las respuestas del paso 2 (contenido) no se pueden comprobar: si alguna sube la clasificación, se anota a mano en `raisedBy` como `"content: <pregunta> = <respuesta>"`. | Repetir el cuestionario (§4) y anotar la nueva clasificación y lo que la subió | La política ("Menores"); `LISTING.md` → *Age rating*; la clasificación de contenido (IARC) en Google Play |
| `ageRatingOverride` | Ninguno (`null`) | No hay edad mínima en el código | Clasificación por edad → "Age Categories and Override" | — |
| `ageRatingAnswers` | No a todo: Parental controls, Age assurance, Unrestricted web access, User-generated content, Messaging and chat, Social media, Advertising y Health or wellness topics | Parental controls ← código, dependencia o capacidad de Family Controls / control parental. Age assurance ← edad mínima. Unrestricted web access ← `react-native-webview`, que no está; con `expo-web-browser` en uso (`inAppBrowserCalls`) lo decide el dueño. User-generated content y Social media ← SDK de servidor o de chat (sin cuentas ni servidor nadie ve lo de otro). Messaging and chat ← SDK de chat. Advertising ← SDK de anuncios. Health or wellness topics ← decisión del dueño (pendiente 6), y Sí obligatorio si la app lee datos de salud. | Cambiar la respuesta que se movió y anotar la clasificación calculada (`ageRating`) | `LISTING.md` → *Age rating* y RELEASE-IOS.md §6; el cuestionario IARC en Google Play |
| `regulatedMedicalDevice` | `false` (no es un dispositivo médico regulado) | El aviso no médico en `docs/privacy.html` (ES y EN), en cada descripción y en las notas de `LISTING.md`; la categoría Productividad | Dispositivo médico regulado, si aparece (§5), y Clasificación por edad → Medical or treatment information | La política y `LISTING.md`. Si la app pasa a Salud y forma física, la declaración aparece (lección 3). |
| `readsHealthData` | `false` | No hay SDK de salud, ni claves `NSHealth*`, ni la capacidad HealthKit | App Privacy → Salud y forma física. Clasificación por edad → Health or wellness topics (9+). Las notas ("reads no health data (no HealthKit)"). Revisar también el dispositivo médico y la categoría. | La política y las notas de `LISTING.md`; Health Connect y Seguridad de los datos en Google Play |

### Cifrado

| Clave | Declarado | Lo hace verdad (archivo · símbolo) | Si cambia: App Store Connect | Si cambia: LISTING.md, política, soporte, Google Play |
|---|---|---|---|---|
| `usesNonExemptEncryption` | `false` | `app.json` → `ios.config.usesNonExemptEncryption`, que escribe `ITSAppUsesNonExemptEncryption = NO`. La app solo usa el HTTPS del sistema. | El cumplimiento de exportación del build: las preguntas y, si hace falta, la documentación | `LISTING.md` → *Export compliance* y RELEASE-IOS.md §0 |
| `encryptionLibraries` | Ninguna (`[]`) | No hay biblioteca de cifrado en `dependencies` ni SQLCipher en `expo-sqlite` | Confirmar que cada biblioteca nueva es exenta (o pasar `usesNonExemptEncryption` a `true`) y anotar aquí por qué | — |

### URL y contacto

| Clave | Declarado | Lo hace verdad (archivo · símbolo) | Si cambia: App Store Connect | Si cambia: LISTING.md, política, soporte, Google Play |
|---|---|---|---|---|
| `supportEmail` | `support@mordobo.com` | `SUPPORT_EMAIL` en `src/about/links.ts` (también lo usa "Enviar comentarios") | Información para la revisión → correo; TestFlight → correo para comentarios | La descripción, las novedades y las notas de `LISTING.md`, `docs/privacy.html` y `docs/support.html`; el correo del desarrollador en Google Play |
| `supportUrl` | `…/support.html` (en-US con `#en`) | `docs/support.html`, servido por GitHub Pages junto a `PRIVACY_POLICY_URL` | Versión → URL de soporte en cada localización; tiene que responder 200 antes de enviar | `LISTING.md` → *Version information* |
| `privacyPolicyUrl` | `…/privacy.html` (en-US con `#en`) | `privacyPolicyUrl(lang)` en `src/about/links.ts`, la misma función que usa Ajustes → "Privacidad" | App Privacy → URL de la política en cada localización; TestFlight → URL de la política | `LISTING.md` → *App information*; la política de privacidad en Google Play |

### Reglas de negocio que cita la ficha

`appStoreDeclarations.test.ts` también comprueba que `LISTING.md` y `docs/support.html` citan estas mismas cifras.

| Clave | Declarado | Lo hace verdad (archivo · símbolo) | Si cambia: App Store Connect | Si cambia: LISTING.md, política, soporte, Google Play |
|---|---|---|---|---|
| `activeActivityLimit` | 5 | `FREE_ACTIVE_LIMIT` en `src/store/limits.ts` | Versión → Descripción en los tres idiomas ("Hasta 5 actividades activas" / "Up to 5 active activities") y las notas ("up to 5 active activities", paso 6) | `LISTING.md`, `docs/support.html` ("Hasta 5 activas"); la ficha de Google Play |
| `everyNMax` | 30 | `validateRule` en `src/engine/presets.ts` (`everyN.range`) | Descripción ("de 1 a 30" / "from 1 to 30") | `LISTING.md` |
| `patternsAfterScheduledDays` | 14 | `MIN_DAYS_FOR_PATTERNS` en `src/stats/statsModel.ts` | Las notas ("patterns appear after 14 scheduled days") | `LISTING.md` |
| `trendWeeks` | 12 | `weeklyTrend` en `src/stats/statsModel.ts` (`weeks = 12`) | Descripción ("últimas 12 semanas" / "last 12 weeks") y las notas ("12-week trend") | `LISTING.md` |
| `trendAfterWeeks` | 2 | `MIN_WEEKS_FOR_TREND` en `src/stats/statsModel.ts` | Las notas ("after two weeks of logs") | `LISTING.md` |

### Lo que el código no puede comprobar

| Declaración | Valor | Depende de | Revisar cuando |
|---|---|---|---|
| Categorías | Productividad / Estilo de vida | El posicionamiento no médico (TR-81) | La app lea datos de salud o se presente como app de salud |
| Derechos de contenido | No hay contenido de terceros | Todo lo que se ve lo escribe el usuario; Inter (SIL OFL) y Phosphor (MIT) tienen licencia | Se añadan plantillas, imágenes, música o datos de terceros |
| Medical or treatment information (y el porqué de Health or wellness topics = No) | None (y No, decisión del dueño en `ageRatingAnswers.healthOrWellnessTopics`) | La sugerencia "Tratamiento cada 2 días" (`firstActivity.treatment` en `src/i18n/*.json`, `src/store/sample.ts`) y los ejemplos de entrenar y fisio; en Google Play, la declaración de salud "Medication and Treatment Management" | Se añada contenido de salud o de tratamiento, o cambie la declaración de salud de Google Play |
| Resto de respuestas del paso 2 de la clasificación (lenguaje, terror, alcohol y drogas, temas para adultos, sexualidad, violencia, armas, azar, concursos, cajas de botín) | None / No | Lo que se ve en la app: lo que escribe el usuario y los textos de `src/i18n/*.json` y `src/store/sample.ts` | Se añadan textos, plantillas, imágenes, sugerencias o juegos con ese contenido. Si alguna respuesta sube la clasificación, va en `ageRating.raisedBy` como `content: …` |
| Age suitability URL (§4) | Vacía | No hay página para padres | Se publique una |
| URL de opciones de privacidad del usuario (§7) | Vacía | No hay nada que desactivar porque no se recopila nada (`dataCollected`) | `dataCollected` pase a `true` o haya cualquier opción de privacidad que el usuario pueda cambiar |
| Etiquetas de accesibilidad (§8.2) | Sin declarar | Lo que se haya probado en iPhone real (VoiceOver, por ejemplo el menú de cada actividad en Hoy; texto grande; modo oscuro; contraste) | Se prueben y se decida declararlas, o cambie una pantalla ya probada |
| Precio y disponibilidad | Gratis; todos los países menos China continental | Decisión del dueño | Lleguen las compras (TR-96) o cambien los mercados |
| Mac con Apple silicon · Apple Vision Pro | Decisión del dueño (verificar) | Dónde se ha probado la app | Se pruebe en Mac o Vision Pro |
| Copyright | `2026 MORDOBO TECHNOLOGIES LLC` | El año y el vendedor | Cada año nuevo, o si cambia el vendedor |
| Publicación | Manual | Decisión del dueño | — |
| Otros textos de la ficha: atajos de 21 días, 4 semanas y 3 meses; "DELETE" / "BORRAR"; "Skip"; "Train every other day"; "Something else" | Los citan la descripción y las notas | `DurationKind` en `src/ui/editor/editorModel.ts` y los textos de `src/i18n/*.json` | Cambien esas reglas o esos textos |
| Contenido de las capturas | Las 8 pantallas de `LISTING.md` → *Screenshots* | La interfaz y los textos de la app, y el tema oscuro por defecto | Cambie cualquier pantalla que aparezca en ellas |

### Google Play

Lo declarado en Google Play está en [`store/google-play/GOOGLE-PLAY-CONSOLE.md`](../google-play/GOOGLE-PLAY-CONSOLE.md): la versión 1.0.0 (versionCode 2), publicada el 17 de septiembre de 2026, reconstruida de las notas del envío y con todo en "verificar". La app de Android no es igual a la de iOS: `showsPro('android')` y `analyticsAllowed('android')` son `true`, así que tiene la sección Pro y puede enviar datos a PostHog y Sentry si el build lleva claves. Por eso sus respuestas no se copian de estas. Tres cosas de Play no cuadran con lo planeado aquí:

1. **Salud**: Play declara la función "Medication and Treatment Management"; aquí el plan es "Health or wellness topics" = No y "Medical or treatment information" = None (§4, pendiente 6).
2. **Correo de contacto**: Play muestra `angelo.rivas@mordobo.com`; aquí, la app, la política y la página de soporte usan `support@mordobo.com` (`supportEmail`).
3. **Seguridad de los datos**: Play dice "no se recopilan datos", que solo es verdad mientras el build de Android no lleve claves de PostHog ni de Sentry.

---

## Antes de cada build/versión de iOS

- [ ] `npm test`, `npm run typecheck` y `npm run lint` en verde (Node 22). Que `appStoreDeclarations.test.ts` esté en verde significa que el JSON coincide con el código, no que App Store Connect coincida con el JSON. Eso lo dice este registro.
- [ ] Revisar los commits desde el último build enviado. Si alguno toca reglas de negocio, cuenta o inicio de sesión, datos que salen del dispositivo, compras, anuncios, edad, permisos, idiomas, dispositivos, URL o las pantallas de las capturas, seguir su fila de [Qué depende de qué](#qué-depende-de-qué).
- [ ] `npx eas-cli@latest env:list --environment production` (solo los nombres). Si aparecen claves de PostHog o Sentry, en iOS siguen apagadas (`analyticsAllowed`), pero hay que saber por qué están.
- [ ] Si cambió `version` en `app.json`: crear esa versión en App Store Connect con el mismo número, rellenar las novedades (bloque `### What's New` con los cambios reales) y abrir aquí su sección.
- [ ] Comprobar que `curl -sI https://angelorivasmordobo.github.io/TraceRoutine/privacy.html` y `…/support.html` responden 200.
- [ ] Si cambió el inicio de sesión, incluido pasar de opcional a obligatorio (`signIn`), seguir su fila: es un cambio de declaración aunque las pantallas sean las mismas.
- [ ] Si cambió una pantalla que sale en las capturas (Hoy, el editor, Mes, Estadísticas o Ajustes) o sus textos, rehacer las dos series (la de 6,9" de `screenshots/` y la de 6,3" de `screenshots-6.3/`, con la orden de `screenshots/README.md`) y subir la de 6,3" con la versión.
- [ ] Si cambió algo que cuentan la descripción o las notas (el límite de 5, las frecuencias, las estadísticas, los recordatorios, exportar o borrar), actualizar `LISTING.md` y la versión en App Store Connect.
- [ ] Confirmar que App Privacy, la clasificación por edad y las notas para la revisión siguen siendo verdad.
- [ ] Al enviar el build, anotar aquí la fecha, el número de build y lo introducido, y actualizar `record` en el JSON.
- [ ] Al aprobarse y publicarse la versión, anotar las dos fechas en el historial.

## Pendiente de verificar

1. El número del build de EAS: 1.0.0 (1).
2. Que el nombre `TraceRoutine` está libre en es-MX, es-ES y en-US.
3. Si el build de EAS ya registró el ID de paquete `app.traceroutine` en developer.apple.com → Identifiers.
4. Que en Negocio → Acuerdos no queda ningún acuerdo pendiente de aceptar (el 19 de octubre quedaba el Program License Agreement actualizado, con plazo hasta el 28 de octubre de 2026).
5. Que la ficha de TraceRoutine en la UE muestra los datos de comerciante de la DSA.
6. La decisión sobre "Health or wellness topics": No (4+) o Sí (9+), teniendo en cuenta que Google Play declara "Medication and Treatment Management" (registro de Google Play, conflicto 1).
7. Si App Store Connect pide la declaración de dispositivo médico regulado con la categoría Productividad.
8. La decisión sobre Mac con Apple silicon y Apple Vision Pro.
9. Qué tamaños de captura pide App Store Connect para TraceRoutine: el de 6,3" y si además el de 6,9" o el de 6,5".
10. Que la versión 1.0 de App Store Connect se cambia a 1.0.0, como el build.
11. Que al procesar el build no se pide el cumplimiento de exportación.
12. Que `support.html` responde 200 cuando esta rama llegue a `main`.
13. Si App Store Connect pide las etiquetas de accesibilidad.
14. Lo que declara hoy Google Play: está reconstruido en `store/google-play/GOOGLE-PLAY-CONSOLE.md` y falta confirmarlo en Play Console, junto con el correo de contacto (conflicto 2).

## Historial

| Fecha | Qué | Build |
|---|---|---|
| 2026-10-21 | Se crea este registro como plan, a partir de `LISTING.md`. No hay nada introducido en App Store Connect. | 1.0.0 (1) en EAS, sin enviar |
| 2026-10-21 | Revisión del registro: el inicio de sesión pasa a tres estados (`signIn`), se añaden `inAppBrowserCalls`, todas las respuestas del paso 1 de la clasificación y `ageRating.raisedBy`; las frases de "sin cuenta" y de "datos en el dispositivo" se comprueban palabra por palabra; la serie de 6,3" entra en el repo (`screenshots-6.3/`); se crea el registro de Google Play; las fechas de la cuenta (19 de octubre) quedan anotadas. Sigue sin haber nada introducido en App Store Connect. | 1.0.0 (1) en EAS, sin enviar |
