import type { PromotionType } from "@/config/promotions";

export type CheckoutInput = { listingId: string; promotionType: PromotionType };

export type CheckoutResult = {
  paymentId: string;
  promotionType: PromotionType;
  amountCents: number;
  /** ISO timestamp. Equals the payment time for REFRESH. */
  endsAt: string;
  listingPath: string;
  /** Provider reference shown to the user as the demo receipt number. */
  reference: string;
};
