import { findAttribute, type AttributeSet } from "@/config/attribute-sets";
import { getFeature } from "@/config/features";
import {
  ALL_BODY_TYPES,
  COLOR_OPTIONS,
  CONDITION_OPTIONS,
  DRIVETRAIN_OPTIONS,
  FUEL_OPTIONS,
  GEARBOX_OPTIONS,
  optionLabel,
  type Option,
} from "@/config/options";
import { formatNumber } from "@/lib/format";
import { searchHref, type RangeValue, type SearchFilters, type SortKey } from "./params";
import type { ResolvedRefs } from "./queries";

export type FilterChip = { key: string; label: string; href: string };

function rangeLabel(label: string, range: RangeValue, unit = ""): string | null {
  const suffix = unit ? `\u00a0${unit}` : "";
  const fmt = (value: number) => (unit ? formatNumber(value) : String(value));
  if (range.from !== undefined && range.to !== undefined) return `${label}: ${fmt(range.from)}-${fmt(range.to)}${suffix}`;
  if (range.from !== undefined) return `${label} от ${fmt(range.from)}${suffix}`;
  if (range.to !== undefined) return `${label} до ${fmt(range.to)}${suffix}`;
  return null;
}

export function buildFilterChips(categorySlug: string, set: AttributeSet, filters: SearchFilters, refs: ResolvedRefs, sort: SortKey): FilterChip[] {
  const chips: FilterChip[] = [];
  const href = (next: SearchFilters) => searchHref(categorySlug, next, { sort });
  const add = (key: string, label: string | null | undefined, next: SearchFilters) => {
    if (label) chips.push({ key, label, href: href(next) });
  };

  add("q", filters.q ? `„${filters.q}“` : null, { ...filters, q: undefined });
  add("make", filters.make ? (refs.make?.name ?? filters.make) : null, { ...filters, make: undefined, model: undefined, generation: undefined });
  add("model", filters.model ? (refs.model?.name ?? filters.model) : null, { ...filters, model: undefined, generation: undefined });
  add("generation", filters.generation ? (refs.generation?.name ?? filters.generation) : null, { ...filters, generation: undefined });
  add("price", rangeLabel("Цена", filters.price, "€"), { ...filters, price: {} });
  add("year", rangeLabel("Година", filters.year), { ...filters, year: {} });
  add("mileage", rangeLabel("Пробег", filters.mileage, "км"), { ...filters, mileage: {} });
  add("power", rangeLabel("Мощност", filters.power, "к.с."), { ...filters, power: {} });
  add("engine", rangeLabel("Кубатура", filters.engine, "куб. см"), { ...filters, engine: {} });

  const listChips = (field: "fuel" | "gearbox" | "body" | "drivetrain" | "condition" | "color", options: readonly Option[]) => {
    for (const value of filters[field]) {
      add(`${field}-${value}`, optionLabel(options, value), { ...filters, [field]: filters[field].filter((candidate) => candidate !== value) });
    }
  };
  listChips("fuel", FUEL_OPTIONS);
  listChips("gearbox", GEARBOX_OPTIONS);
  listChips("body", ALL_BODY_TYPES);
  listChips("drivetrain", DRIVETRAIN_OPTIONS);
  listChips("condition", CONDITION_OPTIONS);
  listChips("color", COLOR_OPTIONS);

  add("seller", filters.seller === "dealer" ? "Дилъри" : filters.seller === "private" ? "Частни лица" : null, { ...filters, seller: undefined });
  add("region", filters.region ? (refs.region?.name ?? filters.region) : null, { ...filters, region: undefined, city: undefined });
  add("city", filters.city ? (refs.city?.name ?? filters.city) : null, { ...filters, city: undefined });
  add("dealer", filters.dealer ? (refs.dealer?.name ?? filters.dealer) : null, { ...filters, dealer: undefined });

  for (const key of filters.features) {
    add(`feature-${key}`, getFeature(key)?.label, { ...filters, features: filters.features.filter((candidate) => candidate !== key) });
  }

  for (const [key, filter] of Object.entries(filters.attributes)) {
    const definition = findAttribute(set, key);
    if (!definition) continue;
    const without = (next: SearchFilters["attributes"][string] | null): SearchFilters => {
      const attributes = { ...filters.attributes };
      if (next) attributes[key] = next;
      else delete attributes[key];
      return { ...filters, attributes };
    };
    if (filter.kind === "select" && definition.type === "select") {
      for (const value of filter.values) {
        const rest = filter.values.filter((candidate) => candidate !== value);
        add(`attr-${key}-${value}`, optionLabel(definition.options, value), without(rest.length > 0 ? { kind: "select", values: rest } : null));
      }
    } else if (filter.kind === "range" && definition.type === "number") {
      add(`attr-${key}`, rangeLabel(definition.label, filter, definition.unit), without(null));
    } else if (filter.kind === "boolean") {
      add(`attr-${key}`, definition.label, without(null));
    }
  }
  return chips;
}

/** Page heading: "BMW 3 Series", "Автомобили в Пловдив", "Джипове". */
export function searchTitle(categoryName: string, refs: ResolvedRefs): string {
  const vehicle = [refs.make?.name, refs.model?.name, refs.generation?.name].filter(Boolean).join(" ");
  const place = refs.city?.name ?? refs.region?.name;
  if (vehicle) return place ? `${vehicle} в ${place}` : vehicle;
  return place ? `${categoryName} в ${place}` : categoryName;
}
