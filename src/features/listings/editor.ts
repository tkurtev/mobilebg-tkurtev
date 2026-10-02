import { z } from "zod";
import { coreRequired, getAttributeSet, usesCore, type AttributeSet, type CoreField } from "@/config/attribute-sets";
import { isFeatureKey } from "@/config/features";
import {
  ALL_BODY_TYPES,
  COLOR_OPTIONS,
  CONDITION_OPTIONS,
  DRIVETRAIN_OPTIONS,
  FUEL_OPTIONS,
  GEARBOX_OPTIONS,
  optionValues,
} from "@/config/options";
import { normalizeBgPhone } from "@/lib/phone";

export const LISTING_STEPS = [
  { key: "category", label: "Категория" },
  { key: "vehicle", label: "Марка и модел" },
  { key: "details", label: "Данни" },
  { key: "features", label: "Оборудване" },
  { key: "price", label: "Цена" },
  { key: "photos", label: "Снимки" },
  { key: "description", label: "Описание" },
  { key: "location", label: "Местоположение" },
  { key: "contact", label: "Контакти" },
  { key: "review", label: "Преглед" },
] as const;

export type StepKey = (typeof LISTING_STEPS)[number]["key"];

export function stepsForSet(set: AttributeSet): { key: StepKey; label: string }[] {
  return LISTING_STEPS.filter((step) => step.key !== "features" || set.featureGroups.length > 0).map((step) =>
    step.key === "vehicle" && !usesCore(set, "make") ? { ...step, label: "Заглавие" } : step.key === "details" ? { ...step, label: `Данни` } : step,
  );
}

const optionalId = z.uuid().nullable().optional();
const optionalInt = (min: number, max: number, message: string) => z.number().int(message).min(min, message).max(max, message).nullable().optional();
const optionalEnum = (values: [string, ...string[]]) => z.enum(values).nullable().optional();

/** Every field a seller can write. Anything else in a request is ignored, which prevents mass assignment. */
export const listingValuesSchema = z.object({
  makeId: optionalId,
  modelId: optionalId,
  generationId: optionalId,
  title: z.string().max(120, "Заглавието е твърде дълго.").optional(),
  year: optionalInt(1900, 2100, "Невалидна година."),
  mileageKm: optionalInt(0, 5_000_000, "Невалиден пробег."),
  fuel: optionalEnum(optionValues(FUEL_OPTIONS)),
  gearbox: optionalEnum(optionValues(GEARBOX_OPTIONS)),
  powerHp: optionalInt(1, 3000, "Невалидна мощност."),
  engineCc: optionalInt(10, 30_000, "Невалидна кубатура."),
  drivetrain: optionalEnum(optionValues(DRIVETRAIN_OPTIONS)),
  bodyType: z.string().max(40).nullable().optional(),
  color: optionalEnum(optionValues(COLOR_OPTIONS)),
  condition: optionalEnum(optionValues(CONDITION_OPTIONS)),
  attributes: z.record(z.string().max(40), z.union([z.string().max(200), z.number(), z.boolean(), z.null()])).optional(),
  features: z.array(z.string().max(40)).max(80).optional(),
  priceEuros: z.number().int("Цената трябва да е цяло число.").min(1, "Въведи цена.").max(50_000_000, "Цената е твърде висока.").nullable().optional(),
  priceNegotiable: z.boolean().optional(),
  description: z.string().max(5000, "Описанието е твърде дълго.").optional(),
  regionId: optionalId,
  cityId: optionalId,
  contactName: z.string().max(80, "Името е твърде дълго.").optional(),
  contactPhone: z.string().max(30).optional(),
});

export type ListingValues = z.infer<typeof listingValuesSchema>;

export const STEP_FIELDS: Record<StepKey, (keyof ListingValues)[]> = {
  category: [],
  vehicle: ["makeId", "modelId", "generationId", "title"],
  details: ["year", "mileageKm", "fuel", "gearbox", "powerHp", "engineCc", "drivetrain", "bodyType", "color", "condition", "attributes"],
  features: ["features"],
  price: ["priceEuros", "priceNegotiable"],
  photos: [],
  description: ["description"],
  location: ["regionId", "cityId"],
  contact: ["contactName", "contactPhone"],
  review: [],
};

const CORE_FIELD_KEYS: Record<CoreField, keyof ListingValues> = {
  make: "makeId",
  model: "modelId",
  generation: "generationId",
  year: "year",
  mileage: "mileageKm",
  fuel: "fuel",
  gearbox: "gearbox",
  power: "powerHp",
  engine: "engineCc",
  drivetrain: "drivetrain",
  bodyType: "bodyType",
  color: "color",
};

const REQUIRED_MESSAGES: Partial<Record<keyof ListingValues, string>> = {
  makeId: "Избери марка.",
  modelId: "Избери модел.",
  year: "Избери година.",
  mileageKm: "Въведи пробег.",
  fuel: "Избери гориво.",
  gearbox: "Избери скоростна кутия.",
  powerHp: "Въведи мощност.",
  engineCc: "Въведи кубатура.",
  bodyType: "Избери вид.",
  condition: "Избери състояние.",
};

