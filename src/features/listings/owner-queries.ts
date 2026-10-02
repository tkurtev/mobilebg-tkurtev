import "server-only";
import { and, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, listings } from "@/db/schema";
import type { CurrentUser } from "@/server/auth/session";
import { listingPath } from "./paths";

export const OWNER_FILTERS = {
  all: { label: "Всички", statuses: null },
  active: { label: "Активни", statuses: ["ACTIVE"] },
  draft: { label: "Чернови", statuses: ["DRAFT"] },
  pending: { label: "Изчакващи", statuses: ["PENDING"] },
  paused: { label: "Паузирани", statuses: ["PAUSED"] },
  attention: { label: "Изискват внимание", statuses: ["REJECTED", "EXPIRED"] },
  sold: { label: "Продадени", statuses: ["SOLD"] },
  archived: { label: "Архивирани", statuses: ["ARCHIVED"] },
} as const;

export type OwnerFilter = keyof typeof OWNER_FILTERS;

function ownership(user: CurrentUser): SQL {
  return user.dealerId ? (or(eq(listings.sellerId, user.id), eq(listings.dealerId, user.dealerId)) as SQL) : eq(listings.sellerId, user.id);
}

export async function getOwnerListings(user: CurrentUser, filter: OwnerFilter) {
  const statuses = OWNER_FILTERS[filter].statuses;
  const conditions: SQL[] = [ownership(user), isNull(listings.deletedAt)];
  if (statuses) conditions.push(inArray(listings.status, [...statuses]));
  else conditions.push(sql`${listings.status} <> 'ARCHIVED'`);
  const rows = await db
    .select({
      id: listings.id,
      number: listings.number,
      slug: listings.slug,
      title: listings.title,
      status: listings.status,
      priceCents: listings.priceCents,
      coverImageUrl: listings.coverImageUrl,
      viewCount: listings.viewCount,
      favoriteCount: listings.favoriteCount,
      inquiryCount: listings.inquiryCount,
      expiresAt: listings.expiresAt,
      updatedAt: listings.updatedAt,
      rejectionReason: listings.rejectionReason,
      moderationLock: listings.moderationLock,
      vipUntil: listings.vipUntil,
      topUntil: listings.topUntil,
      highlightUntil: listings.highlightUntil,
      categorySlug: categories.slug,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(and(...conditions))
    .orderBy(desc(listings.updatedAt))
    .limit(200);
  const now = new Date();
  return rows.map((row) => ({
    ...row,
    path: listingPath({ categorySlug: row.categorySlug, number: row.number, slug: row.slug }),
    expired: row.status === "EXPIRED" || (row.status === "ACTIVE" && row.expiresAt !== null && row.expiresAt <= now),
    promotion: row.vipUntil && row.vipUntil > now ? ("VIP" as const) : row.topUntil && row.topUntil > now ? ("TOP" as const) : row.highlightUntil && row.highlightUntil > now ? ("HIGHLIGHT" as const) : null,
  }));
}

export type OwnerListing = Awaited<ReturnType<typeof getOwnerListings>>[number];

export async function countOwnerListingsByFilter(user: CurrentUser): Promise<Record<OwnerFilter, number>> {
  const rows = await db
    .select({ status: listings.status, count: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(ownership(user), isNull(listings.deletedAt)))
    .groupBy(listings.status);
  const byStatus = Object.fromEntries(rows.map((row) => [row.status, row.count])) as Record<string, number>;
  const result = {} as Record<OwnerFilter, number>;
  for (const [key, config] of Object.entries(OWNER_FILTERS) as [OwnerFilter, (typeof OWNER_FILTERS)[OwnerFilter]][]) {
    result[key] = config.statuses
      ? config.statuses.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0)
      : Object.entries(byStatus).filter(([status]) => status !== "ARCHIVED").reduce((sum, [, value]) => sum + value, 0);
  }
  return result;
}
