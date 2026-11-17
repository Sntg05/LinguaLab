/**
 * Lector mínimo de ZIP: encontrar una entrada por nombre y descomprimirla.
 *
 * POR QUÉ PROPIO Y NO UNA DEPENDENCIA
 *
 * Un .docx es un ZIP con XML dentro, y para sacar su texto basta una entrada
 * (`word/document.xml`). El formato del directorio central está fijado por la
 * especificación APPNOTE de PKWARE y es corto de leer; la descompresión la hace
 * el navegador (`DecompressionStream("deflate-raw")`). Una biblioteca de ZIP
 * traería escritura, cifrado y ZIP64, que aquí no hacen falta.
 *
 * Lo que NO lee: ZIP64 (archivos de más de 4 GB, imposibles bajo el tope de
 * 10 MB) ni entradas cifradas. Los dos casos devuelven un error con nombre.
 *
 * BOMBAS DE DESCOMPRESIÓN
 *
 * Unos KB comprimidos pueden declarar o producir cientos de MB. La salida se
 * cuenta mientras se descomprime y se corta al pasar `maxBytes`, sin creer en el
 * tamaño que declara el propio archivo.
 */

export type ZipError =
  | { readonly code: "not-a-zip" }
  | { readonly code: "missing-entry"; readonly name: string }
  | { readonly code: "unsupported"; readonly detail: string }
  | { readonly code: "too-large"; readonly limit: number }
  | { readonly code: "corrupt"; readonly detail: string };

export type ZipResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ZipError };

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const LOCAL_FILE_HEADER = 0x04034b50;

interface Entry {
  readonly name: string;
  readonly method: number;
  readonly flags: number;
  readonly compressedSize: number;
  readonly localOffset: number;
}

const fail = (error: ZipError): ZipResult<never> => ({ ok: false, error });

/** El registro de fin de directorio está al final, antes de un comentario opcional de hasta 64 KB. */
const findEnd = (view: DataView): number => {
  const earliest = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let offset = view.byteLength - 22; offset >= earliest; offset -= 1) {
    if (view.getUint32(offset, true) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  return -1;
};

const readEntries = (bytes: Uint8Array): ZipResult<readonly Entry[]> => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length >= 22 ? findEnd(view) : -1;
  if (end < 0) return fail({ code: "not-a-zip" });

  const count = view.getUint16(end + 10, true);
  const directory = view.getUint32(end + 16, true);
  if (count === 0xffff || directory === 0xffffffff) {
    return fail({ code: "unsupported", detail: "ZIP64" });
  }

  const decoder = new TextDecoder();
  const entries: Entry[] = [];
  let offset = directory;
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== CENTRAL_FILE_HEADER) {
      return fail({ code: "corrupt", detail: "directorio central" });
    }
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    entries.push({
      flags: view.getUint16(offset + 8, true),
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      localOffset: view.getUint32(offset + 42, true),
      name: decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { ok: true, value: entries };
};

/** Descomprime contando bytes: corta en cuanto la salida pasa del tope. */
const inflate = async (data: Uint8Array, maxBytes: number): Promise<ZipResult<Uint8Array>> => {
  // La copia fija el tipo del búfer (`ArrayBuffer`, no compartido), que es lo que `Blob` admite.
  const stream = new Blob([new Uint8Array(data)])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        return fail({ code: "too-large", limit: maxBytes });
      }
      chunks.push(value);
    }
  } catch (error) {
    return fail({
      code: "corrupt",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return { ok: true, value: out };
};

/** Los bytes descomprimidos de una entrada. */
export const readZipEntry = async (
  bytes: Uint8Array,
  name: string,
  maxBytes: number,
): Promise<ZipResult<Uint8Array>> => {
  const entries = readEntries(bytes);
  if (!entries.ok) return entries;
  const entry = entries.value.find((candidate) => candidate.name === name);
  if (entry === undefined) return fail({ code: "missing-entry", name });
  if ((entry.flags & 0x1) !== 0) return fail({ code: "unsupported", detail: "cifrado" });

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const local = entry.localOffset;
  if (local + 30 > bytes.length || view.getUint32(local, true) !== LOCAL_FILE_HEADER) {
    return fail({ code: "corrupt", detail: "cabecera local" });
  }
  const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
  const data = bytes.subarray(start, start + entry.compressedSize);
  if (data.length !== entry.compressedSize)
    return fail({ code: "corrupt", detail: "entrada truncada" });

  if (entry.method === 0) {
    return data.length > maxBytes
      ? fail({ code: "too-large", limit: maxBytes })
      : { ok: true, value: data };
  }
  if (entry.method === 8) return inflate(data, maxBytes);
  return fail({ code: "unsupported", detail: `método ${entry.method}` });
};
