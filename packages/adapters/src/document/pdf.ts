/**
 * El texto de un PDF con pdf.js (Mozilla).
 *
 * pdf.js se recibe ya cargado por una función: el navegador lo importa con su
 * worker (`pdf-browser.ts`) y las pruebas con la compilación para Node. Así el
 * mismo código de extracción corre en los dos sitios.
 *
 * LO QUE UN PDF NO GUARDA
 *
 * Un PDF guarda dónde se dibuja cada trozo de texto, no párrafos. pdf.js marca
 * los finales de línea (`hasEOL`); las palabras partidas con guion al final de
 * una línea se vuelven a unir cuando la línea siguiente empieza en minúscula
 * («socio-/lingüística» → «sociolingüística»). Las columnas, las tablas y los
 * encabezados repetidos pueden salir en otro orden: la página lo advierte.
 *
 * SEGURIDAD
 *
 * `isEvalSupported: false`: pdf.js no compila funciones de fuentes con `eval`
 * (la CSP del sitio tampoco lo permitiría). Solo se pide el texto; nada se
 * dibuja.
 */
import { type DocumentReadError, type Result, err, ok } from "@lingualab/core";
import type { PdfTextReader } from "./document-reader";

interface TextItemLike {
  readonly str?: string;
  readonly hasEOL?: boolean;
}

interface PdfPageLike {
  getTextContent(): Promise<{ readonly items: readonly TextItemLike[] }>;
  cleanup(): unknown;
}

interface PdfDocumentLike {
  readonly numPages: number;
  getPage(number: number): Promise<PdfPageLike>;
}

/** Lo que este lector usa de pdf.js, y nada más. */
export interface PdfjsLike {
  getDocument(source: {
    readonly data: Uint8Array;
    readonly isEvalSupported: boolean;
    readonly disableFontFace: boolean;
    readonly stopAtErrors: boolean;
  }): { readonly promise: Promise<PdfDocumentLike>; destroy(): Promise<void> };
}

/** Une los trozos de una página: `hasEOL` es un salto de línea. */
export const pageText = (items: readonly TextItemLike[]): string =>
  items.map((item) => `${item.str ?? ""}${item.hasEOL === true ? "\n" : ""}`).join("");

/** Une una palabra partida con guion al final de línea si sigue en minúscula. */
export const joinHyphenated = (text: string): string =>
  text.replace(/(\p{Ll})-\n(\p{Ll})/gu, "$1$2");

const describe = (error: unknown): DocumentReadError => {
  const name = error instanceof Error ? error.name : "";
  if (name === "PasswordException") return { code: "encrypted" };
  return { code: "corrupt", detail: error instanceof Error ? error.message : String(error) };
};

export const createPdfTextReader =
  (load: () => Promise<PdfjsLike>): PdfTextReader =>
  async (
    bytes,
  ): Promise<Result<{ readonly text: string; readonly pages: number }, DocumentReadError>> => {
    let pdfjs: PdfjsLike;
    try {
      pdfjs = await load();
    } catch {
      // Sin red o con un despliegue nuevo a medias, el módulo no llega: se dice,
      // y el siguiente intento vuelve a pedirlo (ver `pdf-browser.ts`).
      return err({ code: "reader-unavailable" });
    }
    // pdf.js se queda con el búfer que recibe (lo transfiere al worker): se le da una copia.
    const task = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      disableFontFace: true,
      stopAtErrors: false,
    });
    let document: PdfDocumentLike;
    try {
      document = await task.promise;
    } catch (error) {
      await task.destroy();
      return err(describe(error));
    }

    try {
      const pages: string[] = [];
      for (let number = 1; number <= document.numPages; number += 1) {
        const page = await document.getPage(number);
        pages.push(pageText((await page.getTextContent()).items));
        page.cleanup();
      }
      return ok({ text: joinHyphenated(pages.join("\n\n")).trim(), pages: document.numPages });
    } catch (error) {
      return err(describe(error));
    } finally {
      // Libera el documento y, en el navegador, lo que el worker guardaba de él.
      await task.destroy();
    }
  };
