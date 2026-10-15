import type { ToolDescriptor } from "../domain/tool-descriptor";
import type { ToolFilter, ToolRegistryError, ToolRegistryPort } from "../ports/tool-registry";
import type { Result } from "../result";

/**
 * Caso de uso `ListTools`.
 *
 * Solo compone el filtro con el puerto: la regla de que area y lengua se
 * combinan con AND vive en el contrato del puerto, no aqui.
 */
export const createListTools =
  (deps: { readonly registry: ToolRegistryPort }) =>
  (filter?: ToolFilter): Promise<Result<readonly ToolDescriptor[], ToolRegistryError>> =>
    deps.registry.list(filter);
