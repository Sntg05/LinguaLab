/**
 * Fabrica de adaptadores para las suites de contrato.
 *
 * Devuelve una instancia NUEVA en cada llamada porque cada prueba necesita
 * empezar sin estado: un contrato que comparte el adaptador entre casos
 * arrastra el estado de la prueba anterior y termina comprobando cosas que
 * nadie escribio.
 */
export type AdapterFactory<Port> = () => Port | Promise<Port>;
