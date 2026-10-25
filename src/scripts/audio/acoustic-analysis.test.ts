/**
 * Reglas de los parametros del panel acustico.
 *
 * AQUI SE PRUEBA LO QUE UN CAMPO NUMERICO PUEDE ROMPER
 *
 * El motor no valida nada: si el techo de F0 queda por debajo del piso, el
 * analisis devuelve un contorno vacio, y un contorno vacio se lee como «este
 * audio no tiene voz». Un rango imposible no puede llegar al worker. Lo mismo
 * con la frecuencia maxima de los formantes: por debajo de F3, el analisis
 * informa un formante que no existe.
 *
 * Los presets se prueban como invariantes y no como numeros exactos: lo que
 * tiene que cumplirse es que cada preset sea coherente consigo mismo, no que el
 * techo de la voz infantil sea 800 y no 900.
 */

import { describe, expect, it } from "vitest";
import { analysisParams, VOICE_PRESETS } from "./acoustic-analysis";

describe("analysisParams", () => {
  it("recorta el piso al rango en el que un analisis de voz tiene sentido", () => {
    expect(analysisParams({ floorHz: 5, ceilingHz: 600, maxFormantHz: 5500 }).floor).toBe(20);
    expect(analysisParams({ floorHz: 5000, ceilingHz: 600, maxFormantHz: 5500 }).floor).toBe(2000);
  });

  it("nunca deja el techo en el piso ni por debajo", () => {
    const params = analysisParams({ floorHz: 300, ceilingHz: 200, maxFormantHz: 5500 });

    // Un techo igual al piso haria que Praat no encuentre ningun candidato.
    expect(params.ceiling).toBeGreaterThan(params.floor);
  });

  it("recorta la frecuencia maxima de los formantes y el techo de F0", () => {
    const params = analysisParams({ floorHz: 75, ceilingHz: 99_000, maxFormantHz: 99_000 });

    expect(params.ceiling).toBe(3000);
    expect(params.maxFormantHz).toBe(12_000);
  });

  it("no toca un rango que ya es valido", () => {
    const params = analysisParams({ floorHz: 100, ceilingHz: 500, maxFormantHz: 5500 });

    expect(params).toEqual({ floor: 100, ceiling: 500, maxFormantHz: 5500 });
  });
});

describe("los presets de voz", () => {
  it("traen los tres tipos de voz que ofrece el panel", () => {
    expect(Object.keys(VOICE_PRESETS).sort()).toEqual(["child", "feminine", "masculine"]);
  });

  it("cada preset es coherente: piso menor que techo y formantes por encima del techo", () => {
    for (const [name, preset] of Object.entries(VOICE_PRESETS)) {
      expect(preset.floorHz, name).toBeLessThan(preset.ceilingHz);
      // F3 tiene que caber dentro del analisis de formantes.
      expect(preset.maxFormantHz, name).toBeGreaterThan(preset.ceilingHz);
    }
  });

  it("el preset infantil busca mas arriba que el femenino, y este que el masculino", () => {
    expect(VOICE_PRESETS.masculine?.ceilingHz).toBeLessThan(VOICE_PRESETS.feminine?.ceilingHz ?? 0);
    expect(VOICE_PRESETS.feminine?.ceilingHz).toBeLessThan(VOICE_PRESETS.child?.ceilingHz ?? 0);
  });
});
