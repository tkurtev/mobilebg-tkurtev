import type { AttributeSet } from "@/config/attribute-sets";
import { isFeatureKey } from "@/config/features";
import {
  ALL_BODY_TYPES,
  COLOR_OPTIONS,
  CONDITION_OPTIONS,
  DRIVETRAIN_OPTIONS,
  FUEL_OPTIONS,
  GEARBOX_OPTIONS,
  type Option,
} from "@/config/options";

export const SORT_OPTIONS = [
  { value: "newest", label: "Най-нови" },
  { value: "price-asc", label: "Цена - ниска към висока" },
  { value: "price-desc", label: "Цена - висока към ниска" },
  { value: "year-desc", label: "Година - нови към стари" },
  { value: "mileage-asc", label: "Пробег - нисък към висок" },
] as const;

export type SortKey = (typeof SORT_OPTIONS)[number]["value"];

export type RangeValue = { from?: number; to?: number };

export type AttributeFilter =
  | { kind: "select"; values: string[] }
  | { kind: "range"; from?: number; to?: number }
  | { kind: "boolean" };

export type SearchFilters = {
  q?: string;
  make?: string;
  model?: string;
  generation?: string;
  price: RangeValue;
  year: RangeValue;
  mileage: RangeValue;
  power: RangeValue;
  engine: RangeValue;
  fuel: string[];
  gearbox: string[];
  body: string[];
  drivetrain: string[];
  condition: string[];
  color: string[];
  seller?: "private" | "dealer";
  region?: string;
  city?: string;
  features: string[];
  attributes: Record<string, AttributeFilter>;
  dealer?: string;
};

export type SearchState = { filters: SearchFilters; sort: SortKey; page: number };

export type RawSearchParams = Record<string, string | string[] | undefined>;

const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const MAX_PAGE = 500;

export function emptyFilters(): SearchFilters {
  return { price: {}, year: {}, mileage: {}, power: {}, engine: {}, fuel: [], gearbox: [], body: [], drivetrain: [], condition: [], color: [], features: [], attributes: {} };
}

function first(raw: RawSearchParams, key: string): string | undefined {
  const value = raw[key];
  const result = Array.isArray(value) ? value[0] : value;
  return result?.trim() || undefined;
}

function slugParam(raw: RawSearchParams, key: string): string | undefined {
  const value = first(raw, key)?.toLowerCase();
  return value && SLUG.test(value) ? value : undefined;
}

function intParam(raw: RawSearchParams, key: string, min: number, max: number): number | undefined {
  const value = first(raw, key);
  if (!value || !/^\d{1,10}$/.test(value.replace(/[\s\u00a0]/g, ""))) return undefined;
  const parsed = Number.parseInt(value.replace(/[\s\u00a0]/g, ""), 10);
  if (!Number.isSafeInteger(parsed) || parsed < min) return undefined;
  return Math.min(parsed, max);
}

function rangeParam(raw: RawSearchParams, key: string, min: number, max: number): RangeValue {
  let from = intParam(raw, `${key}From`, min, max);
  let to = intParam(raw, `${key}To`, min, max);
  if (from !== undefined && to !== undefined && from > to) [from, to] = [to, from];
  return { from, to };
}

function listParam(raw: RawSearchParams, key: string, allowed: readonly Option[] | ((value: string) => boolean)): string[] {
  const value = raw[key];
  const parts = (Array.isArray(value) ? value : value ? [value] : []).flatMap((part) => part.split(","));
  const check = typeof allowed === "function" ? allowed : (candidate: string) => allowed.some((option) => option.value === candidate);
  return [...new Set(parts.map((part) => part.trim().toLowerCase()).filter((part) => part && check(part)))].slice(0, 30);
}

