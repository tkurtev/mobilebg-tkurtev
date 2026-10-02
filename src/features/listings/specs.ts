import { getAttributeSet, usesCore } from "@/config/attribute-sets";
import {
  bodyTypeLabel,
  COLOR_OPTIONS,
  CONDITION_OPTIONS,
  DRIVETRAIN_OPTIONS,
  FUEL_OPTIONS,
  GEARBOX_OPTIONS,
  optionLabel,
} from "@/config/options";
import { formatEngine, formatMileage, formatNumber, formatPower } from "@/lib/format";
import type { AttributeValueRow } from "./card-data";

export type SpecRow = { label: string; value: string };

type SpecSource = {
  attributeSet: string;
  makeName: string | null;
  modelName: string | null;
  generationName: string | null;
  year: number | null;
  mileageKm: number | null;
  fuel: string | null;
  gearbox: string | null;
  powerHp: number | null;
  engineCc: number | null;
  drivetrain: string | null;
  bodyType: string | null;
  color: string | null;
  condition: string | null;
  attributes: AttributeValueRow[];
};

export function buildSpecRows(source: SpecSource): SpecRow[] {
  const set = getAttributeSet(source.attributeSet);
  const rows: SpecRow[] = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value) rows.push({ label, value });
  };
  push(set.key === "parts" ? "За марка" : "Марка", source.makeName);
  push(set.key === "parts" ? "За модел" : "Модел", source.modelName);
  push("Поколение", source.generationName);
  push("Година", source.year ? String(source.year) : null);
  if (usesCore(set, "mileage")) push("Пробег", source.mileageKm !== null ? formatMileage(source.mileageKm) : null);
  push("Гориво", optionLabel(FUEL_OPTIONS, source.fuel));
  push("Скоростна кутия", optionLabel(GEARBOX_OPTIONS, source.gearbox));
  push("Мощност", source.powerHp ? formatPower(source.powerHp) : null);
  push("Кубатура", source.engineCc ? formatEngine(source.engineCc) : null);
  push("Задвижване", optionLabel(DRIVETRAIN_OPTIONS, source.drivetrain));
  push(set.bodyTypeLabel ?? "Купе", bodyTypeLabel(source.bodyType));
  push("Цвят", optionLabel(COLOR_OPTIONS, source.color));
  push("Състояние", optionLabel(CONDITION_OPTIONS, source.condition));

  for (const definition of set.attributes) {
    const value = source.attributes.find((attribute) => attribute.key === definition.key);
    if (!value) continue;
    if (definition.type === "select") push(definition.label, optionLabel(definition.options, value.valueText));
    else if (definition.type === "number" && value.valueNumber !== null) {
      push(definition.label, definition.unit ? `${formatNumber(value.valueNumber)} ${definition.unit}` : formatNumber(value.valueNumber));
    } else if (definition.type === "boolean" && value.valueBool !== null) push(definition.label, value.valueBool ? "Да" : "Не");
    else if (definition.type === "text") push(definition.label, value.valueText);
  }
  return rows;
}
