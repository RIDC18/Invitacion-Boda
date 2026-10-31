# PROJECT_CONTEXT — Invitación de Boda Diego & Liz

> Documento para IAs y desarrolladores. Léelo completo antes de tocar código. Última revisión: 2026-10-29.
> Idioma del producto y de los comentarios del código: **español (Paraguay)**. Responde al usuario en español.

## 1. Qué es

Invitación digital de boda, **sitio web estático de una sola página** (sin framework, sin build, sin dependencias npm).
Flujo del invitado: abre el link (opcionalmente personalizado `?invitado=Nombre`) → ve un **sobre con sello de cera** → lo toca → el sobre se abre, suena música y se revela la invitación → recorre secciones → confirma asistencia (RSVP).

| Dato | Valor |
|---|---|
| Novios | Diego & Liz |
| Fecha/hora | **21 de noviembre de 2026, 20:30** (UTC-3, Paraguay) |
| Lugar | Salón de Eventos de la Cooperativa ÑandeMba'e (ceremonia y recepción en el mismo sitio). Maps: https://maps.app.goo.gl/Z15joEe78psNLWvZA |
| Dress code | Elegante Formal |
| Hosting | Firebase Hosting, proyecto `boda-diego-liz-2026` (`.firebaserc`). URL esperable: `https://boda-diego-liz-2026.web.app` (inferida, no verificada) |
| Backend RSVP | Google Apps Script (`code.gs`) → Google Sheets, pestaña `RSVP` |
| Música | `audio/photograph-ed-sheeran.mp3` (~5.9 MB, con fallback sintetizado por Web Audio) |

## 2. Stack

- HTML5 + CSS3 + JavaScript vanilla (ES2020, sin módulos, sin bundler).
- Fuentes de Google Fonts: Great Vibes (script), Playfair Display (display), Cormorant Garamond (serif), Montserrat (sans), Poppins (cuerpo).
- Todo el arte (sobre, sello, botánicos, iconos) es **SVG inline** en `index.html`; no hay imágenes locales salvo el audio.
- PWA ligera: `sw.js` (Service Worker) con caché propia.
- Sin tests automatizados. Verificación = revisión visual en navegador (ver §7).

## 3. Estructura del repo

| Ruta | Rol | Se despliega |
|---|---|---|
| `index.html` (703 líneas) | Todo el marcado: portal-sobre, hero y secciones | Sí |
| `style.css` (~1880 líneas) | Todos los estilos, organizado en bloques con cabecera `/* === NOMBRE === */` | Sí |
| `app.js` (657 líneas) | Toda la lógica, en IIFEs numeradas por sección | Sí |
| `sw.js` | Service Worker (`CACHE_NAME = "boda-diego-liz-v24"`) | Sí |
| `audio/` | MP3 de fondo | Sí |
| `img/` | **Vacía.** Reservada para fotos reales de la galería | Sí |
| `code.gs` | Código de Google Apps Script (se pega manualmente en el editor de Apps Script; no corre aquí) | No (ignorado en hosting) |
| `firebase.json`, `.firebaserc` | Config de Firebase Hosting | No |
| `checkpoints/` | ~120 MB de capturas JPG, JSON de métricas, perfiles de Chrome y un respaldo (`checkpoint-2026-06-26-gate-before-redesign/`) de una versión previa del portal. **Es artefacto de QA, no código.** No leer ni indexar | No / no versionar |
| `*.zip` | Paquetes antiguos (`Invitacion-Boda-...-paquete-nube.zip` no incluye `sw.js`; está desactualizado) | No |
| `firebase-debug.log` | Log del CLI de Firebase | No |
| `AGENTS.md`, `.codex/`, `.vexp/` | Configuración de herramientas de IA (vexp, hooks de Codex). No tocar | No |
| `package.json`, `.gitignore`, `PROJECT_CONTEXT.md` | Entorno/documentación (añadidos 2026-10-29) | No |

Git: repo inicializado en `master`, **sin ningún commit todavía**.

