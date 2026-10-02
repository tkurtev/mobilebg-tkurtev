"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import type { z } from "zod";
import { db } from "@/db/client";
import { categories } from "@/db/schema";
import { CATALOG_TAGS } from "@/features/catalog/queries";
import type { ActionResult } from "@/lib/action-result";
import { sanitizeSingleLine } from "@/lib/text";
import { parseInput, runAction } from "@/server/action";
import { recordAudit } from "@/server/audit";
import { requireActionPermission } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { categoryInputSchema, categoryUpdateSchema, type CategoryInput } from "../schemas";

/** Category pages live at /{slug}, so a slug must not shadow a top-level route. */
const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "dev",
  "media",
  "profil",
  "vhod",
  "registratsiya",
  "zabravena-parola",
  "nova-parola",
  "potvarzhdenie",
  "publikuvai",
  "publikuvay",
  "lyubimi",
  "suobshteniya",
  "dilari",
  "tarsene",
  "demo-plashtane",
]);

async function assertSlugAvailable(slug: string, exceptId?: string) {
  if (RESERVED_SLUGS.has(slug)) throw new AppError("VALIDATION", undefined, { slug: "Този адрес е запазен за системна страница." });
  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(exceptId ? and(eq(categories.slug, slug), ne(categories.id, exceptId)) : eq(categories.slug, slug))
    .limit(1);
  if (existing) throw new AppError("VALIDATION", undefined, { slug: "Вече има категория с този адрес." });
}

function toRow(data: CategoryInput) {
  return {
    name: sanitizeSingleLine(data.name, 60),
    slug: data.slug,
    sortOrder: data.sortOrder,
    isActive: data.isActive,
    attributeSet: data.attributeSet,
    vehicleType: data.vehicleType || null,
  };
}

function invalidateCategories() {
  updateTag(CATALOG_TAGS.categories);
  updateTag("listings:aggregates");
  revalidatePath("/admin/categories");
}

export async function createCategoryAction(input: z.input<typeof categoryInputSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await requireActionPermission("categories.manage");
    const data = parseInput(categoryInputSchema, input);
    await assertSlugAvailable(data.slug);
    const row = toRow(data);
    const id = await db.transaction(async (tx) => {
      const [created] = await tx.insert(categories).values(row).returning({ id: categories.id });
      if (!created) throw new Error("category insert failed");
      await recordAudit({ actorId: actor.id, action: "category.create", targetType: "category", targetId: created.id, metadata: { slug: row.slug, name: row.name } }, tx);
      return created.id;
    });
    invalidateCategories();
    return { id };
  });
}

export async function updateCategoryAction(input: z.input<typeof categoryUpdateSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("categories.manage");
    const data = parseInput(categoryUpdateSchema, input);
    const [current] = await db.select().from(categories).where(eq(categories.id, data.id)).limit(1);
    if (!current) throw new AppError("NOT_FOUND", "Категорията не е намерена.");
    if (data.slug !== current.slug) await assertSlugAvailable(data.slug, current.id);
    const row = toRow(data);
    const changed = (Object.keys(row) as (keyof typeof row)[]).filter((key) => row[key] !== current[key]);
    if (changed.length === 0) return;
    await db.transaction(async (tx) => {
      await tx.update(categories).set(row).where(eq(categories.id, current.id));
      const metadata: Record<string, string | number | boolean | null> = { fields: changed.join(",") };
      if (changed.includes("slug")) Object.assign(metadata, { fromSlug: current.slug, toSlug: row.slug });
      if (changed.includes("isActive")) metadata.isActive = row.isActive;
      await recordAudit({ actorId: actor.id, action: "category.update", targetType: "category", targetId: current.id, metadata }, tx);
    });
    invalidateCategories();
  });
}
