import type { ToolArea, ToolDescriptor, ToolIntegration } from "../domain/index";
import type { Result } from "../result";

/**
 * Filtro del catalogo de herramientas. Todos los campos son opcionales y se
 * combinan con AND: `area` y `language` juntos significan "herramientas de
 * esta area que sirvan a esta lengua".
 */
export interface ToolFilter {
  readonly area?: ToolArea;
  readonly language?: string;
  readonly integration?: ToolIntegration;
}

/** Fallos al consultar el registro de herramientas. */
export type ToolRegistryError =
  | { readonly code: "registry-unavailable"; readonly detail?: string }
  | { readonly code: "unknown"; readonly detail: string };

/**
 * Puerto del registro de herramientas. `byId` devuelve `null` si el
 * identificador no existe: una URL antigua con un id retirado debe poder
 * mostrar "no encontrada" sin tratarse como fallo del registro.
 */
export interface ToolRegistryPort {
  list(filter?: ToolFilter): Promise<Result<readonly ToolDescriptor[], ToolRegistryError>>;
  byId(id: string): Promise<Result<ToolDescriptor | null, ToolRegistryError>>;
}
