/**
 * Superficie publica de los casos de uso.
 *
 * Aqui NO estan los casos de uso de ELAN ni analisis acustico: pertenecen a los
 * segmentos 8 y 9 y no se implementan todavia. Dejarlos como stubs vacios seria
 * peor que su ausencia, porque un stub que compila y no hace nada se confunde
 * con trabajo hecho.
 *
 * El proyecto de anotacion (segmento 6) si esta: guardar, cargar y listar lo
 * anotado es lo que hace que el trabajo sobre un audio sobreviva a recargar la
 * pagina, y sin servidor esa es la unica copia que existe.
 *
 * El generador de ensayos (segmento 7) tambien, y por una razon distinta: el
 * orden de presentacion es lo unico del experimento que TIENE que ser
 * reproducible, y no depende de jsPsych ni del navegador. Ejecutar el
 * experimento es un adaptador; decidir que se presenta y en que orden es nucleo.
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
export { generateExperimentTrials } from "./generate-experiment-trials";
export type {
  ExperimentTrialPlan,
  GenerateExperimentTrialsOptions,
  GeneratedTrial,
} from "./generate-experiment-trials";
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
