import { describe, expect, it } from "vitest";
import type { OrthographyTable } from "../domain/orthography-table";
import { convertLayer } from "../engine/convert-layer";
import {
  DEMO_TABLES,
  ENGLISH_DEMO,
  PORTUGUESE_DEMO,
  SPANISH_DEMO_DISTINCION,
  SPANISH_DEMO_YEISMO,
  WAYUU_DEMO,
} from "./demo-tables";
import { COMMUNITY_VALIDATION_NOTICE, INDIGENOUS_TEMPLATES } from "./indigenous-templates";

/**
 * Aplica las dos capas en el orden en que lo hace el caso de uso
 * `ConvertOrthographyToIpa`: la alofonica se calcula sobre la salida de la
 * fonemica, no sobre el texto escrito.
 *
 * Repetir ese orden aqui es lo que hace que la prueba hable del comportamiento
 * real de la herramienta y no de una comodidad de la prueba. Si algun dia el
 * caso de uso cambia de orden, esta prueba deja de describirlo y hay que
 * moverla con el.
 */
const convertTable = (table: OrthographyTable, text: string): string => {
  const phonemic = convertLayer(text, table.rules, {
    layer: "phonemic",
    casePolicy: "fold",
    classes: table.classes,
  });

  const allophonic = table.allophonic;
  if (allophonic === undefined || allophonic.length === 0) {
    return phonemic.output;
  }

  return convertLayer(phonemic.output, allophonic, {
    layer: "allophonic",
    casePolicy: "fold",
    classes: table.classes,
  }).output;
};

describe("DEMO_TABLES", () => {
  it("contiene las dos variantes de espanol, la de ingles y las dos nuevas", () => {
    expect(DEMO_TABLES).toHaveLength(5);
    expect(DEMO_TABLES).toContain(SPANISH_DEMO_YEISMO);
    expect(DEMO_TABLES).toContain(SPANISH_DEMO_DISTINCION);
    expect(DEMO_TABLES).toContain(ENGLISH_DEMO);
    expect(DEMO_TABLES).toContain(PORTUGUESE_DEMO);
    expect(DEMO_TABLES).toContain(WAYUU_DEMO);
  });

  it("las publica en el orden en que el editor las muestra", () => {
    expect(DEMO_TABLES.map((table) => table.id)).toEqual([
      "es-demo-yeismo",
      "es-demo-distincion",
      "en-demo",
      "pt-demo",
      "guc-demo",
    ]);
  });

  it("todas se rotulan como demo en las notas", () => {
    for (const table of DEMO_TABLES) {
      expect(table.notes ?? "").toMatch(/demo/i);
    }
  });

  it("las dos variantes de espanol solo se diferencian en el grafema ll", () => {
    const yeismo = SPANISH_DEMO_YEISMO.rules;
    const distincion = SPANISH_DEMO_DISTINCION.rules;

    expect(distincion).toHaveLength(yeismo.length);

    for (let index = 0; index < yeismo.length; index += 1) {
      const left = yeismo[index];
      const right = distincion[index];
      if (left === undefined || right === undefined) {
        continue;
      }
      if (left.grapheme === "ll") {
        continue;
      }
      expect(right).toEqual(left);
    }

    const llYeismo = yeismo.find((rule) => rule.grapheme === "ll");
    const llDistincion = distincion.find((rule) => rule.grapheme === "ll");
    expect(llYeismo?.ipa).toBe("\u029d");
    expect(llDistincion?.ipa).toBe("\u028e");
  });
});

describe("ENGLISH_DEMO", () => {
  it("transcribe un digrafo antes de la letra suelta", () => {
    const result = convertLayer("shop", ENGLISH_DEMO.rules, {
      layer: "phonemic",
      casePolicy: "fold",
      classes: ENGLISH_DEMO.classes,
    });

    expect(result.output).toBe("\u0283\u0251p");
  });
});

