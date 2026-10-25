import type { AnnotationDocument, Interval, Tier } from "../domain/annotation";
import {
  TIME_EPSILON,
  findTierGaps,
  isIntervalTier,
  type TierGap,
} from "../domain/annotation-edit";
import type { TextGridCodecPort, TextGridError } from "../ports/textgrid-codec";
import { err, ok, type Result } from "../result";

/**
 * El formato TextGrid de Praat, en el nucleo y sin dependencias.
 *
 * POR QUE AQUI Y NO EN UN ADAPTADOR
 *
 * El formato es el mismo para todos los adaptadores, y eso ya lo decidio este
 * repositorio con el JSON de las tablas (`data/table-json.ts`): el adaptador
 * decide DONDE se guarda, no COMO se escribe. Si el formato viviera en cada
 * adaptador, un TextGrid exportado desde el navegador podria no abrirse con el
 * exportado desde cualquier otro sitio, sin que nadie hubiera cambiado el
 * archivo. Aqui no hay red, ni reloj, ni DOM: solo texto que entra y sale.
 *
 * DOS FORMATOS DE LECTURA, UNO DE ESCRITURA
 *
 * Praat escribe el formato largo (`xmin = 0`) y el corto (valores
 * posicionales). Al leer se aceptan los dos porque un archivo de campo puede
 * venir de cualquiera de las dos opciones del menu; al escribir se emite
 * siempre el largo, que es el unico que un humano puede revisar con los ojos.
 */

/** Un hueco de una capa concreta, con el nombre de esa capa. */
export interface TextGridTierGap extends TierGap {
  readonly tier: string;
  readonly tierIndex: number;
}

/** Los limites que declara una capa en el archivo, que no son los del documento. */
export interface TierBounds {
  readonly xmin: number;
  readonly xmax: number;
}

/**
 * Resultado del analisis.
 *
 * Lleva los huecos aparte del documento a proposito. Un TextGrid con huecos se
 * puede leer —los intervalos estan ahi— pero rompe la invariante de cobertura
 * continua que Praat exige al abrir. Devolver solo un error obligaria a tirar
 * los datos y pedirle a la persona que reescriba el archivo a mano; devolver
 * solo el documento escondería que el archivo exportado no va a abrir igual.
 */
export interface ParsedTextGrid {
  readonly document: AnnotationDocument;
  readonly gaps: readonly TextGridTierGap[];
  /**
   * Los `xmin`/`xmax` que declara cada capa, en el orden del documento.
   *
   * `AnnotationDocument` no los guarda (una capa es nombre y contenido) y sin
   * ellos la exportacion inventaba cobertura: escribia los limites del
   * documento en una capa que media menos, y el archivo resultante declaraba
   * un tramo que sus intervalos no cubrian. Con estos limites,
   * `serializeTextGrid` puede escribir lo que se leyo.
   */
  readonly tierBounds: readonly TierBounds[];
}

type Token =
  | { readonly type: "string"; readonly text: string; readonly line: number }
  | { readonly type: "number"; readonly value: number; readonly line: number }
  | { readonly type: "exists" | "absent"; readonly line: number };

const isDigit = (char: string | undefined): boolean =>
  char !== undefined && char >= "0" && char <= "9";

const isLetter = (char: string | undefined): boolean =>
  char !== undefined &&
  ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || char === "_");

const isSpace = (char: string | undefined): boolean =>
  char === " " || char === "\t" || char === "\r";

/**
 * Escanea un numero: signo opcional, digitos, punto decimal opcional y
 * exponente opcional. Devuelve `null` si en esa posicion no empieza un numero.
 *
 * POR QUE NO ALCANZA CON MIRAR EL SIGUIENTE CARACTER
 *
 * La version anterior solo aceptaba `-` o `.` cuando los seguia un digito, asi
 * que `-.5` —la forma que Praat escribe— no entraba como numero: el `-` se
descartaba como ruido y el tiempo quedaba en `0.5`. Medio segundo de
 * desplazamiento silencioso es peor que un error, porque nadie lo busca.
 */
