# LinguaLab — Política de seguridad (SECURITY.md)

**Última revisión:** 2026-09-22

LinguaLab es una aplicación estática de análisis lingüístico. No hay base de datos, no hay
cuentas de usuario y no hay backend de análisis. Esta política describe las salvaguardas que sí
existen y cómo verificarlas.

## Alcance

- Páginas: `index.html`, `trees.html`, `ipa-chart.html`, `tools.html`, `glossary.html`,
  `resources.html`, `security.html`, `about.html`.
- Procesamiento: 100 % en el navegador (tokenización, frecuencias, parseo de árboles, layout,
  render SVG, exportaciones, transcripción AFI).
- Almacenamiento: `localStorage` con dos claves (`lingualab-lang`, `lingualab-theme`).

## Salvaguardas aplicadas

| # | Guardrail | Implementación | Verificación |
|---|---|---|---|
| 1 | Límites de entrada | `guardrails.validateText` / `validateFile`: 100 KB, extensiones txt/md/csv/json/conllu | `js/core/guardrails.js` |
| 2 | Escape anti-XSS | `guardrails.escapeHTML()` antes de cualquier inserción al DOM; sin `innerHTML` con datos del usuario | `js/core/guardrails.js` |
| 3 | Limpieza de marcado activo | `guardrails.sanitizeInput()` elimina `<script>`, `<iframe>`, handlers `on*` y `javascript:` | `js/core/guardrails.js` |
| 4 | Rate-limiting | `guardrails.rateLimit(ms)` en análisis y descargas | `js/core/guardrails.js` |
| 5 | CSP | `<meta http-equiv="Content-Security-Policy">` en cada página: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, fuentes en lista blanca | Detectada en runtime por `security.js` |
| 6 | SRI | Dependencias externas con versión fijada; comprobación `integrity` en runtime | Lista en vivo de `security.html` |
| 7 | Sin cookies / sin rastreo | Cero cookies, cero scripts analíticos, cero píxeles | Comprobado en runtime |
| 8 | Sin terceros rastreadores | Búsqueda de dominios de analtics/anuncios en `security.js` | Lista en vivo |
| 9 | Procesamiento local | Ningún `fetch` envía el contenido del usuario | Pestaña Network de DevTools |
| 10 | Borrado de datos | Botón «Borrar mis datos locales» → `localStorage.clear()` | Botones en `index.html` y `security.html` |
| 11 | Referrer estricto | `<meta name="referrer" content="strict-origin-when-cross-origin">` | Cabecera de cada página |
| 12 | Integridad de datos | Cada dataset (IPA, bibliografía, ejemplos) declara `version` y `license`; atribución obligatoria en `audio/README.md` | Archivos de datos |

## Verificación rápida (para usuarios)

1. DevTools (F12) → **Application** → **Local Storage**: solo `lingualab-lang` y `lingualab-theme`.
2. DevTools → **Network**: tras analizar texto o dibujar árboles, ninguna petición lleva tu contenido.
3. DevTools → **Console**: no aparecen violaciones de CSP.
4. Visita `security.html`: la lista en vivo ejecuta las comprobaciones en tu navegador.

## Modelos de amenaza considerados

- **Inyección XSS vía texto pegado (stored/reflected):** mitigado con escape + sanitizado.
  *Estado: mitigado.*
- **Inyección de scripts por archivo subido:** solo extensiones de texto permitidas y contenido
  sanitizado. *Estado: mitigado.*
- **Supply chain (CDN comprometido):** fuentes y librerías con versión fijada y, donde aplica,
  SRI. *Estado: reducido.* Recomendación: servir en local para uso sensible.
- **Fuga de datos del usuario:** no hay red de análisis; el riesgo residual es la extensión o
  devtools del propio usuario. *Estado: por diseño.*
- **Clickjacking:** sin cabecera `X-Frame-Options` (no controlable en estático). Mitigación
  recomendada al desplegar: `frame-ancestors 'none'` en la CSP del servidor. *Estado: pendiente
  de cabeceras de servidor.*

## Reportar un fallo

Incluye: (1) qué esperabas, (2) qué ocurrió, (3) el texto de entrada exacto, (4) navegador y
versión, (5) resultado de las comprobaciones de `security.html`. No incluyas datos personales
en los ejemplos.

## Limitaciones conocidas

- La CSP va por `<meta>`, más restrictiva que la de servidor pero sin `frame-ancestors` ni
  informes (`report-uri`).
- El transcriptor AFI es una aproximación grafema→fonema con fines didácticos, no un modelo
  fonológico validado.
- Las muestras de audio dependen de archivos con licencia libre en `audio/ipa/`; si faltan, el
  reproductor degrada a la voz del sistema del navegador.
