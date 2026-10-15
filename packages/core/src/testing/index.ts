/**
 * Punto de entrada de las utilidades de prueba del nucleo.
 *
 * Aqui viven los fakes en memoria y las suites de contrato reutilizables. Se
 * publican en un subpath aparte (`@lingualab/core/testing`) para que el codigo
 * de produccion no pueda depender de ellos por accidente.
 */

export * from "./fakes/index";
export * from "./contracts/index";
