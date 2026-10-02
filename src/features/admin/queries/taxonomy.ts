import "server-only";
import { asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { vehicleGenerations, vehicleMakes, vehicleModels } from "@/db/schema";
import { ADMIN_PAGE_SIZE, likePattern } from "../params";

// Drizzle drops table qualifiers in single-table selects, so correlated subqueries name tables explicitly.
const MAKES_PAGE_SIZE = ADMIN_PAGE_SIZE * 2;

export async function searchMakes(filters: { q?: string; page: number }) {
  const where = filters.q ? or(ilike(vehicleMakes.name, likePattern(filters.q)), ilike(vehicleMakes.slug, likePattern(filters.q))) : undefined;
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: vehicleMakes.id,
        name: vehicleMakes.name,
        slug: vehicleMakes.slug,
        isActive: vehicleMakes.isActive,
        modelCount: sql<number>`(select count(*)::int from vehicle_models m where m.make_id = vehicle_makes.id)`,
        listingCount: sql<number>`(select count(*)::int from listings l where l.make_id = vehicle_makes.id and l.deleted_at is null)`,
      })
      .from(vehicleMakes)
      .where(where)
      .orderBy(asc(vehicleMakes.name))
      .limit(MAKES_PAGE_SIZE)
      .offset((filters.page - 1) * MAKES_PAGE_SIZE),
    db.select({ value: count() }).from(vehicleMakes).where(where),
  ]);
  return { items, total: total?.value ?? 0, pageSize: MAKES_PAGE_SIZE };
}

export async function getMakeWithModels(makeId: string) {
  const [make] = await db.select().from(vehicleMakes).where(eq(vehicleMakes.id, makeId)).limit(1);
  if (!make) return null;
  const models = await db
    .select({
      id: vehicleModels.id,
      name: vehicleModels.name,
      slug: vehicleModels.slug,
      vehicleType: vehicleModels.vehicleType,
      isActive: vehicleModels.isActive,
      listingCount: sql<number>`(select count(*)::int from listings l where l.model_id = vehicle_models.id)`,
    })
    .from(vehicleModels)
    .where(eq(vehicleModels.makeId, makeId))
    .orderBy(asc(vehicleModels.vehicleType), asc(vehicleModels.name));
  const generations =
    models.length === 0
      ? []
      : await db
          .select({
            id: vehicleGenerations.id,
            modelId: vehicleGenerations.modelId,
            name: vehicleGenerations.name,
            slug: vehicleGenerations.slug,
            yearFrom: vehicleGenerations.yearFrom,
            yearTo: vehicleGenerations.yearTo,
            listingCount: sql<number>`(select count(*)::int from listings l where l.generation_id = vehicle_generations.id)`,
          })
          .from(vehicleGenerations)
          .where(inArray(vehicleGenerations.modelId, models.map((model) => model.id)))
          .orderBy(asc(vehicleGenerations.yearFrom), asc(vehicleGenerations.name));

  return {
    make,
    models: models.map((model) => ({ ...model, generations: generations.filter((generation) => generation.modelId === model.id) })),
  };
}

export type AdminMakeDetail = NonNullable<Awaited<ReturnType<typeof getMakeWithModels>>>;
export type AdminModelRow = AdminMakeDetail["models"][number];
export type AdminGenerationRow = AdminModelRow["generations"][number];
