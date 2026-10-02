import { describe, expect, it } from "vitest";
import { getPromotionProduct, PROMOTION_PRODUCTS } from "@/config/promotions";
import { DemoPaymentProvider } from "@/features/payments/demo-provider";
import { getPaymentProvider } from "@/features/payments/provider";
import {
  formatCardNumber,
  formatExpiryInput,
  isExpiryCurrentOrFuture,
  isValidCardNumberFormat,
  isValidCvc,
  parseExpiry,
} from "@/features/payments/card-validation";
import { activePromotionsOf, promotionWindow } from "@/features/promotions/catalog";

const input = {
  paymentId: "00000000-0000-4000-8000-000000000001",
  amountCents: 999,
  currency: "EUR" as const,
  description: "VIP",
  metadata: { listingId: "l", promotionType: "VIP" as const, userId: "u" },
};

describe("demo payment provider", () => {
  it("succeeds for a valid EUR amount without any configuration", async () => {
    const result = await new DemoPaymentProvider().createPayment(input);
    expect(result).toMatchObject({ status: "SUCCEEDED", provider: "DEMO", amountCents: 999, currency: "EUR" });
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("fails for impossible amounts", async () => {
    expect((await new DemoPaymentProvider().createPayment({ ...input, amountCents: 0 })).status).toBe("FAILED");
  });

  it("is the active provider", () => {
    expect(getPaymentProvider()).toBeInstanceOf(DemoPaymentProvider);
  });

  it("prices promotions in integer cents", () => {
    expect(getPromotionProduct("VIP")?.priceCents).toBe(999);
    expect(getPromotionProduct("TOP")?.priceCents).toBe(499);
    expect(PROMOTION_PRODUCTS.every((product) => Number.isInteger(product.priceCents))).toBe(true);
  });
});

describe("card form validation", () => {
  it("accepts any syntactically valid card number without a Luhn check", () => {
    expect(isValidCardNumberFormat("4111 1111 1111 1111")).toBe(true);
    expect(isValidCardNumberFormat("1234567890123")).toBe(true);
    expect(isValidCardNumberFormat("1234 5678")).toBe(false);
    expect(isValidCardNumberFormat("4111-1111-1111-111a")).toBe(false);
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
  });

  it("validates expiry and CVC", () => {
    const now = new Date("2026-10-02T12:00:00Z");
    expect(formatExpiryInput("1230")).toBe("12/30");
    expect(parseExpiry("13/30")).toBeNull();
    const current = parseExpiry("10/26");
    expect(current && isExpiryCurrentOrFuture(current, now)).toBe(true);
    const past = parseExpiry("09/26");
    expect(past && isExpiryCurrentOrFuture(past, now)).toBe(false);
    expect(isValidCvc("123")).toBe(true);
    expect(isValidCvc("12")).toBe(false);
  });
});

describe("promotion windows", () => {
  const vip = getPromotionProduct("VIP")!;
  const now = new Date("2026-10-02T12:00:00Z");

  it("starts now when nothing is active and extends an active promotion", () => {
    expect(promotionWindow(vip, null, now)).toMatchObject({ startsAt: now, extended: false });
    const currentEnd = new Date("2026-10-05T12:00:00Z");
    const extended = promotionWindow(vip, currentEnd, now);
    expect(extended.startsAt).toEqual(currentEnd);
    expect(extended.endsAt.getTime() - currentEnd.getTime()).toBe(14 * 86_400_000);
  });

  it("lists only promotions that are still running", () => {
    const active = activePromotionsOf({ vipUntil: new Date("2026-10-10T00:00:00Z"), topUntil: new Date("2026-09-01T00:00:00Z"), highlightUntil: null }, now);
    expect(active.map((promotion) => promotion.type)).toEqual(["VIP"]);
  });
});
