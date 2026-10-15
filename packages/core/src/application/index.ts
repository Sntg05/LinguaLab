/**
 * Superficie publica de los casos de uso.
 *
 * Aqui NO estan los casos de uso de TextGrid, ELAN, analisis acustico,
 * anotacion ni experimentos: pertenecen a los segmentos 6 a 9 y no se
 * implementan todavia. Dejarlos como stubs vacios seria peor que su ausencia,
 * porque un stub que compila y no hace nada se confunde con trabajo hecho.
 */

export { createConvertOrthographyToIpa } from "./convert-orthography-to-ipa";
export type {
  ConvertOrthographyToIpaError,
  ConvertOrthographyToIpaInput,
  ConvertOrthographyToIpaOutput,
} from "./convert-orthography-to-ipa";
export { createListTools } from "./list-tools";
export {
  createExportOrthographyTable,
  createImportOrthographyTable,
  createListOrthographyTables,
  createRemoveOrthographyTable,
  createSaveOrthographyTable,
} from "./orthography-tables";
export type {
  OrthographyTableDraft,
  SaveOrthographyTableError,
  SavedOrthographyTable,
} from "./orthography-tables";
export { createPhonemizeText } from "./phonemize-text";
export type { PhonemizeTextInput } from "./phonemize-text";
export { validateOrthographyTable } from "./validate-orthography-table";
export type { OrthographyIssue, OrthographyIssueCode } from "./validate-orthography-table";
