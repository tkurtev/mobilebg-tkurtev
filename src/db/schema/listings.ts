import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  customType,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt, timestamps } from "./columns";
import { dealers } from "./dealers";
import { listingStatusEnum } from "./enums";
import { cities, regions } from "./locations";
import { categories, vehicleGenerations, vehicleMakes, vehicleModels } from "./taxonomy";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * Core vehicle fields that most categories share and that drive the main search filters
 * live as typed, indexed columns. Category-specific data goes to listing_attributes.
 * Drafts are stored in the same table, so most fields are nullable and completeness is
 * enforced by validation at publish time.
 */
export const listings = pgTable(
  "listings",
  {
    id: uuid().primaryKey().defaultRandom(),
    number: bigint({ mode: "number" }).notNull().unique().generatedAlwaysAsIdentity({ startWith: 10000001 }),
    slug: text().notNull().default(""),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    sellerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    dealerId: uuid().references(() => dealers.id, { onDelete: "set null" }),
    status: listingStatusEnum().notNull().default("DRAFT"),
    title: text().notNull().default(""),
    description: text().notNull().default(""),
    priceCents: bigint({ mode: "number" }),
    priceNegotiable: boolean().notNull().default(false),
    condition: text(),
    makeId: uuid().references(() => vehicleMakes.id, { onDelete: "set null" }),
    modelId: uuid().references(() => vehicleModels.id, { onDelete: "set null" }),
    generationId: uuid().references(() => vehicleGenerations.id, { onDelete: "set null" }),
    year: smallint(),
    mileageKm: integer(),
    fuel: text(),
    gearbox: text(),
    powerHp: smallint(),
    engineCc: integer(),
    drivetrain: text(),
    bodyType: text(),
    color: text(),
    regionId: uuid().references(() => regions.id, { onDelete: "set null" }),
    cityId: uuid().references(() => cities.id, { onDelete: "set null" }),
    contactName: text(),
    contactPhone: text(),
    coverImageUrl: text(),
    imageCount: smallint().notNull().default(0),
    viewCount: integer().notNull().default(0),
    favoriteCount: integer().notNull().default(0),
    inquiryCount: integer().notNull().default(0),
    previousPriceCents: bigint({ mode: "number" }),
    publishedAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    soldAt: timestamp({ withTimezone: true }),
    sortDate: timestamp({ withTimezone: true }).notNull().defaultNow(),
    vipUntil: timestamp({ withTimezone: true }),
    topUntil: timestamp({ withTimezone: true }),
    highlightUntil: timestamp({ withTimezone: true }),
    rejectionReason: text(),
    draftStep: smallint().notNull().default(1),
    searchDocument: text().notNull().default(""),
    searchVector: tsvector().generatedAlwaysAs(sql`to_tsvector('simple', search_document)`),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("listings_status_category_sort_idx").on(t.status, t.categoryId, t.sortDate),
    index("listings_make_model_idx").on(t.makeId, t.modelId),
    index("listings_price_idx").on(t.priceCents),
    index("listings_year_idx").on(t.year),
    index("listings_mileage_idx").on(t.mileageKm),
    index("listings_city_idx").on(t.cityId),
    index("listings_region_idx").on(t.regionId),
    index("listings_seller_idx").on(t.sellerId, t.status),
    index("listings_dealer_idx").on(t.dealerId, t.status),
    index("listings_expires_at_idx").on(t.expiresAt),
    index("listings_search_vector_idx").using("gin", t.searchVector),
    index("listings_search_document_trgm_idx").using("gin", t.searchDocument.op("gin_trgm_ops")),
    check("listings_price_non_negative", sql`${t.priceCents} IS NULL OR ${t.priceCents} >= 0`),
  ],
);

export const listingImages = pgTable(
  "listing_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text().notNull(),
    thumbUrl: text().notNull(),
    storagePath: text().notNull(),
    thumbStoragePath: text().notNull(),
    width: integer().notNull(),
    height: integer().notNull(),
    sizeBytes: integer().notNull(),
    position: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("listing_images_listing_position_idx").on(t.listingId, t.position)],
);

export const listingAttributes = pgTable(
  "listing_attributes",
  {
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    key: text().notNull(),
    valueText: text(),
    valueNumber: numeric({ mode: "number" }),
    valueBool: boolean(),
  },
  (t) => [
    primaryKey({ columns: [t.listingId, t.key] }),
    index("listing_attributes_key_text_idx").on(t.key, t.valueText),
    index("listing_attributes_key_number_idx").on(t.key, t.valueNumber),
  ],
);

export const listingFeatures = pgTable(
  "listing_features",
  {
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    featureKey: text().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.listingId, t.featureKey] }),
    index("listing_features_feature_idx").on(t.featureKey, t.listingId),
  ],
);

export const listingPriceHistory = pgTable(
  "listing_price_history",
  {
    id: uuid().primaryKey().defaultRandom(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    oldPriceCents: bigint({ mode: "number" }).notNull(),
    newPriceCents: bigint({ mode: "number" }).notNull(),
    changedById: uuid().references(() => users.id, { onDelete: "set null" }),
    changedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listing_price_history_listing_idx").on(t.listingId, t.changedAt)],
);

/** One row per listing, anonymous viewer hash and day. Used to deduplicate view counts. */
export const listingViewEvents = pgTable(
  "listing_view_events",
  {
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    viewerHash: text().notNull(),
    day: date({ mode: "string" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.listingId, t.viewerHash, t.day] }), index("listing_view_events_day_idx").on(t.day)],
);
