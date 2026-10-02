import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { favorites } from "@/db/schema";

export async function getFavoritedIds(userId: string | undefined, listingIds: string[]): Promise<Set<string>> {
  if (!userId || listingIds.length === 0) return new Set();
  const rows = await db
    .select({ listingId: favorites.listingId })
    .from(favorites)
    .where(and(eq(favorites.userId, userId), inArray(favorites.listingId, listingIds)));
  return new Set(rows.map((row) => row.listingId));
}

export async function getFavoriteListingIds(userId: string): Promise<string[]> {
  const rows = await db.select({ listingId: favorites.listingId }).from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
  return rows.map((row) => row.listingId);
}
