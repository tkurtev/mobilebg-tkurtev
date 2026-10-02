import { boolean, index, integer, pgTable, smallint, text, unique, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns";

/**
 * `attributeSet` points at a code-defined attribute set (see src/config/attribute-sets.ts)
 * so admins can add categories without schema changes. `vehicleType` selects which
 * part of the make/model taxonomy applies; null for categories without makes.
 */
export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  attributeSet: text().notNull(),
  vehicleType: text(),
  sortOrder: integer().notNull().default(0),
  isActive: boolean().notNull().default(true),
  ...timestamps(),
});

export const vehicleMakes = pgTable("vehicle_makes", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  isActive: boolean().notNull().default(true),
  ...timestamps(),
});

export const vehicleModels = pgTable(
  "vehicle_models",
  {
    id: uuid().primaryKey().defaultRandom(),
    makeId: uuid()
      .notNull()
      .references(() => vehicleMakes.id, { onDelete: "cascade" }),
    name: text().notNull(),
    slug: text().notNull(),
    vehicleType: text().notNull(),
    isActive: boolean().notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    unique("vehicle_models_make_slug_type_unique").on(t.makeId, t.slug, t.vehicleType),
    index("vehicle_models_type_make_idx").on(t.vehicleType, t.makeId),
  ],
);

export const vehicleGenerations = pgTable(
  "vehicle_generations",
  {
    id: uuid().primaryKey().defaultRandom(),
    modelId: uuid()
      .notNull()
      .references(() => vehicleModels.id, { onDelete: "cascade" }),
    name: text().notNull(),
    slug: text().notNull(),
    yearFrom: smallint().notNull(),
    yearTo: smallint(),
    ...timestamps(),
  },
  (t) => [unique("vehicle_generations_model_slug_unique").on(t.modelId, t.slug)],
);