## 4. Arquitectura del frontend

### 4.1 `index.html` — orden de secciones
1. `<head>`: fuentes, `style.css`, y la función global `imgFallback(img)` (inline a propósito, para estar lista antes de que carguen las fotos; si una foto falla muestra un placeholder "Agrega tu foto").
2. `.site-wrapper` con `<canvas id="ambient-canvas">` (pétalos/destellos).
3. `#gate` — portal del sobre (`#envelope`, `#seal`, `#gate-guest-name`). Dos ramas botánicas SVG, sobre armado con 5 piezas SVG (`back/top/left/right/bottom`) + carta + sello "D&L".
4. `<audio id="bg-music" loop preload="none">`.
5. `header.hero` (monograma, "Nos casamos", nombres).
6. `.welcome` → `.calendar-section` (`#calendar-grid`, generado por JS) → `.countdown` (`#dias #horas #minutos #segundos`, `#countdown-done`) → `.timeline-section` → `.locations` → `.dress-code` → `.gallery-section` (`#gallery-grid` + `#lightbox`) → `.gifts-section` → `.rsvp-section` (`#rsvp-form`) → `footer.final`.
7. `#music-toggle` (botón flotante) y `<script src="app.js">`.

Las secciones usan `data-aos="fade-up"`, pero **no se usa la librería AOS**: el revelado lo implementa `app.js` (§4.2 bloque 1).

Itinerario (hardcodeado en HTML): 20:30 Ceremonia · 22:30 Recepción · 23:30 Brindis · 00:00 Vals · 01:00 Corte del Pastel · 01:30 Música y Baile.

### 4.2 `app.js` — bloques (comentarios numerados en el código)
0. **Configuración** (arriba del archivo): `FECHA_BODA` (`new Date("2026-11-21T20:30:00-03:00")`) y `RSVP_SCRIPT_URL` (URL del Web App de Apps Script). Registro del Service Worker (`/sw.js`).
1. Revelado on-scroll con `IntersectionObserver` (añade `.is-visible`; la clase `reveal-enabled` en `<html>` activa el estado oculto; sin JS o con `prefers-reduced-motion` el contenido queda visible).
2. Fondo ambiental en canvas (30–58 partículas según alto de página).
3. Nombre del invitado: `?invitado=` o `?guest=` → `#gate-guest-name` (se inserta con `textContent`, seguro contra XSS).
4. Música: `musicaSintetica` (acordes con Web Audio) + `reproducirMusica()` que intenta primero el MP3 y cae al sintetizado. Funciones: `reproducirMusica`, `pausarMusica`, `setMusicaSilenciada`, `actualizarIconoMusica`.
5. Apertura del sobre (`inicializarSobre`): al click añade `.is-open`, inicia música, a los 2300 ms añade `.gate--closing`, a los 820 ms más oculta `#gate` y quita `no-scroll` del `<body>`.
6. Calendario autogenerado desde `FECHA_BODA` (marca el día con anillo).
7. Cuenta regresiva (setInterval 1 s; al llegar a 0 muestra "¡Hoy es el gran día!").
8. Lightbox de la galería.
9. Botones de regalo con clase `.is-disabled` no navegan.
10. RSVP: valida nombre/apellido (solo letras `\p{L}` y espacios, 2–40), envía `FormData` por `fetch` POST a Apps Script.

Convenciones: nombres de funciones y variables en español, camelCase; cada bloque es una IIFE `inicializarXxx`; se respeta `prefiereMovimientoReducido`.

