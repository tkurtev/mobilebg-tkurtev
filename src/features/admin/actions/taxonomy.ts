"use server";

import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db, type DbOrTx } from "@/db/client";
import { listings, vehicleGenerations, vehicleMakes, vehicleModels } from "@/db/schema";
import { CATALOG_TAGS } from "@/features/catalog/queries";
import { refreshSearchDocument } from "@/features/listings/service";
import type { ActionResult } from "@/lib/action-result";
import { slugify } from "@/lib/slug";
import { sanitizeSingleLine } from "@/lib/text";
import { parseInput, runAction } from "@/server/action";
import { recordAudit } from "@/server/audit";
import { requireActionPermission } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import {
  generationCreateSchema,
  generationUpdateSchema,
  makeCreateSchema,
  makeUpdateSchema,
  modelCreateSchema,
  modelUpdateSchema,
  toggleActiveSchema,
} from "../schemas";

function invalidateTaxonomy(makeId?: string) {
  updateTag(CATALOG_TAGS.taxonomy);
  updateTag("listings:aggregates");
  revalidatePath("/admin/vehicle-data");
  if (makeId) revalidatePath(`/admin/vehicle-data/${makeId}`);
}

function resolveSlug(name: string, slug: string): string {
  const value = slug || slugify(name, 60);
  if (!value) throw new AppError("VALIDATION", undefined, { slug: "Въведи адрес (slug) с латински букви." });
  return value;
}

/** Make and model names are part of listings.search_document, so renames refresh it. */
async function refreshListingsWhere(tx: DbOrTx, column: typeof listings.makeId | typeof listings.modelId | typeof listings.generationId, id: string) {
  const rows = await tx.select({ id: listings.id }).from(listings).where(eq(column, id));
  for (const row of rows) await refreshSearchDocument(tx, row.id);
}

async function loadMake(id: string) {
  const [make] = await db.select().from(vehicleMakes).where(eq(vehicleMakes.id, id)).limit(1);
  if (!make) throw new AppError("NOT_FOUND", "Марката не е намерена.");
  return make;
}

async function loadModel(id: string) {
  const [model] = await db.select().from(vehicleModels).where(eq(vehicleModels.id, id)).limit(1);
  if (!model) throw new AppError("NOT_FOUND", "Моделът не е намерен.");
  return model;
}

async function loadGeneration(id: string) {
  const [generation] = await db
    .select({ generation: vehicleGenerations, makeId: vehicleModels.makeId })
    .from(vehicleGenerations)
    .innerJoin(vehicleModels, eq(vehicleModels.id, vehicleGenerations.modelId))
    .where(eq(vehicleGenerations.id, id))
    .limit(1);
  if (!generation) throw new AppError("NOT_FOUND", "Поколението не е намерено.");
  return generation;
}

async function assertMakeSlugFree(slug: string, exceptId?: string) {
  const [existing] = await db
    .select({ id: vehicleMakes.id })
    .from(vehicleMakes)
    .where(exceptId ? and(eq(vehicleMakes.slug, slug), ne(vehicleMakes.id, exceptId)) : eq(vehicleMakes.slug, slug))
    .limit(1);
  if (existing) throw new AppError("VALIDATION", undefined, { slug: "Вече има марка с този адрес." });
}

async function assertModelSlugFree(makeId: string, vehicleType: string, slug: string, exceptId?: string) {
  const conditions = [eq(vehicleModels.makeId, makeId), eq(vehicleModels.vehicleType, vehicleType), eq(vehicleModels.slug, slug)];
  if (exceptId) conditions.push(ne(vehicleModels.id, exceptId));
  const [existing] = await db.select({ id: vehicleModels.id }).from(vehicleModels).where(and(...conditions)).limit(1);
  if (existing) throw new AppError("VALIDATION", undefined, { slug: "Тази марка вече има модел с този адрес." });
}

