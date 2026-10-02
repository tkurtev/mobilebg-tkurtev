"use client";

import { useFormContext } from "react-hook-form";
import { coreRequired, usesCore, type AttributeDefinition, type AttributeSet, type CoreField } from "@/config/attribute-sets";
import { BODY_TYPE_OPTIONS, COLOR_OPTIONS, DRIVETRAIN_OPTIONS, FUEL_OPTIONS, GEARBOX_OPTIONS, type Option } from "@/config/options";
import { Checkbox, Input, Select } from "@/components/ui/field";
import type { ListingValues } from "../../editor";
import { EditorField, StepSection, emptyToNull, numberOrNull } from "../editor-fields";
import type { Issues } from "../types";

type FieldKey = "fuel" | "gearbox" | "drivetrain" | "bodyType" | "color";

export function DetailsStep({ set, issues }: { set: AttributeSet; issues: Issues }) {
  const form = useFormContext<ListingValues>();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear + 1 - set.yearMin + 1 }, (_, index) => currentYear + 1 - index);

  const selectField = (core: CoreField, key: FieldKey, label: string, options: readonly Option[]) =>
    usesCore(set, core) ? (
      <EditorField id={key} label={label} required={coreRequired(set, core)} error={issues[key]}>
        <Select
          id={key}
          value={(form.watch(key) as string | null | undefined) ?? ""}
          aria-invalid={Boolean(issues[key])}
          onChange={(event) => form.setValue(key, emptyToNull(event.target.value) as never, { shouldDirty: true })}
        >
          <option value="">Избери</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </EditorField>
    ) : null;

  const numberField = (core: CoreField, key: "mileageKm" | "powerHp" | "engineCc", label: string, unit: string) =>
    usesCore(set, core) ? (
      <EditorField id={key} label={`${label} (${unit})`} required={coreRequired(set, core)} error={issues[key]}>
        <Input
          id={key}
          inputMode="numeric"
          aria-invalid={Boolean(issues[key])}
          {...form.register(key, { setValueAs: numberOrNull })}
          defaultValue={form.getValues(key) ?? ""}
        />
      </EditorField>
    ) : null;

  const renderAttribute = (attribute: AttributeDefinition) => {
    const name = `attributes.${attribute.key}` as const;
    const error = issues[name];
    if (attribute.type === "boolean") {
      return (
        <div key={attribute.key} className="flex items-end pb-2">
          <Checkbox
            label={attribute.label}
            checked={form.watch(name) === true}
            onChange={(event) => form.setValue(name, event.target.checked ? true : null, { shouldDirty: true })}
          />
        </div>
      );
    }
    if (attribute.type === "select") {
      return (
        <EditorField key={attribute.key} id={name} label={attribute.label} required={attribute.required} error={error}>
          <Select
            id={name}
            value={(form.watch(name) as string | null | undefined) ?? ""}
            aria-invalid={Boolean(error)}
            onChange={(event) => form.setValue(name, emptyToNull(event.target.value), { shouldDirty: true })}
          >
            <option value="">Избери</option>
            {attribute.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </EditorField>
      );
    }
    if (attribute.type === "number") {
      return (
        <EditorField key={attribute.key} id={name} label={attribute.unit ? `${attribute.label} (${attribute.unit})` : attribute.label} required={attribute.required} error={error}>
          <Input id={name} inputMode="numeric" aria-invalid={Boolean(error)} {...form.register(name, { setValueAs: numberOrNull })} defaultValue={(form.getValues(name) as number | null) ?? ""} />
        </EditorField>
      );
    }
    return (
      <EditorField key={attribute.key} id={name} label={attribute.label} error={error}>
        <Input id={name} maxLength={attribute.maxLength} placeholder={attribute.placeholder} aria-invalid={Boolean(error)} {...form.register(name, { setValueAs: emptyToNull })} defaultValue={(form.getValues(name) as string | null) ?? ""} />
      </EditorField>
    );
  };

  const bodyOptions = set.bodyTypes ? BODY_TYPE_OPTIONS[set.bodyTypes] : [];

  return (
    <StepSection title="Данни">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {usesCore(set, "year") ? (
          <EditorField id="year" label="Година" required={coreRequired(set, "year")} error={issues.year}>
            <Select id="year" value={form.watch("year") ?? ""} aria-invalid={Boolean(issues.year)} onChange={(event) => form.setValue("year", numberOrNull(event.target.value), { shouldDirty: true })}>
              <option value="">Избери</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </EditorField>
        ) : null}
        {numberField("mileage", "mileageKm", "Пробег", "км")}
        {selectField("fuel", "fuel", "Гориво", FUEL_OPTIONS)}
        {selectField("gearbox", "gearbox", "Скоростна кутия", GEARBOX_OPTIONS)}
        {numberField("power", "powerHp", "Мощност", "к.с.")}
        {numberField("engine", "engineCc", "Кубатура", "куб. см")}
        {selectField("drivetrain", "drivetrain", "Задвижване", DRIVETRAIN_OPTIONS)}
        {bodyOptions.length > 0 ? selectField("bodyType", "bodyType", set.bodyTypeLabel ?? "Купе", bodyOptions) : null}
        {selectField("color", "color", "Цвят", COLOR_OPTIONS)}
        <EditorField id="condition" label="Състояние" required error={issues.condition}>
          <Select
            id="condition"
            value={form.watch("condition") ?? ""}
            aria-invalid={Boolean(issues.condition)}
            onChange={(event) => form.setValue("condition", emptyToNull(event.target.value) as ListingValues["condition"], { shouldDirty: true })}
          >
            <option value="">Избери</option>
            {set.conditions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </EditorField>
        {set.attributes.map(renderAttribute)}
      </div>
    </StepSection>
  );
}
