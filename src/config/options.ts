export type Option<V extends string = string> = { value: V; label: string };

export function optionLabel<V extends string>(options: readonly Option<V>[], value: string | null | undefined): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}

export function optionValues<V extends string>(options: readonly Option<V>[]): [V, ...V[]] {
  return options.map((option) => option.value) as [V, ...V[]];
}

export const FUEL_OPTIONS = [
  { value: "petrol", label: "Бензин" },
  { value: "diesel", label: "Дизел" },
  { value: "lpg", label: "Газ/Бензин" },
  { value: "cng", label: "Метан/Бензин" },
  { value: "hybrid", label: "Хибрид" },
  { value: "plugin-hybrid", label: "Плъгин хибрид" },
  { value: "electric", label: "Електрически" },
] as const satisfies readonly Option[];

export const GEARBOX_OPTIONS = [
  { value: "manual", label: "Ръчна" },
  { value: "automatic", label: "Автоматична" },
  { value: "semi-automatic", label: "Полуавтоматична" },
] as const satisfies readonly Option[];

export const DRIVETRAIN_OPTIONS = [
  { value: "fwd", label: "Предно" },
  { value: "rwd", label: "Задно" },
  { value: "awd", label: "4x4" },
] as const satisfies readonly Option[];

export const CONDITION_OPTIONS = [
  { value: "new", label: "Нов" },
  { value: "used", label: "Употребяван" },
  { value: "damaged", label: "Повреден" },
  { value: "for-parts", label: "За части" },
] as const satisfies readonly Option[];

export const COLOR_OPTIONS = [
  { value: "black", label: "Черен", hex: "#1c1c1e" },
  { value: "white", label: "Бял", hex: "#f4f4f2" },
  { value: "silver", label: "Сребрист", hex: "#b9bdc2" },
  { value: "gray", label: "Сив", hex: "#6b7076" },
  { value: "blue", label: "Син", hex: "#24508f" },
  { value: "red", label: "Червен", hex: "#a8262b" },
  { value: "green", label: "Зелен", hex: "#2f6b45" },
  { value: "brown", label: "Кафяв", hex: "#6a4a33" },
  { value: "beige", label: "Бежов", hex: "#d6c6a5" },
  { value: "yellow", label: "Жълт", hex: "#e2b93b" },
  { value: "orange", label: "Оранжев", hex: "#d4692a" },
  { value: "other", label: "Друг", hex: "#9aa0a6" },
] as const satisfies readonly (Option & { hex: string })[];

export const EMISSION_OPTIONS = [
  { value: "euro1", label: "Евро 1" },
  { value: "euro2", label: "Евро 2" },
  { value: "euro3", label: "Евро 3" },
  { value: "euro4", label: "Евро 4" },
  { value: "euro5", label: "Евро 5" },
  { value: "euro6", label: "Евро 6" },
] as const satisfies readonly Option[];

export const SELLER_TYPE_OPTIONS = [
  { value: "private", label: "Частно лице" },
  { value: "dealer", label: "Дилър" },
] as const satisfies readonly Option[];

export const BODY_TYPE_OPTIONS = {
  car: [
    { value: "sedan", label: "Седан" },
    { value: "hatchback", label: "Хечбек" },
    { value: "wagon", label: "Комби" },
    { value: "coupe", label: "Купе" },
    { value: "convertible", label: "Кабрио" },
    { value: "minivan", label: "Миниван" },
    { value: "suv", label: "Джип" },
    { value: "crossover", label: "Кросоувър" },
    { value: "pickup", label: "Пикап" },
  ],
  suv: [
    { value: "suv", label: "Джип" },
    { value: "crossover", label: "Кросоувър" },
    { value: "pickup", label: "Пикап" },
  ],
  van: [
    { value: "cargo-van", label: "Товарен" },
    { value: "passenger-van", label: "Пътнически" },
    { value: "minibus", label: "Микробус" },
    { value: "chassis-cab", label: "Шаси с кабина" },
    { value: "dropside", label: "Бордови" },
  ],
  truck: [
    { value: "tractor-unit", label: "Влекач" },
    { value: "box", label: "Фургон" },
    { value: "tipper", label: "Самосвал" },
    { value: "flatbed", label: "Платформа" },
    { value: "refrigerated", label: "Хладилен" },
    { value: "tanker", label: "Цистерна" },
  ],
  motorcycle: [
    { value: "naked", label: "Нейкид" },
    { value: "sport", label: "Спортен" },
    { value: "touring", label: "Туринг" },
    { value: "adventure", label: "Ендуро/Туринг" },
    { value: "cruiser", label: "Чопър/Круизър" },
    { value: "scooter", label: "Скутер" },
    { value: "cross", label: "Крос" },
    { value: "atv", label: "ATV" },
  ],
  caravan: [
    { value: "standard", label: "Стандартна" },
    { value: "compact", label: "Компактна" },
    { value: "twin-axle", label: "Двуосна" },
  ],
  camper: [
    { value: "alcove", label: "Алкова" },
    { value: "semi-integrated", label: "Полуинтегриран" },
    { value: "integrated", label: "Интегриран" },
    { value: "van-conversion", label: "Кемпер ван" },
  ],
  agri: [
    { value: "tractor", label: "Трактор" },
    { value: "combine", label: "Комбайн" },
    { value: "sprayer", label: "Пръскачка" },
    { value: "seeder", label: "Сеялка" },
    { value: "plough", label: "Плуг" },
    { value: "other", label: "Друга" },
  ],
  construction: [
    { value: "excavator", label: "Багер" },
    { value: "mini-excavator", label: "Мини багер" },
    { value: "wheel-loader", label: "Челен товарач" },
    { value: "backhoe-loader", label: "Комбиниран багер" },
    { value: "bulldozer", label: "Булдозер" },
    { value: "crane", label: "Кран" },
    { value: "forklift", label: "Мотокар" },
    { value: "roller", label: "Валяк" },
    { value: "other", label: "Друга" },
  ],
  trailer: [
    { value: "car-trailer", label: "За автомобили" },
    { value: "platform", label: "Платформа" },
    { value: "box", label: "Фургон" },
    { value: "curtainsider", label: "Тентован" },
    { value: "tipper", label: "Самосвално" },
    { value: "refrigerated", label: "Хладилно" },
    { value: "lowloader", label: "Нископлатформено" },
    { value: "boat", label: "За лодка" },
  ],
} as const satisfies Record<string, readonly Option[]>;

export type BodyTypeGroup = keyof typeof BODY_TYPE_OPTIONS;

export const ALL_BODY_TYPES: readonly Option[] = Object.values(BODY_TYPE_OPTIONS).flat();

export function bodyTypeLabel(value: string | null | undefined): string | null {
  return optionLabel(ALL_BODY_TYPES, value);
}
