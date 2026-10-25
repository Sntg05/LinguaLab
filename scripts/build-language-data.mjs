#!/usr/bin/env node
/**
 * Genera `src/data/languages-co.json`: las lenguas de Colombia segun Glottolog.
 *
 * POR QUE EL JSON SE VERSIONA Y EL SCRIPT SOLO SIRVE PARA REGENERARLO
 *
 * El sitio promete funcionar sin red y la verificacion de la compilacion falla
 * si una pagina referencia un origen externo. Si el JSON se descargara durante
 * `astro build`, el build dependeria de que raw.githubusercontent.com responda y
 * la pagina dejaria de compilar en un avion, en un CI sin salida o el dia que
 * Glottolog cambie una URL. Por eso el resultado se commitea: es un dato de
 * entrada del sitio, como `tools.json` o el manifiesto de audio, y este script
 * es la unica forma de actualizarlo, a mano y a proposito.
 *
 * El archivo guarda la version de Glottolog, la fecha de recuperacion, la URL de
 * origen y el sha256 del CSV leido, para que cualquiera pueda comprobar de donde
 * salio cada nombre sin confiar en este comentario.
 *
 * POR QUE SOLO SE LEE `languages.csv` Y NO TAMBIEN `values.csv`
 *
 * Las columnas del dataset CLDF se verificaron contra el archivo real antes de
 * escribir el filtro. `languages.csv` es la tabla de languoides y trae todo lo
 * que el mapa necesita: `Level` (family | language | dialect), `Countries` (codigos
 * ISO 3166-1 alfa-2 separados por `;`), `Family_ID`, `Latitude`, `Longitude`,
 * `ISO639P3code` y `Name`. `values.csv` es un StructureDataset de parametros
 * (`level`, `category`, `classification`, `aes`, `med`, `bib`) y NO tiene ningun
 * parametro de pais: 21 MB de descarga que no aportarian un solo campo. Por eso
 * el script no lo pide, y `sha256` cubre el unico CSV del que sale el dato.
 *
 * Uso:
 *   node scripts/build-language-data.mjs
 *   node scripts/build-language-data.mjs --source <dir|url> --out <archivo>
 *
 * La bandera `--source` existe para las pruebas, que corren contra un fixture
 * CLDF pequeno en vez de la red, y `--retrieved-at` fija la fecha para que la
 * salida sea reproducible byte a byte.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Raiz del repositorio, para que el script funcione desde cualquier cwd. */
const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Dataset CLDF de Glottolog. La barra final importa: se resuelven rutas hijas. */
const DEFAULT_SOURCE = "https://raw.githubusercontent.com/glottolog/glottolog-cldf/master/cldf/";
const DEFAULT_OUT = join(ROOT, "src", "data", "languages-co.json");

/** El pais que filtra el mapa, como codigo ISO 3166-1 alfa-2. */
const COLOMBIA = "CO";

const USAGE = `Genera src/data/languages-co.json a partir del dataset CLDF de Glottolog.

Opciones:
  --source <dir|url>       Carpeta o URL con languages.csv y cldf-metadata.json.
                           Por defecto: ${DEFAULT_SOURCE}
  --out <archivo>          Archivo de salida. Por defecto: src/data/languages-co.json
  --retrieved-at <iso>     Fecha de recuperacion a declarar. Por defecto: ahora.
  --help                   Muestra esta ayuda.

El JSON generado se commitea: el sitio compila sin red y este script es la forma
de regenerarlo. Ver la cabecera del script y public/mapa/README.md.`;

/**
 * Un fallo de datos o de fuente detiene el script con un mensaje que nombra el
 * archivo culpable. Nunca se escribe un JSON a medias ni se rellena un campo
 * con una suposicion.
 */
const fail = (message) => {
  process.stderr.write(`build-language-data: ${message}\n`);
  process.exit(1);
};

const parseArgs = (argv) => {
  const options = { source: DEFAULT_SOURCE, out: DEFAULT_OUT, retrievedAt: undefined, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === "--help" || flag === "-h") {
      options.help = true;
      continue;
    }

    if (flag === "--source" || flag === "--out" || flag === "--retrieved-at") {
      if (value === undefined || value.startsWith("--")) {
        fail(`falta el valor de ${flag}`);
      }
      const key = flag === "--retrieved-at" ? "retrievedAt" : flag.slice(2);
      options[key] = value;
      index += 1;
      continue;
    }

    fail(`opcion desconocida: ${flag}. Ver --help.`);
  }

  return options;
};

