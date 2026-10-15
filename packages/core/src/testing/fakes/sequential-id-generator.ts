import type { IdGeneratorPort } from "../../ports/id-generator";

/**
 * Generador determinista: `prefijo-1`, `prefijo-2`, ...
 *
 * POR QUE NO ALEATORIO
 *
 * Una prueba que compara el identificador generado contra un valor esperado
 * necesita que ese valor no cambie entre corridas. Con una secuencia fija, el
 * caso de uso se puede afirmar entero.
 */
export class SequentialIdGenerator implements IdGeneratorPort {
  private next: number;
  private readonly prefix: string;

  constructor(prefix = "id") {
    this.prefix = prefix;
    this.next = 1;
  }

  generate(): string {
    const id = `${this.prefix}-${this.next}`;
    this.next += 1;
    return id;
  }
}
