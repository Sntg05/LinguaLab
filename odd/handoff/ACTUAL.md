---
status: current
updated: 2026-11-03
---

# Traspaso vigente

Lo que necesita quien retoma el trabajo —otra sesión, otra persona u otra computadora— para no
reconstruirlo del historial. **Se reescribe en cada entrega, no se le agregan capítulos**: los traspasos
anteriores se archivan con fecha en `odd/handoff/archivo/`. Este documento no copia cifras; están en
[`docs/metrics.json`](../../docs/metrics.json).

## Antes que nada

```bash
git fetch && git status -sb
npm install
npm run doctor      # Node, rama frente a origin, Chromium, puerto 4331, documentos ODD sin estado
```

`npm run doctor` existe por un incidente: el 2026-11-03 una sesión planeó cuatro herramientas que ya
existían, porque la copia local estaba 59 commits detrás de `origin/main`. Si dice que la rama está atrás,
no se planea nada hasta traerla.

## Dónde está cada cosa

| Pregunta | Documento |
|---|---|
| ¿Qué está publicado y en qué se puede confiar? | [`docs/STATUS.md`](../../docs/STATUS.md) |
| ¿Qué cifras dio la última medición? | [`docs/metrics.json`](../../docs/metrics.json) (`npm run status:measure`) |
| ¿Qué falta en el código? | [`docs/PENDING.md`](../../docs/PENDING.md), con su tabla resumen arriba |
| ¿Qué falta que solo puede cerrar una persona? | [`docs/HUMAN-EVIDENCE.md`](../../docs/HUMAN-EVIDENCE.md) |
| ¿Qué se está haciendo ahora? | El documento de `odd/tasks/` con `status: active` |
| ¿Cómo se trabaja aquí? | [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md) |
| ¿Por qué el sistema es así? | [`docs/adr/`](../../docs/adr/) y [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) |
| ¿Qué dice la revisión de seguridad? | [`docs/SECURITY-REVIEW.md`](../../docs/SECURITY-REVIEW.md) |

## Estado de las ramas

- **`main`** (`2eddc2b`) es lo publicado en `https://lingualab-beta.vercel.app`. Incluye el cierre de la
  auditoría del 2026-11-03, fusionado por squash desde el PR #13: dominio ajeno en `robots.txt`, promesas
  de funcionar sin conexión, error de consola en cada página, enlaces rotos, desborde a 320 px, pestañas
  ARIA, alertas de CodeQL, Biome 2.6, motores en carpetas versionadas e inmutables, el visor de audio
  partido en módulos y las mejoras de metodología. `npm run live:check` contra producción dio todo en
  orden después del despliegue. El detalle está en
  [`odd/tasks/audit-v3.1-closure.md`](../tasks/audit-v3.1-closure.md), ya cerrado.
- **Lo próximo**, según el dueño: cambios de interfaz (UX/UI) y algunos del lado del código. Arranca con un
  documento ODD nuevo en `odd/tasks/`.

## Trampas del entorno, ya pagadas

1. **La puerta e2e usa el puerto 4331** y lo exige libre; `npm run dev` usa el 4321 y conviven.
2. **El Chromium de Playwright no viene con `npm install`**: `npx playwright install chromium` una vez.
3. **Astro 7.4.2 exige Node 22.23.4.** La rama se quedó en Astro 7.4.1 para no subir el piso de Node de
   paso: es la P23 y una decisión de la lista de evidencia humana.
4. **Los motores pesados viven en `public/<motor>/<versión>/`.** Para actualizar uno, se cambia su versión
   en `src/config/engines.json` y se corre su script (`vendor-pyodide.mjs` o `sync-espeak-data.mjs`);
   `src/config/engines.test.ts` falla si algo quedó a medias.
5. **Lo que solo existe en el servidor** (cabeceras, caché, robots servido) no lo ve ninguna puerta local:
   `npm run live:check <url>` lo revisa, y `live-check.yml` lo corre después de cada despliegue.