const scanNumber = (text: string, index: number): { readonly end: number } | null => {
  let cursor = index;
  const sign = text.charAt(cursor);
  if (sign === "-" || sign === "+") {
    cursor += 1;
  }

  let digits = 0;
  while (isDigit(text.charAt(cursor))) {
    cursor += 1;
    digits += 1;
  }
  if (text.charAt(cursor) === ".") {
    cursor += 1;
    while (isDigit(text.charAt(cursor))) {
      cursor += 1;
      digits += 1;
    }
  }
  if (digits === 0) {
    return null;
  }

  const exponentMark = text.charAt(cursor);
  if (exponentMark === "e" || exponentMark === "E") {
    let after = cursor + 1;
    if (text.charAt(after) === "+" || text.charAt(after) === "-") {
      after += 1;
    }
    if (isDigit(text.charAt(after))) {
      while (isDigit(text.charAt(after))) {
        after += 1;
      }
      cursor = after;
    }
  }

  return { end: cursor };
};

/**
 * Convierte el archivo en una lista de valores, sin mirar las claves.
 *
 * El truco es que los dos formatos de Praat son POSICIONALES una vez que se
 * descartan las palabras: `xmin = 0` y un `0` suelto aportan el mismo numero, y
 * `"IntervalTier"` aparece en el mismo lugar en ambos. Lo unico que hay que
 * quitar son los indices de los bloques (`item [1]:`, `intervals [2]:`), que
 * de otro modo entrarian como numeros y desplazarian todo lo que sigue.
 */
const tokenize = (text: string): Result<readonly Token[], TextGridError> => {
  const tokens: Token[] = [];
  let line = 1;
  let index = 0;

  while (index < text.length) {
    const char = text.charAt(index);

    if (char === "\n") {
      line += 1;
      index += 1;
      continue;
    }

    if (char === '"') {
      const startLine = line;
      let value = "";
      let closed = false;
      index += 1;
      while (index < text.length) {
        const current = text.charAt(index);
        if (current === '"') {
          if (text.charAt(index + 1) === '"') {
            value += '"';
            index += 2;
            continue;
          }
          index += 1;
          closed = true;
          break;
        }
        if (current === "\n") {
          line += 1;
        }
        value += current;
        index += 1;
      }
      if (!closed) {
        return err({
          code: "malformed-header",
          detail: "Una cadena entre comillas no se cierra.",
          line: startLine,
        });
      }
      tokens.push({ type: "string", text: value, line: startLine });
      continue;
    }

    if (char === "<") {
      const close = text.indexOf(">", index);
      if (close === -1) {
        return err({
          code: "malformed-header",
          detail: "Falta el cierre de una marca `<...>`.",
          line,
        });
      }
      const word = text
        .slice(index + 1, close)
        .trim()
        .toLowerCase();
      if (word === "exists" || word === "absent") {
        tokens.push({ type: word, line });
      }
      index = close + 1;
      continue;
    }

    const numberStart = text.charAt(index);
    if (isDigit(numberStart) || numberStart === "-" || numberStart === "+" || numberStart === ".") {
      const scanned = scanNumber(text, index);
      if (scanned !== null) {
        const literal = text.slice(index, scanned.end);
        const value = Number(literal);
        if (!Number.isFinite(value)) {
          return err({
            code: "non-finite-number",
            detail: `El numero \`${literal}\` no es finito: ningun tiempo de un TextGrid puede ser infinito.`,
            line,
          });
        }
        tokens.push({ type: "number", value, line });
        index = scanned.end;
        continue;
      }
    }

    if (isLetter(char)) {
      let end = index;
      while (isLetter(text.charAt(end)) || isDigit(text.charAt(end))) {
        end += 1;
      }
      const word = text.slice(index, end).toLowerCase();
      if (word === "item" || word === "intervals" || word === "points") {
        let cursor = end;
        while (isSpace(text.charAt(cursor))) {
          cursor += 1;
        }
        if (text.charAt(cursor) === "[") {
          const close = text.indexOf("]", cursor);
          if (close !== -1) {
            index = close + 1;
            continue;
          }
        }
      }
      index = end;
      continue;
    }

    index += 1;
  }

  return ok(tokens);
};

