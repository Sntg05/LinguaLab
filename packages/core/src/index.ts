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
// Contratos de salida hacia el mundo exterior (adaptadores secundarios).
export * from "./ports/index";