/**
 * Lee un campo entrecomillado desde la comilla de apertura.
 *
 * Devuelve el valor y el indice que sigue al cierre, o `null` cuando el archivo
 * termina antes de cerrar: un CSV truncado no se completa a la fuerza.
 * `""` dentro del campo es una comilla literal, que es como el dataset escapa
 * los nombres que traen comillas.
 */
const readQuotedField = (text, start) => {
  let value = "";

  for (let cursor = start + 1; cursor < text.length; cursor += 1) {
    const character = text[cursor];
    if (character !== '"') {
      value += character;
      continue;
    }
    if (text[cursor + 1] === '"') {
      value += '"';
      cursor += 1;
      continue;
    }
    return { value, next: cursor + 1 };
  }

  return null;
};

/**
 * Consume el separador en `index`: una coma cierra el campo, un salto de linea
 * cierra la fila, y `\r\n` cuenta como un solo salto.
 */
const readSeparator = (text, index) => ({
  next: index + (text[index] === "\r" && text[index + 1] === "\n" ? 2 : 1),
  endsRow: text[index] !== ",",
});

/**
 * Convierte las filas en objetos `{ columna: valor }`.
 *
 * La primera fila es el encabezado y manda: cada valor se guarda bajo el nombre
 * de su columna, recortado. Una fila con una sola celda es una linea en blanco
 * del archivo y se descarta; una columna ausente en la fila queda como cadena
 * vacia, que es lo mismo que el CSV dice.
 */
const toRecords = (rows) => {
  const [header, ...records] = rows;
  if (header === undefined) {
    return [];
  }

  const columns = header.map((column) => column.trim());
  return records
    .filter((record) => record.length > 1)
    .map((record) => {
      const parsed = {};
      columns.forEach((column, columnIndex) => {
        parsed[column] = (record[columnIndex] ?? "").trim();
      });
      return parsed;
    });
};

/**
 * Lector de CSV con comillas.
 *
 * El archivo real trae campos entrecomillados con comas y comillas escapadas
 * (por ejemplo el `subclassification` de una familia o el nombre de un pueblo),
 * asi que un `split(",")` publicaria filas corridas sin avisar. Se soportan los
 * dos finales de linea porque el dataset se regenera en otra maquina.
 */
