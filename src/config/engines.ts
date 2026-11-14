/**
 * Donde vive cada motor pesado que el sitio sirve desde su propio origen.
 *
 * POR QUE LA VERSION VA EN LA RUTA
 *
 * Pyodide (13,7 MB), eSpeak NG (5,9 MB, retirado en el rework v4: hoy ese lugar
 * lo ocupa el diccionario CMUdict) y praatfan (0,7 MB) se servian desde
 * `/pyodide/`, `/espeak-phonemizer/` y `/praatfan/` con `max-age=0`: cada visita
 * volvia a preguntar por cada archivo. Marcarlos como inmutables en esa ruta
 * habria sido peor, porque al actualizar un motor el navegador seguiria usando
 * el viejo durante un año. Con la version en la ruta (`/pyodide/314.0.7/`), una
 * version nueva es una URL nueva: `vercel.json` los declara inmutables sin ese
 * riesgo.
 *
 * `engines.json` es la unica fuente de las tres versiones. La leen esta
 * configuracion, los scripts que vendorizan cada motor y `engines.test.ts`, que
 * exige que coincidan con `package.json`, con la procedencia de praatfan y con
 * las carpetas de `public/`.
 */
import { withBase } from "../lib/paths";
import ENGINES from "./engines.json";

export type EngineName = keyof typeof ENGINES;

/** La carpeta publica de cada motor, sin la version. */
export const ENGINE_DIRS: Readonly<Record<EngineName, string>> = {
  pyodide: "pyodide",
  cmudict: "cmudict",
  praatfan: "praatfan",
};

export const ENGINE_VERSIONS: Readonly<Record<EngineName, string>> = ENGINES;

/** La URL base de un motor, con la version y el prefijo de despliegue. */
export const enginePath = (engine: EngineName): string =>
  withBase(`/${ENGINE_DIRS[engine]}/${ENGINE_VERSIONS[engine]}`);
