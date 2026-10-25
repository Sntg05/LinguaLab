import type { AnnotationDocument, ElanError } from "@lingualab/core";
import type { ElanConversionReport, ElanProgress } from "./pyodide-elan-types";

/**
 * Mensajes entre el adaptador y su worker.
 *
 * En su propio modulo para que el adaptador y el worker compartan la forma sin
 * importarse: el worker no puede cargarse en el hilo principal (arrastraria
 * Pyodide al bundle) y el adaptador no debe importar el archivo del worker (lo
 * construye por URL).
 *
 * `indexURL` viaja en CADA peticion, igual que la `baseUrl` del fonemizador: el
 * worker no guarda configuracion global y asi dos codecs distintos pueden
 * apuntar a directorios distintos sin pisarse.
 */
export type ElanWorkerRequest =
  | { readonly id: number; readonly kind: "warm-up"; readonly indexURL: string }
  | {
      readonly id: number;
      readonly kind: "parse";
      readonly indexURL: string;
      readonly bytes: Uint8Array;
    }
  | {
      readonly id: number;
      readonly kind: "serialize";
      readonly indexURL: string;
      readonly document: AnnotationDocument;
    };

export type ElanWorkerReply =
  | { readonly id: number; readonly kind: "progress"; readonly progress: ElanProgress }
  | {
      readonly id: number;
      readonly kind: "parse-ok";
      readonly document: AnnotationDocument;
      readonly report: ElanConversionReport;
    }
  | {
      readonly id: number;
      readonly kind: "serialize-ok";
      readonly text: string;
      readonly report: ElanConversionReport;
    }
  | { readonly id: number; readonly kind: "warm-up-ok" }
  | { readonly id: number; readonly kind: "error"; readonly error: ElanError };
