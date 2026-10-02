"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { getAttributeSet, usesCore, type AttributeDefinition } from "@/config/attribute-sets";
import { featuresForGroups } from "@/config/features";
import {
  BODY_TYPE_OPTIONS,
  COLOR_OPTIONS,
  CONDITION_OPTIONS,
  DRIVETRAIN_OPTIONS,
  FUEL_OPTIONS,
  GEARBOX_OPTIONS,
  SELLER_TYPE_OPTIONS,
} from "@/config/options";
import type { CityOption, GenerationOption, MakeOption, ModelOption, RegionOption } from "@/features/catalog/queries";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { countActiveFilters, emptyFilters, searchHref, serializeSearch, type AttributeFilter, type SearchFilters, type SortKey } from "../params";
import { CheckboxGroup, Disclosure, FilterSection, FilterSelect, RangeFilter, YearRangeFilter } from "./filter-controls";

export type SearchFiltersProps = {
  categorySlug: string;
  attributeSetKey: string;
  vehicleType: string | null;
  filters: SearchFilters;
  sort: SortKey;
  makes: MakeOption[];
  models: ModelOption[];
  generations: GenerationOption[];
  regions: RegionOption[];
  cities: CityOption[];
  mode: "instant" | "deferred";
  idPrefix: string;
  onApplied?: () => void;
};

const COLOR_SWATCHES: Record<string, string> = Object.fromEntries(COLOR_OPTIONS.map((option) => [option.value, option.hex]));

