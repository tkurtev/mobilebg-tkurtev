import { boolean, index, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, timestamps } from "./columns";
import { listings } from "./listings";

export const favorites = pgTable(
  "favorites",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] }), index("favorites_listing_idx").on(t.listingId)],
);

export const recentlyViewed = pgTable(
  "recently_viewed",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    viewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] }), index("recently_viewed_user_idx").on(t.userId, t.viewedAt)],
);

export type SavedSearchFilters = Record<string, string>;

export const savedSearches = pgTable(
  "saved_searches",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    categorySlug: text().notNull(),
    filters: jsonb().$type<SavedSearchFilters>().notNull(),
    isActive: boolean().notNull().default(true),
    lastRunAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("saved_searches_user_idx").on(t.userId)],
);
