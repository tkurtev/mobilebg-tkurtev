export type PromotionType = "TOP" | "VIP" | "HIGHLIGHT" | "REFRESH";

export type PromotionProduct = {
  type: PromotionType;
  name: string;
  description: string;
  priceCents: number;
  durationDays: number;
  /** Higher ranks are listed first. Standard listings have rank 0. */
  rank: number;
};

export const PROMOTION_PRODUCTS: readonly PromotionProduct[] = [
  {
    type: "VIP",
    name: "VIP",
    description: "Най-отгоре в резултатите и в секцията с промотирани обяви на началната страница.",
    priceCents: 999,
    durationDays: 14,
    rank: 2,
  },
  {
    type: "TOP",
    name: "TOP",
    description: "Над стандартните обяви в резултатите от търсене.",
    priceCents: 499,
    durationDays: 7,
    rank: 1,
  },
  {
    type: "HIGHLIGHT",
    name: "Открояване",
    description: "Обявата се показва с цветен фон в резултатите.",
    priceCents: 299,
    durationDays: 7,
    rank: 0,
  },
  {
    type: "REFRESH",
    name: "Обновяване",
    description: "Обявата се връща най-отгоре при подреждане по най-нови.",
    priceCents: 149,
    durationDays: 0,
    rank: 0,
  },
];

export function getPromotionProduct(type: string): PromotionProduct | undefined {
  return PROMOTION_PRODUCTS.find((product) => product.type === type);
}

export function isPromotionType(value: string): value is PromotionType {
  return PROMOTION_PRODUCTS.some((product) => product.type === value);
}
