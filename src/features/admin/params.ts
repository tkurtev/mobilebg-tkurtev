export type RawSearchParams = Record<string, string | string[] | undefined>;

export const ADMIN_PAGE_SIZE = 25;
const MAX_PAGE = 2000;

export function firstParam(raw: RawSearchParams, key: string): string | undefined {
  const value = raw[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined ? undefined : first;
}

export function textParam(raw: RawSearchParams, key: string, maxLength = 100): string | undefined {
  const value = firstParam(raw, key)?.trim().slice(0, maxLength);
  return value ? value : undefined;
}

export function pageParam(raw: RawSearchParams): number {
  const value = Number.parseInt(firstParam(raw, "page") ?? "1", 10);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, MAX_PAGE);
}

export function enumParam<T extends string>(raw: RawSearchParams, key: string, values: readonly T[]): T | undefined {
  const value = firstParam(raw, key);
  return values.find((candidate) => candidate === value);
}

export function uuidParam(raw: RawSearchParams, key: string): string | undefined {
  const value = firstParam(raw, key);
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value : undefined;
}

/** Accepts YYYY-MM-DD only, so the value can be passed to SQL as a plain string. */
export function dateParam(raw: RawSearchParams, key: string): string | undefined {
  const value = firstParam(raw, key);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
}

export function hrefWith(base: string, params: Record<string, string | number | undefined | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    query.set(key, String(value));
  }
  const serialized = query.toString();
  return serialized ? `${base}?${serialized}` : base;
}

export function totalPages(total: number, pageSize = ADMIN_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** Escapes LIKE wildcards so user input is matched literally. */
export function likePattern(input: string): string {
  return `%${input.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