describe("PORTUGUESE_DEMO", () => {
  it("se identifica como portugues brasileno revisado y cita sus fuentes", () => {
    expect(PORTUGUESE_DEMO.id).toBe("pt-demo");
    expect(PORTUGUESE_DEMO.languageId).toBe("por");
    expect(PORTUGUESE_DEMO.status).toBe("reviewed");

    for (const source of ["Mateus", "PHOIBLE 2.0", "2207", "9781003266648-2"]) {
      expect(PORTUGUESE_DEMO.notes ?? "").toContain(source);
    }
  });

  it("transcribe el digrafo y eleva la -e final: chave", () => {
    // ch -> ʃ en la capa fonemica; a -> a; v -> v; y la -e final, que en
    // portugues brasileno se eleva a [i], en la capa alofonica. El valor
    // afirmado es el que devuelve el motor con las dos capas.
    expect(convertTable(PORTUGUESE_DEMO, "chave")).toBe("\u0283avi");
  });

  it("palataliza la coronal sonora ante [i], como lo declara su nota", () => {
    // dia -> [ˈdʒiɐ]: d -> dʒ ante i. Es la regla de realizacion que la tabla
    // declara y no una regla de grafia.
    expect(convertTable(PORTUGUESE_DEMO, "dia")).toBe("d\u0292ia");
  });

  it("vocaliza la -l final en la capa alofonica, con su aproximacion declarada", () => {
    // mal -> [ˈmaw]. La nota de la regla dice que el sur del Brasil conserva
    // [l]: la tabla transcribe la norma que generaliza, no todas las hablas.
    expect(convertTable(PORTUGUESE_DEMO, "mal")).toBe("maw");
  });
});

describe("WAYUU_DEMO", () => {
  it("nace en draft y lleva la advertencia de validacion comunitaria", () => {
    expect(WAYUU_DEMO.id).toBe("guc-demo");
    expect(WAYUU_DEMO.languageId).toBe("guc");
    expect(WAYUU_DEMO.status).toBe("draft");
    expect(WAYUU_DEMO.notes ?? "").toContain(COMMUNITY_VALIDATION_NOTICE);
  });

  it("transcribe el nombre de la lengua con la duracion vocalica de la fuente", () => {
    // w a j uu n a i k i. La uu es una vocal larga contrastiva, asi que el
    // motor devuelve "wajuːnaiki" y no "wajuunaiki": la diferencia con la
    // expectativa ingenua la produce la regla de duracion, no un defecto. El
    // valor afirmado es el observado al escribir la prueba.
    expect(convertTable(WAYUU_DEMO, "wayuunaiki")).toBe("waju\u02d0naiki");
  });

  it("cubre los grafemas que el espanol no tiene", () => {
    expect(convertTable(WAYUU_DEMO, "\u00fc\u00fc")).toBe("\u0268\u02d0");
    expect(convertTable(WAYUU_DEMO, "\uA78C")).toBe("\u0294");
    expect(convertTable(WAYUU_DEMO, "sh")).toBe("\u0283");
    expect(convertTable(WAYUU_DEMO, "j")).toBe("h");
    expect(convertTable(WAYUU_DEMO, "kk")).toBe("k\u02d0");
    expect(convertTable(WAYUU_DEMO, "r")).toBe("\u027e");
  });
});

describe("plantillas de lenguas indigenas", () => {
  it("siguen siendo cuatro, vacias y en draft: la demo no las relleno", () => {
    expect(INDIGENOUS_TEMPLATES).toHaveLength(4);

    for (const template of INDIGENOUS_TEMPLATES) {
      expect(template.rules).toHaveLength(0);
      expect(template.status).toBe("draft");
      expect(template.allophonic ?? []).toHaveLength(0);
      expect(template.notes ?? "").toContain(COMMUNITY_VALIDATION_NOTICE);
    }
  });

  it("la demo de wayuunaiki es un artefacto distinto de la plantilla guc", () => {
    const wayuuTemplates = INDIGENOUS_TEMPLATES.filter(
      (template) => template.languageId === WAYUU_DEMO.languageId,
    );

    expect(wayuuTemplates).toHaveLength(1);
    expect(wayuuTemplates[0]?.id).toBe("guc-template");
    expect(wayuuTemplates[0]?.rules).toHaveLength(0);
    expect(WAYUU_DEMO.id).not.toBe(wayuuTemplates[0]?.id);

    // Las plantillas no viajan con las demos: rellenar una demo no puede haber
    // convertido una plantilla vacia en una tabla con reglas por la puerta de
    // atras.
    for (const template of INDIGENOUS_TEMPLATES) {
      expect(DEMO_TABLES).not.toContain(template);
    }
  });
});
