import type { ClockPort } from "../../ports/clock";

/**
 * Reloj fijo con control manual.
 *
 * Por defecto arranca en la epoca Unix y no avanza: dos ejecuciones de una
 * prueba producen la misma marca de tiempo. `set` y `advance` permiten
 * simular el paso del tiempo cuando el caso de uso depende de el.
 */
export class FixedClock implements ClockPort {
  private current: Date;

  constructor(initial: Date = new Date(0)) {
    this.current = initial;
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(date: Date): void {
    this.current = new Date(date.getTime());
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}
