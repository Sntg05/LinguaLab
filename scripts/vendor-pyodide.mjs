#!/usr/bin/env node
/**
 * Copia Pyodide y los wheels del conversor ELAN a `public/pyodide/`.
 *
 * POR QUE SE VENDOREA EN VEZ DE PEDIRLO A UN CDN
 *
 * La CSP del sitio es `default-src 'self'`: un `import()` contra
 * `cdn.jsdelivr.net` lo bloquea el navegador, y con razon. Pero ademas la
 * promesa de la herramienta es que el archivo de campo no sale del navegador y
 * que la pagina funciona sin conexion despues de la primera carga. Servir el
 * motor desde el mismo origen es lo que hace cierta esa promesa; el porque
 * completo, con su costo, esta en `docs/adr/0007-distribucion-de-pyodide.md`.
 *
 * POR QUE UN SCRIPT Y NO UN `postinstall`
 *
 * Esto necesita red y 13 MB de escritura, y el build del sitio no debe depender
 * de ninguna de las dos: los archivos quedan versionados en `public/pyodide/` y
 * este script solo se ejecuta cuando alguien decide subir de version. Tampoco
 * es un paso de CI: si los archivos ya estan y los hashes coinciden, el script
 * no descarga nada y termina diciendolo.
 *
 * QUE HACE EXACTAMENTE
 *
 * 1. Comprueba que la version instalada de `pyodide` en `node_modules` es la
 *    version fijada aqui. Si no coincide, aborta: mezclar el `pyodide.mjs` de
 *    una version con el `pyodide.asm.wasm` de otra produce errores que no
 *    dicen cual es el archivo culpable.
 * 2. Copia los cinco archivos que `loadPyodide` pide en tiempo de ejecucion.
 * 3. Descarga el wheel de `micropip` desde el release de Pyodide y comprueba
 *    su sha256 contra el que declara `pyodide-lock.json`; descarga el wheel de
 *    `pympi-ling` desde PyPI y lo comprueba contra el sha256 fijado aqui.
 * 4. Escribe `public/pyodide/README.md` con el tamano y el sha256 REALES de
 *    cada archivo. Un README escrito a mano se queda viejo en la primera
 *    actualizacion y entonces miente; por eso lo genera este script.
 *
 * Uso: `node scripts/vendor-pyodide.mjs` (agrega `--check` para verificar sin
 * escribir nada, que es lo que conviene correr antes de un PR).
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PYODIDE_NPM_DIR = join(ROOT, "node_modules", "pyodide");
const DEST = join(ROOT, "public", "pyodide");
const WHEELS_DIR = join(DEST, "wheels");

/** Versiones fijadas. Subir cualquiera de las dos exige regenerar los hashes. */
const PYODIDE_VERSION = "314.0.7";
const PYMPI_VERSION = "1.71";

/**
 * Los cinco archivos que `loadPyodide` busca bajo `indexURL`.
 *
 * `pyodide.asm.js` no aparece porque esta version de Pyodide ya no lo publica:
 * el motor Emscripten se llama `pyodide.asm.mjs`. Copiar un archivo que no
 * existe fallaria aqui, que es justo lo que se quiere.
 */
const RUNTIME_FILES = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

/** Base publica del release de Pyodide, de donde sale el wheel de micropip. */
const PYODIDE_RELEASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

/**
 * Wheel de pympi-ling: Python puro, sin dependencias de ejecucion, licencia MIT.
 * La URL y el sha256 son los que publica PyPI para 1.71; si PyPI reemplazara el
 * archivo, la comprobacion falla en vez de instalar otra cosa.
 */
const PYMPI_WHEEL = {
  fileName: "pympi_ling-1.71-py3-none-any.whl",
  url: "https://files.pythonhosted.org/packages/6f/64/3731b9770449857b51a17c269893b02e1e6a502bfafea5fca19ec1ab0600/pympi_ling-1.71-py3-none-any.whl",
  sha256: "f89043d275946d9fe04c09cd5a5fbcff1e42b4160c91c8aa246e5e8136e305ab",
};

const CHECK_ONLY = process.argv.includes("--check");

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const humanBytes = (bytes) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(bytes / 1024).toFixed(1)} kB`;

/** Falla con un mensaje que dice que hacer, no solo que algo salio mal. */
function fail(message) {
  console.error(`vendor-pyodide: ${message}`);
  process.exit(1);
}

function readInstalledVersion() {
  const manifestPath = join(PYODIDE_NPM_DIR, "package.json");
  if (!existsSync(manifestPath)) {
    fail(
      `no esta instalado pyodide@${PYODIDE_VERSION}. Ejecuta \`npm install\` antes de vendorizar.`,
    );
  }
  return JSON.parse(readFileSync(manifestPath, "utf8")).version;
}

