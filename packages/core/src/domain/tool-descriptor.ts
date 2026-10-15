/**
 * `ToolDescriptor`: la ficha publica de una herramienta del sitio.
 *
 * Este es el unico punto donde el codigo del nucleo usa palabras en espanol
 * (`"fonetica"`, `"morfosintaxis"`): son valores de datos que se muestran en
 * la interfaz y se guardan en el catalogo, no identificadores. Traducirlos
 * obligaria a mantener un mapa de traduccion para un dato que ya es contenido.
 */

/** Areas linguisticas del catalogo de herramientas. */
export type ToolArea =
  | "fonetica"
  | "fonologia"
  | "morfosintaxis"
  | "semantica"
  | "pragmatica"
  | "psicolinguistica"
  | "tipologia"
  | "documentacion";

/**
 * Como se integra la herramienta al sitio. `needs-backend` marca lo que no
 * puede funcionar con el sitio estatico y queda para una fase con servidor.
 */
export type ToolIntegration = "embedded" | "external-link" | "needs-backend";

/** Estado de madurez. `experimental` y `planned` son avisos visibles en la interfaz. */
export type ToolStatus = "stable" | "experimental" | "planned";

/** Idiomas fijos de la ficha: el nombre y las notas se muestran en es o en. */
export type ToolLocalizedText = Readonly<Record<"es" | "en", string>>;

export interface ToolDescriptor {
  readonly id: string;
  readonly name: ToolLocalizedText;
  readonly area: ToolArea;
  readonly integration: ToolIntegration;
  readonly status: ToolStatus;
  /** Codigos de lengua con los que la herramienta tiene datos o soporte real. */
  readonly languages: readonly string[];
  /** Enlace externo; obligatorio en la practica cuando `integration` es `external-link`. */
  readonly url?: string;
  readonly notes?: ToolLocalizedText;
  /** Referencia bibliografica de la herramienta o del metodo que implementa. */
  readonly citation?: string;
}
