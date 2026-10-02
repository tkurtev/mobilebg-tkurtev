import { getPromotionProduct, type PromotionProduct, type PromotionType } from "@/config/promotions";

export const PROMOTION_TYPES = ["VIP", "TOP", "HIGHLIGHT", "REFRESH"] as const satisfies readonly PromotionType[];

export type TimedPromotionType = Exclude<PromotionType, "REFRESH">;

/** Ranking order used when listing several active promotions. */
export const TIMED_PROMOTION_TYPES: readonly TimedPromotionType[] = ["VIP", "TOP", "HIGHLIGHT"];

const DAY_MS = 86_400_000;

export function promotionName(type: PromotionType): string {
  return getPromotionProduct(type)?.name ?? type;
}

export function promotionDurationLabel(product: PromotionProduct): string {
  if (product.durationDays === 0) return "Еднократно";
  return product.durationDays === 1 ? "1 ден" : `${product.durationDays} дни`;
}

export type PromotionWindow = { startsAt: Date; endsAt: Date; extended: boolean };

/**
 * Buying a type that is still active extends it from its current end date; otherwise it starts now.
 * REFRESH is instant, so it starts and ends at the same moment.
 */
export function promotionWindow(product: PromotionProduct, currentEnd: Date | null, now: Date = new Date()): PromotionWindow {
  if (product.durationDays === 0) return { startsAt: now, endsAt: now, extended: false };
  const extended = currentEnd !== null && currentEnd > now;
  const startsAt = extended ? currentEnd : now;
  return { startsAt, endsAt: new Date(startsAt.getTime() + product.durationDays * DAY_MS), extended };
}

export type PromotionColumns = { vipUntil: Date | null; topUntil: Date | null; highlightUntil: Date | null };

export function promotionEnd(listing: PromotionColumns, type: TimedPromotionType): Date | null {
  if (type === "VIP") return listing.vipUntil;
  if (type === "TOP") return listing.topUntil;
  return listing.highlightUntil;
}

export type ActivePromotion = { type: TimedPromotionType; endsAt: Date };

/** The denormalized listing columns are the source of truth for what is active (they drive ranking). */
export function activePromotionsOf(listing: PromotionColumns, now: Date = new Date()): ActivePromotion[] {
  return TIMED_PROMOTION_TYPES.flatMap((type) => {
    const endsAt = promotionEnd(listing, type);
    return endsAt && endsAt > now ? [{ type, endsAt }] : [];
  });
}
