import "server-only";
import { and, eq, gt, sql } from "drizzle-orm";
import { getPromotionProduct } from "@/config/promotions";
import { db } from "@/db/client";
import { listings, payments } from "@/db/schema";
import { activatePromotion } from "@/features/promotions/service";
import { canManageListing, isPubliclyVisible, type Actor } from "@/server/auth/policies";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { getPaymentProvider, type PaymentResult } from "./provider";
import type { CheckoutInput, CheckoutResult } from "./types";

const NOT_PROMOTABLE = "Само активни обяви могат да бъдат промотирани.";

/**
 * Charges for a promotion and activates it. The amount always comes from PROMOTION_PRODUCTS;
 * the client only names the listing and the package.
 */
export async function purchasePromotion(actor: Actor, input: CheckoutInput): Promise<CheckoutResult> {
  const product = getPromotionProduct(input.promotionType);
  if (!product) throw new AppError("VALIDATION", "Невалиден пакет.");

  const [listing] = await db
    .select({
      id: listings.id,
      number: listings.number,
      sellerId: listings.sellerId,
      dealerId: listings.dealerId,
      status: listings.status,
      expiresAt: listings.expiresAt,
      deletedAt: listings.deletedAt,
    })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);
  if (!listing || listing.deletedAt !== null || !canManageListing(actor, listing)) throw new AppError("NOT_FOUND", "Обявата не е намерена.");
  if (!isPubliclyVisible(listing)) throw new AppError("CONFLICT", NOT_PROMOTABLE);
  await enforceRateLimit("checkout", actor.id);

  const provider = getPaymentProvider();
  const outcome = await db.transaction(async (tx) => {
    // The row lock serializes concurrent checkouts for one listing, so the duplicate check below is reliable.
    const [locked] = await tx
      .select({ status: listings.status, expiresAt: listings.expiresAt, deletedAt: listings.deletedAt })
      .from(listings)
      .where(eq(listings.id, listing.id))
      .for("update")
      .limit(1);
    if (!locked || !isPubliclyVisible(locked)) throw new AppError("CONFLICT", NOT_PROMOTABLE);

    const [recent] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.listingId, listing.id),
          eq(payments.promotionType, product.type),
          eq(payments.status, "SUCCEEDED"),
          gt(payments.createdAt, sql`now() - interval '15 seconds'`),
        ),
      )
      .limit(1);
    if (recent) throw new AppError("CONFLICT", "Това плащане вече е обработено. Провери историята на плащанията.");

    const [payment] = await tx
      .insert(payments)
      .values({ userId: actor.id, listingId: listing.id, promotionType: product.type, amountCents: product.priceCents, currency: "EUR", status: "PENDING" })
      .returning({ id: payments.id });
    if (!payment) throw new Error("payment insert failed");

    let result: PaymentResult | null = null;
    try {
      result = await provider.createPayment({
        paymentId: payment.id,
        amountCents: product.priceCents,
        currency: "EUR",
        description: `${product.name}, обява № ${listing.number}`,
        metadata: { listingId: listing.id, promotionType: product.type, userId: actor.id },
      });
    } catch (error) {
      console.error("[payments] provider error", error instanceof Error ? error.message : "unknown");
    }

    if (!result || result.status !== "SUCCEEDED" || result.amountCents !== product.priceCents || result.currency !== "EUR") {
      await tx.update(payments).set({ status: "FAILED", providerReference: result?.id ?? null }).where(eq(payments.id, payment.id));
      return { ok: false as const };
    }

    await tx.update(payments).set({ status: "SUCCEEDED", provider: result.provider, providerReference: result.id }).where(eq(payments.id, payment.id));
    const promotion = await activatePromotion(tx, { listingId: listing.id, type: product.type, paymentId: payment.id, userId: actor.id });
    return { ok: true as const, paymentId: payment.id, reference: result.id, promotion };
  });

  // Thrown after commit so the FAILED payment row is kept for the history.
  if (!outcome.ok) throw new AppError("CONFLICT", "Плащането не беше одобрено. Опитай отново.");

  return {
    paymentId: outcome.paymentId,
    promotionType: product.type,
    amountCents: product.priceCents,
    endsAt: outcome.promotion.endsAt.toISOString(),
    listingPath: outcome.promotion.listingPath,
    reference: outcome.reference,
  };
}
