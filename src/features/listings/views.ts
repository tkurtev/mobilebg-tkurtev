import "server-only";
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { authSecret } from "@/config/env";
import { db } from "@/db/client";
import { listingViewEvents, listings } from "@/db/schema";
import { sofiaDayKey } from "@/lib/format";

const BOT_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse/i;

/**
 * Counts at most one view per listing, viewer and day. Viewers are identified by a salted
 * hash of the user id or IP and user agent, so no raw personal data is stored.
 */
export async function recordListingView(input: { listingId: string; sellerId: string; userId: string | null; ip: string; userAgent: string }): Promise<boolean> {
  if (BOT_PATTERN.test(input.userAgent) || input.userId === input.sellerId) return false;
  const day = sofiaDayKey(new Date());
  const identity = input.userId ? `u:${input.userId}` : `a:${input.ip}:${input.userAgent}`;
  const viewerHash = createHash("sha256").update(`${authSecret()}|${day}|${identity}`).digest("base64url").slice(0, 32);
  const inserted = await db
    .insert(listingViewEvents)
    .values({ listingId: input.listingId, viewerHash, day })
    .onConflictDoNothing()
    .returning({ listingId: listingViewEvents.listingId });
  if (inserted.length === 0) return false;
  await db.update(listings).set({ viewCount: sql`${listings.viewCount} + 1` }).where(eq(listings.id, input.listingId));
  return true;
}
