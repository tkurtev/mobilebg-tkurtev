export const DEALER_LISTING_FILTERS = [
  { value: "all", label: "Всички" },
  { value: "active", label: "Активни" },
  { value: "draft", label: "Чернови" },
  { value: "pending", label: "Изчакват преглед" },
  { value: "paused", label: "Паузирани" },
  { value: "sold", label: "Продадени" },
  { value: "expired", label: "Изтекли" },
  { value: "rejected", label: "Отказани" },
  { value: "archived", label: "Архивирани" },
] as const;

export type DealerListingFilter = (typeof DEALER_LISTING_FILTERS)[number]["value"];

export function parseDealerListingFilter(value: string | string[] | undefined): DealerListingFilter {
  const raw = Array.isArray(value) ? value[0] : value;
  return DEALER_LISTING_FILTERS.find((option) => option.value === raw)?.value ?? "all";
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
}

export function pageParam(value: string | string[] | undefined): number {
  const raw = firstParam(value);
  if (!raw || !/^\d{1,5}$/.test(raw)) return 1;
  return Math.max(1, Number.parseInt(raw, 10));
}

const SLUG_PATTERN = /^[a-z0-9-]{1,100}$/;

export function slugParam(value: string | string[] | undefined): string | undefined {
  const raw = firstParam(value)?.toLowerCase();
  return raw && SLUG_PATTERN.test(raw) ? raw : undefined;
}
