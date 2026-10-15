import type { ToolDescriptor } from "../../domain/tool-descriptor";
import type { ToolFilter, ToolRegistryError, ToolRegistryPort } from "../../ports/tool-registry";
import { ok, type Result } from "../../result";

/** Registro de herramientas en memoria; los filtros se combinan con AND. */
export class InMemoryToolRegistry implements ToolRegistryPort {
  private readonly tools: readonly ToolDescriptor[];

  constructor(tools: readonly ToolDescriptor[] = []) {
    this.tools = [...tools];
  }

  async list(filter?: ToolFilter): Promise<Result<readonly ToolDescriptor[], ToolRegistryError>> {
    const filtered = this.tools.filter((tool) => {
      if (filter?.area !== undefined && tool.area !== filter.area) {
        return false;
      }
      if (filter?.integration !== undefined && tool.integration !== filter.integration) {
        return false;
      }
      if (filter?.language !== undefined && !tool.languages.includes(filter.language)) {
        return false;
      }
      return true;
    });
    return ok(filtered);
  }

  async byId(id: string): Promise<Result<ToolDescriptor | null, ToolRegistryError>> {
    return ok(this.tools.find((tool) => tool.id === id) ?? null);
  }
}
