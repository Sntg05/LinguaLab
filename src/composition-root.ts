/* ============================================================
   LinguaLab — composition root

   The ONE place in `src/**` that is allowed to import
   `@lingualab/adapters`. `npm run deps:check`
   (`ui-to-adapters-only-from-composition-root`) fails the moment a page or a
   component reaches for an adapter, and that rule is the executable half of
   ADR 0001.

   WHY EXACTLY ONE OBJECT AND WHY THE UI NEVER IMPORTS AN ADAPTER ITSELF

   The UI must be able to change storage (memory, IndexedDB, a file) without
   any component knowing that a storage decision was ever made. If a component
   imported `createIndexedDbOrthographyRepository` directly, swapping the
   backend would mean editing every caller, and the page would start to depend
   on the fact that persistence is IndexedDB — which is exactly the coupling
   the hexagon exists to remove.

   Everything is built once, at module load. The IndexedDB factory is
   synchronous and opens the database lazily on first use, so importing this
   module in a page script is cheap and cannot throw. No singleton globals, no
   service locator: if an adapter has to be replaced, there is one file to read.

   The phonemizer follows the same rule for a subtler reason: its engine is
   WebAssembly behind a Web Worker, and constructing the adapter only records
   WHERE the data lives. Nothing is downloaded, no worker is spawned and no wasm
   is compiled until the first `phonemize`, so wiring it here costs the pages
   that never use it nothing at all.
   ============================================================ */

import {
  type ClockPort,
  type IdGeneratorPort,
  createConvertOrthographyToIpa,
  createExportOrthographyTable,
  createImportOrthographyTable,
  createListOrthographyTables,
  createListTools,
  createPhonemizeText,
  createRemoveOrthographyTable,
  createSaveOrthographyTable,
} from "@lingualab/core";
import {
  type PersistenceStatus,
  createEspeakPhonemizer,
  createIndexedDbOrthographyRepository,
  createPraatfanAcousticAnalysis,
  createStaticToolRegistry,
} from "@lingualab/adapters";
import { TOOLS } from "./scripts/catalogo/catalog-data";
import { withBase } from "./lib/paths";

/**
 * The ports below are trivial but still injected rather than called inline:
 * the use cases take them as explicit dependencies, and the browser is the
 * only place that can supply a real clock and real ids.
 */
const clock: ClockPort = { now: () => new Date() };

/**
 * `crypto.randomUUID` only exists in a secure context. The site is served over
 * HTTPS in production, but a local network IP without TLS is not a secure
 * context and would make saving impossible. The fallback is not a security
 * boundary — the id only has to be unique inside one browser profile — so a
 * timestamp plus random suffix is honest and sufficient.
 */
const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

const ids: IdGeneratorPort = { generate: generateId };

const tables = createIndexedDbOrthographyRepository();

/**
 * El catalogo se construye a partir de `src/data/tools.json`, que llega ya
 * validado por `catalog-data`. El adaptador no conoce el archivo: recibe las
 * fichas, y por eso se puede probar con un catalogo minimo sin tocar el real.
 */
const registry = createStaticToolRegistry(TOOLS);

/**
 * El fonemizador es el unico adaptador que pide algo fuera de este dispositivo
 * —los datos de eSpeak NG llegan por HTTP— y por eso su ubicacion se decide aqui.
 *
 * `withBase` no es decorativo: GitHub Pages sirve el sitio bajo `/LinguaLab`, y
 * una base sin prefijo se pediria al dominio y volveria 404. Los datos viven en
 * `public/espeak-phonemizer/` (los copia `scripts/sync-espeak-data.mjs`), asi que
 * se buscan en tiempo de ejecucion y no viajan en el bundle: el presupuesto de
 * peso por pagina mide scripts, y estos 5,7 MB no lo son.
 *
 * Esa base no es opcional por otra razon: si los datos no estan donde se los
 * busca, el paquete cae en pedirlos a un CDN publico. La CSP del sitio
 * (`connect-src 'self'`) lo bloquearia y la promesa de que la herramienta
 * funciona sin conexion despues de la primera carga dejaria de ser cierta.
 */
const phonemizer = createEspeakPhonemizer({ baseUrl: withBase("/espeak-phonemizer") });

