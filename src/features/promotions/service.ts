import "server-only";
import { desc, eq } from "drizzle-orm";
import { getPromotionProduct, type PromotionType } from "@/config/promotions";
import { db, type DbOrTx, type Transaction } from "@/db/client";
import { categories, listings, payments, promotions } from "@/db/schema";
import { listingPath } from "@/features/listings/paths";
import { notify } from "@/features/notifications/service";
import { formatDate } from "@/lib/format";
import { AppError } from "@/server/errors";
import { activePromotionsOf, promotionEnd, promotionWindow, type ActivePromotion } from "./catalog";

export type ActivatedPromotion = { promotionId: string; type: PromotionType; startsAt: Date; endsAt: Date; listingPath: string };

/**
 * Runs inside the payment transaction so the payment, the promotion row, the listing columns
 * and the notification commit or roll back together.
 */
export async function activatePromotion(
  tx: Transaction,
  input: { listingId: string; type: PromotionType; paymentId: string | null; userId: string },
  now: Date = new Date(),
): Promise<ActivatedPromotion> {
  const product = getPromotionProduct(input.type);
  if (!product) throw new AppError("VALIDATION", "Невалиден пакет.");

  const [listing] = await tx
    .select({
      id: listings.id,
      title: listings.title,
      number: listings.number,
      slug: listings.slug,
      categorySlug: categories.slug,
      vipUntil: listings.vipUntil,
      topUntil: listings.topUntil,
      highlightUntil: listings.highlightUntil,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(eq(listings.id, input.listingId))
    .for("update", { of: listings })
    .limit(1);
  if (!listing) throw new AppError("NOT_FOUND", "Обявата не е намерена.");

  const { startsAt, endsAt } = promotionWindow(product, input.type === "REFRESH" ? null : promotionEnd(listing, input.type), now);
  const patch: Partial<typeof listings.$inferInsert> =
    input.type === "VIP" ? { vipUntil: endsAt } : input.type === "TOP" ? { topUntil: endsAt } : input.type === "HIGHLIGHT" ? { highlightUntil: endsAt } : { sortDate: now };
  await tx.update(listings).set(patch).where(eq(listings.id, listing.id));

  const [row] = await tx
    .insert(promotions)
    .values({ listingId: listing.id, paymentId: input.paymentId, type: input.type, startsAt, endsAt, createdById: input.userId })
    .returning({ id: promotions.id });
  if (!row) throw new Error("promotion insert failed");

  const path = listingPath({ categorySlug: listing.categorySlug, number: listing.number, slug: listing.slug });
  await notify(
    input.type === "REFRESH"
      ? { userId: input.userId, type: "PROMOTION_ACTIVATED", title: "Обявата е обновена", body: `„${listing.title}“ е преместена най-отгоре при подреждане по най-нови.`, link: path }
      : { userId: input.userId, type: "PROMOTION_ACTIVATED", title: `Промоция ${product.name} е активирана`, body: `„${listing.title}“ е промотирана до ${formatDate(endsAt)}.`, link: path },
    tx,
  );

  return { promotionId: row.id, type: input.type, startsAt, endsAt, listingPath: path };
}

export async function getActivePromotions(listingId: string, tx: DbOrTx = db, now: Date = new Date()): Promise<ActivePromotion[]> {
  const [listing] = await tx
    .select({ vipUntil: listings.vipUntil, topUntil: listings.topUntil, highlightUntil: listings.highlightUntil })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  return listing ? activePromotionsOf(listing, now) : [];
}

export type PromotionHistoryItem = {
  id: string;
  type: PromotionType;
  startsAt: Date;
  endsAt: Date;
  createdAt: Date;
  amountCents: number | null;
  paymentReference: string | null;
};

export async function getPromotionHistory(listingId: string, limit = 20): Promise<PromotionHistoryItem[]> {
  return db
    .select({
      id: promotions.id,
      type: promotions.type,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      createdAt: promotions.createdAt,
      amountCents: payments.amountCents,
      paymentReference: payments.providerReference,
    })
    .from(promotions)
    .leftJoin(payments, eq(payments.id, promotions.paymentId))
    .where(eq(promotions.listingId, listingId))
    .orderBy(desc(promotions.createdAt), desc(promotions.id))
    .limit(limit);
}
