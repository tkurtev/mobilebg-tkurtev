import "server-only";
import { desc, eq } from "drizzle-orm";
import { getAttributeSet } from "@/config/attribute-sets";
import { db } from "@/db/client";
import { savedSearches } from "@/db/schema";
import { getCategoryBySlug } from "@/features/catalog/queries";
import { buildFilterChips } from "@/features/search/chips";
import { parseSearchParams, searchHref } from "@/features/search/params";
import { countListings, resolveRefs } from "@/features/search/queries";

export async function getSavedSearchesWithSummary(userId: string) {
  const rows = await db.select().from(savedSearches).where(eq(savedSearches.userId, userId)).orderBy(desc(savedSearches.createdAt));
  return Promise.all(
    rows.map(async (row) => {
      const category = await getCategoryBySlug(row.categorySlug);
      if (!category) return { ...row, categoryName: row.categorySlug, href: null, chips: [] as string[], total: 0, newCount: 0 };
      const set = getAttributeSet(category.attributeSet);
      const state = parseSearchParams(row.filters, set);
      const refs = await resolveRefs(category, state.filters);
      const [total, newCount] = await Promise.all([
        countListings(category, state.filters),
        row.lastRunAt ? countListings(category, state.filters, { publishedAfter: row.lastRunAt }) : Promise.resolve(0),
      ]);
      return {
        ...row,
        categoryName: category.name,
        href: searchHref(category.slug, state.filters, { sort: state.sort }),
        chips: buildFilterChips(category.slug, set, state.filters, refs, state.sort).map((chip) => chip.label),
        total,
        newCount,
      };
    }),
  );
}
