import {
  MAX_TEXTGRID_BYTES,
  type AnnotationDocument,
  type ElanError,
  type TextGridError,
  createTextGridCodec,
  isTextGridTooLarge,
} from "@lingualab/core";
import { lingualab } from "../../composition-root";
import { safeInit } from "../core/safe";
import { detectFormat, formatBytes, suggestedFileName, type ElanFileFormat } from "./format";
import {
  clearTiers,
  renderReport,
  renderReportPlaceholder,
  renderTiers,
  type ReportElements,
} from "./render";
import { createElanStrings, parseElanStrings, type ElanStrings } from "./strings";

/**
 * El controlador del conversor ELAN ↔ TextGrid.
 *
 * COMO SE REPARTE EL TRABAJO
 *
 * - El codec ELAN (Pyodide + pympi) solo existe detras de `lingualab.elan`; este
 *   archivo no conoce ni el adaptador ni el worker.
 * - El lado TextGrid es el codec del nucleo (`createTextGridCodec`), el mismo
 *   que usa el visor. La conversion pasa siempre por `AnnotationDocument`, asi
 *   que ELAN → TextGrid es «leer ELAN, escribir TextGrid» y no un traductor
 *   aparte con sus propias reglas.
 * - Aqui solo se decide que se muestra y que se descarga.
 *
 * POR QUE LA CARGA DE UN .eaf TARDA Y LA DE UN .TextGrid NO
 *
 * Leer un .eaf necesita Pyodide (unos 13 MB en disco la primera vez) y por eso muestra la
 * barra de progreso. Un .TextGrid lo lee el nucleo en el hilo principal, sin
 * motor, y no cuesta nada. Al reves, exportar a .eaf necesita el motor y exportar
 * a .TextGrid no. La barra aparece exactamente cuando hay algo que esperar.
 */

/**
 * El tope de tamano es el mismo del TextGrid del nucleo.
 *
 * Un archivo de anotacion de 1 MB ya es enorme, y el limite existe para no
 * congelar la pestaña antes de leer el archivo entero. Se aplica a los dos
 * formatos para que el mensaje diga un solo numero.
 */
const MAX_BYTES = MAX_TEXTGRID_BYTES;

interface LoadedFile {
  readonly name: string;
  readonly format: ElanFileFormat;
  readonly document: AnnotationDocument;
}

type StatusState = "idle" | "busy" | "ok" | "error";

