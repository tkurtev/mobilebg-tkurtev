import "server-only";
import { and, eq, gt, lt, lte } from "drizzle-orm";
import { getAttributeSet } from "@/config/attribute-sets";
import { db } from "@/db/client";
import { listingViewEvents, listings, notifications, rateLimits, savedSearches, sessions } from "@/db/schema";
import { getCategoryBySlug } from "@/features/catalog/queries";
import { parseSearchParams } from "@/features/search/params";
import { countListings } from "@/features/search/queries";

const DAY_MS = 86_400_000;

export type MaintenanceReport = { expiredListings: number; deletedRateLimits: number; deletedViewEvents: number; deletedSessions: number; savedSearchAlerts: number };

/** Idempotent daily maintenance. Safe to run more often; public reads never depend on it. */
export async function runMaintenance(now = new Date()): Promise<MaintenanceReport> {
  const expired = await db
    .update(listings)
    .set({ status: "EXPIRED" })
    .where(and(eq(listings.status, "ACTIVE"), lte(listings.expiresAt, now)))
    .returning({ id: listings.id, sellerId: listings.sellerId, title: listings.title });
  if (expired.length > 0) {
    await db.insert(notifications).values(
      expired.map((listing) => ({ userId: listing.sellerId, type: "LISTING_EXPIRED" as const, title: "Обявата ти изтече", body: listing.title, link: "/profil/obiavi?status=attention" })),
    );
  }

  const deletedRateLimits = await db.delete(rateLimits).where(lt(rateLimits.windowEnd, new Date(now.getTime() - DAY_MS))).returning({ key: rateLimits.key });
  const cutoffDay = new Date(now.getTime() - 3 * DAY_MS).toISOString().slice(0, 10);
  const deletedViews = await db.delete(listingViewEvents).where(lt(listingViewEvents.day, cutoffDay)).returning({ id: listingViewEvents.listingId });
  const deletedSessions = await db.delete(sessions).where(lt(sessions.expiresAt, now)).returning({ id: sessions.id });

  let savedSearchAlerts = 0;
  const since = new Date(now.getTime() - DAY_MS);
  const active = await db.select().from(savedSearches).where(eq(savedSearches.isActive, true)).limit(2000);
  for (const search of active) {
    const category = await getCategoryBySlug(search.categorySlug);
    if (!category) continue;
    const { filters } = parseSearchParams(search.filters, getAttributeSet(category.attributeSet));
    const count = await countListings(category, filters, { publishedAfter: since });
    if (count === 0) continue;
    const link = `/profil/tarseniya/${search.id}/izpalni`;
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, search.userId), eq(notifications.link, link), gt(notifications.createdAt, since)))
      .limit(1);
    if (existing) continue;
    await db.insert(notifications).values({
      userId: search.userId,
      type: "SAVED_SEARCH_MATCH",
      title: `Нови обяви: ${search.name}`,
      body: count === 1 ? "1 нова обява през последните 24 часа." : `${count} нови обяви през последните 24 часа.`,
      link,
    });
    savedSearchAlerts += 1;
  }

  return {
    expiredListings: expired.length,
    deletedRateLimits: deletedRateLimits.length,
    deletedViewEvents: deletedViews.length,
    deletedSessions: deletedSessions.length,
    savedSearchAlerts,
  };
}

