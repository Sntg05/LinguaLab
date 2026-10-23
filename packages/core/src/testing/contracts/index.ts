/**
 * Suites de contrato reutilizables.
 *
 * Cada `runXxxPortContract(createAdapter)` se ejecuta igual contra el fake en
 * memoria y contra el adaptador real. Un adaptador nuevo no esta terminado
 * hasta que pasa la misma suite que ya pasaba el fake.
 *
 * Faltan a proposito las suites de los puertos cuyos casos de uso llegan en
 * segmentos posteriores (`ElanCodecPort`, `AudioDecoderPort`,
 * `AcousticAnalysisPort`, `ExperimentRunnerPort`): un contrato que no puede
 * afirmar nada del comportamiento es ruido, y escribir uno ahora obligaria a
 * inventar expectativas que despues habria que deshacer.
 *
 * `TextGridCodecPort` ya la tiene: su implementacion existe y es real, asi que
 * el contrato puede afirmar algo verificable —ida y vuelta, errores tipados,
 * serializacion determinista— en vez de describir una intencion.
 */

export { runAnnotationStoragePortContract } from "./annotation-storage";
export { runClockPortContract } from "./clock";
export { runIdGeneratorPortContract } from "./id-generator";
export { runLanguageCatalogPortContract } from "./language-catalog";
export { runOrthographyRepositoryPortContract } from "./orthography-repository";
export { runPhonemizerPortContract } from "./phonemizer";
export { runTextGridCodecPortContract } from "./textgrid-codec";
export { runToolRegistryPortContract } from "./tool-registry";
export type { AdapterFactory } from "./types";
