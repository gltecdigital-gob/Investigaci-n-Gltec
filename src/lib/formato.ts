const compacto = new Intl.NumberFormat("es", { notation: "compact", maximumFractionDigits: 1 });
const relativo = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function numeroCorto(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : compacto.format(n);
}

export function multiplicadorTexto(m: number): string {
  return `${m >= 10 ? Math.round(m) : m.toFixed(1).replace(".", ",")}×`;
}

export function haceCuanto(fecha: string, ahora: Date = new Date()): string {
  const dias = Math.round((new Date(fecha).getTime() - ahora.getTime()) / 86_400_000);
  if (dias > -1) return "hoy";
  if (dias > -31) return relativo.format(dias, "day");
  if (dias > -365) return relativo.format(Math.round(dias / 30), "month");
  return relativo.format(Math.round(dias / 365), "year");
}

export function duracionTexto(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = String(seg % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
