import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../result";
import { SPANISH_DEMO_YEISMO } from "./demo-tables";
import { orthographyTableFromJson, orthographyTableToJson } from "./table-json";

describe("formato JSON compartido de una tabla", () => {
  it("hace un viaje de ida y vuelta sin perder nada", () => {
    const restored = orthographyTableFromJson(orthographyTableToJson(SPANISH_DEMO_YEISMO));

    expect(isOk(restored)).toBe(true);
    if (isOk(restored)) {
      expect(restored.value).toEqual(SPANISH_DEMO_YEISMO);
    }
  });

  it("distingue el texto ilegible del objeto mal formado", () => {
    const unparseable = orthographyTableFromJson("{ esto no es json");
    const wrongShape = orthographyTableFromJson(JSON.stringify({ id: "x", name: "sin reglas" }));

    expect(isErr(unparseable)).toBe(true);
    if (isErr(unparseable)) {
      expect(unparseable.error.code).toBe("invalid-json");
    }
    expect(isErr(wrongShape)).toBe(true);
    if (isErr(wrongShape)) {
      expect(wrongShape.error.code).toBe("invalid-table");
      expect(wrongShape.error.detail.length).toBeGreaterThan(0);
    }
  });
});
