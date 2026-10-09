import { describe, expect, it } from "vitest";
import { duracionASegundos, enLotes, interpretarCanal } from "./youtube";

describe("duracionASegundos", () => {
  it.each([
    ["PT45S", 45],
    ["PT3M", 180],
    ["PT1H2M3S", 3723],
    ["P1DT1S", 86401],
    ["P0D", 0],
    [undefined, 0],
    ["basura", 0],
  ])("%s → %i", (iso, esperado) => expect(duracionASegundos(iso)).toBe(esperado));
});

describe("interpretarCanal", () => {
  const id = "UC" + "a".repeat(22);
  it("id directo", () => expect(interpretarCanal(id)).toEqual({ tipo: "id", valor: id }));
  it("handle", () =>
    expect(interpretarCanal(" @mi.canal ")).toEqual({ tipo: "handle", valor: "@mi.canal" }));
  it("URL con handle", () =>
    expect(interpretarCanal("https://www.youtube.com/@canal/videos")).toEqual({
      tipo: "handle",
      valor: "@canal",
    }));
  it("URL con id", () =>
    expect(interpretarCanal(`https://youtube.com/channel/${id}`)).toEqual({ tipo: "id", valor: id }));
  it("entrada no válida", () => {
    expect(interpretarCanal("canal sin arroba")).toBeNull();
    expect(interpretarCanal("")).toBeNull();
  });
});

describe("enLotes", () => {
  it("parte en grupos", () => expect(enLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]));
});
