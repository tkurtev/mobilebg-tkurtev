import "server-only";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { recentlyViewed } from "@/db/schema";

const KEEP = 30;

export async function recordRecentlyViewed(userId: string, listingId: string): Promise<void> {
  await db
    .insert(recentlyViewed)
    .values({ userId, listingId, viewedAt: new Date() })
    .onConflictDoUpdate({ target: [recentlyViewed.userId, recentlyViewed.listingId], set: { viewedAt: sql`now()` } });
  const keep = db
    .select({ listingId: recentlyViewed.listingId })
    .from(recentlyViewed)
    .where(eq(recentlyViewed.userId, userId))
    .orderBy(desc(recentlyViewed.viewedAt))
    .limit(KEEP);
  await db.delete(recentlyViewed).where(and(eq(recentlyViewed.userId, userId), notInArray(recentlyViewed.listingId, keep)));
}

export async function mergeRecentlyViewed(userId: string, listingIds: string[]): Promise<void> {
  if (listingIds.length === 0) return;
  const now = Date.now();
  await db
    .insert(recentlyViewed)
    .values(listingIds.slice(0, KEEP).map((listingId, index) => ({ userId, listingId, viewedAt: new Date(now - index * 1000) })))
    .onConflictDoNothing();
}

export async function getRecentlyViewedIds(userId: string, limit = 12): Promise<string[]> {
  const rows = await db
    .select({ listingId: recentlyViewed.listingId })
    .from(recentlyViewed)
    .where(eq(recentlyViewed.userId, userId))
    .orderBy(desc(recentlyViewed.viewedAt))
    .limit(limit);
  return rows.map((row) => row.listingId);
}

export async function clearRecentlyViewed(userId: string, listingIds?: string[]): Promise<void> {
  await db
    .delete(recentlyViewed)
    .where(listingIds ? and(eq(recentlyViewed.userId, userId), inArray(recentlyViewed.listingId, listingIds)) : eq(recentlyViewed.userId, userId));
}
