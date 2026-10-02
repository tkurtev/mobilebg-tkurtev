import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { ListingStatus } from "@/config/listing-status";
import { db } from "@/db/client";
import { categories, listings } from "@/db/schema";
import { listingPath } from "@/features/listings/paths";
import { canManageListing, isPubliclyVisible, type Actor } from "@/server/auth/policies";
import { activePromotionsOf, type ActivePromotion, type PromotionColumns } from "./catalog";

export type PromotableListing = PromotionColumns & {
  id: string;
  number: number;
  title: string;
  priceCents: number | null;
  coverImageUrl: string | null;
  /** EXPIRED when the status is still ACTIVE but the expiry date has passed. */
  displayStatus: ListingStatus;
  path: string;
  promotable: boolean;
  activePromotions: ActivePromotion[];
};

/** Listing summary for the promotion and checkout pages; null when missing or not manageable by the actor. */
export async function getPromotableListing(actor: Actor, listingId: string): Promise<PromotableListing | null> {
  if (!z.uuid().safeParse(listingId).success) return null;
  const [row] = await db
    .select({
      id: listings.id,
      number: listings.number,
      slug: listings.slug,
      title: listings.title,
      status: listings.status,
      priceCents: listings.priceCents,
      coverImageUrl: listings.coverImageUrl,
      sellerId: listings.sellerId,
      dealerId: listings.dealerId,
      expiresAt: listings.expiresAt,
      deletedAt: listings.deletedAt,
      vipUntil: listings.vipUntil,
      topUntil: listings.topUntil,
      highlightUntil: listings.highlightUntil,
      categorySlug: categories.slug,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(and(eq(listings.id, listingId), isNull(listings.deletedAt)))
    .limit(1);
  if (!row || !canManageListing(actor, row)) return null;

  const now = new Date();
  const promotable = isPubliclyVisible(row, now);
  return {
    id: row.id,
    number: row.number,
    title: row.title,
    priceCents: row.priceCents,
    coverImageUrl: row.coverImageUrl,
    vipUntil: row.vipUntil,
    topUntil: row.topUntil,
    highlightUntil: row.highlightUntil,
    displayStatus: !promotable && row.status === "ACTIVE" ? "EXPIRED" : (row.status as ListingStatus),
    path: listingPath({ categorySlug: row.categorySlug, number: row.number, slug: row.slug }),
    promotable,
    activePromotions: promotable ? activePromotionsOf(row, now) : [],
  };
}
