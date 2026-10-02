import "server-only";
import { and, asc, count, desc, eq, ilike, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { cities, dealerMembers, dealers, regions, users } from "@/db/schema";
import { ADMIN_PAGE_SIZE, likePattern } from "../params";
import type { DealerStatus } from "../labels";

// Drizzle drops table qualifiers in single-table selects, so correlated subqueries name tables explicitly.
const activeListingCount = sql<number>`(select count(*)::int from listings l where l.dealer_id = dealers.id and l.status = 'ACTIVE' and l.deleted_at is null)`;

export async function searchDealers(filters: { q?: string; status?: DealerStatus; page: number }) {
  const conditions: SQL[] = [isNull(dealers.deletedAt)];
  if (filters.status) conditions.push(eq(dealers.status, filters.status));
  if (filters.q) {
    const pattern = likePattern(filters.q);
    const match = or(ilike(dealers.name, pattern), ilike(dealers.slug, pattern), ilike(dealers.email, pattern));
    if (match) conditions.push(match);
  }
  const where = and(...conditions);
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: dealers.id,
        name: dealers.name,
        slug: dealers.slug,
        phone: dealers.phone,
        status: dealers.status,
        createdAt: dealers.createdAt,
        cityName: cities.name,
        activeListings: activeListingCount,
        memberCount: sql<number>`(select count(*)::int from dealer_members m where m.dealer_id = dealers.id)`,
      })
      .from(dealers)
      .leftJoin(cities, eq(cities.id, dealers.cityId))
      .where(where)
      .orderBy(asc(dealers.name))
      .limit(ADMIN_PAGE_SIZE)
      .offset((filters.page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(dealers).where(where),
  ]);
  return { items, total: total?.value ?? 0 };
}

export async function getAdminDealer(id: string) {
  const [row] = await db
    .select({
      dealer: dealers,
      cityName: cities.name,
      regionName: regions.name,
      activeListings: activeListingCount,
      totalListings: sql<number>`(select count(*)::int from listings l where l.dealer_id = dealers.id and l.deleted_at is null)`,
    })
    .from(dealers)
    .leftJoin(cities, eq(cities.id, dealers.cityId))
    .leftJoin(regions, eq(regions.id, dealers.regionId))
    .where(and(eq(dealers.id, id), isNull(dealers.deletedAt)))
    .limit(1);
  if (!row) return null;
  const members = await db
    .select({ userId: users.id, name: users.name, email: users.email, role: dealerMembers.role, userStatus: users.status, joinedAt: dealerMembers.createdAt })
    .from(dealerMembers)
    .innerJoin(users, eq(users.id, dealerMembers.userId))
    .where(eq(dealerMembers.dealerId, id))
    .orderBy(desc(sql`${dealerMembers.role} = 'OWNER'`), asc(users.name));
  return { ...row, members };
}

export type AdminDealerDetail = NonNullable<Awaited<ReturnType<typeof getAdminDealer>>>;