async function download(url) {
  const response = await fetch(url);
  if (!response.ok) {
    fail(`no se pudo descargar ${url}: HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/** Copia (o descarga) un archivo y devuelve su ficha para el README. */
async function place({ path, bytes, origin, licence, expectedSha }) {
  if (bytes !== undefined) {
    const actual = sha256(bytes);
    if (expectedSha !== undefined && actual !== expectedSha) {
      fail(
        `${path}: el sha256 no coincide con el esperado.\n  esperado: ${expectedSha}\n  obtenido: ${actual}`,
      );
    }
    if (!CHECK_ONLY) {
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, bytes);
    }
    return { file: path, bytes: bytes.length, sha256: actual, origin, licence };
  }

  if (!existsSync(path)) {
    fail(`falta ${path} y no hay de donde descargarlo: revisa la lista de archivos.`);
  }
  const content = readFileSync(path);
  return {
    file: path,
    bytes: content.length,
    sha256: sha256(content),
    origin,
    licence,
  };
}

function writeReadme(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const relative = (path) => path.slice(DEST.length + 1).split("\\").join("/");

  const rows = entries
    .map(
      (entry) =>
        `| \`${relative(entry.file)}\` | ${entry.bytes.toLocaleString("es-CO")} (${humanBytes(entry.bytes)}) | \`${entry.sha256}\` | ${entry.origin} | ${entry.licence} |`,
    )
    .join("\n");

  const text = `# Pyodide vendorizado

Este directorio lo genera \`node scripts/vendor-pyodide.mjs\`. No lo edites a
mano: el proximo \`--check\` lo sobrescribe y, peor, los hashes dejarian de
corresponder a los archivos.

## Por que esta aqui

La CSP del sitio es \`default-src 'self'\` y la herramienta promete que el
archivo de campo no sale del navegador. Un motor cargado desde
\`cdn.jsdelivr.net\` rompe las dos cosas. La decision completa, con su costo,
esta en \`docs/adr/0007-distribucion-de-pyodide.md\`.

## Que se sirve

- \`indexURL\` = \`/pyodide/\`: los cinco archivos de la tabla, menos los wheels.
- \`packageBaseUrl\` = \`/pyodide/wheels/\`: de ahi salen los wheels, tanto el de
  \`micropip\` (que Pyodide instala con \`loadPackage\`) como el de \`pympi-ling\`
  (que \`micropip\` instala desde su URL).

## Contenido, version y hash

Pyodide **${PYODIDE_VERSION}** (MPL-2.0) y pympi-ling **${PYMPI_VERSION}** (MIT).

| Archivo | Bytes | sha256 | Origen | Licencia |
| --- | --- | --- | --- | --- |
${rows}

Total: **${total.toLocaleString("es-CO")} bytes (${humanBytes(total)})**.

Los cinco primeros archivos salen del paquete npm \`pyodide@${PYODIDE_VERSION}\`
(\`https://www.npmjs.com/package/pyodide\`, espejo del release oficial en
\`https://github.com/pyodide/pyodide/releases\`). El wheel de \`micropip\` sale de
\`${PYODIDE_RELEASE_URL}\` y su sha256 es el que declara
\`pyodide-lock.json\`. El de \`pympi-ling\` sale de PyPI
(\`https://pypi.org/project/pympi-ling/${PYMPI_VERSION}/\`).

## Como se actualiza

1. Cambia la version en \`package.json\` (\`pyodide\`) y en
   \`scripts/vendor-pyodide.mjs\` (\`PYODIDE_VERSION\`), y \`npm install\`.
2. Cambia \`PYMPI_VERSION\`, la URL y el sha256 de \`PYMPI_WHEEL\` si hay una
   version nueva en PyPI. El sha256 se copia del JSON de PyPI
   (\`https://pypi.org/pypi/pympi-ling/<version>/json\`, campo
   \`digests.sha256\`), nunca de un archivo ya descargado.
3. \`node scripts/vendor-pyodide.mjs\` y luego
   \`node scripts/vendor-pyodide.mjs --check\` en el mismo commit.
4. Corre \`npx vitest run packages/adapters/src/elan/\`: la prueba de humo carga
   este Pyodide de verdad, instala el wheel y lee un \`.eaf\`. Si algo se rompio,
   se rompe ahi y no en el navegador de quien convierte.

## Licencias

- Pyodide: Mozilla Public License 2.0. El texto completo esta en
  \`https://github.com/pyodide/pyodide/blob/main/LICENSE\`.
- pympi-ling: MIT, copyright (c) 2015 Mart Lubbers.
`;

  const readmePath = join(DEST, "README.md");
  if (CHECK_ONLY) {
    if (!existsSync(readmePath)) {
      fail("falta public/pyodide/README.md; corre el script sin --check.");
    }
    if (readFileSync(readmePath, "utf8") !== text) {
      fail("public/pyodide/README.md no coincide con los archivos: regenera con el script.");
    }
    return;
  }
  writeFileSync(readmePath, text);
}

/** Copia los archivos del motor desde el paquete npm. */
async function vendorRuntimeFiles() {
  const entries = [];
  for (const name of RUNTIME_FILES) {
    const source = join(PYODIDE_NPM_DIR, name);
    if (!existsSync(source)) {
      fail(`pyodide@${PYODIDE_VERSION} no trae ${name}; revisa RUNTIME_FILES.`);
    }
    const target = join(DEST, name);
    if (!CHECK_ONLY) {
      mkdirSync(DEST, { recursive: true });
      copyFileSync(source, target);
    }
    entries.push(
      await place({
        path: target,
        origin: `paquete npm pyodide@${PYODIDE_VERSION}`,
        licence: "MPL-2.0",
      }),
    );
  }
  return entries;
}

/** Descarga (o reutiliza) un wheel, comprobando su sha256 antes de escribirlo. */
async function vendorWheel({ path, url, sha256: expectedSha, licence }) {
  const current = existsSync(path) ? sha256(readFileSync(path)) : null;
  const bytes = current === expectedSha ? undefined : await download(url);
  return place({ path, bytes, origin: url, licence, expectedSha });
}

async function main() {
  const installed = readInstalledVersion();
  if (installed !== PYODIDE_VERSION) {
    fail(
      `node_modules/pyodide es ${installed} y este script fija ${PYODIDE_VERSION}. Actualiza ambos o ninguno.`,
    );
  }

  const lock = JSON.parse(readFileSync(join(PYODIDE_NPM_DIR, "pyodide-lock.json"), "utf8"));
  const micropip = lock.packages?.micropip;
  if (!micropip?.file_name || !micropip?.sha256) {
    fail("pyodide-lock.json no declara el paquete micropip con su sha256.");
  }

  const entries = [
    ...(await vendorRuntimeFiles()),

    // La version y el hash del wheel de micropip los manda el lock de Pyodide:
    // si el lock cambia, el archivo servido cambia con el.
    await vendorWheel({
      path: join(WHEELS_DIR, micropip.file_name),
      url: `${PYODIDE_RELEASE_URL}${micropip.file_name}`,
      sha256: micropip.sha256,
      licence: "MPL-2.0",
    }),

    // El wheel de pympi-ling: version y hash fijados en este script.
    await vendorWheel({
      path: join(WHEELS_DIR, PYMPI_WHEEL.fileName),
      url: PYMPI_WHEEL.url,
      sha256: PYMPI_WHEEL.sha256,
      licence: "MIT",
    }),
  ];

  writeReadme(entries);

  // Un archivo de mas en el directorio es un archivo que nadie actualiza y que
  // se sirve igual: se avisa en vez de dejarlo pasar en silencio.
  const expected = new Set([...RUNTIME_FILES, "README.md", "wheels"]);
  for (const entry of readdirSync(DEST)) {
    if (!expected.has(entry)) {
      console.warn(`vendor-pyodide: sobra public/pyodide/${entry}; no lo sirve nada.`);
    }
  }

  const total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  const missing = entries.filter((entry) => !existsSync(entry.file)).length;
  console.log(
    `${CHECK_ONLY ? "verificado" : "vendorizado"}: ${entries.length} archivos, ` +
      `${total} bytes (${humanBytes(total)}) en public/pyodide/` +
      (missing > 0 ? ` (${missing} sin escribir: --check no escribe)` : ""),
  );
  for (const entry of entries) {
    const size = existsSync(entry.file) ? statSync(entry.file).size : entry.bytes;
    console.log(`  ${entry.file.slice(DEST.length + 1)}  ${humanBytes(size)}  ${entry.sha256}`);
  }
}

await main();
