/**
 * Pruebas de `scripts/build-language-data.mjs`, la generacion del mapa de lenguas.
 *
 * POR QUE SE EJECUTA EL SCRIPT EN VEZ DE IMPORTAR SUS FUNCIONES
 *
 * El contrato que importa es el del comando que alguien corre a mano: que lea
 * una fuente CLDF, que escriba el JSON versionado y que falle ruidosamente
 * cuando la fuente no declara lo que el script necesita. Importar una funcion
 * interna probaria una pieza que solo existe para que el comando funcione, y
 * dejaria sin cubrir justo la parte que se rompe en silencio: el archivo que se
 * escribe en disco.
 *
 * El script es `.mjs` y este repositorio compila `src/**` con `allowJs: false`,
 * asi que un `import` desde TypeScript no tendria tipos. Ejecutarlo como proceso
 * resuelve las dos cosas a la vez.
 *
 * La fuente es un fixture CLDF de nueve filas copiadas del dataset real: trae
 * una familia, dos lenguas de Colombia con coordenadas, una sin coordenadas y
 * sin codigo ISO, una aislada, un dialecto de Colombia y una lengua de otro
 * pais. Con eso se puede comprobar el filtro sin descargar 2,5 MB.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const SCRIPT = join(ROOT, "scripts/build-language-data.mjs");
const FIXTURE = join(ROOT, "scripts/fixtures/cldf");
const FIXTURE_WITHOUT_VERSION = join(ROOT, "scripts/fixtures/cldf-sin-version");

/** Fecha fija: la salida tiene que ser reproducible byte a byte. */
const RETRIEVED_AT = "2026-10-25T12:00:00.000Z";

const scratch = mkdtempSync(join(tmpdir(), "lingualab-languages-"));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

interface GeneratedLanguage {
  readonly glottocode: string;
  readonly name: string;
  readonly family: string | null;
  readonly iso639p3: string | null;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly glottologUrl: string;
}

interface GeneratedDataset {
  readonly glottologVersion: string;
  readonly retrievedAt: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly citation: string;
  readonly sha256: string;
  readonly languages: readonly GeneratedLanguage[];
}

/** Run the script against a fixture and return the file it wrote. */
const generate = (name: string, source = FIXTURE): { out: string; raw: string } => {
  const out = join(scratch, `${name}.json`);
  const result = spawnSync(
    process.execPath,
    [SCRIPT, "--source", source, "--out", out, "--retrieved-at", RETRIEVED_AT],
    { cwd: ROOT, encoding: "utf8" },
  );

  expect(result.stderr, "el script deberia terminar sin errores").toBe("");
  expect(result.status).toBe(0);
  return { out, raw: readFileSync(out, "utf8") };
};

const parse = (raw: string): GeneratedDataset => JSON.parse(raw) as GeneratedDataset;

describe("build-language-data: el filtro de Colombia", () => {
  const { raw } = generate("filtro");
  const dataset = parse(raw);
  const codes = dataset.languages.map((language) => language.glottocode);

  it("deja solo las lenguas cuyo pais incluye Colombia", () => {
    expect(codes).toEqual(["ando1256", "mali1242", "paez1247", "wayu1243"]);
  });

  it("descarta las familias y los dialectos, que viven en el mismo archivo", () => {
    // languages.csv es la tabla de languoides: ademas de lenguas trae familias
    // (sin coordenadas y con Level=family) y dialectos, que comparten el pais.
    for (const excluded of ["araw1281", "tuca1253", "uncl1493", "taiw1247"]) {
      expect(codes, `${excluded} no es una lengua`).not.toContain(excluded);
    }
  });

  it("no se queda con una lengua de otro pais por coincidencia de letras", () => {
    expect(codes).not.toContain("stan1295");
  });

  it("ordena por nombre para que dos corridas no dependan del orden del CSV", () => {
    expect(dataset.languages.map((language) => language.name)).toEqual([
      "Andoque",
      "Malibu",
      "Páez",
      "Wayuu",
    ]);
  });
});

