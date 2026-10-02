import type { PromotionType } from "@/config/promotions";
import type { paymentProviderEnum, paymentStatusEnum } from "@/db/schema/enums";
import { DemoPaymentProvider } from "./demo-provider";

export type PaymentProviderName = (typeof paymentProviderEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];

/**
 * What the marketplace hands to a provider. There are deliberately no card fields: card data
 * is entered on the provider's side (or, for the demo, only checked in the browser).
 */
export type CreatePaymentInput = {
  /** Our payments.id; a real provider can use it as the idempotency key. */
  paymentId: string;
  amountCents: number;
  currency: "EUR";
  description: string;
  metadata: { listingId: string; promotionType: PromotionType; userId: string };
};

export type PaymentResult = {
  id: string;
  status: PaymentStatus;
  provider: PaymentProviderName;
  amountCents: number;
  currency: "EUR";
};

export interface PaymentProvider {
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
}

const demoProvider = new DemoPaymentProvider();

/** The single place that picks a provider. Marketplace logic only depends on PaymentProvider. */
export function getPaymentProvider(): PaymentProvider {
  return demoProvider;
}
