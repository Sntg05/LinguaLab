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
   ============================================================ */

import {
  type ClockPort,
  type IdGeneratorPort,
  createConvertOrthographyToIpa,
  createExportOrthographyTable,
  createImportOrthographyTable,
  createListOrthographyTables,
  createRemoveOrthographyTable,
  createSaveOrthographyTable,
} from "@lingualab/core";
import {
  type PersistenceStatus,
  createIndexedDbOrthographyRepository,
} from "@lingualab/adapters";

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
  // `persistence` does not depend on `this`, so passing the reference is exact
  // and avoids a wrapper that would only add a stack frame.
  persistence: tables.persistence,
};
