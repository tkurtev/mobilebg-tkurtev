import "server-only";
import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { categories, listingReports, listings, users } from "@/db/schema";
import { ADMIN_PAGE_SIZE } from "../params";
import type { ReportReasonValue, ReportStatus } from "../labels";

const resolver = alias(users, "resolver");

export async function countOpenReports(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(listingReports).where(eq(listingReports.status, "OPEN"));
  return row?.value ?? 0;
}

const reportFields = {
  id: listingReports.id,
  reason: listingReports.reason,
  details: listingReports.details,
  status: listingReports.status,
  createdAt: listingReports.createdAt,
  resolvedAt: listingReports.resolvedAt,
  listingId: listings.id,
  listingNumber: listings.number,
  listingTitle: listings.title,
  listingSlug: listings.slug,
  listingStatus: listings.status,
  categorySlug: categories.slug,
  reporterId: users.id,
  reporterName: users.name,
  reporterEmail: users.email,
  resolverName: resolver.name,
};

function reportsQuery() {
  return db
    .select(reportFields)
    .from(listingReports)
    .innerJoin(listings, eq(listings.id, listingReports.listingId))
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(users, eq(users.id, listingReports.reporterId))
    .leftJoin(resolver, eq(resolver.id, listingReports.resolvedById));
}

export async function listReports(filters: { status?: ReportStatus; reason?: ReportReasonValue; page: number }) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(listingReports.status, filters.status));
  if (filters.reason) conditions.push(eq(listingReports.reason, filters.reason));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, [total]] = await Promise.all([
    reportsQuery()
      .where(where)
      .orderBy(filters.status === "OPEN" ? asc(listingReports.createdAt) : desc(listingReports.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((filters.page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(listingReports).where(where),
  ]);
  return { items, total: total?.value ?? 0 };
}

export async function getNewestOpenReports(limit: number) {
  return reportsQuery().where(eq(listingReports.status, "OPEN")).orderBy(desc(listingReports.createdAt)).limit(limit);
}

export async function getReportsForListing(listingId: string) {
  return reportsQuery().where(eq(listingReports.listingId, listingId)).orderBy(desc(listingReports.createdAt));
}

export type AdminReportRow = Awaited<ReturnType<typeof getNewestOpenReports>>[number];
