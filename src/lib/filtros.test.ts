import { describe, expect, it } from "vitest";
import { fechaDesde, leerFiltros, POR_DEFECTO, urlCon } from "./filtros";

const NICHOS = ["desarrollo-personal", "negocios"];

describe("leerFiltros", () => {
  it("sin parámetros usa los valores por defecto", () =>
    expect(leerFiltros({}, NICHOS)).toEqual(POR_DEFECTO));

  it("acepta valores válidos", () =>
    expect(
      leerFiltros(
        { nicho: "negocios", formato: "short", piso: "10", dias: "0", tamano: "1m+" },
        NICHOS,
      ),
    ).toEqual({ nicho: "negocios", formato: "short", piso: 10, dias: 0, tamano: "1m+" }));

  it("descarta valores desconocidos", () =>
    expect(
      leerFiltros({ nicho: "x", formato: "x", piso: "4", dias: "abc", tamano: "x" }, NICHOS),
    ).toEqual(POR_DEFECTO));

  it("piso 0 es válido; vacío equivale a ausente", () => {
    expect(leerFiltros({ piso: "0" }, NICHOS).piso).toBe(0);
    expect(leerFiltros({ piso: "" }, NICHOS).piso).toBe(POR_DEFECTO.piso);
  });

  it("toma el primer valor si el parámetro se repite", () =>
    expect(leerFiltros({ nicho: ["negocios", "x"] }, NICHOS).nicho).toBe("negocios"));
});

describe("urlCon", () => {
  it("omite los valores por defecto", () => expect(urlCon(POR_DEFECTO, {})).toBe("/"));
  it("conserva los demás filtros al cambiar uno", () =>
    expect(urlCon({ ...POR_DEFECTO, nicho: "negocios" }, { piso: 10 })).toBe(
      "/?nicho=negocios&piso=10",
    ));
});

describe("fechaDesde", () => {
  const ahora = new Date("2026-10-09T00:00:00Z");
  it("resta los días", () => expect(fechaDesde(7, ahora)).toBe("2026-10-02T00:00:00.000Z"));
  it("0 significa sin límite", () => expect(fechaDesde(0, ahora)).toBeNull());
});
