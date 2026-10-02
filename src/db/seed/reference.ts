import { DEFAULT_CATEGORIES } from "@/config/categories";
import { DEFAULT_SETTINGS } from "@/config/settings";
import { db, type DbOrTx } from "@/db/client";
import * as s from "@/db/schema";
import { slugify } from "@/lib/slug";
import { BULGARIAN_REGIONS } from "./data/locations";
import { MAKES, type ModelSeed } from "./data/taxonomy";

/**
 * Reference data every environment needs: regions and cities, categories, the make/model
 * taxonomy and default settings. Used by the development seed and by `pnpm db:setup`.
 */

export type InsertedCity = { id: string; name: string; regionId: string; regionName: string; isRegionCenter: boolean };

export async function insertLocations(tx: DbOrTx = db): Promise<InsertedCity[]> {
  const regionRows = await tx
    .insert(s.regions)
    .values(BULGARIAN_REGIONS.map((region, index) => ({ name: region.name, slug: region.slug, sortOrder: index })))
    .returning({ id: s.regions.id, slug: s.regions.slug, name: s.regions.name });
  const regionBySlug = new Map(regionRows.map((row) => [row.slug, row]));

  const cityValues = BULGARIAN_REGIONS.flatMap((region) => {
    const regionRow = regionBySlug.get(region.slug);
    if (!regionRow) throw new Error(`region ${region.slug} was not inserted`);
    return region.cities.map((name, cityIndex) => ({
      regionId: regionRow.id,
      name,
      slug: slugify(name),
      isRegionCenter: cityIndex === 0 && region.centerIsFirst !== false,
      sortOrder: cityIndex,
    }));
  });
  const cityRows = await tx
    .insert(s.cities)
    .values(cityValues)
    .returning({ id: s.cities.id, name: s.cities.name, regionId: s.cities.regionId, isRegionCenter: s.cities.isRegionCenter });
  const regionNameById = new Map(regionRows.map((row) => [row.id, row.name]));
  return cityRows.map((row) => ({ ...row, regionName: regionNameById.get(row.regionId) ?? "" }));
}

export async function insertCategories(tx: DbOrTx = db) {
  return tx
    .insert(s.categories)
    .values(DEFAULT_CATEGORIES.map((category, index) => ({ ...category, sortOrder: index })))
    .returning({ id: s.categories.id, slug: s.categories.slug, name: s.categories.name, attributeSet: s.categories.attributeSet, vehicleType: s.categories.vehicleType });
}

export type InsertedModel = {
  id: string;
  makeId: string;
  makeName: string;
  name: string;
  vehicleType: string;
  seed: ModelSeed;
  generations: { id: string; name: string; yearFrom: number; yearTo: number | null }[];
};

export async function insertTaxonomy(tx: DbOrTx = db): Promise<InsertedModel[]> {
  const makeRows = await tx
    .insert(s.vehicleMakes)
    .values(MAKES.map((make) => ({ name: make.name, slug: slugify(make.name) })))
    .returning({ id: s.vehicleMakes.id, slug: s.vehicleMakes.slug });
  const makeIdBySlug = new Map(makeRows.map((row) => [row.slug, row.id]));

  const modelInputs = MAKES.flatMap((make) => {
    const makeId = makeIdBySlug.get(slugify(make.name));
    if (!makeId) throw new Error(`make ${make.name} was not inserted`);
    return make.models.map((seed) => ({ makeId, makeName: make.name, seed }));
  });
  const modelRows = await tx
    .insert(s.vehicleModels)
    .values(modelInputs.map(({ makeId, seed }) => ({ makeId, name: seed.name, slug: slugify(seed.name), vehicleType: seed.type })))
    .returning({ id: s.vehicleModels.id, makeId: s.vehicleModels.makeId, slug: s.vehicleModels.slug, vehicleType: s.vehicleModels.vehicleType });
  const modelKey = (makeId: string, slug: string, vehicleType: string) => `${makeId}:${slug}:${vehicleType}`;
  const modelIdByKey = new Map(modelRows.map((row) => [modelKey(row.makeId, row.slug, row.vehicleType), row.id]));

  const models: InsertedModel[] = modelInputs.map((input) => {
    const id = modelIdByKey.get(modelKey(input.makeId, slugify(input.seed.name), input.seed.type));
    if (!id) throw new Error(`model ${input.makeName} ${input.seed.name} was not inserted`);
    return { id, makeId: input.makeId, makeName: input.makeName, name: input.seed.name, vehicleType: input.seed.type, seed: input.seed, generations: [] };
  });

  const generationInputs = models.flatMap((model) =>
    (model.seed.generations ?? []).map(([name, yearFrom, yearTo]) => ({ modelId: model.id, name, slug: slugify(name), yearFrom, yearTo })),
  );
  if (generationInputs.length > 0) {
    const generationRows = await tx
      .insert(s.vehicleGenerations)
      .values(generationInputs)
      .returning({ id: s.vehicleGenerations.id, modelId: s.vehicleGenerations.modelId, name: s.vehicleGenerations.name, yearFrom: s.vehicleGenerations.yearFrom, yearTo: s.vehicleGenerations.yearTo });
    const modelById = new Map(models.map((model) => [model.id, model]));
    for (const { modelId, ...generation } of generationRows) modelById.get(modelId)?.generations.push(generation);
  }
  return models;
}

/** Adds settings that do not exist yet and keeps values an admin already changed. */
export async function insertMissingSettings(tx: DbOrTx = db): Promise<void> {
  await tx
    .insert(s.appSettings)
    .values(Object.entries(DEFAULT_SETTINGS).map(([key, value]) => ({ key, value })))
    .onConflictDoNothing();
}
