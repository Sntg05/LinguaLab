import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Lo que el sitio promete tiene que ser cierto en el sitio publicado.
 *
 * POR QUÉ ESTA PRUEBA EXISTE
 *
 * `/seguridad` decía «Abrir esta página sin conexión sigue funcionando» y la
 * ficha del conversor ELAN decía «funciona sin conexión después de la primera
 * carga». Medido en el sitio publicado el 2026-11-03: no hay service worker, y
 * con la red cortada recargar o navegar falla con `ERR_INTERNET_DISCONNECTED`.
 * Los motores pesados, además, se sirven con `max-age=0, must-revalidate`, así
 * que la caché HTTP tampoco los entrega sin red.
 *
 * Lo que SÍ es cierto —una pestaña ya abierta sigue calculando sin red, porque
 * todo corre en el navegador— se puede decir. Lo que no se puede es prometer
 * abrir, recargar o volver a una página sin conexión mientras no exista el
 * mecanismo que lo cumple. El día que exista un service worker, esta prueba deja
 * de exigirlo y tiene que reescribirse con una e2e que corte la red y recargue.
 */
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

const walk = (dir: string, found: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (/\.(astro|ts|json)$/.test(entry) && !/\.test\.ts$/.test(entry)) found.push(full);
  }
  return found;
};

/**
 * Promesas de abrir o seguir usando el sitio sin red. Se buscan en texto
 * visible y en comentarios por igual: un comentario que la repite es el que
 * después se copia a la interfaz.
 */
const OFFLINE_PROMISE =
  /(funcionan?|sigue funcionando|abrir[^.]{0,40})[^.]{0,60}sin conexi[oó]n|(works?|keeps working)[^.]{0,40}offline/i;

const hasServiceWorker = (): boolean =>
  ["public/sw.js", "public/service-worker.js", "src/sw.ts"].some((path) => existsSync(join(ROOT, path)));

describe("las promesas del sitio", () => {
  it("no promete funcionar sin conexión mientras no haya un service worker", () => {
    if (hasServiceWorker()) return;

    const offenders = walk(join(ROOT, "src")).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => OFFLINE_PROMISE.test(line))
        .map(({ line, index }) => `${relative(ROOT, file)}:${index + 1}: ${line.trim().slice(0, 120)}`),
    );

    expect(offenders).toEqual([]);
  });
});

/**
 * La variedad de español que cada herramienta dice usar es la que usa.
 *
 * El fonemizador decía «español de Castilla» mientras el adaptador elegía la voz
 * `es-419`, latinoamericana con seseo: `zapato` sale con /s/, no con /θ/. Y el
 * transcriptor de FonoLab aplica distinción (`z` → /θ/) con un comentario que
 * decía «seseo is noted in the UI», cuando la interfaz no lo anotaba. Las dos
 * cosas se leían como la misma lengua y daban resultados distintos.
 */
describe("la variedad de español declarada", () => {
  const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");

  it("el fonemizador nombra la variedad de la voz que configura su adaptador", () => {
    const voices = read("packages/adapters/src/phonemizer/espeak-voices.ts");
    expect(voices).toMatch(/spa:\s*"es-419"/);

    const es = read("src/i18n/messages/es.ts").match(/"phon\.limits":\s*"([^"]+)"/)?.[1] ?? "";
    const en = read("src/i18n/messages/en.ts").match(/"phon\.limits":\s*"([^"]+)"/)?.[1] ?? "";
    expect(es).toMatch(/latinoamericano/i);
    expect(es).not.toMatch(/Castilla/);
    expect(en).toMatch(/Latin American/);
    expect(en).not.toMatch(/Castilian/);
  });

  it("FonoLab anuncia en su interfaz que su transcriptor usa distinción", () => {
    const rules = read("src/scripts/fono/phonetics.ts");
    expect(rules).toMatch(/\[\/z\/g, "θ"\]/);

    const page = read("src/components/FonoLab.astro");
    expect(page).toMatch(/Usa distinción[^"]*seseo/);
    expect(page).toMatch(/It uses distinción[^"]*seseo/);
  });
});
