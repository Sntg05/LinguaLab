/**
 * Superficie publica de los casos de uso.
 *
 * Aqui NO estan los casos de uso de ELAN, analisis acustico ni experimentos:
 * pertenecen a los segmentos 7 a 9 y no se implementan todavia. Dejarlos como
 * stubs vacios seria peor que su ausencia, porque un stub que compila y no hace
 * nada se confunde con trabajo hecho.
 *
 * El proyecto de anotacion (segmento 6) si esta: guardar, cargar y listar lo
 * anotado es lo que hace que el trabajo sobre un audio sobreviva a recargar la
 * pagina, y sin servidor esa es la unica copia que existe.
 */

export {
  createListAnnotationProjects,
  createLoadAnnotationProject,
  createSaveAnnotationProject,
  summarizeAnnotation,
} from "./annotation-project";
export type {
  AnnotationProjectSnapshot,
  AnnotationSummary,
  SaveAnnotationProjectDeps,
} from "./annotation-project";
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