const parseTokens = (tokens: readonly Token[]): Result<ParsedTextGrid, TextGridError> => {
  const fileType = tokens[0];
  if (
    fileType === undefined ||
    fileType.type !== "string" ||
    fileType.text.trim().toLowerCase() !== "ootextfile"
  ) {
    return err({
      code: "malformed-header",
      detail: 'El archivo no empieza por `File type = "ooTextFile"`.',
      line: fileType?.line ?? 1,
    });
  }

  const objectClass = tokens[1];
  if (objectClass === undefined || objectClass.type !== "string") {
    return err({
      code: "malformed-header",
      detail: "Falta la linea `Object class`.",
      line: objectClass?.line ?? fileType.line,
    });
  }
  if (objectClass.text.trim() !== "TextGrid") {
    return err({
      code: "unsupported-object-class",
      detail: `Se esperaba "TextGrid" y se encontro "${objectClass.text}".`,
      line: objectClass.line,
    });
  }

  let cursor = 2;
  let lastLine = objectClass.line;

  const takeNumber = (
    code: "malformed-header" | "malformed-tier",
    what: string,
  ): Result<number, TextGridError> => {
    const token = tokens[cursor];
    if (token === undefined) {
      return err({ code, detail: `Falta ${what}.`, line: lastLine });
    }
    if (token.type !== "number") {
      return err({ code, detail: `${what} no es un numero.`, line: token.line });
    }
    cursor += 1;
    lastLine = token.line;
    return ok(token.value);
  };

  const takeString = (
    code: "malformed-header" | "malformed-tier",
    what: string,
  ): Result<string, TextGridError> => {
    const token = tokens[cursor];
    if (token === undefined) {
      return err({ code, detail: `Falta ${what}.`, line: lastLine });
    }
    if (token.type !== "string") {
      return err({ code, detail: `${what} no es una cadena entre comillas.`, line: token.line });
    }
    cursor += 1;
    lastLine = token.line;
    return ok(token.text);
  };

  const takeCount = (what: string): Result<number, TextGridError> => {
    const result = takeNumber("malformed-tier", what);
    if (!result.ok) {
      return result;
    }
    if (!Number.isInteger(result.value) || result.value < 0) {
      return err({
        code: "malformed-tier",
        detail: `${what} tiene que ser un entero no negativo.`,
        line: lastLine,
      });
    }
    return result;
  };

  const xmin = takeNumber("malformed-header", "`xmin`");
  if (!xmin.ok) {
    return xmin;
  }
  const xmax = takeNumber("malformed-header", "`xmax`");
  if (!xmax.ok) {
    return xmax;
  }

  const tiersMarker = tokens[cursor];
  let tierCount = 0;

  if (tiersMarker !== undefined && tiersMarker.type === "absent") {
    cursor += 1;
    lastLine = tiersMarker.line;
  } else {
    if (tiersMarker !== undefined && tiersMarker.type === "exists") {
      cursor += 1;
      lastLine = tiersMarker.line;
    }
    // Si no hay marca, el formato corto sigue igualmente con el tamano: un
    // archivo escrito a mano sin `<exists>` no merece perder sus intervalos.
    const count = takeCount("`size`");
    if (!count.ok) {
      return count;
    }
    tierCount = count.value;
  }

  const tiers: Tier[] = [];
  const bounds: TierBounds[] = [];

  for (let position = 0; position < tierCount; position += 1) {
    const tierClass = takeString("malformed-tier", `la clase de la capa ${position + 1}`);
    if (!tierClass.ok) {
      return tierClass;
    }
    if (tierClass.value.trim() !== "IntervalTier" && tierClass.value.trim() !== "TextTier") {
      return err({
        code: "malformed-tier",
        detail: `La capa ${position + 1} declara la clase "${tierClass.value}", que no es IntervalTier ni TextTier.`,
        line: lastLine,
      });
    }

    const name = takeString("malformed-tier", `el nombre de la capa ${position + 1}`);
    if (!name.ok) {
      return name;
    }
    const tierXmin = takeNumber("malformed-tier", `el xmin de la capa ${position + 1}`);
    if (!tierXmin.ok) {
      return tierXmin;
    }
    const tierXmax = takeNumber("malformed-tier", `el xmax de la capa ${position + 1}`);
    if (!tierXmax.ok) {
      return tierXmax;
    }
    const itemCount = takeCount(`el numero de elementos de la capa ${position + 1}`);
    if (!itemCount.ok) {
      return itemCount;
    }

    // Una capa no puede cubrir mas que el documento: si lo hiciera, serializarla
    // con SUS limites escribiria un archivo mas largo que su cabecera, y
    // serializarla con los del documento dejaria intervalos fuera de la capa.
    // Rechazarla es la unica salida que no inventa nada.
    if (tierXmax.value < tierXmin.value) {
      return err({
        code: "malformed-tier",
        detail: `La capa ${position + 1} ("${name.value}") termina (${formatNumber(tierXmax.value)}) antes de empezar (${formatNumber(tierXmin.value)}).`,
        line: lastLine,
      });
    }
    if (tierXmin.value < xmin.value - TIME_EPSILON || tierXmax.value > xmax.value + TIME_EPSILON) {
      return err({
        code: "tier-out-of-document",
        detail: `La capa ${position + 1} ("${name.value}") declara ${formatNumber(tierXmin.value)}–${formatNumber(tierXmax.value)} y el documento cubre ${formatNumber(xmin.value)}–${formatNumber(xmax.value)}.`,
        line: lastLine,
      });
    }

    if (tierClass.value.trim() === "IntervalTier") {
      const items: Interval[] = [];
      let previousEnd = tierXmin.value;
      for (let item = 0; item < itemCount.value; item += 1) {
        const start = takeNumber("malformed-tier", `el inicio del intervalo ${item + 1}`);
        if (!start.ok) {
          return start;
        }
        const end = takeNumber("malformed-tier", `el fin del intervalo ${item + 1}`);
        if (!end.ok) {
          return end;
        }
        const text = takeString("malformed-tier", `el texto del intervalo ${item + 1}`);
        if (!text.ok) {
          return text;
        }
        if (end.value < start.value) {
          return err({
            code: "malformed-tier",
            detail: `El intervalo ${item + 1} de "${name.value}" termina (${end.value}) antes de empezar (${start.value}).`,
            line: lastLine,
          });
        }
        if (start.value < previousEnd - TIME_EPSILON) {
          return err({
            code: "malformed-tier",
            detail: `Los intervalos de "${name.value}" no estan ordenados ni son contiguos: el intervalo ${item + 1} empieza antes de que termine el anterior.`,
            line: lastLine,
          });
        }
        if (
          start.value < tierXmin.value - TIME_EPSILON ||
          end.value > tierXmax.value + TIME_EPSILON
        ) {
          return err({
            code: "interval-out-of-tier",
            detail: `El intervalo ${item + 1} (${formatNumber(start.value)}–${formatNumber(end.value)}) se sale de los limites de "${name.value}" (${formatNumber(tierXmin.value)}–${formatNumber(tierXmax.value)}).`,
            line: lastLine,
          });
        }
        previousEnd = end.value;
        items.push({ start: start.value, end: end.value, text: text.value });
      }
      tiers.push({ name: name.value, kind: "interval", items });
    } else {
      const points: { time: number; text: string }[] = [];
      for (let point = 0; point < itemCount.value; point += 1) {
        const time = takeNumber("malformed-tier", `el tiempo del punto ${point + 1}`);
        if (!time.ok) {
          return time;
        }
        const mark = takeString("malformed-tier", `la marca del punto ${point + 1}`);
        if (!mark.ok) {
          return mark;
        }
        // La misma invariante que en los intervalos, en la otra rama: un punto
        // fuera de su capa lo pinta el visor sobre un eje que no llega y la
        // exportacion lo escribe fuera de rango, que es lo que Praat rechaza.
        if (
          time.value < tierXmin.value - TIME_EPSILON ||
          time.value > tierXmax.value + TIME_EPSILON
        ) {
          return err({
            code: "point-out-of-tier",
            detail: `El punto ${point + 1} (${formatNumber(time.value)}) se sale de los limites de "${name.value}" (${formatNumber(tierXmin.value)}–${formatNumber(tierXmax.value)}).`,
            line: lastLine,
          });
        }
        points.push({ time: time.value, text: mark.value });
      }
      tiers.push({ name: name.value, kind: "point", points });
    }

    bounds.push({ xmin: tierXmin.value, xmax: tierXmax.value });
  }

  // Un archivo que declara menos bloques de los que trae pierde anotaciones sin
  // avisar: `size = 1` con dos capas —o con dos intervalos— se rechaza aqui,
  // igual que se rechaza el archivo truncado al que le faltan bloques. Lo que
  // sobra son valores sueltos porque el analizador ya se sabe el formato: si
  // queda alguno, el archivo traia mas de lo que dijo.
  const leftover = tokens[cursor];
  if (leftover !== undefined) {
    return err({
      code: "unexpected-blocks",
      detail: `El archivo trae mas bloques de los que declara: sobran ${tokens.length - cursor} valor(es) desde la linea ${leftover.line}.`,
      line: leftover.line,
    });
  }

  const document: AnnotationDocument = { xmin: xmin.value, xmax: xmax.value, tiers };

  const gaps: TextGridTierGap[] = [];
  for (const [position, tier] of document.tiers.entries()) {
    if (!isIntervalTier(tier)) {
      continue;
    }
    // Los huecos se miden contra los limites del DOCUMENTO y no contra los de la
    // capa. Una capa que cubre 0..3 en un documento de 5 s no tiene huecos
    // propios, pero deja 2 s sin cubrir: Praat rechaza el archivo exportado
    // aunque el visor diga que todo esta bien. El hueco lleva el nombre de la
    // capa que no llega, que es la que hay que rellenar.
    for (const gap of findTierGaps(tier, xmin.value, xmax.value)) {
      gaps.push({ ...gap, tier: tier.name, tierIndex: position });
    }
  }

  return ok({ document, gaps, tierBounds: bounds });
};

