"use client";

import { useFormContext } from "react-hook-form";
import { featuresForGroups, type FeatureGroupKey } from "@/config/features";
import type { ListingValues } from "../../editor";
import { StepSection } from "../editor-fields";

export function FeaturesStep({ groups }: { groups: readonly FeatureGroupKey[] }) {
  const form = useFormContext<ListingValues>();
  const selected = form.watch("features") ?? [];
  const toggle = (key: string) =>
    form.setValue("features", selected.includes(key) ? selected.filter((value) => value !== key) : [...selected, key], { shouldDirty: true });

  return (
    <StepSection title="Оборудване" description="Отбележи наличното оборудване. Купувачите филтрират по него.">
      <div className="grid gap-6 sm:grid-cols-2">
        {featuresForGroups(groups).map((group) => (
          <fieldset key={group.key}>
            <legend className="mb-2 text-sm font-semibold">{group.label}</legend>
            <div className="space-y-1.5">
              {group.features.map((feature) => (
                <label key={feature.key} className="flex cursor-pointer items-center gap-2.5 text-[15px] select-none">
                  <input type="checkbox" checked={selected.includes(feature.key)} onChange={() => toggle(feature.key)} className="size-4 accent-brand" />
                  {feature.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </StepSection>
  );
}
