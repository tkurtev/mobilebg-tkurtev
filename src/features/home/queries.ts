import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { categories, cities, dealers, listings, vehicleMakes } from "@/db/schema";
import { publicListingCondition } from "@/features/listings/queries";

export const getPopularMakes = unstable_cache(
  async (categorySlug: string, limit: number) =>
    db
      .select({ name: vehicleMakes.name, slug: vehicleMakes.slug, count: sql<number>`count(*)::int` })
      .from(listings)
      .innerJoin(vehicleMakes, eq(vehicleMakes.id, listings.makeId))
      .innerJoin(categories, eq(categories.id, listings.categoryId))
      .where(and(publicListingCondition(), eq(categories.slug, categorySlug)))
      .groupBy(vehicleMakes.id)
      .orderBy(desc(sql`count(*)`), vehicleMakes.name)
      .limit(limit),
  ["popular-makes"],
  { revalidate: 600, tags: ["listings:aggregates"] },
);

export const getCategoryCounts = unstable_cache(
  async () => {
    const rows = await db
      .select({ categoryId: listings.categoryId, count: sql<number>`count(*)::int` })
      .from(listings)
      .where(publicListingCondition())
      .groupBy(listings.categoryId);
    return Object.fromEntries(rows.map((row) => [row.categoryId, row.count])) as Record<string, number>;
  },
  ["category-counts"],
  { revalidate: 300, tags: ["listings:aggregates"] },
);

export const getFeaturedDealers = unstable_cache(
  async (limit: number) =>
    db
      .select({
        id: dealers.id,
        slug: dealers.slug,
        name: dealers.name,
        logoUrl: dealers.logoUrl,
        cityName: cities.name,
        activeCount: sql<number>`count(${listings.id})::int`,
      })
      .from(dealers)
      .leftJoin(cities, eq(cities.id, dealers.cityId))
      .leftJoin(listings, and(eq(listings.dealerId, dealers.id), publicListingCondition()))
      .where(and(eq(dealers.status, "ACTIVE"), isNull(dealers.deletedAt)))
      .groupBy(dealers.id, cities.name)
      .orderBy(desc(sql`count(${listings.id})`))
      .limit(limit),
  ["featured-dealers"],
  { revalidate: 600, tags: ["listings:aggregates", "dealers"] },
);
