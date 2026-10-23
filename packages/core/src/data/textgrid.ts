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

    const next = text.charAt(index + 1);
    if (isDigit(char) || ((char === "-" || char === ".") && isDigit(next))) {
      let end = index;
      if (text.charAt(end) === "-") {
        end += 1;
      }
      while (isDigit(text.charAt(end))) {
        end += 1;
      }
      if (text.charAt(end) === ".") {
        end += 1;
        while (isDigit(text.charAt(end))) {
          end += 1;
        }
      }
      const exponent = text.charAt(end);
      if (exponent === "e" || exponent === "E") {
        let cursor = end + 1;
        if (text.charAt(cursor) === "+" || text.charAt(cursor) === "-") {
          cursor += 1;
        }
        if (isDigit(text.charAt(cursor))) {
          while (isDigit(text.charAt(cursor))) {
            cursor += 1;
          }
          end = cursor;
        }
      }
      tokens.push({ type: "number", value: Number(text.slice(index, end)), line });
      index = end;
      continue;
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

/** Documento vacio para los archivos que declaran `<absent>` en las capas. */
const EMPTY_BOUNDS = { xmin: 0, xmax: 0 } as const;

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
  const bounds: { xmin: number; xmax: number }[] = [];

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
        points.push({ time: time.value, text: mark.value });
      }
      tiers.push({ name: name.value, kind: "point", points });
    }

    bounds.push({ xmin: tierXmin.value, xmax: tierXmax.value });
  }

  const document: AnnotationDocument = { xmin: xmin.value, xmax: xmax.value, tiers };

  const gaps: TextGridTierGap[] = [];
  for (const [position, tier] of document.tiers.entries()) {
    if (!isIntervalTier(tier)) {
      continue;
    }
    const range = bounds[position] ?? EMPTY_BOUNDS;
    for (const gap of findTierGaps(tier, range.xmin, range.xmax)) {
      gaps.push({ ...gap, tier: tier.name, tierIndex: position });
    }
  }

  return ok({ document, gaps });
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
 * Sin BOM, un archivo de texto UTF-16 esta lleno de bytes 0 en la mitad de las
 * posiciones. Es la unica senal disponible, y basta: el formato TextGrid es
 * ASCII salvo los textos, asi que media muestra de ceros del lado alto solo
 * ocurre en UTF-16.
 */
const sniffUtf16 = (bytes: Uint8Array): "utf16le" | "utf16be" | null => {
  const limit = Math.min(bytes.length, 512);
  let evenZeros = 0;
  let oddZeros = 0;
  let pairs = 0;

  for (let index = 0; index + 1 < limit; index += 2) {
    if (bytes[index] === 0) {
      evenZeros += 1;
    }
    if (bytes[index + 1] === 0) {
      oddZeros += 1;
    }
    pairs += 1;
  }

  if (pairs === 0) {
    return null;
  }
  if (oddZeros > pairs / 2 && evenZeros === 0) {
    return "utf16le";
  }
  if (evenZeros > pairs / 2 && oddZeros === 0) {
    return "utf16be";
  }
  return null;
};

/** Bytes del archivo a texto, detectando la codificacion. */
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

  const sniffed = sniffUtf16(bytes);
  if (sniffed === "utf16le") {
    return ok(decodeUtf16(bytes, 0, true));
  }
  if (sniffed === "utf16be") {
    return ok(decodeUtf16(bytes, 0, false));
  }

  return decodeUtf8(bytes, 0);
};

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
 * Numero con la representacion mas corta que NO pierda el valor.
 *
 * `String` ya lo hace para los dobles habituales, y solo cae en notacion
 * cientifica en magnitudes que un audio no alcanza; en ese caso se escribe en
 * notacion decimal fija, porque el lector de Praat no acepta exponentes.
 */
const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "0";
  }
  const plain = String(value);
  if (!/e/i.test(plain)) {
    return plain;
  }
  return value.toFixed(12).replace(/0+$/, "").replace(/\.$/, "");
};

/** Dentro de una cadena de TextGrid, una comilla doble se escribe dos veces. */
const quote = (value: string): string => `"${value.replace(/"/g, '""')}"`;

/**
 * Documento a TextGrid en formato largo.
 *
 * Siempre el largo: es el que se puede leer y corregir a mano, y el unico en el
 * que un revisor ve que capa es cual sin contar posiciones.
 */
export const serializeTextGrid = (doc: AnnotationDocument): string => {
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
    lines.push(`    item [${position + 1}]:`);
    lines.push(`        class = ${quote(tier.kind === "interval" ? "IntervalTier" : "TextTier")}`);
    lines.push(`        name = ${quote(tier.name)}`);
    lines.push(`        xmin = ${formatNumber(doc.xmin)}`);
    lines.push(`        xmax = ${formatNumber(doc.xmax)}`);

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