/** Decodifica UTF-8 validando las secuencias: illegal no se convierte en «basura silenciosa». */
const decodeUtf8 = (bytes: Uint8Array, offset: number): Result<string, TextGridError> => {
  let text = "";
  let index = offset;

  while (index < bytes.length) {
    const byte = bytes[index] ?? 0;

    if (byte < 0x80) {
      text += String.fromCharCode(byte);
      index += 1;
      continue;
    }

    let extra = 0;
    let code = 0;
    if ((byte & 0xe0) === 0xc0) {
      extra = 1;
      code = byte & 0x1f;
    } else if ((byte & 0xf0) === 0xe0) {
      extra = 2;
      code = byte & 0x0f;
    } else if ((byte & 0xf8) === 0xf0) {
      extra = 3;
      code = byte & 0x07;
    } else {
      return err({
        code: "unreadable-encoding",
        detail: `El byte 0x${byte.toString(16)} del desplazamiento ${index} no abre una secuencia UTF-8 valida.`,
      });
    }

    if (index + extra >= bytes.length) {
      return err({
        code: "unreadable-encoding",
        detail: "El archivo termina en medio de un caracter UTF-8.",
      });
    }

    for (let step = 1; step <= extra; step += 1) {
      const continuation = bytes[index + step] ?? 0;
      if ((continuation & 0xc0) !== 0x80) {
        return err({
          code: "unreadable-encoding",
          detail: `La secuencia UTF-8 que empieza en el desplazamiento ${index} esta truncada.`,
        });
      }
      code = (code << 6) | (continuation & 0x3f);
    }

    // Una secuencia sobrelarga escribe el mismo caracter con mas bytes de los
    // necesarios: `C0 80` es un NUL escrito con dos. Aceptarla deja entrar bytes
    // que un lector estricto rechaza, y aqui ese NUL se volvia contenido.
    const minimumForLength = extra === 1 ? 0x80 : extra === 2 ? 0x800 : 0x10000;
    if (code < minimumForLength) {
      return err({
        code: "unreadable-encoding",
        detail: `La secuencia UTF-8 que empieza en el desplazamiento ${index} es sobrelarga: el mismo caracter se puede escribir con menos bytes.`,
      });
    }
    if (code > 0x10ffff || (code >= 0xd800 && code <= 0xdfff)) {
      return err({
        code: "unreadable-encoding",
        detail: `La secuencia UTF-8 que empieza en el desplazamiento ${index} no codifica un caracter valido.`,
      });
    }

    text += String.fromCodePoint(code);
    index += extra + 1;
  }

  return ok(text);
};