const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = "";
  let index = 0;

  while (index < text.length) {
    const character = text[index];

    if (character === '"') {
      const quoted = readQuotedField(text, index);
      if (quoted === null) {
        break;
      }
      field += quoted.value;
      index = quoted.next;
      continue;
    }

    if (character !== "," && character !== "\n" && character !== "\r") {
      field += character;
      index += 1;
      continue;
    }

    const separator = readSeparator(text, index);
    row.push(field);
    field = "";
    index = separator.next;

    if (separator.endsRow) {
      rows.push(row);
      row = [];
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return toRecords(rows);
};

/** Un `Countries` vacio no es Colombia; uno con varios separa por `;`. */
const countriesOf = (value) => (value ?? "").split(";").map((code) => code.trim());

const isColombianLanguage = (row) => row["Level"] === "language" && countriesOf(row["Countries"]).includes(COLOMBIA);

/** Un numero de la fuente, o `null` cuando la fuente no lo trae. */
const coordinateOf = (value) => {
  if (value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * La version de Glottolog, leida de la cita bibliografica del dataset.
 *
 * No hay un archivo de version en el repositorio CLDF: la version viaja en
 * `dc:bibliographicCitation` («... 2025. Glottolog 5.2.1. Leipzig: ...») y, como
 * respaldo, en el titulo. Si ninguna de las dos la declara, el script falla: una
 * ficha sin version no se puede citar, y escribir "desconocida" convertiria un
 * dato faltante en un dato.
 */
const versionOf = (metadata) => {
  const citation = String(metadata["dc:bibliographicCitation"] ?? "");
  const fromCitation = citation.match(/Glottolog\s+(\d+(?:\.\d+)+)/);
  if (fromCitation?.[1] !== undefined) {
    return fromCitation[1];
  }

  const title = String(metadata["dc:title"] ?? "");
  const fromTitle = title.match(/Glottolog database\s+(\d+(?:\.\d+)+)/);
  return fromTitle?.[1] ?? null;
};

/** Compara por punto de codigo, no por `localeCompare`. */
const compareText = (left, right) => {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
};

const isRemote = (source) => /^https?:\/\//.test(source);

/** Lee un archivo de la fuente: disco si es una carpeta, red si es una URL. */
const readSourceFile = async (source, name) => {
  if (!isRemote(source)) {
    const path = join(resolve(source), name);
    try {
      return readFileSync(path, "utf8");
    } catch (error) {
      fail(`no se pudo leer ${name} en ${resolve(source)} (${error.code ?? error.message})`);
    }
  }

  const base = source.endsWith("/") ? source : `${source}/`;
  let response;
  try {
    response = await fetch(new URL(name, base));
  } catch (error) {
    fail(`no se pudo descargar ${name} desde ${base} (${error.message})`);
  }

  if (!response.ok) {
    fail(`no se pudo descargar ${name} desde ${base} (HTTP ${response.status})`);
  }

  return await response.text();
};

/** La URL que se declara en el JSON: la de Glottolog, o la carpeta del fixture. */
const sourceUrlOf = (source) =>
  isRemote(source)
    ? source.endsWith("/")
      ? source
      : `${source}/`
    : `${pathToFileURL(resolve(source)).href}/`;

const main = async () => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    process.stdout.write(`${USAGE}\n`);
    return;
  }

  // El CSV primero: si falta, el mensaje tiene que nombrar el archivo de datos y
  // no el de metadatos, que es el que se lee despues.
  const csv = await readSourceFile(options.source, "languages.csv");
  const metadataText = await readSourceFile(options.source, "cldf-metadata.json");

  let metadata;
  try {
    metadata = JSON.parse(metadataText);
  } catch (error) {
    fail(`cldf-metadata.json no es JSON valido (${error.message})`);
  }

  const version = versionOf(metadata);
  if (version === null) {
    fail(
      "la fuente no declara la version de Glottolog: cldf-metadata.json no la trae en " +
        "dc:bibliographicCitation ni en dc:title",
    );
  }

  const rows = parseCsv(csv);
  const byGlottocode = new Map(rows.map((row) => [row["Glottocode"] || row["ID"], row]));

  const languages = rows.filter(isColombianLanguage).map((row) => {
    const glottocode = row["Glottocode"] || row["ID"];
    const familyId = row["Family_ID"];
    let family = null;

    if (familyId !== "") {
      const familyRow = byGlottocode.get(familyId);
      if (familyRow === undefined) {
        fail(`la lengua ${glottocode} declara la familia ${familyId}, que no esta en languages.csv`);
      }
      family = familyRow["Name"];
    }

    const latitude = coordinateOf(row["Latitude"]);
    const longitude = coordinateOf(row["Longitude"]);

    const language = {
      glottocode,
      name: row["Name"],
      // `null` y no una cadena vacia: Glottolog deja Family_ID vacio en las
      // lenguas aisladas, y esa ausencia es un dato, no un hueco.
      family,
      iso639p3: row["ISO639P3code"] === "" ? null : row["ISO639P3code"],
    };

    // Sin coordenadas la entrada se publica igual y los campos NO se escriben:
    // un 0 o un centroide del pais serian coordenadas inventadas.
    if (latitude !== null && longitude !== null) {
      language.latitude = latitude;
      language.longitude = longitude;
    }

    language.glottologUrl = `https://glottolog.org/resource/languoid/id/${glottocode}`;
    return language;
  });

  if (languages.length === 0) {
    fail(`el filtro no encontro ninguna lengua de ${COLOMBIA}; la fuente cambio de formato?`);
  }

  // Orden por nombre y desempate por glottocode: el orden del CSV es el de un
  // volcado de base de datos y cambia entre versiones, asi que fijarlo es lo que
  // hace que dos corridas produzcan el mismo archivo.
  languages.sort(
    (left, right) =>
      compareText(left.name, right.name) || compareText(left.glottocode, right.glottocode),
  );

  const dataset = {
    glottologVersion: version,
    retrievedAt: options.retrievedAt ?? new Date().toISOString(),
    sourceUrl: sourceUrlOf(options.source),
    license: String(metadata["dc:license"] ?? ""),
    citation: String(metadata["dc:bibliographicCitation"] ?? ""),
    sha256: createHash("sha256").update(csv, "utf8").digest("hex"),
    languages,
  };

  mkdirSync(dirname(options.out), { recursive: true });
  const json = `${JSON.stringify(dataset, null, 2)}\n`;
  writeFileSync(options.out, json, "utf8");

  const located = languages.filter((language) => language.latitude !== undefined).length;
  process.stdout.write(
    `build-language-data: ${languages.length} lenguas de ${COLOMBIA} ` +
      `(${located} con coordenadas, ${languages.length - located} sin coordenadas) ` +
      `de Glottolog ${version} -> ${options.out} (${(Buffer.byteLength(json) / 1024).toFixed(1)} KB)\n`,
  );
};

await main();
