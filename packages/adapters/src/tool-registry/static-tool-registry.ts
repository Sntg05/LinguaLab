/**
 * Registro de herramientas a partir de datos ya cargados en memoria.
 *
 * POR QUE ESTE ADAPTADOR NO CONOCE EL CATALOGO
 *
 * La fabrica recibe las fichas y no las importa. Si leyera `src/data/tools.json`
 * directamente, el adaptador solo se podria probar contra el catalogo real: una
 * prueba de filtros tendria que inventar fichas metidas dentro del archivo de
 * produccion, o conformarse con lo que hoy haya en el. Recibiendo los datos, el
 * contrato se ejecuta contra un catalogo de prueba minimo y el adaptador sigue
 * siendo el mismo que sirve al sitio.
 *
 * POR QUE EL ORDEN ES POR `id`
 *
 * Un filtro tiene que dar siempre la misma lista. Si el orden dependiera del
 * orden de insercion en el JSON, anadir una herramienta al final reordenaria la
 * vista y dos renders del mismo filtro dejarian de ser comparables: la prueba
 * que compara listas tendria que ordenarlas antes y el desorden real quedaria
 * escondido. Ordenar por `id` —unico por construccion— da un orden total y
 * estable, y se compara por unidades de codigo, no con `localeCompare`, para
 * que la lista no cambie segun el idioma del sistema que compila.
 */
import { type ToolDescriptor, type ToolFilter, type ToolRegistryPort, ok } from "@lingualab/core";

const matches = (tool: ToolDescriptor, filter: ToolFilter): boolean => {
  // Los tres criterios son opcionales y se combinan con AND: elegir area y
  // lengua significa "de esta area Y que sirva a esta lengua". El contrato del
  // puerto fija esa regla, asi que vive aqui una sola vez.
  if (filter.area !== undefined && tool.area !== filter.area) {
    return false;
  }
  if (filter.integration !== undefined && tool.integration !== filter.integration) {
    return false;
  }
  if (filter.language !== undefined && !tool.languages.includes(filter.language)) {
    return false;
  }
  return true;
};

/** El puerto que implementa este adaptador, nombrado en la superficie publica. */
export type StaticToolRegistry = ToolRegistryPort;

const byId = (left: ToolDescriptor, right: ToolDescriptor): number => {
  if (left.id === right.id) {
    return 0;
  }
  return left.id < right.id ? -1 : 1;
};

export const createStaticToolRegistry = (tools: readonly ToolDescriptor[]): ToolRegistryPort => {
  // Copia defensiva: quien construye el registro no puede reordenarlo despues
  // desde fuera, con lo que el orden estable dejaria de estar garantizado.
  const catalog = [...tools];

  return {
    list: async (filter) => {
      const visible = catalog.filter((tool) => (filter ? matches(tool, filter) : true));
      return ok(visible.sort(byId));
    },

    byId: async (id) => {
      // Un id desconocido no es un fallo del registro: devolver `null` permite
      // que una ruta antigua muestre "no encontrada" sin tratarlo como averia.
      return ok(catalog.find((tool) => tool.id === id) ?? null);
    },
  };
};
