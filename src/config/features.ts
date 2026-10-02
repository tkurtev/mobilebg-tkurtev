export type FeatureGroupKey = "safety" | "comfort" | "multimedia" | "exterior" | "other";

export type FeatureDefinition = { key: string; label: string; group: FeatureGroupKey };

export const FEATURE_GROUPS: readonly { key: FeatureGroupKey; label: string }[] = [
  { key: "safety", label: "Безопасност" },
  { key: "comfort", label: "Комфорт" },
  { key: "multimedia", label: "Мултимедия" },
  { key: "exterior", label: "Екстериор" },
  { key: "other", label: "Други" },
];

export const FEATURES: readonly FeatureDefinition[] = [
  { key: "abs", label: "ABS", group: "safety" },
  { key: "esp", label: "ESP", group: "safety" },
  { key: "airbags", label: "Въздушни възглавници", group: "safety" },
  { key: "lane-assist", label: "Асистент за лентата", group: "safety" },
  { key: "blind-spot", label: "Следене на мъртвата зона", group: "safety" },
  { key: "adaptive-cruise", label: "Адаптивен круиз контрол", group: "safety" },
  { key: "parking-sensors", label: "Парктроник", group: "safety" },
  { key: "rear-camera", label: "Камера за задно виждане", group: "safety" },
  { key: "camera-360", label: "Камера 360°", group: "safety" },
  { key: "isofix", label: "Isofix", group: "safety" },

  { key: "air-conditioning", label: "Климатик", group: "comfort" },
  { key: "climate-control", label: "Климатроник", group: "comfort" },
  { key: "heated-seats", label: "Подгрев на седалките", group: "comfort" },
  { key: "ventilated-seats", label: "Вентилация на седалките", group: "comfort" },
  { key: "electric-seats", label: "Електрически седалки", group: "comfort" },
  { key: "memory-seats", label: "Памет на седалките", group: "comfort" },
  { key: "panoramic-roof", label: "Панорамен покрив", group: "comfort" },
  { key: "keyless", label: "Безключов достъп", group: "comfort" },
  { key: "cruise-control", label: "Круиз контрол", group: "comfort" },
  { key: "leather", label: "Кожен салон", group: "comfort" },
  { key: "heated-steering", label: "Подгрев на волана", group: "comfort" },

  { key: "navigation", label: "Навигация", group: "multimedia" },
  { key: "bluetooth", label: "Bluetooth", group: "multimedia" },
  { key: "apple-carplay", label: "Apple CarPlay", group: "multimedia" },
  { key: "android-auto", label: "Android Auto", group: "multimedia" },
  { key: "premium-audio", label: "Премиум аудио", group: "multimedia" },
  { key: "digital-cockpit", label: "Дигитално табло", group: "multimedia" },

  { key: "alloy-wheels", label: "Лети джанти", group: "exterior" },
  { key: "led-lights", label: "LED фарове", group: "exterior" },
  { key: "tow-hitch", label: "Теглич", group: "exterior" },
  { key: "roof-rails", label: "Рейлинги", group: "exterior" },

  { key: "first-owner", label: "Първи собственик", group: "other" },
  { key: "garage-kept", label: "Гаражен", group: "other" },
];

const FEATURE_BY_KEY = new Map(FEATURES.map((feature) => [feature.key, feature]));

export function getFeature(key: string): FeatureDefinition | undefined {
  return FEATURE_BY_KEY.get(key);
}

export function isFeatureKey(key: string): boolean {
  return FEATURE_BY_KEY.has(key);
}

export function groupFeatures(keys: readonly string[], allowedGroups?: readonly FeatureGroupKey[]) {
  const selected = new Set(keys);
  return FEATURE_GROUPS.filter((group) => !allowedGroups || allowedGroups.includes(group.key))
    .map((group) => ({
      ...group,
      features: FEATURES.filter((feature) => feature.group === group.key && selected.has(feature.key)),
    }))
    .filter((group) => group.features.length > 0);
}

export function featuresForGroups(groups: readonly FeatureGroupKey[]) {
  return FEATURE_GROUPS.filter((group) => groups.includes(group.key)).map((group) => ({
    ...group,
    features: FEATURES.filter((feature) => feature.group === group.key),
  }));
}
