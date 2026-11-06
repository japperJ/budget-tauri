export const LOCALE = "da-DK";
export const CURRENCY = "DKK";

export function formatMoney(cents: number, currency = CURRENCY): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatMonth(isoMonth: string): string {
  // YYYY-MM
  const [y, m] = isoMonth.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric" }).format(d);
}

export function toCents(value: string | number): number {
  const n = typeof value === "string" ? parseFloat(value.replace(",", ".")) : value;
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

export function monthKey(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const currentMonth = () => monthKey(new Date());