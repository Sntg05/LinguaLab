import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Los documentos de estado dicen lo mismo que sus fuentes.
 *
 * POR QUE ESTA PRUEBA EXISTE
 *
 * La auditoría del 2026-11-03 encontró los documentos contradiciéndose: el
 * traspaso decía que el análisis acústico no existía y que nada se había
 * fusionado, cuando las dos cosas ya eran falsas; PENDING listaba como abiertas
 * entradas cerradas y no nombraba la última; STATUS daba 117 e2e, PENDING 88, y
 * se medían 118. Nadie mentía: cada cifra fue cierta el día que se copió. El
 * arreglo no es copiar con más cuidado, sino no copiar, y esta prueba lo hace
 * cumplir.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");

/** El valor de `status:` en el encabezado YAML de un Markdown, o `undefined`. */
const frontMatterStatus = (text: string): string | undefined =>
  text.match(/^---\n[\s\S]*?^status:\s*(\S+)[\s\S]*?^---\n/m)?.[1];

describe("las cifras viven en docs/metrics.json", () => {
  // Los documentos de estado actual. PENDING y los documentos de PR guardan
  // mediciones con su fecha, como historia, y por eso no entran.
  const CURRENT_STATE_DOCS = ["README.md", "docs/STATUS.md", "odd/handoff/ACTUAL.md"];
  const COPIED_FIGURE =
    /\b\d[\d.,]*\s+(?:pruebas unitarias|pruebas de extremo a extremo|e2e\b|módulos|avisos de lint|avisos\b)/i;

  it("existe y se generó con el script", () => {
    const metrics = JSON.parse(read("docs/metrics.json")) as { version?: string; $comment?: string };
    expect(metrics.$comment).toContain("status:measure");
    expect(metrics.version).toBe((JSON.parse(read("package.json")) as { version: string }).version);
  });

  it.each(CURRENT_STATE_DOCS)("%s no copia cifras de la medición", (path) => {
    const copied = read(path)
      .split("\n")
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => COPIED_FIGURE.test(line))
      .map(({ line, index }) => `${path}:${index + 1}: ${line.trim().slice(0, 100)}`);
    expect(copied).toEqual([]);
  });
});

describe("docs/PENDING.md", () => {
  const pending = read("docs/PENDING.md");
  const entries = [...pending.matchAll(/^## (P\d+) —/gm)].map((match) => match[1] ?? "");
  const summary = new Map(
    [...pending.matchAll(/^\| (P\d+) \| [^|]+ \| ([^|]+) \|/gm)].map((match) => [
      match[1] ?? "",
      (match[2] ?? "").trim(),
    ]),
  );

  /** La raíz del estado, para que «cerrado» y «cerrada» digan lo mismo. */
  const stem = (state: string): string => state.toLowerCase().match(/^(cerrad|abiert|informativ)/)?.[1] ?? state;

  it("la tabla resumen nombra cada entrada del detalle, y nada más", () => {
    expect([...summary.keys()]).toEqual(entries);
  });

  it.each(entries)("%s dice lo mismo en la tabla y en su línea de estado", (id) => {
    const body = pending.slice(pending.indexOf(`## ${id} —`));
    const state = body.match(/^\*\*Estado:\s*([^.*]+)/m)?.[1] ?? "(sin línea **Estado:)";
    expect(stem(state)).toBe(stem(summary.get(id) ?? "(sin fila)"));
  });
});

describe("los documentos ODD y el traspaso", () => {
  const TASK_STATES = new Set(["active", "closed", "superseded", "reference"]);
  const tasks = readdirSync(join(ROOT, "odd", "tasks")).filter((file) => file.endsWith(".md"));

  it.each(tasks)("odd/tasks/%s declara un estado válido", (file) => {
    expect(TASK_STATES.has(frontMatterStatus(read(`odd/tasks/${file}`)) ?? "")).toBe(true);
  });

  it("hay a lo sumo un documento activo", () => {
    const active = tasks.filter((file) => frontMatterStatus(read(`odd/tasks/${file}`)) === "active");
    expect(active.length).toBeLessThanOrEqual(1);
  });

  it("el traspaso vigente existe y los anteriores están archivados", () => {
    expect(frontMatterStatus(read("odd/handoff/ACTUAL.md"))).toBe("current");
    const loose = readdirSync(join(ROOT, "odd", "handoff")).filter(
      (entry) => entry.endsWith(".md") && entry !== "ACTUAL.md",
    );
    expect(loose).toEqual([]);
    const archive = join(ROOT, "odd", "handoff", "archivo");
    for (const file of existsSync(archive) ? readdirSync(archive) : []) {
      expect(frontMatterStatus(read(`odd/handoff/archivo/${file}`))).toBe("archived");
    }
  });
});
