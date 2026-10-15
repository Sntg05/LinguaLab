/**
 * Suites de contrato reutilizables.
 *
 * Cada `runXxxPortContract(createAdapter)` se ejecuta igual contra el fake en
 * memoria y contra el adaptador real. Un adaptador nuevo no esta terminado
 * hasta que pasa la misma suite que ya pasaba el fake.
 *
 * Faltan a proposito las cinco suites de los puertos cuyos casos de uso llegan
 * en segmentos posteriores (`TextGridCodecPort`, `ElanCodecPort`,
 * `AudioDecoderPort`, `AcousticAnalysisPort`, `ExperimentRunnerPort`): un
 * contrato que no puede afirmar nada del comportamiento es ruido, y escribir
 * uno ahora obligaria a inventar expectativas que despues habria que deshacer.
 */

export { runAnnotationStoragePortContract } from "./annotation-storage";
export { runClockPortContract } from "./clock";
export { runIdGeneratorPortContract } from "./id-generator";
export { runLanguageCatalogPortContract } from "./language-catalog";
export { runOrthographyRepositoryPortContract } from "./orthography-repository";
export { runPhonemizerPortContract } from "./phonemizer";
export { runToolRegistryPortContract } from "./tool-registry";
export type { AdapterFactory } from "./types";
