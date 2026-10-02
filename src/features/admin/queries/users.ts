import "server-only";
import { and, count, desc, eq, gt, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import type { ListingStatus } from "@/config/listing-status";
import { db } from "@/db/client";
import { auditLogs, cities, dealerMembers, dealers, listings, payments, profiles, sessions, users } from "@/db/schema";
import type { Role } from "@/server/auth/policies";
import { ADMIN_PAGE_SIZE, likePattern } from "../params";
import type { UserStatus } from "../labels";

// Drizzle drops table qualifiers in single-table selects, so correlated subqueries name tables explicitly.
export type AdminUserFilters = { q?: string; role?: Role; status?: UserStatus; page: number };

export async function searchUsers(filters: AdminUserFilters) {
  const conditions: SQL[] = [isNull(users.deletedAt)];
  if (filters.role) conditions.push(eq(users.role, filters.role));
  if (filters.status) conditions.push(eq(users.status, filters.status));
  if (filters.q) {
    const pattern = likePattern(filters.q);
    const match = or(ilike(users.name, pattern), ilike(users.email, pattern));
    if (match) conditions.push(match);
  }
  const where = and(...conditions);
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        listingCount: sql<number>`(select count(*)::int from listings l where l.seller_id = users.id and l.deleted_at is null)`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((filters.page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(users).where(where),
  ]);
  return { items, total: total?.value ?? 0 };
}

export async function getAdminUser(id: string) {
  const [row] = await db
    .select({
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        emailVerified: users.emailVerified,
        role: users.role,
        status: users.status,
        suspendedAt: users.suspendedAt,
        suspensionReason: users.suspensionReason,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
      },
      phone: profiles.phone,
      cityName: cities.name,
      dealerId: dealers.id,
      dealerName: dealers.name,
      dealerRole: dealerMembers.role,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .leftJoin(cities, eq(cities.id, profiles.cityId))
    .leftJoin(dealerMembers, eq(dealerMembers.userId, users.id))
    .leftJoin(dealers, eq(dealers.id, dealerMembers.dealerId))
    .where(eq(users.id, id))
    .limit(1);
  if (!row) return null;

  const [statusRows, [paymentTotals], [sessionCount]] = await Promise.all([
    db
      .select({ status: listings.status, value: count() })
      .from(listings)
      .where(and(eq(listings.sellerId, id), isNull(listings.deletedAt)))
      .groupBy(listings.status),
    db
      .select({
        value: count(),
        succeededCents: sql<string | null>`sum(${payments.amountCents}) filter (where ${payments.status} = 'SUCCEEDED')`,
      })
      .from(payments)
      .where(eq(payments.userId, id)),
    db.select({ value: count() }).from(sessions).where(and(eq(sessions.userId, id), gt(sessions.expiresAt, new Date()))),
  ]);

  return {
    ...row,
    listingsByStatus: Object.fromEntries(statusRows.map((status) => [status.status, status.value])) as Partial<Record<ListingStatus, number>>,
    paymentCount: paymentTotals?.value ?? 0,
    paymentSucceededCents: Number(paymentTotals?.succeededCents ?? 0),
    sessionCount: sessionCount?.value ?? 0,
  };
}

export type AdminUserDetail = NonNullable<Awaited<ReturnType<typeof getAdminUser>>>;

/** Entries about the user (role changes, suspensions) and actions the user performed. */
export async function getUserAuditEntries(userId: string, limit: number) {
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorId: auditLogs.actorId,
      actorName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(or(and(eq(auditLogs.targetType, "user"), eq(auditLogs.targetId, userId)), eq(auditLogs.actorId, userId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