/** UTF-16 tal como lo guarda Praat al elegir «Unicode». */
const decodeUtf16 = (bytes: Uint8Array, offset: number, littleEndian: boolean): string => {
  let text = "";
  for (let index = offset; index + 1 < bytes.length; index += 2) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1] ?? 0;
    text += String.fromCharCode(littleEndian ? first | (second << 8) : (first << 8) | second);
  }
  return text;
};

/**
 * Bytes del archivo a texto, detectando la codificacion.
 *
 * UTF-16 SOLO CON BOM, Y AQUI SE CUMPLE
 *
 * Antes habia una heuristica que contaba bytes 0 y afirmaba que «basta». No
 * basta: `name = "Āguila"` en UTF-16LE sin BOM pasa por UTF-8 valido (el byte
 * alto es 0x01, no 0x00) y entra como texto con un caracter de control; el
 * rechazo llegaba despues, desde el analizador y con un mensaje que culpaba al
 * formato. Praat escribe el BOM cuando guarda «Unicode», asi que exigirlo no
 * cierra ninguna puerta real: sin BOM se intenta UTF-8, y si el archivo trae
 * bytes 0 —que ningun TextGrid legitimo tiene— o secuencias invalidas, se
 * devuelve `unreadable-encoding` diciendo lo que se esperaba de verdad.
 */