export const initElanLab = (): void => {
  const root = document.querySelector<HTMLElement>("[data-elanlab]");
  if (root === null) return;

  const $ = <T extends Element>(selector: string): T | null => root.querySelector<T>(selector);

  const strings: ElanStrings = createElanStrings(
    parseElanStrings(root.dataset.elanlabStrings),
  );
  const textGrid = createTextGridCodec();

  const input = $<HTMLInputElement>("[data-elan-file]");
  const status = $<HTMLElement>("[data-elan-status]");
  const detail = $<HTMLElement>("[data-elan-detail]");
  const progress = $<HTMLElement>("[data-elan-progress]");
  const progressBar = $<HTMLProgressElement>("[data-elan-progress-bar]");
  const tiersEmpty = $<HTMLElement>("[data-elan-tiers-empty]");
  const tiersTable = $<HTMLElement>("[data-elan-tiers]");
  const tierRows = $<HTMLElement>("[data-elan-tier-rows]");
  const exportButton = $<HTMLButtonElement>("[data-elan-export]");

  // El informe necesita sus siete nodos: si falta uno, no se dibuja nada y la
  // pagina sigue funcionando sin informe en vez de romperse a medias.
  const lossNodes = {
    container: $<HTMLElement>("[data-elan-loss]"),
    placeholder: $<HTMLElement>("[data-elan-loss-empty]"),
    none: $<HTMLElement>("[data-elan-loss-none]"),
    hierarchical: $<HTMLElement>("[data-elan-loss-hierarchical]"),
    references: $<HTMLElement>("[data-elan-loss-references]"),
    vocabularies: $<HTMLElement>("[data-elan-loss-vocabularies]"),
    notes: $<HTMLElement>("[data-elan-loss-notes]"),
  };
  const reportElements: ReportElements | null =
    lossNodes.container !== null &&
    lossNodes.placeholder !== null &&
    lossNodes.none !== null &&
    lossNodes.hierarchical !== null &&
    lossNodes.references !== null &&
    lossNodes.vocabularies !== null &&
    lossNodes.notes !== null
      ? {
          container: lossNodes.container,
          placeholder: lossNodes.placeholder,
          none: lossNodes.none,
          hierarchical: lossNodes.hierarchical,
          references: lossNodes.references,
          vocabularies: lossNodes.vocabularies,
          notes: lossNodes.notes,
        }
      : null;

  if (input === null || status === null || tierRows === null) return;

  let loaded: LoadedFile | null = null;

  /**
   * El texto que el componente dejo en el informe antes de cargar nada.
   *
   * Se lee del DOM en vez de pedirlo a las cadenas de ejecucion: es un texto que
   * ya viajo traducido en el HTML, y repetir su clave aqui seria dos fuentes
   * para la misma frase.
   */
  const reportIdleMessage = reportElements?.placeholder.textContent ?? "";

  /** Una frase, un estado. Nunca un panel en blanco que pueda pasar por resultado. */
  const say = (message: string, state: StatusState): void => {
    status.textContent = message;
    status.dataset.state = state;
  };

  /** El detalle tecnico se muestra aparte: es evidencia, no la frase principal. */
  const showDetail = (text: string | undefined): void => {
    if (detail === null) return;
    detail.hidden = text === undefined;
    detail.textContent =
      text === undefined ? "" : `${strings.text("elan.error.detail")}: ${text}`;
  };

  const setProgressVisible = (visible: boolean): void => {
    if (progress === null) return;
    progress.hidden = !visible;
    if (!visible && progressBar !== null) progressBar.value = 0;
  };

  const setBusy = (busy: boolean): void => {
    if (exportButton !== null) {
      exportButton.disabled = busy || loaded === null;
      exportButton.setAttribute("aria-busy", busy ? "true" : "false");
    }
    root.setAttribute("aria-busy", busy ? "true" : "false");
  };

  /** El nombre del formato, ya traducido, para las frases de estado. */
  const formatName = (format: ElanFileFormat): string =>
    strings.text(format === "eaf" ? "elan.format.eaf" : "elan.format.textgrid");

  const phaseName = (phase: string): string => {
    switch (phase) {
      case "runtime":
        return strings.text("elan.phase.runtime");
      case "wheel":
        return strings.text("elan.phase.wheel");
      default:
        return strings.text("elan.phase.convert");
    }
  };

  // La barra cuenta FASES, no bytes: Pyodide no expone cuanto le falta a su
  // propia descarga, y un porcentaje inventado seria una barra que se mueve sola.
  lingualab.elan.onProgress((value) => {
    setProgressVisible(true);
    if (progressBar !== null) {
      progressBar.max = value.total;
      progressBar.value = value.step;
    }
    say(
      strings.format("elan.status.busy", {
        step: value.step,
        total: value.total,
        phase: phaseName(value.phase),
      }),
      "busy",
    );
  });

  const describeElanError = (error: ElanError): string => {
    switch (error.code) {
      case "empty":
        return strings.text("elan.error.empty");
      case "malformed-xml":
        showDetail(error.detail);
        return strings.text("elan.error.malformedXml");
      case "unsupported-structure":
        showDetail(error.detail);
        return strings.text("elan.error.unsupportedStructure");
      case "unreadable-encoding":
        showDetail(error.detail);
        return strings.text("elan.error.unreadableEncoding");
      case "runtime-unavailable":
        showDetail(error.detail);
        return strings.text("elan.error.runtimeUnavailable");
    }
  };

  const describeTextGridError = (error: TextGridError): string => {
    const line = "line" in error && error.line !== undefined ? ` (línea ${error.line})` : "";
    showDetail(`${error.code}${line}: ${"detail" in error ? error.detail : ""}`);
    return strings.format("elan.error.textgrid", { code: error.code });
  };

  const download = (name: string, text: string): void => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.rel = "noopener";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    // Revocar de inmediato cancela la descarga en algunos navegadores; un turno
    // del bucle de eventos alcanza para que la haya tomado.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  /** Deja la pagina en el estado de antes de cargar un archivo. */
  const reset = (): void => {
    loaded = null;
    clearTiers(tierRows);
    if (tiersEmpty !== null) tiersEmpty.hidden = false;
    if (tiersTable !== null) tiersTable.hidden = true;
    if (reportElements !== null) {
      renderReportPlaceholder(reportElements, reportIdleMessage);
    }
    if (exportButton !== null) {
      exportButton.hidden = true;
      exportButton.disabled = true;
    }
    setProgressVisible(false);
    showDetail(undefined);
  };

  const showTiers = (doc: AnnotationDocument): void => {
    renderTiers(tierRows, doc, strings);
    if (tiersEmpty !== null) tiersEmpty.hidden = true;
    if (tiersTable !== null) tiersTable.hidden = doc.tiers.length === 0;
  };

  /** Los motivos por los que un archivo no se puede ni intentar. */
  const rejectionOf = (bytes: Uint8Array): string | null => {
    if (bytes.length === 0) {
      return strings.text("elan.error.empty");
    }
    if (isTextGridTooLarge(bytes.length)) {
      return strings.format("elan.error.tooLarge", {
        size: formatBytes(bytes.length),
        limit: formatBytes(MAX_BYTES),
      });
    }
    return null;
  };

  const readBytes = async (file: File): Promise<Uint8Array | null> => {
    try {
      return new Uint8Array(await file.arrayBuffer());
    } catch {
      say(strings.text("elan.error.read"), "error");
      return null;
    }
  };

  /** Deja la pagina mostrando lo leido y habilita la exportacion al otro formato. */
  const applyDocument = (
    file: File,
    format: ElanFileFormat,
    doc: AnnotationDocument,
  ): void => {
    loaded = { name: file.name, format, document: doc };
    showTiers(doc);
    if (exportButton !== null) {
      exportButton.hidden = false;
      exportButton.disabled = false;
      exportButton.textContent = strings.text(
        format === "eaf" ? "elan.export.textgrid" : "elan.export.eaf",
      );
    }
    say(
      strings.format("elan.status.loaded", {
        name: file.name,
        format: formatName(format),
        count: doc.tiers.length,
      }),
      "ok",
    );
  };

  /** Un .eaf necesita el motor, y por eso es la unica rama que espera. */
  const readEaf = async (file: File, bytes: Uint8Array): Promise<void> => {
    const parsed = await lingualab.elan.parseWithReport(bytes);
    setProgressVisible(false);
    if (!parsed.ok) {
      say(describeElanError(parsed.error), "error");
      return;
    }
    if (reportElements !== null) {
      renderReport(reportElements, parsed.value.report, strings);
    }
    applyDocument(file, "eaf", parsed.value.document);
  };

  /** Un .TextGrid lo lee el nucleo, sin motor y sin descargar nada. */
  const readTextGrid = (file: File, bytes: Uint8Array): void => {
    const parsed = textGrid.parse(bytes);
    if (!parsed.ok) {
      say(describeTextGridError(parsed.error), "error");
      return;
    }
    if (reportElements !== null) {
      renderReportPlaceholder(reportElements, strings.text("elan.loss.pendingExport"));
    }
    applyDocument(file, "textgrid", parsed.value);
  };

  const load = async (file: File): Promise<void> => {
    reset();
    say(strings.format("elan.status.reading", { name: file.name }), "busy");

    const bytes = await readBytes(file);
    if (bytes === null) {
      return;
    }

    const rejection = rejectionOf(bytes);
    if (rejection !== null) {
      say(rejection, "error");
      return;
    }

    const format = detectFormat(bytes);
    if (format === null) {
      say(strings.text("elan.error.unknownFormat"), "error");
      return;
    }

    if (format === "eaf") {
      await readEaf(file, bytes);
    } else {
      readTextGrid(file, bytes);
    }
  };

  /** Escribir un TextGrid es sincrono y no necesita motor; un .eaf si. */
  const exportTextGrid = (source: LoadedFile): void => {
    const text = textGrid.serialize(source.document);
    const name = suggestedFileName(source.name, "textgrid");
    download(name, text);
    setProgressVisible(false);
    setBusy(false);
    say(strings.format("elan.status.exported", { name }), "ok");
  };

  const exportEaf = async (source: LoadedFile): Promise<void> => {
    const serialized = await lingualab.elan.serializeWithReport(source.document);
    setProgressVisible(false);
    setBusy(false);
    if (!serialized.ok) {
      say(describeElanError(serialized.error), "error");
      return;
    }
    if (reportElements !== null) {
      renderReport(reportElements, serialized.value.report, strings);
    }
    const name = suggestedFileName(source.name, "eaf");
    download(name, serialized.value.text);
    say(strings.format("elan.status.exported", { name }), "ok");
  };

  const exportFile = async (): Promise<void> => {
    if (loaded === null) return;
    const source = loaded;
    setBusy(true);
    say(strings.text("elan.status.exporting"), "busy");

    if (source.format === "eaf") {
      exportTextGrid(source);
    } else {
      await exportEaf(source);
    }
  };

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file === undefined) return;
    void load(file);
    // Sin esto, elegir el mismo archivo otra vez no dispara `change` y parece
    // que la pagina se quedo colgada.
    input.value = "";
  });

  exportButton?.addEventListener("click", () => {
    void exportFile();
  });

  reset();
  say(strings.text("elan.status.idle"), "idle");
};

safeInit("elan", initElanLab);
