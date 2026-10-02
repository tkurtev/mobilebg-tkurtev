import { boolean, index, pgTable, primaryKey, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, timestamps } from "./columns";
import { dealerMemberRoleEnum, dealerStatusEnum } from "./enums";
import { cities, regions } from "./locations";

export const dealers = pgTable(
  "dealers",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text().notNull().default(""),
    logoUrl: text(),
    logoStoragePath: text(),
    phone: text().notNull(),
    email: text(),
    website: text(),
    regionId: uuid().references(() => regions.id, { onDelete: "set null" }),
    cityId: uuid().references(() => cities.id, { onDelete: "set null" }),
    address: text().notNull().default(""),
    status: dealerStatusEnum().notNull().default("ACTIVE"),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("dealers_city_idx").on(t.cityId),
    index("dealers_region_idx").on(t.regionId),
    index("dealers_name_trgm_idx").using("gin", t.name.op("gin_trgm_ops")),
  ],
);

export const dealerMembers = pgTable(
  "dealer_members",
  {
    dealerId: uuid()
      .notNull()
      .references(() => dealers.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: dealerMemberRoleEnum().notNull().default("MEMBER"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.dealerId, t.userId] }), unique("dealer_members_user_unique").on(t.userId)],
);

export const dealerLocations = pgTable(
  "dealer_locations",
  {
    id: uuid().primaryKey().defaultRandom(),
    dealerId: uuid()
      .notNull()
      .references(() => dealers.id, { onDelete: "cascade" }),
    name: text().notNull(),
    address: text().notNull(),
    cityId: uuid().references(() => cities.id, { onDelete: "set null" }),
    phone: text(),
    isPrimary: boolean().notNull().default(false),
    ...timestamps(),
  },
  (t) => [index("dealer_locations_dealer_idx").on(t.dealerId)],
);

/** dayOfWeek follows ISO 8601: 1 is Monday, 7 is Sunday. Times are stored as HH:MM. */
export const dealerOpeningHours = pgTable(
  "dealer_opening_hours",
  {
    id: uuid().primaryKey().defaultRandom(),
    dealerId: uuid()
      .notNull()
      .references(() => dealers.id, { onDelete: "cascade" }),
    dayOfWeek: smallint().notNull(),
    opensAt: text(),
    closesAt: text(),
    isClosed: boolean().notNull().default(false),
  },
  (t) => [unique("dealer_opening_hours_day_unique").on(t.dealerId, t.dayOfWeek)],
);