/**
 * El analisis acustico sigue el mismo criterio que el fonemizador: construir el
 * adaptador solo anota DONDE vive el artefacto vendoreado. No descarga el wasm,
 * no crea el worker y no compila nada hasta el primer analisis, asi que cablearlo
 * aqui no cuesta nada a las paginas que nunca miden.
 *
 * `withBase` no es decorativo: bajo GitHub Pages el sitio se sirve en
 * `/LinguaLab`, y una ruta sin prefijo se pediria al dominio y volveria 404. El
 * artefacto esta en `public/praatfan/`, fijado por hash, y se sirve desde este
 * mismo origen: la CSP no admite un CDN y la promesa de funcionar sin conexion
 * despues de la primera carga tampoco.
 */
const acoustic = createPraatfanAcousticAnalysis({ baseUrl: withBase("/praatfan") });

/** El caso de uso solo traduce el texto a AFI; no decide que se muestra. */
const phonemizeText = createPhonemizeText({ phonemizer });

/**
 * The type is derived from the factories instead of re-typed by hand. A hand
 * written signature would compile while silently disagreeing with the use
 * case the moment `packages/core` changed a parameter, and the whole point of
 * deriving it is that the compiler keeps the two in step for free.
 */
export interface LinguaLab {
  readonly convertOrthographyToIpa: ReturnType<typeof createConvertOrthographyToIpa>;
  readonly listOrthographyTables: ReturnType<typeof createListOrthographyTables>;
  readonly saveOrthographyTable: ReturnType<typeof createSaveOrthographyTable>;
  readonly removeOrthographyTable: ReturnType<typeof createRemoveOrthographyTable>;
  readonly importOrthographyTable: ReturnType<typeof createImportOrthographyTable>;
  readonly exportOrthographyTable: ReturnType<typeof createExportOrthographyTable>;
  /**
   * Catalogo de herramientas del sitio. Devuelve `Result` como cualquier otro
   * caso de uso: la pagina lo comprueba en vez de dar por hecho que el registro
   * siempre responde.
   */
  readonly listTools: ReturnType<typeof createListTools>;
  /**
   * Texto → AFI con eSpeak NG. Devuelve `Result` y no lanza: que el motor no
   * este disponible es una respuesta, y la interfaz tiene que poder mostrarla.
   *
   * La firma deriva de la factoria, como todas las de arriba, para que un
   * cambio de parametros en `@lingualab/core` rompa la compilacion en vez de
   * publicar una firma escrita a mano que ya no coincide.
   */
  readonly phonemizeText: ReturnType<typeof createPhonemizeText>;
  /**
   * El adaptador, no el puerto: `listLanguages` e `isAvailable` son consultas
   * que la interfaz necesita antes de ofrecer el boton, y `dispose` cierra el
   * worker. Nada de esto se reexporta para que la interfaz siga sin conocer
   * `@lingualab/adapters`.
   */
  readonly phonemizer: ReturnType<typeof createEspeakPhonemizer>;
  /**
   * El adaptador acustico, no solo el puerto, por la misma razon que el
   * fonemizador: `isAvailable` responde por el modulo ya cargado y `dispose`
   * cierra el worker. El puerto sigue siendo lo unico que el visor usa para
   * medir; el tipo del adaptador solo agrega esas dos consultas.
   */
  readonly acoustic: ReturnType<typeof createPraatfanAcousticAnalysis>;
  /**
   * Which store is actually holding the tables right now, and why it degraded
   * if it did. It is exposed because the editor must tell the truth about
   * persistence: silently pretending to save is the defect this exists to
   * prevent.
   */
  readonly persistence: () => PersistenceStatus;
}

export const lingualab: LinguaLab = {
  convertOrthographyToIpa: createConvertOrthographyToIpa({ tables }),
  listOrthographyTables: createListOrthographyTables({ tables }),
  saveOrthographyTable: createSaveOrthographyTable({ tables, ids, clock }),
  removeOrthographyTable: createRemoveOrthographyTable({ tables }),
  importOrthographyTable: createImportOrthographyTable({ tables }),
  exportOrthographyTable: createExportOrthographyTable({ tables }),
  listTools: createListTools({ registry }),
  phonemizeText,
  phonemizer,
  acoustic,
  // `persistence` does not depend on `this`, so passing the reference is exact
  // and avoids a wrapper that would only add a stack frame.
  persistence: tables.persistence,
};
