import { describe, expect, it } from "vitest";
import type { Result } from "../result";
import {
  anovaEffectsOf,
  cohensD,
  cohensDOneSample,
  cohensDPaired,
  cramersV,
  hedgesG,
  rankBiserial,
} from "./effects";
import { EFFECTS_REFERENCE, type EffectCase } from "./effects-reference";

const RUN: Readonly<Record<string, (c: EffectCase) => Result<number, unknown>>> = {
  cohens_d_pooled: (c) => cohensD(c.x ?? [], c.y ?? []),
  hedges_g_pooled: (c) => hedgesG(c.x ?? [], c.y ?? []),
  cohens_d_paired: (c) => cohensDPaired(c.x ?? [], c.y ?? []),
  cohens_d_one_sample: (c) => cohensDOneSample(c.x ?? [], c.mu),
  cramers_v_adjusted: (c) => cramersV(c.table ?? []),
  cramers_v_raw: (c) => cramersV(c.table ?? [], false),
  cramers_v_raw_2x2: (c) => cramersV(c.table ?? [], false),
  eta_squared: (c) => {
    const effects = anovaEffectsOf(c.groups ?? []);
    return effects.ok ? { ok: true, value: effects.value.etaSquared } : effects;
  },
  omega_squared: (c) => {
    const effects = anovaEffectsOf(c.groups ?? []);
    return effects.ok ? { ok: true, value: effects.value.omegaSquared } : effects;
  },
  rank_biserial: (c) => rankBiserial(c.x ?? [], c.y ?? []),
};

describe("effect sizes match R's effectsize", () => {
  for (const reference of EFFECTS_REFERENCE) {
    it(`${reference.name} = ${reference.value}`, () => {
      const run = RUN[reference.name];
      if (run === undefined) throw new Error(`no function for ${reference.name}`);
      const result = run(reference);
      if (!result.ok) throw new Error(`expected a value, got ${JSON.stringify(result.error)}`);
      expect(Math.abs(result.value / reference.value - 1)).toBeLessThanOrEqual(1e-10);
    });
  }
});

describe("effect size refusals", () => {
  it("names what is missing instead of returning NaN", () => {
    expect(cohensD([1], [2, 3])).toEqual({ ok: false, error: { code: "too-few", minimum: 2 } });
    expect(cohensD([1, 1], [1, 1])).toEqual({ ok: false, error: { code: "no-variation" } });
    expect(cohensDPaired([1, 2], [1])).toEqual({ ok: false, error: { code: "different-lengths" } });
  });
});
