# 0002 — Sitio estático, privacidad local y sin `SharedArrayBuffer`

- **Estado:** aceptada
- **Fecha:** 2025-10-15
- **Contexto del que surge:** `odd/tasks/LinguaLab_prompt_vibecoding.md`, segmento 0

## Contexto

LinguaLab trabaja con tres cosas que la gente cuida con razón: grabaciones de habla, anotaciones de
campo y, sobre todo en lenguas indígenas de Colombia, datos que pertenecen a una comunidad entera y
no solo a quien los sube.

El prompt pide además que varias herramientas nuevas corran en WebAssembly y en workers: eSpeak NG,
praatfan, Pyodide con `pympi-ling`. La tentación natural es pedir `SharedArrayBuffer` para pasar
audio entre el hilo principal y el worker sin copiarlo.

## Decisión

1. **Todo el procesamiento ocurre en el navegador.** Ningún archivo, texto, audio ni anotación se
   envía a un servidor. Sin analítica, sin telemetría, sin cookies.
2. **Sin `SharedArrayBuffer` y sin hilos de WebAssembly.** El despliegue en GitHub Pages no permite
   enviar las cabeceras `COOP`/`COEP` que `SharedArrayBuffer` exige, y una función que solo funciona
   en uno de los tres destinos no es una función. Los datos se transfieren a los workers por copia
   (`postMessage` con `Float32Array` transferible), no por memoria compartida.
3. **El aviso de privacidad es visible en la interfaz**, no solo en el README. Un usuario que abre
   una herramienta tiene que poder saber, sin buscarlo, que su archivo no sale de su equipo.
4. **Ningún dato de comunidades entra al repositorio.** Nada de audio ni corpus; las plantillas de
   lenguas indígenas se publican vacías.
5. **Sin backend por defecto.** El sitio es estático y publicable tal cual. La fase 2 (`docs/phase2/`)
   queda solo como contrato, sin integrarse en la interfaz.

## Consecuencias

- El coste de copiar el audio a un worker es real, pero el audio de una tarea de anotación dura
  segundos, no horas: la copia no es el cuello de botella, y a cambio el sitio funciona en Pages.
- Al no haber servidor, tampoco hay forma de recuperar datos perdidos. Por eso cada herramienta
  guarda en IndexedDB y ofrece exportar el archivo, y por eso importar y exportar son tan importantes
  como editar: el archivo del usuario es la copia de seguridad.
- `scripts/verify-build.mjs` sigue rechazando cualquier subrecurso externo y cualquier
  `unsafe-inline`. Una librería que se cargue desde una CDN no pasa la verificación de compilación.
- Cualquier herramienta que en el futuro necesite servidor se marca `integration: 'needs-backend'` y
  aparece en el catálogo como tal, con enlace externo y guía propia, en vez de fingir que es local.
