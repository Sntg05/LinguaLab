/**
 * pdf.js en el navegador: el módulo y su worker se piden la primera vez que
 * alguien carga un PDF, y el worker se reutiliza después. Una visita que solo
 * compara .docx o .txt no descarga nada de esto.
 */
import type { PdfjsLike } from "./pdf";

let loading: Promise<PdfjsLike> | null = null;

export const loadBrowserPdfjs = (): Promise<PdfjsLike> => {
  loading ??= import("pdfjs-dist").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(new URL("./pdf-worker.ts", import.meta.url), {
      type: "module",
    });
    return pdfjs as unknown as PdfjsLike;
  });
  return loading;
};
