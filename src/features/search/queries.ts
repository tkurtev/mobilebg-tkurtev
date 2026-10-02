import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { SITE } from "@/config/site";
import { db } from "@/db/client";
import { dealers, listingAttributes, listingFeatures, listings } from "@/db/schema";
import {
  getCities,
  getGenerationsForModel,
  getMakesForVehicleType,
  getModelsForMake,
  getRegions,
  type CategoryRecord,
} from "@/features/catalog/queries";
import type { ListingCardData } from "@/features/listings/card-data";
import { cardQuery, hydrateCards, promotionRank, publicListingCondition } from "@/features/listings/queries";
import { toPrefixTsQuery } from "@/features/listings/search-document";
import type { RangeValue, SearchFilters, SearchState } from "./params";

export type ResolvedRefs = {
  make?: { id: string; name: string } | null;
  model?: { id: string; name: string } | null;
  generation?: { id: string; name: string } | null;
  region?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
  dealer?: { id: string; name: string } | null;
};

/** Maps URL slugs to ids and display names. null means the slug did not match anything. */
export async function resolveRefs(category: CategoryRecord, filters: SearchFilters): Promise<ResolvedRefs> {
  const refs: ResolvedRefs = {};
  if (filters.make && category.vehicleType) {
    const makes = await getMakesForVehicleType(category.vehicleType);
    const make = makes.find((candidate) => candidate.slug === filters.make);
    refs.make = make ? { id: make.id, name: make.name } : null;
    if (make && filters.model) {
      const models = await getModelsForMake(make.id, category.vehicleType);
      const model = models.find((candidate) => candidate.slug === filters.model);
      refs.model = model ? { id: model.id, name: model.name } : null;
      if (model && filters.generation) {
        const generations = await getGenerationsForModel(model.id);
        const generation = generations.find((candidate) => candidate.slug === filters.generation);
        refs.generation = generation ? { id: generation.id, name: generation.name } : null;
      }
    }
  } else if (filters.make) {
    refs.make = null;
  }
  if (filters.region) {
    const region = (await getRegions()).find((candidate) => candidate.slug === filters.region);
    refs.region = region ? { id: region.id, name: region.name } : null;
  }
  if (filters.city) {
    const city = (await getCities()).find((candidate) => candidate.slug === filters.city);
    refs.city = city ? { id: city.id, name: city.name } : null;
  }
  if (filters.dealer) {
    const [dealer] = await db.select({ id: dealers.id, name: dealers.name }).from(dealers).where(eq(dealers.slug, filters.dealer)).limit(1);
    refs.dealer = dealer ?? null;
  }
  return refs;
}

function rangeConditions(column: AnyPgColumn, range: RangeValue, multiplier = 1): SQL[] {
  const conditions: SQL[] = [];
  if (range.from !== undefined) conditions.push(gte(column, range.from * multiplier));
  if (range.to !== undefined) conditions.push(lte(column, range.to * multiplier));
  return conditions;
}

const NONE = sql`false`;

export function buildSearchConditions(category: CategoryRecord, filters: SearchFilters, refs: ResolvedRefs): SQL {
  const conditions: SQL[] = [publicListingCondition(), eq(listings.categoryId, category.id)];
  const ref = (value: { id: string } | null | undefined, column: AnyPgColumn) => {
    if (value === undefined) return;
    conditions.push(value === null ? NONE : eq(column, value.id));
  };
  ref(refs.make, listings.makeId);
  ref(refs.model, listings.modelId);
  ref(refs.generation, listings.generationId);
  ref(refs.region, listings.regionId);
  ref(refs.city, listings.cityId);
  ref(refs.dealer, listings.dealerId);

  if (filters.q) {
    const tsQuery = toPrefixTsQuery(filters.q);
    if (tsQuery) conditions.push(sql`${listings.searchVector} @@ to_tsquery('simple', ${tsQuery})`);
  }

  conditions.push(
    ...rangeConditions(listings.priceCents, filters.price, 100),
    ...rangeConditions(listings.year, filters.year),
    ...rangeConditions(listings.mileageKm, filters.mileage),
    ...rangeConditions(listings.powerHp, filters.power),
    ...rangeConditions(listings.engineCc, filters.engine),
  );

  const list = (column: AnyPgColumn, values: string[]) => {
    if (values.length > 0) conditions.push(inArray(column, values));
  };
  list(listings.fuel, filters.fuel);
  list(listings.gearbox, filters.gearbox);
  list(listings.bodyType, filters.body);
  list(listings.drivetrain, filters.drivetrain);
  list(listings.condition, filters.condition);
  list(listings.color, filters.color);

  if (filters.seller === "dealer") conditions.push(isNotNull(listings.dealerId));
  if (filters.seller === "private") conditions.push(isNull(listings.dealerId));

  for (const feature of filters.features) {
    conditions.push(
      sql`EXISTS (SELECT 1 FROM ${listingFeatures} WHERE ${listingFeatures.listingId} = ${listings.id} AND ${listingFeatures.featureKey} = ${feature})`,
    );
  }

  for (const [key, filter] of Object.entries(filters.attributes)) {
    const base = sql`${listingAttributes.listingId} = ${listings.id} AND ${listingAttributes.key} = ${key}`;
    if (filter.kind === "select") {
      conditions.push(sql`EXISTS (SELECT 1 FROM ${listingAttributes} WHERE ${base} AND ${inArray(listingAttributes.valueText, filter.values)})`);
    } else if (filter.kind === "range") {
      const parts = [base];
      if (filter.from !== undefined) parts.push(sql`${listingAttributes.valueNumber} >= ${filter.from}`);
      if (filter.to !== undefined) parts.push(sql`${listingAttributes.valueNumber} <= ${filter.to}`);
      conditions.push(sql`EXISTS (SELECT 1 FROM ${listingAttributes} WHERE ${sql.join(parts, sql` AND `)})`);
    } else {
      conditions.push(sql`EXISTS (SELECT 1 FROM ${listingAttributes} WHERE ${base} AND ${listingAttributes.valueBool} = true)`);
    }
  }

  return and(...conditions) as SQL;
}

function orderFor(sort: SearchState["sort"]): SQL[] {
  switch (sort) {
    case "price-asc":
      return [sql`${listings.priceCents} ASC NULLS LAST`, desc(listings.sortDate)];
    case "price-desc":
      return [sql`${listings.priceCents} DESC NULLS LAST`, desc(listings.sortDate)];
    case "year-desc":
      return [sql`${listings.year} DESC NULLS LAST`, desc(listings.sortDate)];
    case "mileage-asc":
      return [sql`${listings.mileageKm} ASC NULLS LAST`, desc(listings.sortDate)];
    default:
      return [desc(listings.sortDate)];
  }
}

export type SearchResult = {
  items: ListingCardData[];
  total: number;
  page: number;
  totalPages: number;
  refs: ResolvedRefs;
};

export async function searchListings(category: CategoryRecord, state: SearchState, pageSize: number = SITE.pageSize): Promise<SearchResult> {
  const refs = await resolveRefs(category, state.filters);
  const where = buildSearchConditions(category, state.filters, refs);
  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(listings).where(where);
  const total = countRow?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(state.page, totalPages);
  const rows = await cardQuery()
    .where(where)
    .orderBy(desc(promotionRank), ...orderFor(state.sort), asc(listings.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  return { items: await hydrateCards(rows), total, page, totalPages, refs };
}

export async function countListings(category: CategoryRecord, filters: SearchFilters): Promise<number> {
  const refs = await resolveRefs(category, filters);
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(listings).where(buildSearchConditions(category, filters, refs));
  return row?.count ?? 0;
}
