import { and, desc, eq, isNull } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { appUrl } from "@/config/env";
import { db } from "@/db/client";
import { categories, dealers, listings } from "@/db/schema";
import { listingPath } from "@/features/listings/paths";
import { publicListingCondition } from "@/features/listings/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const [categoryRows, dealerRows, listingRows] = await Promise.all([
    db.select({ slug: categories.slug }).from(categories).where(eq(categories.isActive, true)),
    db.select({ slug: dealers.slug, updatedAt: dealers.updatedAt }).from(dealers).where(and(eq(dealers.status, "ACTIVE"), isNull(dealers.deletedAt))),
    db
      .select({ number: listings.number, slug: listings.slug, updatedAt: listings.updatedAt, categorySlug: categories.slug })
      .from(listings)
      .innerJoin(categories, eq(categories.id, listings.categoryId))
      .where(publicListingCondition())
      .orderBy(desc(listings.updatedAt))
      .limit(10_000),
  ]);
  return [
    { url: base, changeFrequency: "hourly", priority: 1 },
    { url: `${base}/dilari`, changeFrequency: "daily", priority: 0.6 },
    ...categoryRows.map((row) => ({ url: `${base}/${row.slug}`, changeFrequency: "hourly" as const, priority: 0.8 })),
    ...dealerRows.map((row) => ({ url: `${base}/dilari/${row.slug}`, lastModified: row.updatedAt, priority: 0.5 })),
    ...listingRows.map((row) => ({ url: `${base}${listingPath(row)}`, lastModified: row.updatedAt, priority: 0.7 })),
  ];
}
