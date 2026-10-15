import { describe, expect, it } from "vitest";
import { all, andThen, err, isErr, isOk, mapError, mapResult, ok, unwrapOr } from "./result";

describe("ok / err", () => {
  it("ok construye un resultado exitoso con el valor dentro", () => {
    const result = ok(41);

    expect(isOk(result)).toBe(true);
    expect(result).toEqual({ ok: true, value: 41 });
  });

  it("err construye un resultado fallido con el error dentro", () => {
    const result = err("boom");

    expect(isErr(result)).toBe(true);
    expect(result).toEqual({ ok: false, error: "boom" });
  });
});

describe("isOk / isErr", () => {
  it("distingue los dos lados de la union", () => {
    expect(isOk(ok(1))).toBe(true);
    expect(isOk(err("x"))).toBe(false);
    expect(isErr(ok(1))).toBe(false);
    expect(isErr(err("x"))).toBe(true);
  });
});

describe("mapResult", () => {
  it("transforma el valor cuando el resultado es exitoso", () => {
    expect(mapResult(ok(2), (n) => n * 10)).toEqual(ok(20));
  });

  it("deja pasar el error sin tocar cuando el resultado falla", () => {
    const apply = () => {
      throw new Error("no deberia ejecutarse");
    };

    expect(mapResult(err("fallo"), apply)).toEqual(err("fallo"));
  });
});

describe("mapError", () => {
  it("transforma el error cuando el resultado falla", () => {
    expect(mapError(err("fallo"), (e) => e.toUpperCase())).toEqual(err("FALLO"));
  });

  it("deja pasar el valor sin tocar cuando el resultado es exitoso", () => {
    const apply = () => {
      throw new Error("no deberia ejecutarse");
    };

    expect(mapError(ok(7), apply)).toEqual(ok(7));
  });
});

describe("andThen", () => {
  it("encadena otra operacion Result cuando el resultado es exitoso", () => {
    const half = (n: number) => (n % 2 === 0 ? ok(n / 2) : err("impar"));

    expect(andThen(ok(8), half)).toEqual(ok(4));
  });

  it("no encadena cuando el resultado falla y conserva el error original", () => {
    const apply = () => {
      throw new Error("no deberia ejecutarse");
    };

    expect(andThen(err("primero"), apply)).toEqual(err("primero"));
  });

  it("propaga el error nuevo si la operacion encadenada falla", () => {
    const half = (n: number) => (n % 2 === 0 ? ok(n / 2) : err("impar"));

    expect(andThen(ok(3), half)).toEqual(err("impar"));
  });
});

describe("unwrapOr", () => {
  it("devuelve el valor cuando el resultado es exitoso", () => {
    expect(unwrapOr(ok("valor"), "respaldo")).toBe("valor");
  });

  it("devuelve el respaldo cuando el resultado falla", () => {
    expect(unwrapOr(err("fallo"), "respaldo")).toBe("respaldo");
  });
});

describe("all", () => {
  it("sobre una lista vacia es exitoso con una lista vacia", () => {
    expect(all([])).toEqual(ok([]));
  });

  it("sobre una lista de exitosos acumula los valores en orden", () => {
    expect(all([ok(1), ok(2), ok(3)])).toEqual(ok([1, 2, 3]));
  });

  it("acumula todos los errores, no solo el primero", () => {
    const result = all([ok(1), err("a"), err("b"), ok(4)]);

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toEqual(["a", "b"]);
    }
  });
});