### 4.3 `style.css`
- Paleta (variables en `:root`): `--bosque #324D3E`, `--salvia #8EA68C`, `--salvia-claro #BFD0BD`, `--crema #F8F5F0`, `--dorado #C8A468`, `--tinta #3F5141`, `--nacar #FFFDF8`. Variables propias del portal: `--gate-ivory/green/sage/gold`.
- Tipografías vía `--f-script/--f-display/--f-serif/--f-sans/--f-body`.
- Enfoque **mobile-first**; media queries: `max-width:390px`, `max-height:720px`, `max-width:480px`, `max-width:600px`, `min-width:601px`, y `prefers-reduced-motion` al final.
- Mapa por líneas aprox.: reset 37 · utilidades 101 · florales 223 · **portal/sobre 235–762** · hero 763 · bienvenida 904 · calendario 954 · countdown 1044 · itinerario 1146 · ubicación 1208 · vestimenta 1275 · regalos 1350 · galería 1493 · RSVP 1572 · footer 1678 · botón música 1722 · responsive 1776+.
- Animaciones clave del sobre: `envelopeBreath`, `sealGlow`, `sealRelease`, `envelopeFlapOpen`, `letterRiseFromPocket`, `gateFade`.

### 4.4 Service Worker (`sw.js`)
- Precachea `/`, `/index.html`, `/style.css`, `/app.js` y el MP3 (rutas **absolutas desde la raíz**: el sitio debe servirse desde `/`, no desde un subdirectorio).
- HTML/CSS/JS: **network-first** con fallback a caché. Resto: cache-first. Google Fonts: network-first con caché.
- Soporta peticiones `Range` (necesario para el `<audio>` en Safari/iOS) devolviendo `206` desde caché.
- **Regla:** al cambiar cualquier asset precacheado, incrementar `CACHE_NAME` (hoy `v24`) para invalidar cachés viejas. Si se añade un archivo crítico, agregarlo a `CORE_ASSETS`.

## 5. Backend RSVP (Google Apps Script)

- `code.gs` define `doPost(e)` (anexa fila `[Fecha, Nombre, Apellido, Asistencia]` a la hoja `RSVP`, crea encabezados si está vacía), `doGet()` (ping de estado), `configurarEncabezados()`, `obtenerHoja()`.
- Campos del formulario: `nombre`, `apellido`, `asistencia` (`"Sí asistiré"` / `"No podré asistir"`).
- Se despliega manualmente como Web App ("Cualquier persona") desde el editor de Apps Script; la URL `/exec` resultante va en `RSVP_SCRIPT_URL`. **Si se vuelve a desplegar como nueva implementación, la URL cambia y hay que actualizarla.**
- El front usa `mode: "no-cors"` contra Apps Script ⇒ la respuesta es opaca y **la UI muestra "¡Gracias por confirmar!" aunque el servidor falle**. Solo detecta errores de red. Es una limitación conocida; verificar siempre en la hoja real.
- La URL del Web App está en texto plano en `app.js` (es público por diseño; no es un secreto, pero cualquiera podría enviar filas basura).

## 6. Estado actual y pendientes (placeholders)

- [x] **Galería:** Selección curada de las 12 mejores fotos reales (`img/BCF_*.jpg`, elegidas entre las 60 fotos verticales y horizontales de la sesión por calidad técnica y significado simbólico: anuncio, anillo, iglesia, ternura, complicidad y atardecer en el lago) ordenadas narrativamente en `#gallery-grid` con lightbox interactivo. Carga web optimizada a 1920px max.
- [ ] **Regalos:** dos botones "Enlace pendiente" (`Tupi` y "Otra tienda") con clase `is-disabled` y `href="#"`. Poner URL real y quitar `is-disabled` + `aria-disabled`; renombrar "Otra tienda".
- [ ] **Transferencia:** Titular/Banco/Cuenta dicen "Datos a confirmar".
- [ ] La URL de `RSVP_SCRIPT_URL` ya está configurada (apunta a un despliegue concreto de Apps Script); no se ha podido verificar desde aquí que siga activo.
- [ ] El texto de la carta/portal dice "Haz clic en el sobre" (pensado para mobile y desktop).
- [ ] Repo sin commits: se recomienda hacer un commit inicial.
- Bloques marcados `EDITABLE:` en comentarios HTML señalan los puntos de personalización.

## 7. Entorno de desarrollo

Requisitos detectados en esta máquina (Windows, PowerShell): Node v26, npm 11 (`npm.cmd`), Python 3.15, Git. **Firebase CLI no está instalado globalmente.**