async function uniqueGenerationSlug(modelId: string, name: string, exceptId?: string): Promise<string> {
  const base = slugify(name, 60) || "pokolenie";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const conditions = [eq(vehicleGenerations.modelId, modelId), eq(vehicleGenerations.slug, slug)];
    if (exceptId) conditions.push(ne(vehicleGenerations.id, exceptId));
    const [existing] = await db.select({ id: vehicleGenerations.id }).from(vehicleGenerations).where(and(...conditions)).limit(1);
    if (!existing) return slug;
  }
  throw new AppError("CONFLICT", "Не може да се създаде уникален адрес за поколението.");
}

export async function createMakeAction(input: z.input<typeof makeCreateSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(makeCreateSchema, input);
    const name = sanitizeSingleLine(data.name, 60);
    const slug = resolveSlug(name, data.slug);
    await assertMakeSlugFree(slug);
    const id = await db.transaction(async (tx) => {
      const [make] = await tx.insert(vehicleMakes).values({ name, slug }).returning({ id: vehicleMakes.id });
      if (!make) throw new Error("make insert failed");
      await recordAudit({ actorId: actor.id, action: "taxonomy.make_create", targetType: "make", targetId: make.id, metadata: { name, slug } }, tx);
      return make.id;
    });
    invalidateTaxonomy();
    return { id };
  });
}

export async function updateMakeAction(input: z.input<typeof makeUpdateSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(makeUpdateSchema, input);
    const make = await loadMake(data.id);
    const name = sanitizeSingleLine(data.name, 60);
    if (name === make.name && data.slug === make.slug) return;
    if (data.slug !== make.slug) await assertMakeSlugFree(data.slug, make.id);
    await db.transaction(async (tx) => {
      await tx.update(vehicleMakes).set({ name, slug: data.slug }).where(eq(vehicleMakes.id, make.id));
      if (name !== make.name) await refreshListingsWhere(tx, listings.makeId, make.id);
      await recordAudit(
        { actorId: actor.id, action: "taxonomy.make_update", targetType: "make", targetId: make.id, metadata: { fromName: make.name, toName: name, fromSlug: make.slug, toSlug: data.slug } },
        tx,
      );
    });
    invalidateTaxonomy(make.id);
  });
}

export async function setMakeActiveAction(input: z.input<typeof toggleActiveSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(toggleActiveSchema, input);
    const make = await loadMake(data.id);
    if (make.isActive === data.isActive) return;
    await db.transaction(async (tx) => {
      await tx.update(vehicleMakes).set({ isActive: data.isActive }).where(eq(vehicleMakes.id, make.id));
      await recordAudit({ actorId: actor.id, action: "taxonomy.make_update", targetType: "make", targetId: make.id, metadata: { isActive: data.isActive } }, tx);
    });
    invalidateTaxonomy(make.id);
  });
}

export async function createModelAction(input: z.input<typeof modelCreateSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(modelCreateSchema, input);
    const make = await loadMake(data.makeId);
    const name = sanitizeSingleLine(data.name, 60);
    const slug = resolveSlug(name, data.slug);
    await assertModelSlugFree(make.id, data.vehicleType, slug);
    const id = await db.transaction(async (tx) => {
      const [model] = await tx.insert(vehicleModels).values({ makeId: make.id, name, slug, vehicleType: data.vehicleType }).returning({ id: vehicleModels.id });
      if (!model) throw new Error("model insert failed");
      await recordAudit(
        { actorId: actor.id, action: "taxonomy.model_create", targetType: "model", targetId: model.id, metadata: { makeId: make.id, name, slug, vehicleType: data.vehicleType } },
        tx,
      );
      return model.id;
    });
    invalidateTaxonomy(make.id);
    return { id };
  });
}

export async function updateModelAction(input: z.input<typeof modelUpdateSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(modelUpdateSchema, input);
    const model = await loadModel(data.id);
    const name = sanitizeSingleLine(data.name, 60);
    if (name === model.name && data.slug === model.slug) return;
    if (data.slug !== model.slug) await assertModelSlugFree(model.makeId, model.vehicleType, data.slug, model.id);
    await db.transaction(async (tx) => {
      await tx.update(vehicleModels).set({ name, slug: data.slug }).where(eq(vehicleModels.id, model.id));
      if (name !== model.name) await refreshListingsWhere(tx, listings.modelId, model.id);
      await recordAudit(
        { actorId: actor.id, action: "taxonomy.model_update", targetType: "model", targetId: model.id, metadata: { makeId: model.makeId, fromName: model.name, toName: name, fromSlug: model.slug, toSlug: data.slug } },
        tx,
      );
    });
    invalidateTaxonomy(model.makeId);
  });
}

