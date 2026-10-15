/* ============================================================
   LinguaLab — share a table through the URL hash

   WHY THE HASH AND NOT A QUERY STRING
   Everything after `#` is never sent to the server. A shared table is the
   person's own linguistic work, and the whole project promises that nothing
   leaves the browser — a query string would quietly break that promise in the
   browser's own network panel.

   WHY deflate-raw AND A FALLBACK
   A JSON table compresses several times over, which is the difference between
   a link that survives a chat client and one that gets truncated. But the
   compression stream is not in every engine that runs this site, and shipping
   a broken share button is worse than shipping a longer link, so the fallback
   is plain UTF-8 base64url. The single leading digit says which one was used,
   so decoding never has to guess or to probe the browser twice.
   ============================================================ */

import {
  type OrthographyTable,
  type OrthographyTableJsonError,
  type Result,
  err,
  orthographyTableFromJson,
  orthographyTableToJson,
} from "@lingualab/core";

/** Version marker: `1` payloads are deflate-raw, `0` payloads are plain UTF-8. */
const DEFLATED = "1";
const PLAIN = "0";

export const SHARE_HASH_PREFIX = "#t=";

/**
 * Beyond roughly this length browsers, chat clients and QR generators start
 * truncating. The editor warns instead of handing over a link that will fail
 * somewhere else and look like a bug in LinguaLab.
 */
export const LONG_URL_LIMIT = 2000;

export type ShareError =
  | { readonly code: "malformed" }
  | { readonly code: "unsupported"; readonly detail: string }
  | OrthographyTableJsonError;

/**
 * Bytes backed by a plain `ArrayBuffer`.
 *
 * The spelling is not decoration: `Blob`, `ReadableStream` and the compression
 * streams all ask for `ArrayBufferView<ArrayBuffer>`, and a bare `Uint8Array`
 * is generic over `ArrayBufferLike` — which includes `SharedArrayBuffer`, and
 * the site promises never to use one. Naming the concrete type keeps that
 * promise in the signature instead of needing a cast.
 */
type Bytes = Uint8Array<ArrayBuffer>;

const toBase64Url = (bytes: Bytes): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (value: string): Bytes | null => {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  const base64 = remainder === 0 ? padded : `${padded}${"=".repeat(4 - remainder)}`;

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

/**
 * A one-chunk stream over bytes.
 *
 * Built by hand instead of with `new Blob([bytes])`: `Blob` wants an
 * `ArrayBufferView<ArrayBuffer>` and a plain `Uint8Array` is generic over
 * `ArrayBufferLike`, so the blob version needs a cast. There is no cast here.
 */
const byteStream = (bytes: Bytes): ReadableStream<BufferSource> =>
  new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });

const deflate = async (bytes: Bytes): Promise<Bytes | null> => {
  try {
    const stream = byteStream(bytes).pipeThrough(new CompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    // Either the constructor is absent or this engine does not know
    // "deflate-raw". Both mean the same thing here: share uncompressed.
    return null;
  }
};

const inflate = async (bytes: Bytes): Promise<Bytes | null> => {
  try {
    const stream = byteStream(bytes).pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
};

/** Encode a table into the hash payload, without the `#t=` prefix. */
export const encodeTable = async (table: OrthographyTable): Promise<string> => {
  const bytes = new TextEncoder().encode(orthographyTableToJson(table));
  const compressed = await deflate(bytes);
  return compressed === null
    ? `${PLAIN}.${toBase64Url(bytes)}`
    : `${DEFLATED}.${toBase64Url(compressed)}`;
};

/** Decode a hash payload back into a table, validating it on the way in. */
export const decodeTable = async (code: string): Promise<Result<OrthographyTable, ShareError>> => {
  const separator = code.indexOf(".");
  if (separator <= 0) {
    return err({ code: "malformed" });
  }

  const version = code.slice(0, separator);
  const payload = fromBase64Url(code.slice(separator + 1));
  if (payload === null) {
    return err({ code: "malformed" });
  }

  let bytes: Bytes | null = payload;
  if (version === DEFLATED) {
    bytes = await inflate(payload);
  } else if (version !== PLAIN) {
    return err({ code: "unsupported", detail: version });
  }
  if (bytes === null) {
    return err({ code: "malformed" });
  }

  return orthographyTableFromJson(new TextDecoder().decode(bytes));
};

/** The payload inside a location hash, or `null` when the hash carries no table. */
export const readShareCode = (hash: string): string | null => {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) {
    return null;
  }
  const code = hash.slice(SHARE_HASH_PREFIX.length);
  return code === "" ? null : code;
};

/**
 * The URL to hand over. Built from the current location rather than from
 * `SITE.url` so it points at exactly the page the person is looking at,
 * including the deployment base and the locale prefix.
 */
export const shareUrl = (location: { origin: string; pathname: string }, code: string): string =>
  `${location.origin}${location.pathname}${SHARE_HASH_PREFIX}${code}`;