export function parseSearchParams(raw: RawSearchParams, set: AttributeSet): SearchState {
  const q = first(raw, "q")?.slice(0, 100);
  const filters: SearchFilters = {
    q: q || undefined,
    make: slugParam(raw, "make"),
    model: undefined,
    generation: undefined,
    price: rangeParam(raw, "price", 0, 50_000_000),
    year: rangeParam(raw, "year", 1900, 2100),
    mileage: rangeParam(raw, "mileage", 0, 5_000_000),
    power: rangeParam(raw, "power", 0, 5000),
    engine: rangeParam(raw, "engine", 0, 50_000),
    fuel: listParam(raw, "fuel", FUEL_OPTIONS),
    gearbox: listParam(raw, "gearbox", GEARBOX_OPTIONS),
    body: listParam(raw, "body", ALL_BODY_TYPES),
    drivetrain: listParam(raw, "drivetrain", DRIVETRAIN_OPTIONS),
    condition: listParam(raw, "condition", CONDITION_OPTIONS),
    color: listParam(raw, "color", COLOR_OPTIONS),
    seller: ((value) => (value === "private" || value === "dealer" ? value : undefined))(first(raw, "seller")),
    region: slugParam(raw, "region"),
    city: slugParam(raw, "city"),
    features: listParam(raw, "features", isFeatureKey),
    attributes: {},
    dealer: slugParam(raw, "dealer"),
  };
  if (filters.make) {
    filters.model = slugParam(raw, "model");
    if (filters.model) filters.generation = slugParam(raw, "generation");
  }

  for (const attribute of set.attributes) {
    if (!("filterable" in attribute) || !attribute.filterable) continue;
    if (attribute.type === "select") {
      const values = listParam(raw, attribute.key, attribute.options);
      if (values.length > 0) filters.attributes[attribute.key] = { kind: "select", values };
    } else if (attribute.type === "number") {
      const range = rangeParam(raw, attribute.key, attribute.min, attribute.max);
      if (range.from !== undefined || range.to !== undefined) filters.attributes[attribute.key] = { kind: "range", ...range };
    } else if (attribute.type === "boolean") {
      if (first(raw, attribute.key) === "1") filters.attributes[attribute.key] = { kind: "boolean" };
    }
  }

  const sortValue = first(raw, "sort");
  const sort = (SORT_OPTIONS.find((option) => option.value === sortValue)?.value ?? "newest") as SortKey;
  const page = intParam(raw, "page", 1, MAX_PAGE) ?? 1;
  return { filters, sort, page };
}

/** Canonical, stable query string. Default sort and first page are omitted. */
export function serializeSearch(filters: SearchFilters, options: { sort?: SortKey; page?: number } = {}): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  };
  const range = (key: string, value: RangeValue) => {
    set(`${key}From`, value.from);
    set(`${key}To`, value.to);
  };
  const list = (key: string, values: string[]) => {
    if (values.length > 0) params.set(key, values.join(","));
  };

  set("q", filters.q);
  set("make", filters.make);
  set("model", filters.model);
  set("generation", filters.generation);
  range("price", filters.price);
  range("year", filters.year);
  range("mileage", filters.mileage);
  range("power", filters.power);
  range("engine", filters.engine);
  list("fuel", filters.fuel);
  list("gearbox", filters.gearbox);
  list("body", filters.body);
  list("drivetrain", filters.drivetrain);
  list("condition", filters.condition);
  list("color", filters.color);
  set("seller", filters.seller);
  set("region", filters.region);
  set("city", filters.city);
  list("features", filters.features);
  for (const [key, filter] of Object.entries(filters.attributes).sort(([a], [b]) => a.localeCompare(b))) {
    if (filter.kind === "select") list(key, filter.values);
    else if (filter.kind === "range") range(key, filter);
    else params.set(key, "1");
  }
  set("dealer", filters.dealer);
  if (options.sort && options.sort !== "newest") params.set("sort", options.sort);
  if (options.page && options.page > 1) params.set("page", String(options.page));
  return params;
}

export function searchHref(categorySlug: string, filters: SearchFilters, options: { sort?: SortKey; page?: number } = {}): string {
  const query = serializeSearch(filters, options).toString();
  return query ? `/${categorySlug}?${query}` : `/${categorySlug}`;
}

export function countActiveFilters(filters: SearchFilters): number {
  const ranges = [filters.price, filters.year, filters.mileage, filters.power, filters.engine].filter((r) => r.from !== undefined || r.to !== undefined).length;
  const lists = [filters.fuel, filters.gearbox, filters.body, filters.drivetrain, filters.condition, filters.color, filters.features].filter((l) => l.length > 0).length;
  const singles = [filters.q, filters.make, filters.seller, filters.region, filters.dealer].filter(Boolean).length;
  return ranges + lists + singles + Object.keys(filters.attributes).length;
}

/** Saved searches store the canonical query as a flat string map. */
export function filtersToRecord(filters: SearchFilters, sort: SortKey = "newest"): Record<string, string> {
  return Object.fromEntries(serializeSearch(filters, { sort }).entries());
}