const containsZeroByte = (bytes: Uint8Array): boolean => {
  for (const byte of bytes) {
    if (byte === 0) {
      return true;
    }
  }
  return false;
};

export const decodeTextGridBytes = (bytes: Uint8Array): Result<string, TextGridError> => {
  if (bytes.length === 0) {
    return err({ code: "empty" });
  }

  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return decodeUtf8(bytes, 3);
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return ok(decodeUtf16(bytes, 2, true));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return ok(decodeUtf16(bytes, 2, false));
  }

  if (containsZeroByte(bytes)) {
    return err({
      code: "unreadable-encoding",
      detail:
        "El archivo trae bytes 0, que no aparecen en un TextGrid de texto: se esperaba UTF-8 o un BOM de UTF-16 (Praat lo escribe al guardar en «Unicode»).",
    });
  }

  return decodeUtf8(bytes, 0);
};

/**
 * Tope de tamano de un TextGrid, en bytes: 1 MB.
 *
 * El resto del sitio limita a 100 KB el texto que se analiza
 * (`src/scripts/core/guardrails.ts`). Un TextGrid es mas pesado por naturaleza
 * —un archivo de 44 MB con 400 000 intervalos se midio en 896 ms de analisis y
 * +45 MB de heap, con picos de 4 a 6 veces el tamano del archivo—, pero 1 MB
 * sigue siendo holgado para una sesion de anotacion real y corta el caso que
 * congela la pestaña antes de leer el archivo entero.
 *
 * El tope vive aqui, junto al codec, para que la interfaz no invente su propio
 * numero y para que la prueba del limite sea la del formato.
 */
export const MAX_TEXTGRID_BYTES = 1024 * 1024;

