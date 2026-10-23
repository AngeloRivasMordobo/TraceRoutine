# TraceRoutine · Registro de Google Play Console (Android)

Este archivo dice qué hay declarado en Google Play Console para TraceRoutine, sección por sección, con la fecha y el versionCode de cada cosa. Es el equivalente de [`../app-store/APP-STORE-CONNECT.md`](../app-store/APP-STORE-CONNECT.md) para Android. Las columnas "Si cambia: Google Play" de ese registro apuntan aquí.

- **Versión publicada**: 1.0.0 (versionCode 2), en producción desde el **17 de septiembre de 2026** (verificar en Play Console → Producción que no se ha publicado otra después).
- **Estado del registro a 21 de octubre de 2026: reconstruido de las notas del envío** (10 de septiembre de 2026) y de la aprobación (17 de septiembre de 2026), **no** leído de Play Console. Por eso cada valor lleva **(verificar)**. Al confirmarlo en Play Console se quita `(verificar)`, se anota la fecha y se añade una línea al [historial](#historial).
- **Al cambiar algo en Play Console**, el mismo día: el valor exacto, la fecha, el versionCode y una línea en el historial.
- **La app de Android no es la de iOS**: `showsPro('android')` y `analyticsAllowed('android')` son `true`. Tiene la tarjeta Pro ("Avísame cuando esté listo", sin compras) y puede enviar datos a PostHog y Sentry si el build lleva sus claves. Las respuestas de Play nunca se copian de las de iOS.
- **El repositorio es público**: aquí no van los IDs de la cuenta de desarrollador ni de la app en Play Console, los correos de acceso a Play Console, la clave de la cuenta de servicio de EAS Submit ni teléfonos.

Estados: `declarado AAAA-MM-DD` · `publicado AAAA-MM-DD` · **(verificar)**: todavía sin confirmar en Play Console.

---

## 1. Ficha de Play Store y configuración de la tienda

| Campo | Valor | Estado |
|---|---|---|
| Paquete | `app.traceroutine` (`app.json` → `android.package`) | publicado 2026-09-17 |
| Categoría | Aplicación → Productividad | declarado 2026-09-10 (verificar) |
| Correo de contacto (público en la ficha) | `angelo.rivas@mordobo.com` | declarado 2026-09-10 (verificar). **No es el de iOS** ([conflicto 2](#conflictos-con-ios)). |
| URL de la política de privacidad | `https://angelorivasmordobo.github.io/TraceRoutine/privacy.html` | declarado 2026-09-10 (verificar) |
| Nombre, descripción breve, descripción completa, gráfico de funciones y capturas | No están en el repo | (verificar: copiarlos aquí la próxima vez que se abra la ficha, para poder revisar sus frases de "sin cuenta" y "tus datos en tu teléfono" como las de `LISTING.md`) |
| Notas de la versión | En es-419 | declarado 2026-09-10 |

## 2. Producción

| Campo | Valor | Estado |
|---|---|---|
| Versión | 1.0.0 (versionCode 2), el mismo AAB que la prueba interna | publicado 2026-09-17 |
| Países o regiones | Todos (176 más el resto del mundo) | declarado 2026-09-10 (verificar) |
| Precio | Gratis, sin productos dentro de la app | (verificar) |
| Publicación gestionada | Desactivada: lo que se aprueba se publica solo | (verificar) |

## 3. Contenido de la app (Política y programas → Contenido de la app)

| Declaración | Valor | Lo hace verdad | Estado |
|---|---|---|---|
| Política de privacidad | La URL de §1 | `privacyPolicyUrl('es')` en `src/about/links.ts` | declarado 2026-09-10 (verificar) |
| Acceso a la app | No está en las notas. Tendría que ser "Toda la funcionalidad está disponible sin acceso especial", porque no hay cuenta. | `signIn` = `none` en `app-store-declarations.json` | (verificar) |
| Anuncios | La app no contiene anuncios | No hay SDK de anuncios en `dependencies`, que es la misma lista para Android (`containsAds`) | declarado 2026-09-10 (verificar) |
| ID de publicidad | No se usa | No hay SDK de anuncios ni de atribución | declarado 2026-09-10 (verificar) |
| Clasificación del contenido (IARC) | Todas las respuestas "No" | Las mismas razones que el cuestionario de Apple (§4 del registro de iOS) | declarado 2026-09-10 (verificar qué clasificación salió) |
| Público objetivo | 13 años o más | `docs/privacy.html` → "Menores": no está dirigida a menores de 13 | declarado 2026-09-10 (verificar los tramos exactos) |
| Seguridad de los datos | No se recopilan ni se comparten datos | **Solo es verdad mientras el build de Android no lleve claves de PostHog ni de Sentry**: en Android `analyticsAllowed` es `true` ([conflicto 3](#conflictos-con-ios)) | declarado 2026-09-10 (verificar) |
| Funciones financieras | Ninguna | La app no maneja dinero | declarado 2026-09-10 (verificar) |
| App gubernamental | No | — | declarado 2026-09-10 (verificar) |
| Apps de salud | "Medication and Treatment Management" (gestión de medicación y tratamientos) | La sugerencia "Tratamiento cada 2 días" (`firstActivity.treatment`) y los recordatorios de tratamiento | declarado 2026-09-10 (verificar). **No cuadra con lo introducido en iOS** ([conflicto 1](#conflictos-con-ios)). |
| Eliminación de la cuenta | No aplica: no hay cuentas | `signIn` = `none` | (verificar que Play Console no la pide) |

## Conflictos con iOS

Lo declarado en Play que no cuadra con lo introducido en App Store Connect ([`APP-STORE-CONNECT.md`](../app-store/APP-STORE-CONNECT.md), 21 de octubre de 2026). Cada uno es una decisión del dueño, o un aviso que hay que tener presente antes de un build de Android.

1. **Salud.** Play declara la función de salud "Medication and Treatment Management". En iOS se respondió **No** a "Health or wellness topics" y **None** a "Medical or treatment information" (introducido el 21 de octubre de 2026, clasificación 4+), con las categorías Productividad / Estilo de vida y el posicionamiento no médico (TR-81). Queda por decidir si Play se cambia para que cuadre. Las preguntas no son la misma: la de Play es qué funciones tiene la app, y la de Apple es qué contenido muestra. Aun así, la decisión se toma para las dos tiendas y se anota aquí y allí.
2. **Correo de contacto.** Play muestra `angelo.rivas@mordobo.com`. La app ("Enviar comentarios"), la política, la página de soporte y App Store Connect usan `support@mordobo.com` (`SUPPORT_EMAIL`). Lo lógico es pasar Play a `support@mordobo.com` en cuanto ese buzón reciba correo (decisión del dueño).
3. **Seguridad de los datos.** "No se recopilan datos" solo es verdad mientras el entorno `production` de EAS no tenga `EXPO_PUBLIC_POSTHOG_KEY` ni `EXPO_PUBLIC_SENTRY_DSN`. El 19 de octubre de 2026 no tenía ninguna variable (`docs/RELEASE-IOS.md` §5). Antes de subir un build de Android con esas claves, hay que actualizar Seguridad de los datos (Datos de uso → Interacciones con la app, Fallos y diagnóstico, el ID de instalación de PostHog) y `docs/privacy.html`.

## Qué depende de qué (Google Play)

| Si cambia… | Cambiar en Play Console | Y además |
|---|---|---|
| El inicio de sesión (`signIn` deja de ser `none`, u opcional pasa a obligatorio) | Acceso a la app → instrucciones y credenciales de prueba (solo en Play Console, nunca aquí). Seguridad de los datos → los datos de la cuenta. Eliminación de la cuenta → la URL y la forma de borrarla desde la app. | Las frases de "sin cuenta" de la ficha de Play (§1) y la política |
| Los datos que salen del dispositivo (`analyticsAllowed('android')` con claves en EAS, un SDK o código de red nuevos) | Seguridad de los datos | `docs/privacy.html` |
| Los anuncios o un SDK de atribución | Anuncios, ID de publicidad, Seguridad de los datos | `docs/privacy.html` |
| La edad (una edad mínima en el código o un público nuevo) | Público objetivo y, si cambia el contenido, la clasificación IARC | `docs/privacy.html` → "Menores" |
| Contenido de salud o datos de Health Connect | Apps de salud y, con Health Connect, su declaración de permisos | El registro de iOS (§4 y §5) |
| Las compras (TR-96) | Productos dentro de la app, perfil de pagos (todavía no existe) y Seguridad de los datos → compras | La ficha |
| `SUPPORT_EMAIL` | Correo de contacto, si se alinea con iOS (conflicto 2) | — |
| `privacyPolicyUrl` | Política de privacidad | — |
| Las cifras de la ficha (5 activas, de 1 a 30, 12 semanas) o las pantallas | Ficha de Play Store: descripción y capturas (copiarlas antes a §1) | — |

## Pendiente de verificar

1. Todo lo marcado **(verificar)**: abrir Play Console y confirmarlo campo por campo.
2. Si hay alguna versión publicada después de 1.0.0 (versionCode 2).
3. La respuesta de "Acceso a la app".
4. La clasificación IARC resultante y los tramos de edad del público objetivo.
5. Los textos de la ficha (nombre, descripción breve y completa) y sus capturas, para copiarlos aquí.
6. La decisión sobre la declaración de salud (conflicto 1) y el correo de contacto (conflicto 2).

## Historial

| Fecha | Qué | versionCode |
|---|---|---|
| 2026-09-10 | Primer envío a revisión de producción, con las declaraciones de §3 | 2 |
| 2026-09-17 | Aprobado y publicado en producción | 2 |
| 2026-10-21 | Se crea este registro a partir de las notas del envío. No se ha leído nada de Play Console, por eso todo está en (verificar). | 2 |
| 2026-10-22 | El conflicto 1 se actualiza: App Store Connect ya tiene introducido "Health or wellness topics" = No (21 de octubre de 2026). Nada cambia en Play Console. | 2 |
