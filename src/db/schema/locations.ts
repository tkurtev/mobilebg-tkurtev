import { boolean, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const regions = pgTable("regions", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  slug: text().notNull().unique(),
  sortOrder: integer().notNull().default(0),
});

export const cities = pgTable(
  "cities",
  {
    id: uuid().primaryKey().defaultRandom(),
    regionId: uuid()
      .notNull()
      .references(() => regions.id, { onDelete: "restrict" }),
    name: text().notNull(),
    slug: text().notNull().unique(),
    isRegionCenter: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index("cities_region_id_idx").on(t.regionId)],
);
