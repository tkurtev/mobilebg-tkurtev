"use client";

import { useFormContext } from "react-hook-form";
import { Select } from "@/components/ui/field";
import type { CityOption, RegionOption } from "@/features/catalog/queries";
import type { ListingValues } from "../../editor";
import { EditorField, StepSection, emptyToNull } from "../editor-fields";
import type { Issues } from "../types";

export function LocationStep({ regions, cities, issues }: { regions: RegionOption[]; cities: CityOption[]; issues: Issues }) {
  const form = useFormContext<ListingValues>();
  const regionId = form.watch("regionId");
  const cityId = form.watch("cityId");
  const regionCities = cities.filter((city) => city.regionId === regionId);
  return (
    <StepSection title="Местоположение" description="Къде може да се види автомобилът.">
      <div className="grid gap-4 sm:grid-cols-2">
        <EditorField id="regionId" label="Област" required error={issues.regionId}>
          <Select
            id="regionId"
            value={regionId ?? ""}
            aria-invalid={Boolean(issues.regionId)}
            onChange={(event) => {
              form.setValue("regionId", emptyToNull(event.target.value), { shouldDirty: true });
              form.setValue("cityId", null, { shouldDirty: true });
            }}
          >
            <option value="">Избери област</option>
            {regions.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </Select>
        </EditorField>
        <EditorField id="cityId" label="Град" required error={issues.cityId}>
          <Select
            id="cityId"
            value={cityId ?? ""}
            disabled={!regionId}
            aria-invalid={Boolean(issues.cityId)}
            onChange={(event) => form.setValue("cityId", emptyToNull(event.target.value), { shouldDirty: true })}
          >
            <option value="">{regionId ? "Избери град" : "Първо избери област"}</option>
            {regionCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </Select>
        </EditorField>
      </div>
    </StepSection>
  );
}
