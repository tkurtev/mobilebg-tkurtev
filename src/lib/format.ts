const NBSP = "\u00a0";
const SOFIA_TZ = "Europe/Sofia";

export function formatNumber(value: number): string {
  return String(Math.trunc(value)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function formatMileage(km: number): string {
  return `${formatNumber(km)}${NBSP}км`;
}

export function formatPower(hp: number): string {
  return `${hp}${NBSP}к.с.`;
}

export function formatEngine(cc: number): string {
  return `${formatNumber(cc)}${NBSP}куб.${NBSP}см`;
}

const dateFormatter = new Intl.DateTimeFormat("bg-BG", {
  timeZone: SOFIA_TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("bg-BG", {
  timeZone: SOFIA_TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SOFIA_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 02.10.2026 */
export function formatDate(date: Date): string {
  return dateFormatter.format(date).replace(/\s?г\.?$/, "");
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date);
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/** YYYY-MM-DD in Sofia time. */
export function sofiaDayKey(date: Date): string {
  return dayKeyFormatter.format(date);
}

function daysBetween(from: Date, to: Date): number {
  const a = Date.parse(sofiaDayKey(from));
  const b = Date.parse(sofiaDayKey(to));
  return Math.round((b - a) / 86_400_000);
}

/** "днес, 14:20", "вчера, 09:15", "преди 3 дни", "12.09.2026" */
export function formatRelativeDate(date: Date, now: Date = new Date()): string {
  const days = daysBetween(date, now);
  if (days <= 0) return `днес, ${formatTime(date)}`;
  if (days === 1) return `вчера, ${formatTime(date)}`;
  if (days < 7) return `преди ${days} дни`;
  return formatDate(date);
}

export function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export function formatCount(count: number, one: string, many: string): string {
  return `${formatNumber(count)} ${pluralize(count, one, many)}`;
}
