"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { favorites, listings } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";

const listingIdSchema = z.uuid();

export async function toggleFavorite(listingId: string): Promise<ActionResult<{ favorited: boolean }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    const id = parseInput(listingIdSchema, listingId);
    return db.transaction(async (tx) => {
      const [listing] = await tx.select({ id: listings.id }).from(listings).where(eq(listings.id, id)).limit(1);
      if (!listing) throw new AppError("NOT_FOUND", "Обявата не е намерена.");
      const removed = await tx
        .delete(favorites)
        .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, id)))
        .returning({ listingId: favorites.listingId });
      if (removed.length > 0) {
        await tx.update(listings).set({ favoriteCount: sql`greatest(${listings.favoriteCount} - 1, 0)` }).where(eq(listings.id, id));
        return { favorited: false };
      }
      await tx.insert(favorites).values({ userId: user.id, listingId: id });
      await tx.update(listings).set({ favoriteCount: sql`${listings.favoriteCount} + 1` }).where(eq(listings.id, id));
      return { favorited: true };
    });
  });
}

/** Called after login to keep favorites saved while browsing anonymously. */
export async function mergeLocalFavorites(listingIds: string[]): Promise<ActionResult<{ merged: number }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    const ids = parseInput(z.array(z.uuid()).max(200), listingIds);
    if (ids.length === 0) return { merged: 0 };
    const existing = await db.select({ id: listings.id }).from(listings).where(inArray(listings.id, ids));
    if (existing.length === 0) return { merged: 0 };
    const inserted = await db
      .insert(favorites)
      .values(existing.map((listing) => ({ userId: user.id, listingId: listing.id })))
      .onConflictDoNothing()
      .returning({ listingId: favorites.listingId });
    if (inserted.length > 0) {
      await db
        .update(listings)
        .set({ favoriteCount: sql`${listings.favoriteCount} + 1` })
        .where(inArray(listings.id, inserted.map((row) => row.listingId)));
    }
    return { merged: inserted.length };
  });
}
