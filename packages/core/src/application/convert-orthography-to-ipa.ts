import type {
  CasePolicy,
  ConversionLayer,
  ConversionTraceEntry,
  LayerConversion,
  UncoveredPosition,
} from "../engine/index";
import { convertLayer } from "../engine/index";
import { normalizeInput } from "../engine/normalize";
import type { OrthographyTable } from "../domain/orthography-table";
import type {
  OrthographyRepositoryError,
  OrthographyRepositoryPort,
} from "../ports/orthography-repository";
import { err, ok, type Result } from "../result";
import { validateOrthographyTable, type OrthographyIssue } from "./validate-orthography-table";

/**
 * Caso de uso `ConvertOrthographyToIpa` (especificacion S7).
 *
 * Es el que alimenta el modo "explicar": ademas de la cadena AFI devuelve el
 * rastro por caracter y las posiciones sin cobertura.
 */

export interface ConvertOrthographyToIpaInput {
  readonly text: string;
  readonly tableId: string;
  readonly options?: {
    /** Capas visibles; por defecto solo la fonemica. */
    readonly layers?: readonly ConversionLayer[];
    /** `fold` por defecto, porque el AFI ignora las mayusculas. */
    readonly casePolicy?: CasePolicy;
  };
}

export interface ConvertOrthographyToIpaOutput {
  /** Salida de la ultima capa que el llamador pidio. */
  readonly ipa: string;
  readonly layerOutputs: Readonly<Partial<Record<ConversionLayer, string>>>;
  readonly trace: readonly ConversionTraceEntry[];
  readonly uncovered: readonly UncoveredPosition[];
}

export type ConvertOrthographyToIpaError =
  | { readonly code: "table-not-found"; readonly tableId: string }
  | {
      readonly code: "table-unusable";
      readonly tableId: string;
      readonly issues: readonly OrthographyIssue[];
    }
  | { readonly code: "empty-input" }
  | { readonly code: "storage-failure"; readonly detail: string };

const DEFAULT_LAYERS: readonly ConversionLayer[] = ["phonemic"];

/**
 * Traduce el error del repositorio al error de este caso de uso.
 *
 * El repositorio no deberia devolver `not-found` en un `get` (devuelve
 * `null`), pero si lo hiciera se conserva el significado en lugar de
 * etiquetarlo como fallo de almacenamiento.
 */
const toStorageFailure = (error: OrthographyRepositoryError): ConvertOrthographyToIpaError => {
  if (error.code === "not-found") {
    return { code: "table-not-found", tableId: error.id };
  }
  const detail = "detail" in error && error.detail !== undefined ? error.detail : error.code;
  return { code: "storage-failure", detail };
};

const requestedLayers = (input: ConvertOrthographyToIpaInput): readonly ConversionLayer[] => {
  const asked = input.options?.layers;
  // Una lista vacia se interpreta como "lo de siempre" y no como "no quiero
  // ninguna capa": una conversion sin ninguna pasada no es una transcripcion.
  return asked !== undefined && asked.length > 0 ? asked : DEFAULT_LAYERS;
};

/**
 * Aplica la capa alofonica solo si existe y se pidio.
 *
 * Una tabla sin `allophonic` no convierte la salida fonemica en "todo sin
 * cobertura": pasar una lista vacia de reglas marcaria cada caracter como
 * hueco y llenaria el panel de avisos por una capa que, simplemente, no esta.
 */
const applyAllophonic = (
  table: OrthographyTable,
  phonemicOutput: string,
  casePolicy: CasePolicy,
): LayerConversion | null => {
  const rules = table.allophonic;
  if (rules === undefined || rules.length === 0) {
    return null;
  }
  return convertLayer(phonemicOutput, rules, {
    layer: "allophonic",
    casePolicy,
    classes: table.classes,
  });
};

const resolveUsableTable = async (
  tables: OrthographyRepositoryPort,
  tableId: string,
): Promise<Result<OrthographyTable, ConvertOrthographyToIpaError>> => {
  const loaded = await tables.get(tableId);
  if (!loaded.ok) {
    return err(toStorageFailure(loaded.error));
  }
  if (loaded.value === null) {
    return err({ code: "table-not-found", tableId });
  }

  // Una tabla con errores no se convierte: su salida tendria la misma
  // apariencia que una transcripcion correcta y no lo es.
  const errors = validateOrthographyTable(loaded.value).filter(
    (issue) => issue.severity === "error",
  );
  if (errors.length > 0) {
    return err({ code: "table-unusable", tableId, issues: errors });
  }

  return ok(loaded.value);
};

const buildLayerOutputs = (
  layers: readonly ConversionLayer[],
  phonemic: LayerConversion,
  allophonic: LayerConversion | null,
): Partial<Record<ConversionLayer, string>> => {
  const outputs: Partial<Record<ConversionLayer, string>> = {};
  if (layers.includes("phonemic")) {
    outputs.phonemic = phonemic.output;
  }
  if (layers.includes("allophonic") && allophonic !== null) {
    // La clave solo se publica cuando la capa existe de verdad. Rellenarla con la
    // salida fonemica haria que la interfaz mostrara "capa alofonica: aboɡado"
    // en una tabla que no declara ninguna regla alofonica, y quien la lee creeria
    // que ahi se aplico algo. La ausencia de la clave es la respuesta honesta;
    // la salida principal si cae a la fonemica, porque es lo mejor disponible.
    outputs.allophonic = allophonic.output;
  }
  return outputs;
};

// La salida principal es la ULTIMA capa pedida, no una preferencia fija: si el
// llamador pide ["phonemic", "allophonic"] quiere ver las aproximantes, y si
// pide ["allophonic", "phonemic"] quiere el resultado sin refinar.
const lastRequestedOutput = (
  layers: readonly ConversionLayer[],
  phonemic: LayerConversion,
  allophonic: LayerConversion | null,
): string => {
  const lastLayer = layers[layers.length - 1] ?? "phonemic";
  return lastLayer === "allophonic" ? (allophonic?.output ?? phonemic.output) : phonemic.output;
};

export const createConvertOrthographyToIpa =
  (deps: { readonly tables: OrthographyRepositoryPort }) =>
  async (
    input: ConvertOrthographyToIpaInput,
  ): Promise<Result<ConvertOrthographyToIpaOutput, ConvertOrthographyToIpaError>> => {
    if (normalizeInput(input.text).length === 0) {
      return err({ code: "empty-input" });
    }

    const resolved = await resolveUsableTable(deps.tables, input.tableId);
    if (!resolved.ok) {
      return resolved;
    }
    const table = resolved.value;

    const layers = requestedLayers(input);
    const casePolicy = input.options?.casePolicy ?? "fold";

    // La pasada fonemica siempre se ejecuta, aunque el llamador no quiera verla:
    // la alofonica se define sobre su salida y no tiene otra entrada.
    const phonemic = convertLayer(input.text, table.rules, {
      layer: "phonemic",
      casePolicy,
      classes: table.classes,
    });

    const allophonic = layers.includes("allophonic")
      ? applyAllophonic(table, phonemic.output, casePolicy)
      : null;

    return ok({
      ipa: lastRequestedOutput(layers, phonemic, allophonic),
      layerOutputs: buildLayerOutputs(layers, phonemic, allophonic),
      trace: [...phonemic.trace, ...(allophonic?.trace ?? [])],
      uncovered: [...phonemic.uncovered, ...(allophonic?.uncovered ?? [])],
    });
  };
