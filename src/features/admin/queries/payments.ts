import "server-only";
import { and, count, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, listings, payments, users } from "@/db/schema";
import { ADMIN_PAGE_SIZE } from "../params";
import type { PaymentStatus, PromotionTypeValue } from "../labels";

export type AdminPaymentFilters = { status?: PaymentStatus; type?: PromotionTypeValue; from?: string; to?: string; page: number };

function paymentConditions(filters: AdminPaymentFilters): SQL | undefined {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(payments.status, filters.status));
  if (filters.type) conditions.push(eq(payments.promotionType, filters.type));
  // Day boundaries follow Sofia time; dates are validated YYYY-MM-DD strings.
  if (filters.from) conditions.push(sql`${payments.createdAt} >= (${filters.from}::date)::timestamp at time zone 'Europe/Sofia'`);
  if (filters.to) conditions.push(sql`${payments.createdAt} < ((${filters.to}::date + 1)::timestamp at time zone 'Europe/Sofia')`);
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function searchPayments(filters: AdminPaymentFilters) {
  const where = paymentConditions(filters);
  const [items, [totals]] = await Promise.all([
    db
      .select({
        id: payments.id,
        createdAt: payments.createdAt,
        amountCents: payments.amountCents,
        status: payments.status,
        provider: payments.provider,
        providerReference: payments.providerReference,
        promotionType: payments.promotionType,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        listingId: listings.id,
        listingNumber: listings.number,
        listingTitle: listings.title,
        categorySlug: categories.slug,
      })
      .from(payments)
      .innerJoin(users, eq(users.id, payments.userId))
      .innerJoin(listings, eq(listings.id, payments.listingId))
      .innerJoin(categories, eq(categories.id, listings.categoryId))
      .where(where)
      .orderBy(desc(payments.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((filters.page - 1) * ADMIN_PAGE_SIZE),
    db
      .select({
        value: count(),
        sum: sql<string | null>`sum(${payments.amountCents})`,
        succeeded: sql<string | null>`sum(${payments.amountCents}) filter (where ${payments.status} = 'SUCCEEDED')`,
      })
      .from(payments)
      .where(where),
  ]);
  return {
    items,
    total: totals?.value ?? 0,
    sumCents: Number(totals?.sum ?? 0),
    succeededCents: Number(totals?.succeeded ?? 0),
  };
}
