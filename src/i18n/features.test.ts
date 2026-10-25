import { describe, expect, it } from "vitest";
import { en } from "./messages/en";
import { es } from "./messages/es";
import { acousticEn } from "./messages/features/acoustic.en";
import { acousticEs } from "./messages/features/acoustic.es";
import { elanEn } from "./messages/features/elan.en";
import { elanEs } from "./messages/features/elan.es";
import { experimentsEn } from "./messages/features/experiments.en";
import { experimentsEs } from "./messages/features/experiments.es";
import { languagesEn } from "./messages/features/languages.en";
import { languagesEs } from "./messages/features/languages.es";

/**
 * Los módulos de mensajes por herramienta, con su invariante.
 *
 * Cada herramienta nueva escribe su copia en su propio archivo para que dos
 * personas no choquen en las mismas líneas del diccionario central. El precio de
 * esa libertad es que el diccionario se arma con `...spread`, y un `spread` no
 * avisa de nada: una clave repetida gana la última en silencio, y una clave que
 * falta en un idioma se ve como un hueco en la página.
 *
 * Esta prueba paga ese precio: exige que cada módulo declare las mismas claves
 * en los dos idiomas, que no repita ninguna clave de otro módulo, que use su
 * prefijo, y que lo que publique el diccionario central sea exactamente la unión.
 */
const MODULES = [
  { name: "experiments", prefix: "exp.", es: experimentsEs, en: experimentsEn },
  { name: "elan", prefix: "elan.", es: elanEs, en: elanEn },
  { name: "languages", prefix: "map.", es: languagesEs, en: languagesEn },
  { name: "acoustic", prefix: "acoustic.", es: acousticEs, en: acousticEn },
] as const;

describe("los mensajes de cada herramienta", () => {
  for (const module of MODULES) {
    it(`${module.name} declara las mismas claves en español y en inglés`, () => {
      expect(Object.keys(module.es).sort()).toEqual(Object.keys(module.en).sort());
    });

    it(`${module.name} usa el prefijo "${module.prefix}"`, () => {
      for (const key of Object.keys(module.es)) {
        expect(key.startsWith(module.prefix)).toBe(true);
      }
    });

    it(`las claves de ${module.name} llegan al diccionario de los dos idiomas`, () => {
      for (const key of Object.keys(module.es)) {
        expect(es).toHaveProperty(key);
        expect(en).toHaveProperty(key);
      }
    });
  }

  it("ningún módulo repite una clave de otro", () => {
    const seen = new Map<string, string>();
    for (const module of MODULES) {
      for (const key of Object.keys(module.es)) {
        const owner = seen.get(key);
        expect(owner, `«${key}» está en ${owner} y en ${module.name}`).toBeUndefined();
        seen.set(key, module.name);
      }
    }
  });

  it("una clave de un módulo no pisa una del diccionario base", () => {
    const base = Object.keys(es).filter(
      (key) => !MODULES.some((module) => key in module.es),
    );
    const moduleKeys = MODULES.flatMap((module) => Object.keys(module.es));
    // La unión tiene que ser exactamente el diccionario menos las claves base:
    // si un módulo repitiera una clave base, esa clave contaría dos veces.
    expect(new Set([...base, ...moduleKeys]).size).toBe(Object.keys(es).length);
  });
});