/** Verdadero si el archivo supera el tope y hay que rechazarlo antes de leerlo. */
export const isTextGridTooLarge = (byteLength: number): boolean => byteLength > MAX_TEXTGRID_BYTES;

/** Texto de un TextGrid a documento + huecos. */
export const parseTextGridText = (raw: string): Result<ParsedTextGrid, TextGridError> => {
  const text = raw.replace(/^\ufeff/, "");
  if (text.trim() === "") {
    return err({ code: "empty" });
  }

  const tokens = tokenize(text);
  if (!tokens.ok) {
    return tokens;
  }
  return parseTokens(tokens.value);
};

/** Bytes de un TextGrid a documento + huecos. */
export const parseTextGridBytes = (bytes: Uint8Array): Result<ParsedTextGrid, TextGridError> => {
  const decoded = decodeTextGridBytes(bytes);
  if (!decoded.ok) {
    return decoded;
  }
  return parseTextGridText(decoded.value);
};

/**
 * Escapa un numero a la notacion decimal exacta, sin exponente.
 *
 * `toExponential()` sin argumento devuelve los digitos que reconstruyen el
 * doble exacto, y de ahi solo hace falta mover el punto. No se redondea nada:
 * `String` es la representacion mas corta, pero para `1e-13` el camino anterior
 * (`toFixed(12)`) devolvia `0` y para `1e21` devolvia `1e+21`, que es justo la
 * notacion que el lector de Praat no acepta.
 */
const expandDecimal = (value: number): string => {
  const [mantissa = "0", exponentText = "0"] = Math.abs(value).toExponential().split("e");
  const [whole = "0", fraction = ""] = mantissa.split(".");
  const digits = `${whole}${fraction}`;
  const pointAt = whole.length + Number(exponentText);

  let plain: string;
  if (pointAt <= 0) {
    plain = `0.${"0".repeat(-pointAt)}${digits}`;
  } else if (pointAt >= digits.length) {
    plain = `${digits}${"0".repeat(pointAt - digits.length)}`;
  } else {
    plain = `${digits.slice(0, pointAt)}.${digits.slice(pointAt)}`;
  }

  return value < 0 ? `-${plain}` : plain;
};

/**
 * Numero con la representacion mas corta que NO pierda el valor y sin
 * exponente.
 *
 * `String` ya da la forma corta para los dobles habituales; cuando cae en
 * notacion cientifica se expande a decimal fija, porque el lector de Praat no
 * acepta exponentes. Los valores diminutos conservan su valor —`5e-324` se
 * escribe con sus 324 ceros—: redondearlos a cero moveria la anotacion en
 * silencio, que es el defecto que esta funcion tuvo y que una prueba afirma.
 *
 * Un valor no finito no puede venir de un archivo —`parse` lo rechaza con
 * `non-finite-number`— sino de un documento construido en memoria; se escribe
 * `0`, el unico numero que no rompe el formato.
 */
const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const plain = String(value);
  if (!/e/i.test(plain)) {
    return plain;
  }
  return expandDecimal(value);
};

/** Dentro de una cadena de TextGrid, una comilla doble se escribe dos veces. */
const quote = (value: string): string => `"${value.replace(/"/g, '""')}"`;

/**
 * Documento a TextGrid en formato largo.
 *
 * Siempre el largo: es el que se puede leer y corregir a mano, y el unico en el
 * que un revisor ve que capa es cual sin contar posiciones.
 *
 * `tierBounds`, cuando viene de `parseTextGridText`, escribe en cada capa los
 * limites que el archivo declaraba. Sin ellos se usan los del documento, que es
 * lo correcto para un documento construido en el visor —sus capas se crean con
 * el rango del audio— pero mentiria al reexportar una capa mas corta que el
 * documento.
 */
