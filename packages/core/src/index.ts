/**
 * Superficie publica de `@lingualab/core`.
 *
 * Este paquete es el hexagono: entidades de dominio, puertos de salida y casos
 * de uso. No importa nada de fuera de si mismo, y su `tsconfig` sin `lib.DOM`
 * lo hace cumplir en el compilador.
 *
 * Todo lo que se publica pasa por aqui: quien consuma el paquete no debe
 * conocer rutas internas. Los adaptadores y la interfaz importan
 * `@lingualab/core` y nada mas.
 */

// El primitivo de error explicito: toda la superficie que puede fallar lo usa.
export * from "./result";
// Entidades y valores inmutables, mas las funciones puras del dominio.
export * from "./domain/index";
// El motor ortografia -> AFI: normalizacion, contextos, capas y rastro.
export * from "./engine/index";
// Casos de uso: la unica puerta de entrada al dominio.
export * from "./application/index";
// Datos que viajan con el nucleo: demos, plantillas y el formato JSON.
export * from "./data/index";
// Contratos de salida hacia el mundo exterior (adaptadores secundarios).
export * from "./ports/index";
