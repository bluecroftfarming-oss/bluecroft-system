export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function formatNumber(n: number | null | undefined, unit?: string): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-IN") + (unit ? ` ${unit}` : "");
}

export function daysBetween(inIso: string | null, outIso: string | null): number | null {
  if (!inIso || !outIso) return null;
  const a = new Date(inIso + "T00:00:00Z").getTime();
  const b = new Date(outIso + "T00:00:00Z").getTime();
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

export function pct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n}%`;
}