export const serializeTextGrid = (
  doc: AnnotationDocument,
  tierBounds?: readonly TierBounds[],
): string => {
  const lines: string[] = [
    'File type = "ooTextFile"',
    'Object class = "TextGrid"',
    "",
    `xmin = ${formatNumber(doc.xmin)}`,
    `xmax = ${formatNumber(doc.xmax)}`,
    "tiers? <exists>",
    `size = ${doc.tiers.length}`,
    "item []:",
  ];

  for (const [position, tier] of doc.tiers.entries()) {
    const range = tierBounds?.[position];
    const tierXmin = range?.xmin ?? doc.xmin;
    const tierXmax = range?.xmax ?? doc.xmax;
    lines.push(`    item [${position + 1}]:`);
    lines.push(`        class = ${quote(tier.kind === "interval" ? "IntervalTier" : "TextTier")}`);
    lines.push(`        name = ${quote(tier.name)}`);
    lines.push(`        xmin = ${formatNumber(tierXmin)}`);
    lines.push(`        xmax = ${formatNumber(tierXmax)}`);

    if (isIntervalTier(tier)) {
      lines.push(`        intervals: size = ${tier.items.length}`);
      for (const [index, interval] of tier.items.entries()) {
        lines.push(`        intervals [${index + 1}]:`);
        lines.push(`            xmin = ${formatNumber(interval.start)}`);
        lines.push(`            xmax = ${formatNumber(interval.end)}`);
        lines.push(`            text = ${quote(interval.text)}`);
      }
    } else {
      lines.push(`        points: size = ${tier.points.length}`);
      for (const [index, point] of tier.points.entries()) {
        lines.push(`        points [${index + 1}]:`);
        lines.push(`            number = ${formatNumber(point.time)}`);
        lines.push(`            mark = ${quote(point.text)}`);
      }
    }
  }

  return `${lines.join("\n")}\n`;
};

/** Cabecera del CSV de intervalos. Es parte del formato: cambiarla rompe lectores. */
export const ANNOTATION_CSV_HEADER = "tier,start,end,text";

/** Dentro de un campo CSV, comillas, comas y saltos de linea obligan a entrecomillar. */
const csvField = (value: string): string =>
  /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

/**
 * CSV plano para abrir en una hoja de calculo: una fila por intervalo o punto.
 *
 * Las capas de puntos se escriben con inicio igual a fin, porque el CSV declara
 * cuatro columnas y omitirlas dejaria filas de tres campos que una hoja de
 * calculo lee como texto desalineado sin avisar.
 */
export const exportAnnotationCsv = (doc: AnnotationDocument): string => {
  const rows: string[] = [ANNOTATION_CSV_HEADER];

  for (const tier of doc.tiers) {
    if (isIntervalTier(tier)) {
      for (const interval of tier.items) {
        rows.push(
          [
            csvField(tier.name),
            formatNumber(interval.start),
            formatNumber(interval.end),
            csvField(interval.text),
          ].join(","),
        );
      }
    } else {
      for (const point of tier.points) {
        rows.push(
          [
            csvField(tier.name),
            formatNumber(point.time),
            formatNumber(point.time),
            csvField(point.text),
          ].join(","),
        );
      }
    }
  }

  return `${rows.join("\n")}\n`;
};

/**
 * Implementacion de referencia del puerto.
 *
 * `parse` es estricto con los huecos: si el archivo no cubre el intervalo
 * completo de una capa, devuelve `gap-detected` en vez de un documento que
 * Praat rechazaria. La interfaz NO usa este metodo para importar, sino
 * `parseTextGridBytes`, que le entrega el documento junto con los huecos para
 * poder ofrecer «rellenar» sin perder lo leido.
 */
export const createTextGridCodec = (): TextGridCodecPort => ({
  parse: (bytes) => {
    const parsed = parseTextGridBytes(bytes);
    if (!parsed.ok) {
      return parsed;
    }
    const [firstGap] = parsed.value.gaps;
    if (firstGap !== undefined) {
      return err({
        code: "gap-detected",
        detail: `La capa "${firstGap.tier}" no cubre de ${formatNumber(firstGap.start)} a ${formatNumber(firstGap.end)}.`,
      });
    }
    return ok(parsed.value.document);
  },
  serialize: serializeTextGrid,
});
