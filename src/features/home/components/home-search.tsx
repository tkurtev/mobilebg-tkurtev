"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { getAttributeSet, usesCore } from "@/config/attribute-sets";
import { FUEL_OPTIONS, GEARBOX_OPTIONS } from "@/config/options";
import { Button } from "@/components/ui/button";
import type { MakeOption, ModelOption, RegionOption } from "@/features/catalog/queries";
import { FilterSelect } from "@/features/search/components/filter-controls";
import { emptyFilters, searchHref, serializeSearch, type SearchFilters } from "@/features/search/params";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

type HomeCategory = { slug: string; name: string; attributeSet: string; vehicleType: string | null; count: number };

type HomeSearchProps = {
  categories: HomeCategory[];
  initialMakes: MakeOption[];
  regions: RegionOption[];
};

const PRICE_STEPS = [2000, 5000, 7500, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000];

export function HomeSearch({ categories, initialMakes, regions }: HomeSearchProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [categorySlug, setCategorySlug] = useState(categories[0]?.slug ?? "avtomobili");
  const category = categories.find((candidate) => candidate.slug === categorySlug) ?? categories[0];
  const set = getAttributeSet(category?.attributeSet ?? "car");
  const [makesState, setMakesState] = useState({ vehicleType: categories[0]?.vehicleType ?? null, items: initialMakes });
  const [modelsState, setModelsState] = useState<{ makeId: string | null; items: ModelOption[] }>({ makeId: null, items: [] });
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters());
  const [count, setCount] = useState<number | null>(category?.count ?? null);

  const vehicleType = category?.vehicleType ?? null;
  const makes = makesState.vehicleType === vehicleType ? makesState.items : [];
  const makeId = makes.find((make) => make.slug === filters.make)?.id ?? null;
  const models = modelsState.makeId === makeId ? modelsState.items : [];

  useEffect(() => {
    if (!vehicleType || makesState.vehicleType === vehicleType) return;
    const controller = new AbortController();
    fetch(`/api/catalog/makes?vehicleType=${vehicleType}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: MakeOption[]) => setMakesState({ vehicleType, items }))
      .catch(() => {});
    return () => controller.abort();
  }, [vehicleType, makesState.vehicleType]);

  useEffect(() => {
    if (!makeId || !vehicleType || modelsState.makeId === makeId) return;
    const controller = new AbortController();
    fetch(`/api/catalog/models?makeId=${makeId}&vehicleType=${vehicleType}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: ModelOption[]) => setModelsState({ makeId, items }))
      .catch(() => {});
    return () => controller.abort();
  }, [makeId, vehicleType, modelsState.makeId]);

  const query = useMemo(() => serializeSearch(filters).toString(), [filters]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search/count?category=${categorySlug}&${query}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { count: number } | null) => data && setCount(data.count))
        .catch(() => {});
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [categorySlug, query]);

  const update = (patch: Partial<SearchFilters>) => setFilters((current) => ({ ...current, ...patch }));
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - 1989 }, (_, index) => String(currentYear - index)).map((year) => ({ value: year, label: year }));

  return (
    <section aria-labelledby="home-search-heading" className="rounded-lg border border-line bg-surface">
      <div className="scrollbar-none flex overflow-x-auto border-b border-line px-2" role="tablist" aria-label="Категория">
        {categories.map((candidate) => (
          <button
            key={candidate.slug}
            type="button"
            role="tab"
            aria-selected={candidate.slug === categorySlug}
            onClick={() => {
              setCategorySlug(candidate.slug);
              setFilters(emptyFilters());
              setCount(candidate.count);
            }}
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm whitespace-nowrap transition-colors",
              candidate.slug === categorySlug ? "border-brand font-semibold text-ink" : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            {candidate.name}
          </button>
        ))}
      </div>
      <form
        className="p-4 sm:p-5"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => router.push(searchHref(categorySlug, filters)));
        }}
      >
        <h1 id="home-search-heading" className="text-xl font-semibold tracking-tight">
          Търси {category?.name.toLowerCase() ?? "автомобили"}
        </h1>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {usesCore(set, "make") && makes.length > 0 ? (
            <>
              <FilterSelect id="home-make" label="Марка" value={filters.make} options={makes.map((make) => ({ value: make.slug, label: make.name }))} onChange={(make) => update({ make, model: undefined })} />
              <FilterSelect
                id="home-model"
                label="Модел"
                value={filters.model}
                disabled={!filters.make || models.length === 0}
                options={models.map((model) => ({ value: model.slug, label: model.name }))}
                onChange={(model) => update({ model })}
              />
            </>
          ) : null}
          <FilterSelect
            id="home-price"
            label="Цена до"
            value={filters.price.to ? String(filters.price.to) : undefined}
            placeholder="Без ограничение"
            options={PRICE_STEPS.map((step) => ({ value: String(step), label: `${formatNumber(step)} €` }))}
            onChange={(value) => update({ price: { to: value ? Number(value) : undefined } })}
          />
          {usesCore(set, "year") ? (
            <FilterSelect
              id="home-year"
              label="Година от"
              value={filters.year.from ? String(filters.year.from) : undefined}
              options={yearOptions}
              onChange={(value) => update({ year: { from: value ? Number(value) : undefined } })}
            />
          ) : null}
          {usesCore(set, "fuel") ? (
            <FilterSelect id="home-fuel" label="Гориво" value={filters.fuel[0]} options={FUEL_OPTIONS} onChange={(value) => update({ fuel: value ? [value] : [] })} />
          ) : null}
          {usesCore(set, "gearbox") ? (
            <FilterSelect id="home-gearbox" label="Скоростна кутия" value={filters.gearbox[0]} options={GEARBOX_OPTIONS} onChange={(value) => update({ gearbox: value ? [value] : [] })} />
          ) : null}
          <FilterSelect id="home-region" label="Област" value={filters.region} options={regions.map((region) => ({ value: region.slug, label: region.name }))} onChange={(region) => update({ region })} />
          <div className="col-span-2 flex items-end md:col-span-1">
            <Button type="submit" className="h-9 w-full" pending={pending} icon={<Search className="size-4" aria-hidden="true" />}>
              {count === null ? "Търси" : `Търси (${formatNumber(count)})`}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Link href={searchHref(categorySlug, filters)} className="text-sm font-medium text-brand hover:underline">
            Разширено търсене
          </Link>
        </div>
      </form>
    </section>
  );
}
