import "server-only";
import { and, asc, count, eq, gt, gte, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, listings, payments, users } from "@/db/schema";
import { sofiaDayKey } from "@/lib/format";
import { countOpenReports } from "./reports";

const DAY_MS = 86_400_000;

export async function getDashboardCounts() {
  const now = new Date();
  const [[pending], [active], [newUsers], openReports] = await Promise.all([
    db.select({ value: count() }).from(listings).where(and(eq(listings.status, "PENDING"), isNull(listings.deletedAt))),
    db
      .select({ value: count() })
      .from(listings)
      .where(and(eq(listings.status, "ACTIVE"), isNull(listings.deletedAt), or(isNull(listings.expiresAt), gt(listings.expiresAt, now)))),
    db
      .select({ value: count() })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.createdAt, new Date(now.getTime() - 7 * DAY_MS)))),
    countOpenReports(),
  ]);
  return { pending: pending?.value ?? 0, active: active?.value ?? 0, newUsers: newUsers?.value ?? 0, openReports };
}

/** Successful demo payments in the last 30 days. */
export async function getRecentPaymentTotals() {
  const from = new Date(Date.now() - 30 * DAY_MS);
  const [row] = await db
    .select({ value: count(), sum: sql<string | null>`sum(${payments.amountCents})` })
    .from(payments)
    .where(and(eq(payments.status, "SUCCEEDED"), gte(payments.createdAt, from)));
  return { count: row?.value ?? 0, sumCents: Number(row?.sum ?? 0), fromDay: sofiaDayKey(from) };
}

export async function getOldestPendingListings(limit: number) {
  return db
    .select({
      id: listings.id,
      number: listings.number,
      title: listings.title,
      createdAt: listings.createdAt,
      updatedAt: listings.updatedAt,
      categoryName: categories.name,
      sellerName: users.name,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(users, eq(users.id, listings.sellerId))
    .where(and(eq(listings.status, "PENDING"), isNull(listings.deletedAt)))
    .orderBy(asc(listings.updatedAt))
    .limit(limit);
}
