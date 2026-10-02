import type { AttributeSetKey } from "./attribute-sets";

export type VehicleType =
  | "car"
  | "van"
  | "truck"
  | "motorcycle"
  | "caravan"
  | "camper"
  | "agri"
  | "construction"
  | "trailer";

export const VEHICLE_TYPES: readonly { value: VehicleType; label: string }[] = [
  { value: "car", label: "Леки автомобили и джипове" },
  { value: "van", label: "Бусове" },
  { value: "truck", label: "Камиони" },
  { value: "motorcycle", label: "Мотоциклети" },
  { value: "caravan", label: "Каравани" },
  { value: "camper", label: "Кемпери" },
  { value: "agri", label: "Селскостопанска техника" },
  { value: "construction", label: "Строителна техника" },
  { value: "trailer", label: "Ремаркета" },
];

/** Initial category tree. Admins can rename, reorder, hide and add categories afterwards. */
export const DEFAULT_CATEGORIES: readonly {
  slug: string;
  name: string;
  attributeSet: AttributeSetKey;
  vehicleType: VehicleType | null;
}[] = [
  { slug: "avtomobili", name: "Автомобили", attributeSet: "car", vehicleType: "car" },
  { slug: "dzhipove", name: "Джипове", attributeSet: "suv", vehicleType: "car" },
  { slug: "busove", name: "Бусове", attributeSet: "van", vehicleType: "van" },
  { slug: "kamioni", name: "Камиони", attributeSet: "truck", vehicleType: "truck" },
  { slug: "motocikleti", name: "Мотоциклети", attributeSet: "motorcycle", vehicleType: "motorcycle" },
  { slug: "karavani", name: "Каравани", attributeSet: "caravan", vehicleType: "caravan" },
  { slug: "kemperi", name: "Кемпери", attributeSet: "camper", vehicleType: "camper" },
  { slug: "selskostopanska-tehnika", name: "Селскостопанска техника", attributeSet: "agri", vehicleType: "agri" },
  { slug: "stroitelna-tehnika", name: "Строителна техника", attributeSet: "construction", vehicleType: "construction" },
  { slug: "remarketa", name: "Ремаркета", attributeSet: "trailer", vehicleType: "trailer" },
  { slug: "chasti", name: "Части", attributeSet: "parts", vehicleType: "car" },
  { slug: "gumi-i-dzhanti", name: "Гуми и джанти", attributeSet: "tires", vehicleType: null },
];

export const DEFAULT_CATEGORY_SLUG = "avtomobili";
