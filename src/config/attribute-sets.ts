import { CONDITION_OPTIONS, EMISSION_OPTIONS, type BodyTypeGroup, type Option } from "./options";
import type { FeatureGroupKey } from "./features";

export type CoreField =
  | "make"
  | "model"
  | "generation"
  | "year"
  | "mileage"
  | "fuel"
  | "gearbox"
  | "power"
  | "engine"
  | "drivetrain"
  | "bodyType"
  | "color";

export type AttributeDefinition =
  | {
      key: string;
      label: string;
      type: "select";
      options: readonly Option[];
      required?: boolean;
      filterable?: boolean;
    }
  | {
      key: string;
      label: string;
      type: "number";
      unit?: string;
      min: number;
      max: number;
      required?: boolean;
      filterable?: boolean;
    }
  | { key: string; label: string; type: "boolean"; filterable?: boolean }
  | { key: string; label: string; type: "text"; maxLength: number; placeholder?: string };

export type AttributeSet = {
  key: string;
  label: string;
  core: Partial<Record<CoreField, { required: boolean }>>;
  bodyTypes?: BodyTypeGroup;
  bodyTypeLabel?: string;
  conditions: readonly Option[];
  attributes: readonly AttributeDefinition[];
  featureGroups: readonly FeatureGroupKey[];
  yearMin: number;
};

const req = { required: true } as const;
const opt = { required: false } as const;

const USED_NEW = CONDITION_OPTIONS.filter((option) => option.value === "new" || option.value === "used");

const DOORS: AttributeDefinition = {
  key: "doors",
  label: "Врати",
  type: "select",
  options: [
    { value: "2-3", label: "2/3" },
    { value: "4-5", label: "4/5" },
  ],
};
const SEATS: AttributeDefinition = { key: "seats", label: "Места", type: "number", min: 1, max: 60 };
const EURO: AttributeDefinition = {
  key: "euro",
  label: "Евростандарт",
  type: "select",
  options: EMISSION_OPTIONS,
  filterable: true,
};
const REGISTERED: AttributeDefinition = { key: "registered", label: "Регистриран в България", type: "boolean", filterable: true };
const VIN: AttributeDefinition = { key: "vin", label: "VIN", type: "text", maxLength: 17, placeholder: "17 символа" };
const WARRANTY: AttributeDefinition = { key: "warrantyMonths", label: "Гаранция", type: "number", unit: "мес.", min: 1, max: 120 };
const SERVICE_HISTORY: AttributeDefinition = { key: "serviceHistory", label: "Сервизна история", type: "boolean", filterable: true };
const PAYLOAD: AttributeDefinition = { key: "payloadKg", label: "Товароносимост", type: "number", unit: "кг", min: 50, max: 60000 };
const GVW: AttributeDefinition = { key: "gvwKg", label: "Обща допустима маса", type: "number", unit: "кг", min: 100, max: 60000 };
const BERTHS: AttributeDefinition = { key: "berths", label: "Спални места", type: "number", min: 1, max: 12, filterable: true };
const LENGTH: AttributeDefinition = { key: "lengthCm", label: "Дължина", type: "number", unit: "см", min: 100, max: 2000 };
const HOURS: AttributeDefinition = { key: "hours", label: "Моточасове", type: "number", unit: "ч", min: 0, max: 200000, filterable: true };
const AXLES: AttributeDefinition = {
  key: "axles",
  label: "Брой оси",
  type: "select",
  options: [
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4+" },
  ],
  filterable: true,
};

