/**
 * Puerto de generacion de identificadores.
 *
 * POR QUE ES UN PUERTO
 *
 * Si un caso de uso llamara a `crypto.randomUUID` directamente, la prueba
 * tendria que comprobar el resultado contra un valor que cambia en cada
 * corrida: no habria forma de afirmar cual es el identificador esperado. Con
 * el puerto, la prueba inyecta un generador que devuelve valores fijos y
 * entonces SI puede comparar objetos completos. Una prueba que no es
 * determinista no es una prueba.
 */
export interface IdGeneratorPort {
  generate(): string;
}