describe("build-language-data: familias e identificadores", () => {
  const dataset = parse(generate("familias").raw);
  const byCode = (code: string): GeneratedLanguage => {
    const found = dataset.languages.find((language) => language.glottocode === code);
    if (found === undefined) {
      throw new Error(`falta ${code} en la salida`);
    }
    return found;
  };

  it("resuelve el nombre de la familia a partir de su glottocode", () => {
    expect(byCode("wayu1243").family).toBe("Arawakan");
    expect(byCode("mali1242").family).toBe("Unclassifiable");
  });

  it("deja sin familia a una lengua aislada en vez de inventarle una", () => {
    expect(byCode("ando1256").family).toBeNull();
    expect(byCode("paez1247").family).toBeNull();
  });

  it("conserva el codigo ISO cuando existe y declara su ausencia cuando no", () => {
    expect(byCode("wayu1243").iso639p3).toBe("guc");
    expect(byCode("mali1242").iso639p3).toBeNull();
  });

  it("arma la ficha de Glottolog a partir del glottocode", () => {
    expect(byCode("wayu1243").glottologUrl).toBe(
      "https://glottolog.org/resource/languoid/id/wayu1243",
    );
  });
});

describe("build-language-data: coordenadas", () => {
  const dataset = parse(generate("coordenadas").raw);
  const byCode = (code: string): GeneratedLanguage =>
    dataset.languages.find((language) => language.glottocode === code) as GeneratedLanguage;

  it("copia latitud y longitud de la fuente cuando la lengua las tiene", () => {
    expect(byCode("wayu1243").latitude).toBeCloseTo(11.395566, 6);
    expect(byCode("wayu1243").longitude).toBeCloseTo(-72.199791, 6);
  });

  it("no inventa coordenadas: la lengua queda con los campos ausentes", () => {
    const malibu = byCode("mali1242");
    expect(malibu).not.toHaveProperty("latitude");
    expect(malibu).not.toHaveProperty("longitude");
  });
});

describe("build-language-data: procedencia", () => {
  const { raw } = generate("procedencia");
  const dataset = parse(raw);
  const csv = readFileSync(join(FIXTURE, "languages.csv"));

  it("declara la version de Glottolog que se uso", () => {
    expect(dataset.glottologVersion).toBe("5.2.1");
    expect(dataset.citation).toContain("Glottolog 5.2.1");
    expect(dataset.license).toContain("creativecommons.org/licenses/by/4.0");
  });

  it("declara la fecha de recuperacion que recibio, sin inventar la propia", () => {
    expect(dataset.retrievedAt).toBe(RETRIEVED_AT);
  });

  it("declara la URL de origen y el sha256 del CSV que se leyo", () => {
    expect(dataset.sourceUrl.startsWith("file:")).toBe(true);
    expect(dataset.sha256).toBe(createHash("sha256").update(csv).digest("hex"));
  });
});

describe("build-language-data: determinismo", () => {
  it("dos corridas con la misma fuente escriben el mismo archivo", () => {
    const first = generate("determinismo-1");
    const second = generate("determinismo-2");

    expect(first.raw).toBe(second.raw);
  });

  it("el JSON generado termina en salto de linea y se indenta con dos espacios", () => {
    const { raw } = generate("formato");

    expect(raw.endsWith("}\n")).toBe(true);
    expect(raw.split("\n")[1]?.startsWith('  "')).toBe(true);
  });
});

describe("build-language-data: fuentes incompletas", () => {
  it("falla cuando la fuente no declara su version, en vez de escribir 'desconocida'", () => {
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        "--source",
        FIXTURE_WITHOUT_VERSION,
        "--out",
        join(scratch, "sin-version.json"),
        "--retrieved-at",
        RETRIEVED_AT,
      ],
      { cwd: ROOT, encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("version");
  });

  it("falla cuando falta el CSV de lenguas, nombrando el archivo", () => {
    const result = spawnSync(
      process.execPath,
      [
        SCRIPT,
        "--source",
        join(ROOT, "scripts/fixtures"),
        "--out",
        join(scratch, "sin-csv.json"),
        "--retrieved-at",
        RETRIEVED_AT,
      ],
      { cwd: ROOT, encoding: "utf8" },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("languages.csv");
  });
});
