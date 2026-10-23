import type { AnnotationDocument } from "../domain/index";
import type { Result } from "../result";

/**
 * Fallos al leer o escribir un TextGrid.
 *
 * `line` es opcional y de base 1: un archivo mal formado casi siempre se
 * explica en una linea concreta, y sin ese numero el mensaje obliga a la
 * persona a buscar a mano. `gap-detected` no implica que el archivo sea
 * invalido en abstracto, sino que rompe una invariante que este modelo exige.
 */
export type TextGridError =
  | { readonly code: "empty" }
  | { readonly code: "unreadable-encoding"; readonly detail?: string }
  | { readonly code: "malformed-header"; readonly detail: string; readonly line?: number }
  | { readonly code: "malformed-tier"; readonly detail: string; readonly line?: number }
  | { readonly code: "unsupported-object-class"; readonly detail: string; readonly line?: number }
  | { readonly code: "gap-detected"; readonly detail: string; readonly line?: number }
  /**
   * Un numero del archivo (`1e400`) no es finito. Lo produce `parse` al leer
   * cualquier tiempo: sin este rechazo el valor entra como `Infinity` y la
   * exportacion lo escribe `0`, moviendo la anotacion en silencio.
   */
  | { readonly code: "non-finite-number"; readonly detail: string; readonly line?: number }
  /**
   * Un intervalo empieza o termina fuera del `xmin`/`xmax` de SU capa. Lo
   * produce `parse`: Praat rechaza esa capa, y el visor no puede reescribirla
   * con limites coherentes sin inventar cobertura que el archivo no tiene.
   */
  | { readonly code: "interval-out-of-tier"; readonly detail: string; readonly line?: number }
  /**
   * Una capa declara un rango que el documento no cubre (capa 0..9 dentro de un
   * documento 0..5). Lo produce `parse`; serializar despues con los limites del
   * documento escribiria intervalos fuera de su capa, o al reves.
   */
  | { readonly code: "tier-out-of-document"; readonly detail: string; readonly line?: number }
  /**
   * El archivo declara menos bloques de los que trae (`size = 1` con dos capas o
   * dos intervalos). Lo produce `parse`, y es el espejo del archivo truncado:
   * descartar lo que sobra pierde anotaciones sin avisar.
   */
  | { readonly code: "unexpected-blocks"; readonly detail: string; readonly line?: number };

/**
 * Puerto de lectura y escritura de TextGrid de Praat.
 *
 * `parse` es sincrono a proposito: el analisis del texto ya esta en memoria,
 * no hay E/S que esperar y devolver una promesa solo agregaria ruido. Si un
 * adaptador necesitara asincronia real, seria senal de que esta haciendo algo
 * que no le toca.
 */
export interface TextGridCodecPort {
  parse(bytes: Uint8Array): Result<AnnotationDocument, TextGridError>;
  serialize(doc: AnnotationDocument): string;
}
