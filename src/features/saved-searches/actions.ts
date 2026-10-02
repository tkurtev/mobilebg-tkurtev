"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAttributeSet } from "@/config/attribute-sets";
import { db } from "@/db/client";
import { savedSearches } from "@/db/schema";
import { getCategoryBySlug } from "@/features/catalog/queries";
import { filtersToRecord, parseSearchParams } from "@/features/search/params";
import type { ActionResult } from "@/lib/action-result";
import { sanitizeSingleLine } from "@/lib/text";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";

const nameSchema = z
  .string()
  .transform((value) => sanitizeSingleLine(value, 80))
  .pipe(z.string().min(2, "Въведи име поне от 2 символа.").max(80));

const createSchema = z.object({
  name: nameSchema,
  categorySlug: z.string().max(80),
  query: z.string().max(2000),
});

const MAX_SAVED_SEARCHES = 50;

export async function createSavedSearch(input: z.input<typeof createSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(createSchema, input);
    await enforceRateLimit("savedSearchCreate", user.id);
    const category = await getCategoryBySlug(data.categorySlug);
    if (!category) throw new AppError("NOT_FOUND", "Категорията не съществува.");
    const count = await db.$count(savedSearches, eq(savedSearches.userId, user.id));
    if (count >= MAX_SAVED_SEARCHES) throw new AppError("CONFLICT", `Можеш да запазиш до ${MAX_SAVED_SEARCHES} търсения.`);
    const raw = Object.fromEntries(new URLSearchParams(data.query));
    const { filters, sort } = parseSearchParams(raw, getAttributeSet(category.attributeSet));
    const [row] = await db
      .insert(savedSearches)
      .values({ userId: user.id, name: data.name, categorySlug: category.slug, filters: filtersToRecord(filters, sort) })
      .returning({ id: savedSearches.id });
    if (!row) throw new Error("Saved search insert failed");
    revalidatePath("/profil/tarseniya");
    return { id: row.id };
  });
}

async function ownedSearch(userId: string, id: string) {
  const [row] = await db
    .select({ id: savedSearches.id, isActive: savedSearches.isActive })
    .from(savedSearches)
    .where(and(eq(savedSearches.id, id), eq(savedSearches.userId, userId)))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", "Търсенето не е намерено.");
  return row;
}

export async function renameSavedSearch(input: { id: string; name: string }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(z.object({ id: z.uuid(), name: nameSchema }), input);
    await ownedSearch(user.id, data.id);
    await db.update(savedSearches).set({ name: data.name }).where(and(eq(savedSearches.id, data.id), eq(savedSearches.userId, user.id)));
    revalidatePath("/profil/tarseniya");
  });
}

export async function setSavedSearchActive(input: { id: string; active: boolean }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(z.object({ id: z.uuid(), active: z.boolean() }), input);
    await ownedSearch(user.id, data.id);
    await db.update(savedSearches).set({ isActive: data.active }).where(and(eq(savedSearches.id, data.id), eq(savedSearches.userId, user.id)));
    revalidatePath("/profil/tarseniya");
  });
}

export async function deleteSavedSearch(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const searchId = parseInput(z.uuid(), id);
    await ownedSearch(user.id, searchId);
    await db.delete(savedSearches).where(and(eq(savedSearches.id, searchId), eq(savedSearches.userId, user.id)));
    revalidatePath("/profil/tarseniya");
  });
}
