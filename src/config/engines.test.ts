import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ENGINE_DIRS, ENGINE_VERSIONS, type EngineName } from "./engines";

/**
 * La version de cada motor es una sola, y coincide en todos los lugares.
 *
 * `vercel.json` sirve `/pyodide/*`, `/espeak-phonemizer/*` y `/praatfan/*` como
 * inmutables durante un año. Eso solo es seguro si una version nueva vive en
 * una ruta nueva; si alguien actualizara un motor dentro de la misma carpeta,
 * los navegadores seguirian usando el viejo sin enterarse. Estas pruebas hacen
 * imposible ese descuido.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");
type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
/** Lo que declara un package.json, sin importar si es dependencia o de desarrollo. */
const declared = (path: string, name: string): string | undefined => {
  const manifest = JSON.parse(read(path)) as Manifest;
  return manifest.dependencies?.[name] ?? manifest.devDependencies?.[name];
};
const engines = Object.keys(ENGINE_DIRS) as EngineName[];

describe("las versiones de los motores", () => {
  it("coinciden con las dependencias instaladas y con la procedencia de praatfan", () => {
    expect(ENGINE_VERSIONS.pyodide).toBe(declared("package.json", "pyodide"));
    expect(ENGINE_VERSIONS.espeakPhonemizer).toBe(
      declared("packages/adapters/package.json", "espeak-phonemizer"),
    );
    const provenance = read(`public/praatfan/${ENGINE_VERSIONS.praatfan}/PROVENANCE.txt`);
    expect(provenance.split("\n")[0]).toContain(`praatfan-gpl ${ENGINE_VERSIONS.praatfan}`);
  });

  it.each(engines)("%s vive solo dentro de la carpeta de su version", (engine) => {
    const entries = readdirSync(join(ROOT, "public", ENGINE_DIRS[engine]));
    expect(entries).toEqual([ENGINE_VERSIONS[engine]]);
  });

  it.each(engines)("%s no publica archivos ejecutables", (engine) => {
    // `espeak-ng.wasm` y `pyodide.asm.wasm` llegaban con permiso de ejecucion
    // copiado de node_modules: un archivo servido no tiene por que serlo.
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const full = join(dir, entry);
        return statSync(full).isDirectory() ? walk(full) : [full];
      });
    const executable = walk(join(ROOT, "public", ENGINE_DIRS[engine]))
      .filter((file) => (statSync(file).mode & 0o111) !== 0)
      .map((file) => file.slice(ROOT.length));
    expect(executable).toEqual([]);
  });

  it.each(engines)("vercel.json declara inmutable la carpeta de %s", (engine) => {
    const config = JSON.parse(read("vercel.json")) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const rule = config.headers.find((entry) => entry.source === `/${ENGINE_DIRS[engine]}/(.*)`);
    const cache = rule?.headers.find((header) => header.key === "Cache-Control")?.value;
    expect(cache).toBe("public, max-age=31536000, immutable");
  });
});