export async function setModelActiveAction(input: z.input<typeof toggleActiveSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(toggleActiveSchema, input);
    const model = await loadModel(data.id);
    if (model.isActive === data.isActive) return;
    await db.transaction(async (tx) => {
      await tx.update(vehicleModels).set({ isActive: data.isActive }).where(eq(vehicleModels.id, model.id));
      await recordAudit({ actorId: actor.id, action: "taxonomy.model_update", targetType: "model", targetId: model.id, metadata: { makeId: model.makeId, isActive: data.isActive } }, tx);
    });
    invalidateTaxonomy(model.makeId);
  });
}

export async function createGenerationAction(input: z.input<typeof generationCreateSchema>): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(generationCreateSchema, input);
    const model = await loadModel(data.modelId);
    const name = sanitizeSingleLine(data.values.name, 60);
    const slug = await uniqueGenerationSlug(model.id, name);
    const id = await db.transaction(async (tx) => {
      const [generation] = await tx
        .insert(vehicleGenerations)
        .values({ modelId: model.id, name, slug, yearFrom: data.values.yearFrom, yearTo: data.values.yearTo })
        .returning({ id: vehicleGenerations.id });
      if (!generation) throw new Error("generation insert failed");
      await recordAudit(
        { actorId: actor.id, action: "taxonomy.generation_create", targetType: "generation", targetId: generation.id, metadata: { modelId: model.id, name, yearFrom: data.values.yearFrom, yearTo: data.values.yearTo } },
        tx,
      );
      return generation.id;
    });
    invalidateTaxonomy(model.makeId);
    return { id };
  });
}

export async function updateGenerationAction(input: z.input<typeof generationUpdateSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(generationUpdateSchema, input);
    const { generation, makeId } = await loadGeneration(data.id);
    const name = sanitizeSingleLine(data.values.name, 60);
    const slug = name === generation.name ? generation.slug : await uniqueGenerationSlug(generation.modelId, name, generation.id);
    await db.transaction(async (tx) => {
      await tx
        .update(vehicleGenerations)
        .set({ name, slug, yearFrom: data.values.yearFrom, yearTo: data.values.yearTo })
        .where(eq(vehicleGenerations.id, generation.id));
      if (name !== generation.name) await refreshListingsWhere(tx, listings.generationId, generation.id);
      await recordAudit(
        {
          actorId: actor.id,
          action: "taxonomy.generation_update",
          targetType: "generation",
          targetId: generation.id,
          metadata: { modelId: generation.modelId, name, yearFrom: data.values.yearFrom, yearTo: data.values.yearTo },
        },
        tx,
      );
    });
    invalidateTaxonomy(makeId);
  });
}

export async function deleteGenerationAction(input: { id: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("taxonomy.manage");
    const data = parseInput(z.object({ id: z.uuid() }), input);
    const { generation, makeId } = await loadGeneration(data.id);
    const [usage] = await db.select({ value: count() }).from(listings).where(eq(listings.generationId, generation.id));
    if ((usage?.value ?? 0) > 0) {
      throw new AppError("CONFLICT", `Поколението се използва в ${usage?.value} ${usage?.value === 1 ? "обява" : "обяви"} и не може да бъде изтрито.`);
    }
    await db.transaction(async (tx) => {
      await tx.delete(vehicleGenerations).where(eq(vehicleGenerations.id, generation.id));
      await recordAudit(
        { actorId: actor.id, action: "taxonomy.generation_delete", targetType: "generation", targetId: generation.id, metadata: { modelId: generation.modelId, name: generation.name } },
        tx,
      );
    });
    invalidateTaxonomy(makeId);
  });
}
