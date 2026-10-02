import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { categories, cities, regions, vehicleGenerations, vehicleMakes, vehicleModels } from "@/db/schema";

export const CATALOG_TAGS = {
  categories: "catalog:categories",
  taxonomy: "catalog:taxonomy",
  locations: "catalog:locations",
} as const;

export type CategoryRecord = {
  id: string;
  slug: string;
  name: string;
  attributeSet: string;
  vehicleType: string | null;
  sortOrder: number;
};

export const getActiveCategories = unstable_cache(
  async (): Promise<CategoryRecord[]> =>
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        attributeSet: categories.attributeSet,
        vehicleType: categories.vehicleType,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
  ["active-categories"],
  { tags: [CATALOG_TAGS.categories], revalidate: 3600 },
);

export async function getCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
  const all = await getActiveCategories();
  return all.find((category) => category.slug === slug) ?? null;
}

export type MakeOption = { id: string; name: string; slug: string };
export type ModelOption = { id: string; name: string; slug: string; makeId: string };
export type GenerationOption = { id: string; name: string; slug: string; modelId: string; yearFrom: number; yearTo: number | null };

export const getMakesForVehicleType = unstable_cache(
  async (vehicleType: string): Promise<MakeOption[]> =>
    db
      .selectDistinct({ id: vehicleMakes.id, name: vehicleMakes.name, slug: vehicleMakes.slug })
      .from(vehicleMakes)
      .innerJoin(vehicleModels, eq(vehicleModels.makeId, vehicleMakes.id))
      .where(and(eq(vehicleMakes.isActive, true), eq(vehicleModels.isActive, true), eq(vehicleModels.vehicleType, vehicleType)))
      .orderBy(asc(vehicleMakes.name)),
  ["makes-for-type"],
  { tags: [CATALOG_TAGS.taxonomy], revalidate: 3600 },
);

export const getModelsForMake = unstable_cache(
  async (makeId: string, vehicleType: string): Promise<ModelOption[]> =>
    db
      .select({ id: vehicleModels.id, name: vehicleModels.name, slug: vehicleModels.slug, makeId: vehicleModels.makeId })
      .from(vehicleModels)
      .where(and(eq(vehicleModels.makeId, makeId), eq(vehicleModels.vehicleType, vehicleType), eq(vehicleModels.isActive, true)))
      .orderBy(asc(vehicleModels.name)),
  ["models-for-make"],
  { tags: [CATALOG_TAGS.taxonomy], revalidate: 3600 },
);

export const getGenerationsForModel = unstable_cache(
  async (modelId: string): Promise<GenerationOption[]> =>
    db
      .select({
        id: vehicleGenerations.id,
        name: vehicleGenerations.name,
        slug: vehicleGenerations.slug,
        modelId: vehicleGenerations.modelId,
        yearFrom: vehicleGenerations.yearFrom,
        yearTo: vehicleGenerations.yearTo,
      })
      .from(vehicleGenerations)
      .where(eq(vehicleGenerations.modelId, modelId))
      .orderBy(asc(vehicleGenerations.yearFrom)),
  ["generations-for-model"],
  { tags: [CATALOG_TAGS.taxonomy], revalidate: 3600 },
);

export type RegionOption = { id: string; name: string; slug: string };
export type CityOption = { id: string; name: string; slug: string; regionId: string };

export const getRegions = unstable_cache(
  async (): Promise<RegionOption[]> =>
    db.select({ id: regions.id, name: regions.name, slug: regions.slug }).from(regions).orderBy(asc(regions.sortOrder), asc(regions.name)),
  ["regions"],
  { tags: [CATALOG_TAGS.locations], revalidate: 86_400 },
);

export const getCities = unstable_cache(
  async (): Promise<CityOption[]> =>
    db
      .select({ id: cities.id, name: cities.name, slug: cities.slug, regionId: cities.regionId })
      .from(cities)
      .orderBy(sql`${cities.isRegionCenter} DESC`, asc(cities.sortOrder), asc(cities.name)),
  ["cities"],
  { tags: [CATALOG_TAGS.locations], revalidate: 86_400 },
);