> ⚠️ PowerShell tiene la ejecución de scripts deshabilitada: `npm` falla (`npm.ps1`). Usa **`npm.cmd`** / **`npx.cmd`**, o `cmd /c npm ...`.

| Tarea | Comando |
|---|---|
| Servidor local (http://localhost:5500) | `npm.cmd run dev` (o `python -m http.server 5500`) |
| Validar sintaxis JS | `npm.cmd run check` |
| Login Firebase (una vez, interactivo) | `npm.cmd run login` |
| Desplegar | `npm.cmd run deploy` (usa `npx firebase-tools`, descarga bajo demanda) |

Notas:
- Hay que servir por HTTP (no abrir `file://`) para que funcionen el Service Worker y el audio. El SW registra `/sw.js`, así que sirve siempre desde la raíz.
- Durante desarrollo, el SW puede mostrar versiones cacheadas: DevTools → Application → Service Workers → *Unregister* / *Update on reload*, o usa ventana de incógnito.
- `firebase.json`: `public: "."` (se publica la raíz) filtrando con `ignore`. **Si agregas archivos que no deben ser públicos (docs, notas, scripts), añádelos a `ignore`.** Ya excluidos: dotfiles, `checkpoints/**`, `code.gs`, logs, `*.zip`, `*.md`, `package*.json`. Headers: HTML/CSS/JS `no-cache`; imágenes y mp3 `max-age=3600`.
- Verificación visual: el historial muestra que se usaba Chrome headless con viewports móviles (360 px y ~390 px) y capturas guardadas en `checkpoints/`. Probar siempre en móvil primero (la gran mayoría de invitados abrirá desde WhatsApp).

## 8. Reglas para IAs que modifiquen el proyecto

1. **Mantén el stack:** no agregues frameworks, bundlers ni librerías (ni AOS) sin pedirlo. Todo debe seguir funcionando abriendo el sitio estático.
2. **Español** en textos visibles, comentarios y nombres, siguiendo el estilo existente. Conserva los comentarios y cabeceras de sección existentes.
3. **Mobile-first y accesibilidad:** respeta `prefers-reduced-motion`, `aria-*` existentes y `aria-hidden` en SVG decorativos.
4. **No inventes datos** de la boda (horarios, lugar, cuentas bancarias, enlaces). Lo no confirmado queda como placeholder.
5. Tras cambiar `index.html`, `style.css`, `app.js` o el audio → **subir `CACHE_NAME` en `sw.js`**.
6. Cambios de fecha: solo `FECHA_BODA` en `app.js` actualiza calendario y cuenta regresiva; pero **también hay que editar a mano** el `<title>`, "20:30 Hs" en Ubicación y el itinerario en `index.html`.
7. No modificar ni leer `checkpoints/`, `.vexp/`, `.codex/`, `*.zip`, `firebase-debug.log`. No sobrescribir el bloque `<!-- vexp -->` de `AGENTS.md`.
8. No ejecutes `deploy` sin que el usuario lo pida explícitamente: publica en producción (la web real que ven los invitados).
9. No expongas ni commitees credenciales. No añadas rastreadores ni scripts de terceros que afecten la privacidad de los invitados (los RSVP contienen nombres reales).
10. Valida con `npm.cmd run check` y revisión visual en 360–390 px antes de dar una tarea por terminada.

## 9. Riesgos / deuda técnica conocida

- RSVP "falso éxito" por `no-cors` (ver §5).
- Sin limitación de spam en el endpoint de Apps Script.
- `CORE_ASSETS` precachea 5.9 MB de audio en la primera visita (consumo de datos móviles).
- Fotos de galería dependen de Unsplash externo hasta tener `img/` real.
- Calendario y cuenta regresiva usan la zona horaria del navegador del invitado para el cálculo del mes (la hora absoluta de `FECHA_BODA` sí incluye `-03:00`).
- Sin pruebas automatizadas ni CI.

