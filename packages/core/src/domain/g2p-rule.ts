/**
 * `G2PRule`: una regla de grafema a AFI dentro de una tabla de ortografia.
 *
 * El motor de reglas (tarea T5) la usa para convertir texto escrito a su
 * transcripcion. La regla no guarda a que tabla pertenece: vive dentro de
 * `OrthographyTable.rules`, y esa pertenencia es la que le da sentido.
 */

export interface G2PRule {
  /** Grafema de origen, tal como se escribe (puede ser un digrafo como "ch"). */
  readonly grapheme: string;
  /** Transcripcion AFI de destino. Puede ser multi-caracter ("t͡ʃ"). */
  readonly ipa: string;
  /**
   * Contexto que debe aparecer INMEDIATAMENTE ANTES del grafema. Un solo
   * caracter ("s") exige esa letra pegada a la izquierda; `#` exige limite de
   * palabra; una lista entre corchetes ("[aeiou]") exige cualquiera de esos
   * caracteres. Ausente significa "sin restriccion de contexto".
   */
  readonly before?: string;
  /**
   * Contexto que debe aparecer INMEDIATAMENTE DESPUES del grafema, con las
   * mismas convenciones que `before`: caracter suelto, `#` para limite de
   * palabra, o lista `[aeiou]`.
   */
  readonly after?: string;
  /**
   * Desempate cuando dos reglas empatan en longitud y contexto: gana el numero
   * mayor. Sin prioridad, el orden de la lista decide.
   */
  readonly priority?: number;
  /** Razon linguistica de la regla; se muestra en el modo "explicar". */
  readonly note?: string;
}
