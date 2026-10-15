/**
 * Superficie publica de `@lingualab/adapters`.
 *
 * Cada subdirectorio implementa exactamente un puerto de `@lingualab/core` y
 * debe pasar la suite de contrato de ese puerto. Nada de aqui importa la UI.
 *
 * Hoy vive aqui el repositorio de tablas de ortografia sobre IndexedDB
 * (`orthography-repository`), que conserva el JSON del nucleo y se degrada a
 * un almacen en memoria —declarandolo— cuando IndexedDB no esta o no responde.
 */
export {
  createIndexedDbOrthographyRepository,
  type IndexedDbOrthographyRepository,
  type PersistenceBackend,
  type PersistenceStatus,
} from "./orthography-repository/indexeddb-orthography-repository";
