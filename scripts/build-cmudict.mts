/**
 * Empaqueta el diccionario de pronunciación CMUdict para el transcriptor de inglés.
 *
 * POR QUÉ EXISTE
 *
 * El inglés no se puede transcribir por reglas con la fiabilidad que pide una
 * herramienta de estudio: su ortografía no determina la pronunciación. El
 * transcriptor propio (`packages/core/src/g2p/english.ts`) consulta un
 * diccionario revisado, y este script lo deja en el formato que sirve el sitio.
 *
 * Qué hace:
 *   1. descarga `cmudict.dict` y su `LICENSE` de un commit FIJO del repositorio
 *      oficial (o los toma de `node_modules/.cache/cmudict/` si ya están);
 *   2. comprueba el `sha256` de ambos: si no coincide, no escribe nada;
 *   3. quita los comentarios (`# place, danish`), agrupa las variantes
 *      (`read`, `read(2)`) y escribe `palabra<TAB>pron1|pron2`, una por línea;
 *   4. copia la licencia (BSD: obliga a conservar el aviso de copyright) y
 *      escribe un README con la procedencia.
 *
 * La versión es la fecha del commit, porque CMUdict no publica versiones
 * numeradas. Debe coincidir con `src/config/engines.json`.
 *
 * Uso: node --experimental-strip-types --no-warnings scripts/build-cmudict.mts
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const COMMIT = "74790861f652b15e4ac49015a90074ad62a27690";
const VERSION = "2025.10.24";
const SOURCES = {
  "cmudict.dict": "81917843c7f44ce2b094ac63873c2c7a4cf802040792c455ba3ca406891c3d22",
  LICENSE: "bd4ce8e44170a5f9f481310ca85c51de3c4f851a65e679b40e603b143bd3542a",
} as const;

const CACHE = join(ROOT, "node_modules", ".cache", "cmudict");
const OUT = join(ROOT, "public", "cmudict", VERSION);
const sha256 = (data: Uint8Array): string => createHash("sha256").update(data).digest("hex");

const obtain = async (name: keyof typeof SOURCES): Promise<Buffer> => {
  const cached = join(CACHE, name);
  let data: Buffer;
  if (existsSync(cached)) {
    data = readFileSync(cached);
  } else {
    const url = `https://raw.githubusercontent.com/cmusphinx/cmudict/${COMMIT}/${name}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`build-cmudict: ${url} responde ${response.status}`);
    data = Buffer.from(await response.arrayBuffer());
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(cached, data);
  }
  const hash = sha256(data);
  if (hash !== SOURCES[name]) {
    throw new Error(`build-cmudict: ${name} tiene sha256 ${hash}, se esperaba ${SOURCES[name]}`);
  }
  return data;
};

const dictionary = (await obtain("cmudict.dict")).toString("utf8");
const license = await obtain("LICENSE");

/** palabra → pronunciaciones, en el orden del diccionario (la primera es la principal). */
const entries = new Map<string, string[]>();
for (const line of dictionary.split("\n")) {
  const clean = line.replace(/\s+#.*$/, "").trim();
  if (clean === "") continue;
  const space = clean.indexOf(" ");
  if (space < 0) throw new Error(`build-cmudict: línea sin pronunciación: «${line}»`);
  const word = clean.slice(0, space).replace(/\(\d+\)$/, "");
  const phones = clean.slice(space + 1).trim();
  if (!/^[A-Z]+[012]?( [A-Z]+[012]?)*$/.test(phones)) {
    throw new Error(`build-cmudict: pronunciación que no es ARPABET: «${line}»`);
  }
  const known = entries.get(word);
  if (known === undefined) entries.set(word, [phones]);
  else if (!known.includes(phones)) known.push(phones);
}

const tsv = `${[...entries].map(([word, phones]) => `${word}\t${phones.join("|")}`).join("\n")}\n`;

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "en-us.tsv"), tsv, { mode: 0o644 });
writeFileSync(join(OUT, "LICENSE"), license, { mode: 0o644 });
writeFileSync(
  join(OUT, "README.md"),
  `# cmudict ${VERSION}

Diccionario de pronunciación del inglés americano de Carnegie Mellon University (CMUdict), en el
formato que consulta el transcriptor de LinguaLab.

- **Fuente:** https://github.com/cmusphinx/cmudict, archivo \`cmudict.dict\`
- **Commit:** \`${COMMIT}\` (${VERSION.replaceAll(".", "-")})
- **sha256 del original:** \`${SOURCES["cmudict.dict"]}\`
- **sha256 de \`en-us.tsv\`:** \`${sha256(Buffer.from(tsv))}\`
- **Entradas:** ${entries.size} palabras
- **Licencia:** BSD de dos cláusulas, en \`LICENSE\` junto a este archivo

## Qué se cambió respecto al original

Solo el formato: se quitaron los comentarios de fin de línea y las variantes de una palabra
(\`palabra(2)\`) se agruparon en su línea: \`palabra<TAB>pronunciación 1|pronunciación 2\`. Las
pronunciaciones están en ARPABET, sin modificar. Lo genera \`scripts/build-cmudict.mts\`; no se edita
a mano.
`,
  { mode: 0o644 },
);

process.stdout.write(
  `build-cmudict: ${entries.size} palabras, ${(tsv.length / 1024 / 1024).toFixed(2)} MB en public/cmudict/${VERSION}/\n`,
);
