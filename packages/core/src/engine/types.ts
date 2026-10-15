import type { G2PRule } from "../domain/g2p-rule";

/**
 * Tipos compartidos del motor ortografia -> AFI.
 *
 * Viven fuera de `convert-layer.ts` para que la capa de aplicacion pueda
 * nombrar el resultado sin conocer el algoritmo, y para que el motor no
 * dependa de puertos ni de casos de uso.
 */

/**
 * Las dos pasadas del motor (especificacion S7).
 *
 * `phonemic` aplica `table.rules` al texto normalizado. `allophonic` aplica
 * `table.allophonic` SOBRE LA SALIDA de la pasada fonemica: no es una
 * conversion paralela, es un refinamiento del resultado anterior, y quien
 * llama decide que capas quiere ver.
 */
export type ConversionLayer = "phonemic" | "allophonic";

/**
 * Politica de mayusculas/minusculas.
 *
 * El AFI es insensible a mayusculas: una tabla no deberia necesitar un gemelo
 * en mayuscula de cada vocal para transcribir un texto en versalitas. Por eso
 * `fold` es el valor por defecto. `preserve` existe para la lengua que si
 * distingue mayuscula de minuscula y necesita esa diferencia en la tabla.
 */
export type CasePolicy = "fold" | "preserve";

/**
 * El rastro de una sustitucion, pensado para el modo "explicar" del editor.
 *
 * `before`/`after` llevan los caracteres reales que rodeaban al grafema, no
 * solo una referencia a la regla: sin ellos la interfaz no puede decir POR QUE
 * coincidio, que es justo lo que se va a mirar cuando alguien dude de una
 * transcripcion.
 */
export interface ConversionTraceEntry {
  readonly layer: ConversionLayer;
  readonly inputIndex: number;
  readonly grapheme: string;
  readonly ipa: string;
  readonly rule?: G2PRule;
  readonly before: string;
  readonly after: string;
}

/**
 * Un caracter que ninguna regla cubrio (especificacion S7: nunca se descarta
 * en silencio). Se registra por capa y por posicion para que la lista de
 * cobertura pueda resaltarlo.
 */
export interface UncoveredPosition {
  readonly layer: ConversionLayer;
  readonly inputIndex: number;
  readonly grapheme: string;
}

/** Resultado de aplicar UNA capa: salida, rastro y huecos de cobertura. */
export interface LayerConversion {
  readonly output: string;
  readonly trace: readonly ConversionTraceEntry[];
  readonly uncovered: readonly UncoveredPosition[];
}
