import "server-only";
import { desc, eq } from "drizzle-orm";
import type { PromotionType } from "@/config/promotions";
import { db } from "@/db/client";
import { categories, listings, payments } from "@/db/schema";
import { listingPath } from "@/features/listings/paths";
import { isPubliclyVisible } from "@/server/auth/policies";
import type { PaymentProviderName, PaymentStatus } from "./provider";

export const PAYMENTS_PAGE_SIZE = 25;

export type PaymentHistoryItem = {
  id: string;
  createdAt: Date;
  promotionType: PromotionType;
  amountCents: number;
  status: PaymentStatus;
  provider: PaymentProviderName;
  providerReference: string | null;
  listingTitle: string;
  listingNumber: number;
  /** Only set while the listing is publicly visible. */
  listingHref: string | null;
};

export async function getUserPayments(userId: string, page: number): Promise<{ items: PaymentHistoryItem[]; total: number; totalPages: number }> {
  const where = eq(payments.userId, userId);
  const [rows, total] = await Promise.all([
    db
      .select({
        id: payments.id,
        createdAt: payments.createdAt,
        promotionType: payments.promotionType,
        amountCents: payments.amountCents,
        status: payments.status,
        provider: payments.provider,
        providerReference: payments.providerReference,
        listingTitle: listings.title,
        listingNumber: listings.number,
        listingSlug: listings.slug,
        listingStatus: listings.status,
        listingExpiresAt: listings.expiresAt,
        listingDeletedAt: listings.deletedAt,
        categorySlug: categories.slug,
      })
      .from(payments)
      .innerJoin(listings, eq(listings.id, payments.listingId))
      .innerJoin(categories, eq(categories.id, listings.categoryId))
      .where(where)
      .orderBy(desc(payments.createdAt), desc(payments.id))
      .limit(PAYMENTS_PAGE_SIZE)
      .offset((page - 1) * PAYMENTS_PAGE_SIZE),
    db.$count(payments, where),
  ]);

  const now = new Date();
  const items = rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    promotionType: row.promotionType,
    amountCents: row.amountCents,
    status: row.status,
    provider: row.provider,
    providerReference: row.providerReference,
    listingTitle: row.listingTitle,
    listingNumber: row.listingNumber,
    listingHref: isPubliclyVisible({ status: row.listingStatus, expiresAt: row.listingExpiresAt, deletedAt: row.listingDeletedAt }, now)
      ? listingPath({ categorySlug: row.categorySlug, number: row.listingNumber, slug: row.listingSlug })
      : null,
  }));
  return { items, total, totalPages: Math.max(1, Math.ceil(total / PAYMENTS_PAGE_SIZE)) };
}