export const ATTRIBUTE_SETS = {
  car: {
    key: "car",
    label: "Леки автомобили",
    core: {
      make: req, model: req, generation: opt, year: req, mileage: req, fuel: req, gearbox: req,
      power: opt, engine: opt, drivetrain: opt, bodyType: req, color: opt,
    },
    bodyTypes: "car",
    conditions: CONDITION_OPTIONS,
    attributes: [DOORS, SEATS, EURO, REGISTERED, VIN, WARRANTY, SERVICE_HISTORY],
    featureGroups: ["safety", "comfort", "multimedia", "exterior", "other"],
    yearMin: 1950,
  },
  suv: {
    key: "suv",
    label: "Джипове",
    core: {
      make: req, model: req, generation: opt, year: req, mileage: req, fuel: req, gearbox: req,
      power: opt, engine: opt, drivetrain: opt, bodyType: req, color: opt,
    },
    bodyTypes: "suv",
    conditions: CONDITION_OPTIONS,
    attributes: [DOORS, SEATS, EURO, REGISTERED, VIN, WARRANTY, SERVICE_HISTORY],
    featureGroups: ["safety", "comfort", "multimedia", "exterior", "other"],
    yearMin: 1950,
  },
  van: {
    key: "van",
    label: "Бусове",
    core: {
      make: req, model: req, year: req, mileage: req, fuel: req, gearbox: req,
      power: opt, engine: opt, drivetrain: opt, bodyType: req, color: opt,
    },
    bodyTypes: "van",
    conditions: CONDITION_OPTIONS,
    attributes: [SEATS, PAYLOAD, GVW, EURO, REGISTERED, VIN],
    featureGroups: ["safety", "comfort", "multimedia", "exterior", "other"],
    yearMin: 1960,
  },
  truck: {
    key: "truck",
    label: "Камиони",
    core: {
      make: req, model: req, year: req, mileage: req, fuel: req, gearbox: req,
      power: opt, bodyType: req, color: opt,
    },
    bodyTypes: "truck",
    conditions: CONDITION_OPTIONS,
    attributes: [AXLES, GVW, PAYLOAD, EURO, REGISTERED, VIN],
    featureGroups: ["safety", "comfort", "multimedia"],
    yearMin: 1960,
  },
  motorcycle: {
    key: "motorcycle",
    label: "Мотоциклети",
    core: {
      make: req, model: req, year: req, mileage: req, fuel: opt, gearbox: opt,
      power: opt, engine: req, bodyType: req, color: opt,
    },
    bodyTypes: "motorcycle",
    conditions: CONDITION_OPTIONS,
    attributes: [REGISTERED, VIN],
    featureGroups: ["safety", "other"],
    yearMin: 1930,
  },
  caravan: {
    key: "caravan",
    label: "Каравани",
    core: { make: req, model: req, year: req, bodyType: opt, color: opt },
    bodyTypes: "caravan",
    conditions: USED_NEW,
    attributes: [BERTHS, LENGTH, GVW, AXLES, REGISTERED],
    featureGroups: ["comfort", "other"],
    yearMin: 1960,
  },
  camper: {
    key: "camper",
    label: "Кемпери",
    core: {
      make: req, model: req, year: req, mileage: req, fuel: req, gearbox: req,
      power: opt, engine: opt, bodyType: req, color: opt,
    },
    bodyTypes: "camper",
    conditions: CONDITION_OPTIONS,
    attributes: [BERTHS, SEATS, LENGTH, GVW, EURO, REGISTERED, VIN],
    featureGroups: ["safety", "comfort", "multimedia", "exterior", "other"],
    yearMin: 1970,
  },
  agri: {
    key: "agri",
    label: "Селскостопанска техника",
    core: { make: req, model: req, year: req, fuel: opt, power: opt, drivetrain: opt, bodyType: req },
    bodyTypes: "agri",
    bodyTypeLabel: "Вид",
    conditions: USED_NEW,
    attributes: [HOURS],
    featureGroups: [],
    yearMin: 1950,
  },
  construction: {
    key: "construction",
    label: "Строителна техника",
    core: { make: req, model: req, year: req, fuel: opt, power: opt, bodyType: req },
    bodyTypes: "construction",
    bodyTypeLabel: "Вид",
    conditions: USED_NEW,
    attributes: [
      HOURS,
      { key: "operatingWeightKg", label: "Работно тегло", type: "number", unit: "кг", min: 100, max: 500000 },
    ],
    featureGroups: [],
    yearMin: 1950,
  },
  trailer: {
    key: "trailer",
    label: "Ремаркета",
    core: { make: req, model: opt, year: req, bodyType: req },
    bodyTypes: "trailer",
    bodyTypeLabel: "Вид",
    conditions: USED_NEW,
    attributes: [AXLES, GVW, PAYLOAD, REGISTERED],
    featureGroups: [],
    yearMin: 1950,
  },
  parts: {
    key: "parts",
    label: "Части",
    core: { make: opt, model: opt },
    conditions: USED_NEW,
    attributes: [
      {
        key: "partType",
        label: "Вид част",
        type: "select",
        required: true,
        filterable: true,
        options: [
          { value: "engine", label: "Двигател" },
          { value: "gearbox", label: "Скоростна кутия" },
          { value: "body", label: "Каросерия" },
          { value: "suspension", label: "Окачване" },
          { value: "brakes", label: "Спирачна система" },
          { value: "electrical", label: "Електрическа система" },
          { value: "interior", label: "Интериор" },
          { value: "lighting", label: "Осветление" },
          { value: "exhaust", label: "Изпускателна система" },
          { value: "cooling", label: "Охладителна система" },
          { value: "other", label: "Друго" },
        ],
      },
      { key: "partNumber", label: "Каталожен номер", type: "text", maxLength: 40 },
    ],
    featureGroups: [],
    yearMin: 1950,
  },
  tires: {
    key: "tires",
    label: "Гуми и джанти",
    core: {},
    conditions: USED_NEW,
    attributes: [
      {
        key: "productType",
        label: "Продукт",
        type: "select",
        required: true,
        filterable: true,
        options: [
          { value: "tires", label: "Гуми" },
          { value: "rims", label: "Джанти" },
          { value: "wheels", label: "Гуми с джанти" },
        ],
      },
      {
        key: "season",
        label: "Сезон",
        type: "select",
        filterable: true,
        options: [
          { value: "summer", label: "Летни" },
          { value: "winter", label: "Зимни" },
          { value: "all-season", label: "Всесезонни" },
        ],
      },
      { key: "width", label: "Ширина", type: "number", unit: "мм", min: 100, max: 400, filterable: true },
      { key: "aspect", label: "Профил", type: "number", unit: "%", min: 20, max: 95, filterable: true },
      { key: "rim", label: "Диаметър", type: "number", unit: "\"", min: 10, max: 24, filterable: true },
      { key: "quantity", label: "Брой", type: "number", min: 1, max: 12 },
      { key: "tireBrand", label: "Марка гуми", type: "text", maxLength: 40 },
      { key: "boltPattern", label: "Болтово разстояние", type: "text", maxLength: 12, placeholder: "5x112" },
    ],
    featureGroups: [],
    yearMin: 1990,
  },
} as const satisfies Record<string, AttributeSet>;

export type AttributeSetKey = keyof typeof ATTRIBUTE_SETS;

export const ATTRIBUTE_SET_KEYS = Object.keys(ATTRIBUTE_SETS) as AttributeSetKey[];

export function getAttributeSet(key: string): AttributeSet {
  return (ATTRIBUTE_SETS as Record<string, AttributeSet>)[key] ?? ATTRIBUTE_SETS.car;
}

export function usesCore(set: AttributeSet, field: CoreField): boolean {
  return field in set.core;
}

export function coreRequired(set: AttributeSet, field: CoreField): boolean {
  return set.core[field]?.required ?? false;
}

export function findAttribute(set: AttributeSet, key: string): AttributeDefinition | undefined {
  return set.attributes.find((attribute) => attribute.key === key);
}