export function SearchFilterPanel(props: SearchFiltersProps) {
  const { categorySlug, mode, idPrefix } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const set = getAttributeSet(props.attributeSetKey);

  const initialMakeId = props.makes.find((make) => make.slug === props.filters.make)?.id ?? null;
  const initialModelId = props.models.find((model) => model.slug === props.filters.model)?.id ?? null;
  const [draft, setDraft] = useState<SearchFilters>(props.filters);
  const [modelState, setModelState] = useState({ makeId: initialMakeId, items: props.models });
  const [generationState, setGenerationState] = useState({ modelId: initialModelId, items: props.generations });
  const [syncedFilters, setSyncedFilters] = useState(props.filters);
  if (syncedFilters !== props.filters) {
    setSyncedFilters(props.filters);
    setDraft(props.filters);
    setModelState({ makeId: initialMakeId, items: props.models });
    setGenerationState({ modelId: initialModelId, items: props.generations });
  }
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const selectedMakeId = props.makes.find((make) => make.slug === draft.make)?.id ?? null;
  const models = modelState.makeId === selectedMakeId ? modelState.items : [];
  const selectedModelId = models.find((model) => model.slug === draft.model)?.id ?? null;
  const generations = generationState.modelId === selectedModelId ? generationState.items : [];

  useEffect(() => {
    if (!selectedMakeId || !props.vehicleType || modelState.makeId === selectedMakeId) return;
    const controller = new AbortController();
    fetch(`/api/catalog/models?makeId=${selectedMakeId}&vehicleType=${props.vehicleType}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: ModelOption[]) => setModelState({ makeId: selectedMakeId, items }))
      .catch(() => {});
    return () => controller.abort();
  }, [selectedMakeId, props.vehicleType, modelState.makeId]);

  useEffect(() => {
    if (!selectedModelId || generationState.modelId === selectedModelId) return;
    const controller = new AbortController();
    fetch(`/api/catalog/generations?modelId=${selectedModelId}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: GenerationOption[]) => setGenerationState({ modelId: selectedModelId, items }))
      .catch(() => {});
    return () => controller.abort();
  }, [selectedModelId, generationState.modelId]);

  const draftQuery = useMemo(() => serializeSearch(draft).toString(), [draft]);
  useEffect(() => {
    if (mode !== "deferred") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/search/count?category=${categorySlug}&${draftQuery}`, { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { count: number } | null) => setPreviewCount(data?.count ?? null))
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [mode, categorySlug, draftQuery]);

  function commit(next: SearchFilters) {
    startTransition(() => {
      router.push(searchHref(categorySlug, next, { sort: props.sort }), { scroll: false });
    });
  }

  function update(patch: Partial<SearchFilters>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    if (mode === "instant") commit(next);
  }

  function updateAttribute(key: string, filter: AttributeFilter | null) {
    const attributes = { ...draft.attributes };
    if (filter) attributes[key] = filter;
    else delete attributes[key];
    update({ attributes });
  }

  const regionId = props.regions.find((region) => region.slug === draft.region)?.id;
  const cityOptions = props.cities.filter((city) => !regionId || city.regionId === regionId).map((city) => ({ value: city.slug, label: city.name }));
  const bodyOptions = set.bodyTypes ? BODY_TYPE_OPTIONS[set.bodyTypes] : [];
  const featureGroups = featuresForGroups(set.featureGroups);
  const filterableAttributes = set.attributes.filter((attribute) => "filterable" in attribute && attribute.filterable);
  const conditionOptions = set.conditions.length > 0 ? set.conditions : CONDITION_OPTIONS;
  const moreCount =
    [draft.engine, draft.power].filter((range) => range.from !== undefined || range.to !== undefined).length +
    [draft.drivetrain, draft.color, draft.condition].filter((list) => list.length > 0).length +
    Object.keys(draft.attributes).length;

  const renderAttribute = (attribute: AttributeDefinition) => {
    const current = draft.attributes[attribute.key];
    const id = `${idPrefix}-attr-${attribute.key}`;
    if (attribute.type === "select") {
      return (
        <FilterSection key={attribute.key} title={attribute.label}>
          <CheckboxGroup
            name={id}
            options={attribute.options}
            values={current?.kind === "select" ? current.values : []}
            onChange={(values) => updateAttribute(attribute.key, values.length > 0 ? { kind: "select", values } : null)}
            columns={attribute.options.length > 4 ? 2 : 1}
          />
        </FilterSection>
      );
    }
    if (attribute.type === "number") {
      return (
        <FilterSection key={attribute.key} title={attribute.label}>
          <RangeFilter
            id={id}
            label={attribute.label}
            unit={attribute.unit}
            value={current?.kind === "range" ? current : {}}
            onCommit={(range) => updateAttribute(attribute.key, range.from !== undefined || range.to !== undefined ? { kind: "range", ...range } : null)}
          />
        </FilterSection>
      );
    }
    if (attribute.type === "boolean") {
      return (
        <label key={attribute.key} className="flex cursor-pointer items-center gap-2 py-1 text-sm select-none">
          <input
            type="checkbox"
            checked={current?.kind === "boolean"}
            onChange={(event) => updateAttribute(attribute.key, event.target.checked ? { kind: "boolean" } : null)}
            className="size-4 accent-brand"
          />
          {attribute.label}
        </label>
      );
    }
    return null;
  };

  const selectAttributes = filterableAttributes.filter((attribute) => attribute.type === "select" || attribute.type === "number");
  const booleanAttributes = filterableAttributes.filter((attribute) => attribute.type === "boolean");
  const primaryAttributes = set.key === "tires" || set.key === "parts" ? selectAttributes : [];
  const secondaryAttributes = selectAttributes.filter((attribute) => !primaryAttributes.includes(attribute));

  return (
    <div className="flex h-full flex-col" aria-busy={pending}>
      <form className="min-h-0 flex-1" onSubmit={(event) => event.preventDefault()} role="search" aria-label="Филтри">
        {usesCore(set, "make") && props.makes.length > 0 ? (
          <FilterSection title={set.key === "parts" ? "За автомобил" : "Марка и модел"}>
            <div className="space-y-2.5">
              <FilterSelect
                id={`${idPrefix}-make`}
                label="Марка"
                value={draft.make}
                options={props.makes.map((make) => ({ value: make.slug, label: make.name }))}
                onChange={(make) => update({ make, model: undefined, generation: undefined })}
              />
              <FilterSelect
                id={`${idPrefix}-model`}
                label="Модел"
                value={draft.model}
                disabled={!draft.make || models.length === 0}
                options={models.map((model) => ({ value: model.slug, label: model.name }))}
                onChange={(model) => update({ model, generation: undefined })}
              />
              {draft.model && generations.length > 0 ? (
                <FilterSelect
                  id={`${idPrefix}-generation`}
                  label="Поколение"
                  value={draft.generation}
                  options={generations.map((generation) => ({
                    value: generation.slug,
                    label: `${generation.name} (${generation.yearFrom}${generation.yearTo ? `-${generation.yearTo}` : "+"})`,
                  }))}
                  onChange={(generation) => update({ generation })}
                />
              ) : null}
            </div>
          </FilterSection>
        ) : null}

        {primaryAttributes.map(renderAttribute)}

        <FilterSection title="Цена">
          <RangeFilter id={`${idPrefix}-price`} label="Цена" unit="€" value={draft.price} onCommit={(price) => update({ price })} />
        </FilterSection>

        {usesCore(set, "year") ? (
          <FilterSection title="Година">
            <YearRangeFilter id={`${idPrefix}-year`} value={draft.year} minYear={set.yearMin} onChange={(year) => update({ year })} />
          </FilterSection>
        ) : null}

        {usesCore(set, "mileage") ? (
          <FilterSection title="Пробег">
            <RangeFilter id={`${idPrefix}-mileage`} label="Пробег" unit="км" value={draft.mileage} onCommit={(mileage) => update({ mileage })} />
          </FilterSection>
        ) : null}

        {usesCore(set, "fuel") ? (
          <FilterSection title="Гориво">
            <CheckboxGroup name={`${idPrefix}-fuel`} options={FUEL_OPTIONS} values={draft.fuel} onChange={(fuel) => update({ fuel })} columns={2} />
          </FilterSection>
        ) : null}

        {usesCore(set, "gearbox") ? (
          <FilterSection title="Скоростна кутия">
            <CheckboxGroup name={`${idPrefix}-gearbox`} options={GEARBOX_OPTIONS} values={draft.gearbox} onChange={(gearbox) => update({ gearbox })} />
          </FilterSection>
        ) : null}

        {usesCore(set, "bodyType") && bodyOptions.length > 0 ? (
          <FilterSection title={set.bodyTypeLabel ?? "Купе"}>
            <CheckboxGroup name={`${idPrefix}-body`} options={bodyOptions} values={draft.body} onChange={(body) => update({ body })} columns={2} />
          </FilterSection>
        ) : null}

        <FilterSection title="Местоположение">
          <div className="space-y-2.5">
            <FilterSelect
              id={`${idPrefix}-region`}
              label="Област"
              value={draft.region}
              options={props.regions.map((region) => ({ value: region.slug, label: region.name }))}
              onChange={(region) => update({ region, city: undefined })}
            />
            <FilterSelect id={`${idPrefix}-city`} label="Град" value={draft.city} options={cityOptions} onChange={(city) => update({ city })} />
          </div>
        </FilterSection>

        <FilterSection title="Продавач">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {[{ value: "", label: "Всички" }, ...SELLER_TYPE_OPTIONS].map((option) => (
              <label key={option.value || "all"} className="flex cursor-pointer items-center gap-2 text-sm select-none">
                <input
                  type="radio"
                  name={`${idPrefix}-seller`}
                  checked={(draft.seller ?? "") === option.value}
                  onChange={() => update({ seller: (option.value || undefined) as SearchFilters["seller"] })}
                  className="size-4 accent-brand"
                />
                {option.label}
              </label>
            ))}
          </div>
        </FilterSection>

        <Disclosure title="Още филтри" count={moreCount} defaultOpen={moreCount > 0}>
          <div className="space-y-0">
            {usesCore(set, "power") ? (
              <FilterSection title="Мощност">
                <RangeFilter id={`${idPrefix}-power`} label="Мощност" unit="к.с." value={draft.power} onCommit={(power) => update({ power })} />
              </FilterSection>
            ) : null}
            {usesCore(set, "engine") ? (
              <FilterSection title="Кубатура">
                <RangeFilter id={`${idPrefix}-engine`} label="Кубатура" unit="куб. см" value={draft.engine} onCommit={(engine) => update({ engine })} />
              </FilterSection>
            ) : null}
            {usesCore(set, "drivetrain") ? (
              <FilterSection title="Задвижване">
                <CheckboxGroup name={`${idPrefix}-drivetrain`} options={DRIVETRAIN_OPTIONS} values={draft.drivetrain} onChange={(drivetrain) => update({ drivetrain })} />
              </FilterSection>
            ) : null}
            <FilterSection title="Състояние">
              <CheckboxGroup name={`${idPrefix}-condition`} options={conditionOptions} values={draft.condition} onChange={(condition) => update({ condition })} columns={2} />
            </FilterSection>
            {usesCore(set, "color") ? (
              <FilterSection title="Цвят">
                <CheckboxGroup name={`${idPrefix}-color`} options={COLOR_OPTIONS} values={draft.color} onChange={(color) => update({ color })} columns={2} swatches={COLOR_SWATCHES} />
              </FilterSection>
            ) : null}
            {secondaryAttributes.map(renderAttribute)}
            {booleanAttributes.length > 0 ? <FilterSection title="Документи">{booleanAttributes.map(renderAttribute)}</FilterSection> : null}
          </div>
        </Disclosure>

        {featureGroups.length > 0 ? (
          <Disclosure title="Оборудване" count={draft.features.length} defaultOpen={draft.features.length > 0}>
            <div className="space-y-4">
              {featureGroups.map((group) => (
                <div key={group.key}>
                  <p className="mb-1.5 text-[13px] font-medium text-ink-2">{group.label}</p>
                  <CheckboxGroup
                    name={`${idPrefix}-features-${group.key}`}
                    options={group.features.map((feature) => ({ value: feature.key, label: feature.label }))}
                    values={draft.features.filter((key) => group.features.some((feature) => feature.key === key))}
                    onChange={(values) => {
                      const others = draft.features.filter((key) => !group.features.some((feature) => feature.key === key));
                      update({ features: [...others, ...values] });
                    }}
                  />
                </div>
              ))}
            </div>
          </Disclosure>
        ) : null}
      </form>

      {mode === "deferred" ? (
        <div className="sticky bottom-0 -mx-5 mt-4 flex gap-2 border-t border-line bg-surface px-5 py-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              const cleared = { ...emptyFilters(), q: draft.q };
              setDraft(cleared);
            }}
            disabled={countActiveFilters(draft) === 0}
          >
            Изчисти
          </Button>
          <Button
            className="flex-[2]"
            pending={pending}
            onClick={() => {
              commit(draft);
              props.onApplied?.();
            }}
          >
            {previewCount === null ? "Покажи резултатите" : `Покажи ${formatNumber(previewCount)} ${previewCount === 1 ? "обява" : "обяви"}`}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
