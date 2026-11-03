# Pyodide vendorizado

Este directorio lo genera `node scripts/vendor-pyodide.mjs`. No lo edites a
mano: el proximo `--check` lo sobrescribe y, peor, los hashes dejarian de
corresponder a los archivos.

## Por que esta aqui

La CSP del sitio es `default-src 'self'` y la herramienta promete que el
archivo de campo no sale del navegador. Un motor cargado desde
`cdn.jsdelivr.net` rompe las dos cosas. La decision completa, con su costo,
esta en `docs/adr/0007-distribucion-de-pyodide.md`.

## Que se sirve

- `indexURL` = `/pyodide/`: los cinco archivos de la tabla, menos los wheels.
- `packageBaseUrl` = `/pyodide/wheels/`: de ahi salen los wheels, tanto el de
  `micropip` (que Pyodide instala con `loadPackage`) como el de `pympi-ling`
  (que `micropip` instala desde su URL).

## Contenido, version y hash

Pyodide **314.0.7** (MPL-2.0) y pympi-ling **1.71** (MIT).

| Archivo | Bytes | sha256 | Origen | Licencia |
| --- | --- | --- | --- | --- |
| `pyodide.mjs` | 17.931 (17.5 kB) | `6f1d60f7bf529beb300f0f47983c921d3982363640ba20af0e38efdddbc66109` | paquete npm pyodide@314.0.7 | MPL-2.0 |
| `pyodide.asm.mjs` | 1.250.344 (1.19 MB) | `f7cdc8ece80678ceb712f8e65ebe6d3a83203a180c399865f49612a051693635` | paquete npm pyodide@314.0.7 | MPL-2.0 |
| `pyodide.asm.wasm` | 9.598.218 (9.15 MB) | `cc36e3cab04fdfc9a63ff13eb52eae2b911bf46c025cc7b281f394bd3de1d5e6` | paquete npm pyodide@314.0.7 | MPL-2.0 |
| `python_stdlib.zip` | 2.545.637 (2.43 MB) | `fa1957e5777068fc4f7437f96d860ae2fbe9c19732ba06c84e004ec16dd7dd7a` | paquete npm pyodide@314.0.7 | MPL-2.0 |
| `pyodide-lock.json` | 119.077 (116.3 kB) | `5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010` | paquete npm pyodide@314.0.7 | MPL-2.0 |
| `wheels/micropip-0.11.1-py3-none-any.whl` | 115.486 (112.8 kB) | `e2d52886594fd4cd0d0847110a1c34ae0134d3a970eb4496d3b5eb31ee2d8af6` | https://cdn.jsdelivr.net/pyodide/v314.0.7/full/micropip-0.11.1-py3-none-any.whl | MPL-2.0 |
| `wheels/pympi_ling-1.71-py3-none-any.whl` | 25.659 (25.1 kB) | `f89043d275946d9fe04c09cd5a5fbcff1e42b4160c91c8aa246e5e8136e305ab` | https://files.pythonhosted.org/packages/6f/64/3731b9770449857b51a17c269893b02e1e6a502bfafea5fca19ec1ab0600/pympi_ling-1.71-py3-none-any.whl | MIT |

Total: **13.672.352 bytes (13.04 MB)**.

Los cinco primeros archivos salen del paquete npm `pyodide@314.0.7`
(`https://www.npmjs.com/package/pyodide`, espejo del release oficial en
`https://github.com/pyodide/pyodide/releases`). El wheel de `micropip` sale de
`https://cdn.jsdelivr.net/pyodide/v314.0.7/full/` y su sha256 es el que declara
`pyodide-lock.json`. El de `pympi-ling` sale de PyPI
(`https://pypi.org/project/pympi-ling/1.71/`).

## Como se actualiza

1. Cambia la version en `package.json` (`pyodide`) y en
   `scripts/vendor-pyodide.mjs` (`PYODIDE_VERSION`), y `npm install`.
2. Cambia `PYMPI_VERSION`, la URL y el sha256 de `PYMPI_WHEEL` si hay una
   version nueva en PyPI. El sha256 se copia del JSON de PyPI
   (`https://pypi.org/pypi/pympi-ling/<version>/json`, campo
   `digests.sha256`), nunca de un archivo ya descargado.
3. `node scripts/vendor-pyodide.mjs` y luego
   `node scripts/vendor-pyodide.mjs --check` en el mismo commit.
4. Corre `npx vitest run packages/adapters/src/elan/`: la prueba de humo carga
   este Pyodide de verdad, instala el wheel y lee un `.eaf`. Si algo se rompio,
   se rompe ahi y no en el navegador de quien convierte.

## Licencias

- Pyodide: Mozilla Public License 2.0. El texto completo esta en
  `https://github.com/pyodide/pyodide/blob/main/LICENSE`.
- pympi-ling: MIT, copyright (c) 2015 Mart Lubbers.