export type ListingIssues = Record<string, string>;

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
}

/**
 * Category-aware completeness rules shared by the wizard (per step) and the server
 * (before publishing). Type and range checks are done by listingValuesSchema.
 */
export function listingIssues(
  values: ListingValues,
  attributeSetKey: string,
  options: { step?: StepKey; imageCount?: number; currentYear?: number } = {},
): ListingIssues {
  const set = getAttributeSet(attributeSetKey);
  const issues: ListingIssues = {};
  const inStep = (field: keyof ListingValues) => !options.step || STEP_FIELDS[options.step].includes(field);
  const currentYear = options.currentYear ?? new Date().getFullYear();

  if (inStep("title")) {
    const title = values.title?.trim() ?? "";
    if (title.length < 3) issues.title = "Въведи заглавие поне от 3 символа.";
  }

  for (const [field, key] of Object.entries(CORE_FIELD_KEYS) as [CoreField, keyof ListingValues][]) {
    if (!inStep(key)) continue;
    if (coreRequired(set, field) && isEmpty(values[key])) issues[key] = REQUIRED_MESSAGES[key] ?? "Задължително поле.";
  }
  if (inStep("condition") && isEmpty(values.condition)) issues.condition = REQUIRED_MESSAGES.condition as string;
  if (inStep("condition") && values.condition && !set.conditions.some((option) => option.value === values.condition)) issues.condition = "Невалидно състояние.";
  if (inStep("year") && values.year && (values.year < set.yearMin || values.year > currentYear + 1)) issues.year = "Невалидна година.";
  if (inStep("bodyType") && values.bodyType && !ALL_BODY_TYPES.some((option) => option.value === values.bodyType)) issues.bodyType = "Невалиден вид.";

  if (inStep("attributes")) {
    for (const definition of set.attributes) {
      const value = values.attributes?.[definition.key];
      if (definition.type === "select") {
        if (definition.required && isEmpty(value)) issues[`attributes.${definition.key}`] = `Избери ${definition.label.toLowerCase()}.`;
        else if (!isEmpty(value) && !definition.options.some((option) => option.value === value)) issues[`attributes.${definition.key}`] = "Невалидна стойност.";
      } else if (definition.type === "number") {
        if (definition.required && isEmpty(value)) issues[`attributes.${definition.key}`] = `Въведи ${definition.label.toLowerCase()}.`;
        else if (!isEmpty(value) && (typeof value !== "number" || !Number.isInteger(value) || value < definition.min || value > definition.max)) {
          issues[`attributes.${definition.key}`] = `Стойността трябва да е между ${definition.min} и ${definition.max}.`;
        }
      } else if (definition.type === "text" && typeof value === "string" && value.length > definition.maxLength) {
        issues[`attributes.${definition.key}`] = "Стойността е твърде дълга.";
      }
    }
    const vin = values.attributes?.vin;
    if (typeof vin === "string" && vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)) issues["attributes.vin"] = "VIN трябва да е 17 символа без I, O и Q.";
  }

  if (inStep("priceEuros") && isEmpty(values.priceEuros)) issues.priceEuros = "Въведи цена.";
  if (inStep("description") && (values.description?.trim().length ?? 0) < 20) issues.description = "Описанието трябва да е поне 20 символа.";
  if (inStep("regionId") && isEmpty(values.regionId)) issues.regionId = "Избери област.";
  if (inStep("cityId") && isEmpty(values.cityId)) issues.cityId = "Избери град.";
  if (inStep("contactName") && (values.contactName?.trim().length ?? 0) < 2) issues.contactName = "Въведи име за контакт.";
  if (inStep("contactPhone")) {
    if (!values.contactPhone?.trim()) issues.contactPhone = "Въведи телефон.";
    else if (!normalizeBgPhone(values.contactPhone)) issues.contactPhone = "Въведи български телефонен номер, например 0888123456.";
  }
  if ((!options.step || options.step === "photos") && options.imageCount !== undefined && options.imageCount < 1) {
    issues.photos = "Добави поне една снимка.";
  }
  return issues;
}

export function isValidFeatureForSet(key: string, attributeSetKey: string): boolean {
  return isFeatureKey(key) && getAttributeSet(attributeSetKey).featureGroups.length > 0;
}

export function firstIncompleteStep(values: ListingValues, attributeSetKey: string, imageCount: number): StepKey | null {
  const set = getAttributeSet(attributeSetKey);
  for (const step of stepsForSet(set)) {
    if (step.key === "review" || step.key === "category") continue;
    const issues = listingIssues(values, attributeSetKey, { step: step.key, imageCount });
    if (Object.keys(issues).length > 0) return step.key;
  }
  return null;
}
