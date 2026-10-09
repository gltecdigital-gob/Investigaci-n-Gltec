import { describe, expect, it } from "vitest";
import { clasificarFormato, mediana, puntuarCanal, type VideoParaPuntuar } from "./outlier";

const AHORA = new Date("2026-10-09T12:00:00Z");
const haceDias = (d: number) => new Date(AHORA.getTime() - d * 86_400_000);

function canal(vistas: number[], formato: "video" | "short" = "video", desdeDia = 10): VideoParaPuntuar[] {
  return vistas.map((v, i) => ({
    id: `${formato}-${i}`,
    publicadoEn: haceDias(desdeDia + i * 3),
    vistas: v,
    formato,
  }));
}

describe("mediana", () => {
  it("devuelve null sin datos", () => expect(mediana([])).toBeNull());
  it("impar", () => expect(mediana([5, 1, 3])).toBe(3));
  it("par", () => expect(mediana([4, 1, 3, 2])).toBe(2.5));
});

describe("clasificarFormato", () => {
  it("hasta 180 s es short", () => {
    expect(clasificarFormato(45)).toBe("short");
    expect(clasificarFormato(180)).toBe("short");
  });
  it("más de 180 s es video", () => expect(clasificarFormato(181)).toBe("video"));
  it("duración desconocida es video", () => expect(clasificarFormato(0)).toBe("video"));
});

describe("puntuarCanal", () => {
  it("reproduce el ejemplo de referencia: 683 000 / 24 000 ≈ 28×", () => {
    const videos = canal(Array(30).fill(24_000));
    videos.push({ id: "exito", publicadoEn: haceDias(20), vistas: 683_000, formato: "video" });
    const p = puntuarCanal(videos, AHORA).get("exito")!;
    expect(p.medianaBase).toBe(24_000);
    expect(p.multiplicador).toBe(28.46);
    expect(p.provisional).toBe(false);
  });

  it("un éxito gigante no altera la línea base de los demás", () => {
    const videos = canal([1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 5_000_000]);
    const p = puntuarCanal(videos, AHORA).get("video-0")!;
    expect(p.medianaBase).toBe(1000);
    expect(p.multiplicador).toBe(1);
  });

  it("el propio video no cuenta en su línea base", () => {
    const videos = canal([100, 100, 100, 100, 100, 100, 100, 100, 900]);
    const p = puntuarCanal(videos, AHORA).get("video-8")!;
    expect(p.muestraBase).toBe(8);
    expect(p.multiplicador).toBe(9);
  });

  it("sin muestra suficiente no hay multiplicador", () => {
    const p = puntuarCanal(canal([100, 200, 300]), AHORA).get("video-0")!;
    expect(p.multiplicador).toBeNull();
    expect(p.muestraBase).toBe(2);
  });

  it("shorts y videos largos tienen líneas base separadas", () => {
    const videos = [...canal(Array(10).fill(1000), "video"), ...canal(Array(10).fill(50_000), "short")];
    const r = puntuarCanal(videos, AHORA);
    expect(r.get("video-0")!.medianaBase).toBe(1000);
    expect(r.get("short-0")!.medianaBase).toBe(50_000);
  });

  it("los videos recientes no entran en la línea base y se marcan provisionales", () => {
    const videos = canal(Array(10).fill(1000));
    videos.push({ id: "nuevo", publicadoEn: haceDias(1), vistas: 4000, formato: "video" });
    videos.push({ id: "semana", publicadoEn: haceDias(5), vistas: 999_999, formato: "video" });
    const r = puntuarCanal(videos, AHORA);
    expect(r.get("nuevo")!.provisional).toBe(true);
    expect(r.get("nuevo")!.multiplicador).toBe(4);
    expect(r.get("semana")!.provisional).toBe(false);
    // "semana" tiene menos de 7 días: no contamina la mediana de los demás.
    expect(r.get("video-0")!.medianaBase).toBe(1000);
  });

  it("usa solo los 30 más recientes", () => {
    const videos = [...canal(Array(30).fill(100)), ...canal(Array(30).fill(9999), "video", 200)].map(
      (v, i) => ({ ...v, id: `v${i}` }),
    );
    videos.push({ id: "x", publicadoEn: haceDias(8), vistas: 300, formato: "video" });
    expect(puntuarCanal(videos, AHORA).get("x")!.medianaBase).toBe(100);
  });

  it("línea base cero no produce división", () => {
    const videos = canal(Array(10).fill(0));
    expect(puntuarCanal(videos, AHORA).get("video-0")!.multiplicador).toBeNull();
  });
});
