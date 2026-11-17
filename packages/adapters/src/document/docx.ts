/**
 * El texto de un .docx: los párrafos de `word/document.xml`, en orden.
 *
 * WordprocessingML (ECMA-376) guarda cada párrafo en `<w:p>` y el texto en
 * `<w:t>`; `<w:tab/>` es un tabulador y `<w:br/>` o `<w:cr/>` un salto de línea.
 * El XML lo escribe un programa, no una persona, así que se lee con un
 * analizador de etiquetas y no hace falta un DOM (las pruebas corren en Node).
 *
 * QUÉ SE DEJA FUERA, A PROPÓSITO
 *
 * - `<w:delText>`: el texto borrado con control de cambios. No es parte del
 *   documento que la persona ve.
 * - `<mc:Fallback>`: la copia de respaldo de un cuadro de texto o una forma.
 *   Word la escribe junto a la versión principal; leer las dos duplicaría el
 *   texto del cuadro.
 * - Notas al pie, encabezados y pies de página: viven en otras entradas del ZIP.
 *   Se leen solo el cuerpo, y la página lo dice.
 */

const ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

const decodeEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
    if (name.startsWith("#x") || name.startsWith("#X")) {
      return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    }
    if (name.startsWith("#")) return String.fromCodePoint(Number.parseInt(name.slice(1), 10));
    return ENTITIES[name] ?? match;
  });

/**
 * Las piezas que importan: fin de párrafo, texto, tabulador y saltos. `<w:t`
 * exige espacio o `>` detrás, así que no confunde `<w:tab/>`, `<w:tbl>` ni
 * `<w:tc>`.
 */
const PIECES = /<\/w:p>|<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\/>|<w:(?:br|cr)\b[^>]*\/>/g;

export const docxXmlToText = (xml: string): string => {
  const body = xml.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, "");
  let text = "";
  for (const match of body.matchAll(PIECES)) {
    const [piece, content] = match;
    if (content !== undefined) text += decodeEntities(content);
    else if (piece === "</w:p>") text += "\n";
    else if (piece === "<w:tab/>") text += "\t";
    else text += "\n";
  }
  return text.replace(/\n{3,}/g, "\n\n").trim();
};
