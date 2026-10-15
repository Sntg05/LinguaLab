/**
 * Puerto de reloj.
 *
 * POR QUE ES UN PUERTO
 *
 * Un caso de uso que lea `new Date()` no se puede probar: el resultado depende
 * del instante en que se ejecute la prueba. Inyectando el reloj, la prueba fija
 * la fecha y puede verificar exactamente lo que se guardo o se mostro. Sin
 * esto, la unica alternativa seria congelar el tiempo global, que es fragil y
 * afecta a todo el proceso.
 */
export interface ClockPort {
  now(): Date;
}
