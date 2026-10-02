import "server-only";
import { asc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { categories } from "@/db/schema";

// Drizzle drops table qualifiers in single-table selects, so correlated subqueries name tables explicitly.
export async function listAllCategories() {
  return db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      attributeSet: categories.attributeSet,
      vehicleType: categories.vehicleType,
      sortOrder: categories.sortOrder,
      isActive: categories.isActive,
      listingCount: sql<number>`(select count(*)::int from listings l where l.category_id = categories.id)`,
      activeCount: sql<number>`(select count(*)::int from listings l where l.category_id = categories.id and l.status = 'ACTIVE' and l.deleted_at is null)`,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export type AdminCategoryRow = Awaited<ReturnType<typeof listAllCategories>>[number];
