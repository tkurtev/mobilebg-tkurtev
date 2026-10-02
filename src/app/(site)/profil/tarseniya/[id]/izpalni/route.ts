import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAttributeSet } from "@/config/attribute-sets";
import { db } from "@/db/client";
import { savedSearches } from "@/db/schema";
import { getCategoryBySlug } from "@/features/catalog/queries";
import { parseSearchParams, searchHref } from "@/features/search/params";
import { getCurrentUser } from "@/server/auth/session";

/** Opens a saved search and records the run time so "new since last run" counts stay accurate. */
export async function GET(_request: Request, context: RouteContext<"/profil/tarseniya/[id]/izpalni">) {
  const { id } = await context.params;
  const user = await getCurrentUser();
  if (!user) redirect("/vhod?next=/profil/tarseniya");
  if (!z.uuid().safeParse(id).success) redirect("/profil/tarseniya");
  const [search] = await db
    .select()
    .from(savedSearches)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, user.id)))
    .limit(1);
  const category = search ? await getCategoryBySlug(search.categorySlug) : null;
  if (!search || !category) redirect("/profil/tarseniya");
  await db.update(savedSearches).set({ lastRunAt: new Date() }).where(eq(savedSearches.id, search.id));
  const state = parseSearchParams(search.filters, getAttributeSet(category.attributeSet));
  redirect(searchHref(category.slug, state.filters, { sort: state.sort }));
}
