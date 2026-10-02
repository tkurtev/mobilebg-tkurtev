import "server-only";
import { and, asc, count, desc, eq, gt, ilike, isNull, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";
import type { ListingStatus } from "@/config/listing-status";
import { db } from "@/db/client";
import {
  categories,
  cities,
  conversations,
  dealerLocations,
  dealerMembers,
  dealerOpeningHours,
  dealers,
  listings,
  promotions,
  regions,
  users,
} from "@/db/schema";
import type { ListingCardData } from "@/features/listings/card-data";
import { listingPath } from "@/features/listings/paths";
import { cardQuery, hydrateCards, promotionRank, publicListingCondition } from "@/features/listings/queries";
import { completeWeek, type OpeningHoursDay } from "./hours";
import type { DealerListingFilter } from "./params";

export const DEALER_DIRECTORY_PAGE_SIZE = 20;
export const DEALER_INVENTORY_PAGE_SIZE = 20;
export const DEALER_LISTINGS_PAGE_SIZE = 25;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Correlated count; uses listings_dealer_idx (dealer_id, status) per dealer row. */
const activeListingCount = sql<number>`(select count(*)::int from ${listings} where ${listings.dealerId} = ${dealers.id} and ${publicListingCondition()})`;

const publicDealerCondition = () => and(eq(dealers.status, "ACTIVE"), isNull(dealers.deletedAt));

export type DealerDirectoryItem = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  phone: string;
  address: string;
  cityName: string | null;
  regionName: string | null;
  activeCount: number;
};

export type DealerDirectoryResult = { items: DealerDirectoryItem[]; total: number; page: number; totalPages: number };

export async function searchDealers(filters: { q?: string; region?: string; city?: string; page: number }): Promise<DealerDirectoryResult> {
  const conditions: (SQL | undefined)[] = [publicDealerCondition()];
  if (filters.q) conditions.push(ilike(dealers.name, `%${escapeLike(filters.q)}%`));
  if (filters.region) conditions.push(eq(regions.slug, filters.region));
  if (filters.city) conditions.push(eq(cities.slug, filters.city));
  const where = and(...conditions);

  const [countRow] = await db
    .select({ value: count() })
    .from(dealers)
    .leftJoin(cities, eq(cities.id, dealers.cityId))
    .leftJoin(regions, eq(regions.id, dealers.regionId))
    .where(where);
  const total = countRow?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DEALER_DIRECTORY_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const items = await db
    .select({
      id: dealers.id,
      slug: dealers.slug,
      name: dealers.name,
      logoUrl: dealers.logoUrl,
      phone: dealers.phone,
      address: dealers.address,
      cityName: cities.name,
      regionName: regions.name,
      activeCount: activeListingCount,
    })
    .from(dealers)
    .leftJoin(cities, eq(cities.id, dealers.cityId))
    .leftJoin(regions, eq(regions.id, dealers.regionId))
    .where(where)
    .orderBy(desc(activeListingCount), asc(dealers.name), asc(dealers.id))
    .limit(DEALER_DIRECTORY_PAGE_SIZE)
    .offset((page - 1) * DEALER_DIRECTORY_PAGE_SIZE);

  return { items, total, page, totalPages };
}

export type DealerLocation = { id: string; name: string; address: string; cityName: string | null; phone: string | null; isPrimary: boolean };

async function getOpeningHours(dealerId: string): Promise<OpeningHoursDay[]> {
  return db
    .select({
      dayOfWeek: dealerOpeningHours.dayOfWeek,
      opensAt: dealerOpeningHours.opensAt,
      closesAt: dealerOpeningHours.closesAt,
      isClosed: dealerOpeningHours.isClosed,
    })
    .from(dealerOpeningHours)
    .where(eq(dealerOpeningHours.dealerId, dealerId))
    .orderBy(asc(dealerOpeningHours.dayOfWeek));
}

async function getLocations(dealerId: string): Promise<DealerLocation[]> {
  return db
    .select({
      id: dealerLocations.id,
      name: dealerLocations.name,
      address: dealerLocations.address,
      cityName: cities.name,
      phone: dealerLocations.phone,
      isPrimary: dealerLocations.isPrimary,
    })
    .from(dealerLocations)
    .leftJoin(cities, eq(cities.id, dealerLocations.cityId))
    .where(eq(dealerLocations.dealerId, dealerId))
    .orderBy(desc(dealerLocations.isPrimary), asc(dealerLocations.name));
}

export type PublicDealer = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  address: string;
  cityName: string | null;
  regionName: string | null;
  /** Empty when the dealer never stored opening hours. */
  hours: OpeningHoursDay[];
  locations: DealerLocation[];
};

/** Only active, non-deleted dealers are public. Cached per request for metadata and page. */
export const getPublicDealerBySlug = cache(async (slug: string): Promise<PublicDealer | null> => {
  const [row] = await db
    .select({
      id: dealers.id,
      slug: dealers.slug,
      name: dealers.name,
      description: dealers.description,
      logoUrl: dealers.logoUrl,
      phone: dealers.phone,
      email: dealers.email,
      website: dealers.website,
      address: dealers.address,
      cityName: cities.name,
      regionName: regions.name,
    })
    .from(dealers)
    .leftJoin(cities, eq(cities.id, dealers.cityId))
    .leftJoin(regions, eq(regions.id, dealers.regionId))
    .where(and(eq(dealers.slug, slug), publicDealerCondition()))
    .limit(1);
  if (!row) return null;
  const [hours, locations] = await Promise.all([getOpeningHours(row.id), getLocations(row.id)]);
  return { ...row, hours: hours.length > 0 ? completeWeek(hours) : [], locations };
});

export type DealerCategoryCount = { id: string; slug: string; name: string; count: number };

export async function getDealerCategoryCounts(dealerId: string): Promise<DealerCategoryCount[]> {
  return db
    .select({ id: categories.id, slug: categories.slug, name: categories.name, count: sql<number>`count(*)::int` })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(and(publicListingCondition(), eq(listings.dealerId, dealerId)))
    .groupBy(categories.id, categories.slug, categories.name, categories.sortOrder)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getDealerInventory(
  dealerId: string,
  options: { categoryId?: string; page: number },
): Promise<{ items: ListingCardData[]; total: number; page: number; totalPages: number }> {
  const where = and(publicListingCondition(), eq(listings.dealerId, dealerId), options.categoryId ? eq(listings.categoryId, options.categoryId) : undefined);
  const [countRow] = await db.select({ value: count() }).from(listings).where(where);
  const total = countRow?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DEALER_INVENTORY_PAGE_SIZE));
  const page = Math.min(options.page, totalPages);
  const rows = await cardQuery()
    .where(where)
    .orderBy(desc(promotionRank), desc(listings.sortDate), asc(listings.id))
    .limit(DEALER_INVENTORY_PAGE_SIZE)
    .offset((page - 1) * DEALER_INVENTORY_PAGE_SIZE);
  return { items: await hydrateCards(rows), total, page, totalPages };
}

export type DealerStats = {
  active: number;
  drafts: number;
  soldRecent: number;
  views: number;
  favorites: number;
  inquiries: number;
  activePromotions: number;
};

export async function getDealerStats(dealerId: string): Promise<DealerStats> {
  const [listingRow, inquiryRow, promotionRow] = await Promise.all([
    db
      .select({
        active: sql<number>`count(*) filter (where ${publicListingCondition()})`.mapWith(Number),
        drafts: sql<number>`count(*) filter (where ${listings.status} = 'DRAFT')`.mapWith(Number),
        soldRecent: sql<number>`count(*) filter (where ${listings.status} = 'SOLD' and ${listings.soldAt} >= now() - interval '90 days')`.mapWith(Number),
        views: sql<number>`coalesce(sum(${listings.viewCount}) filter (where ${publicListingCondition()}), 0)`.mapWith(Number),
        favorites: sql<number>`coalesce(sum(${listings.favoriteCount}) filter (where ${publicListingCondition()}), 0)`.mapWith(Number),
      })
      .from(listings)
      .where(and(eq(listings.dealerId, dealerId), isNull(listings.deletedAt)))
      .then((rows) => rows[0]),
    db
      .select({ value: count() })
      .from(conversations)
      .innerJoin(listings, eq(listings.id, conversations.listingId))
      .where(and(eq(listings.dealerId, dealerId), gt(conversations.createdAt, sql`now() - interval '30 days'`)))
      .then((rows) => rows[0]),
    db
      .select({ value: count() })
      .from(promotions)
      .innerJoin(listings, eq(listings.id, promotions.listingId))
      .where(and(eq(listings.dealerId, dealerId), isNull(listings.deletedAt), lte(promotions.startsAt, sql`now()`), gt(promotions.endsAt, sql`now()`)))
      .then((rows) => rows[0]),
  ]);
  return {
    active: listingRow?.active ?? 0,
    drafts: listingRow?.drafts ?? 0,
    soldRecent: listingRow?.soldRecent ?? 0,
    views: listingRow?.views ?? 0,
    favorites: listingRow?.favorites ?? 0,
    inquiries: inquiryRow?.value ?? 0,
    activePromotions: promotionRow?.value ?? 0,
  };
}

const notPublicYet = sql`(${listings.expiresAt} IS NULL OR ${listings.expiresAt} <= now())`;

function dealerListingFilterCondition(filter: DealerListingFilter): SQL | undefined {
  switch (filter) {
    case "active":
      return publicListingCondition();
    case "expired":
      return or(eq(listings.status, "EXPIRED"), and(eq(listings.status, "ACTIVE"), notPublicYet));
    case "draft":
      return eq(listings.status, "DRAFT");
    case "pending":
      return eq(listings.status, "PENDING");
    case "paused":
      return eq(listings.status, "PAUSED");
    case "sold":
      return eq(listings.status, "SOLD");
    case "rejected":
      return eq(listings.status, "REJECTED");
    case "archived":
      return eq(listings.status, "ARCHIVED");
    default:
      return ne(listings.status, "ARCHIVED");
  }
}

export type DealerListingRow = {
  id: string;
  href: string;
  title: string;
  coverImageUrl: string | null;
  priceCents: number | null;
  /** ACTIVE listings past their expiry date are reported as EXPIRED before the cron catches up. */
  status: ListingStatus;
  expiresAt: Date | null;
  viewCount: number;
  favoriteCount: number;
  inquiryCount: number;
};

export async function getDealerListings(
  dealerId: string,
  options: { filter: DealerListingFilter; q?: string; page: number },
): Promise<{ items: DealerListingRow[]; total: number; page: number; totalPages: number }> {
  const where = and(
    eq(listings.dealerId, dealerId),
    isNull(listings.deletedAt),
    dealerListingFilterCondition(options.filter),
    options.q ? ilike(listings.title, `%${escapeLike(options.q)}%`) : undefined,
  );
  const [countRow] = await db.select({ value: count() }).from(listings).where(where);
  const total = countRow?.value ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / DEALER_LISTINGS_PAGE_SIZE));
  const page = Math.min(options.page, totalPages);
  const rows = await db
    .select({
      id: listings.id,
      number: listings.number,
      slug: listings.slug,
      categorySlug: categories.slug,
      title: listings.title,
      coverImageUrl: listings.coverImageUrl,
      priceCents: listings.priceCents,
      status: listings.status,
      expiresAt: listings.expiresAt,
      viewCount: listings.viewCount,
      favoriteCount: listings.favoriteCount,
      inquiryCount: listings.inquiryCount,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(where)
    .orderBy(desc(listings.updatedAt), asc(listings.id))
    .limit(DEALER_LISTINGS_PAGE_SIZE)
    .offset((page - 1) * DEALER_LISTINGS_PAGE_SIZE);

  const now = new Date();
  const items = rows.map((row) => ({
    id: row.id,
    href: listingPath({ categorySlug: row.categorySlug, number: row.number, slug: row.slug }),
    title: row.title,
    coverImageUrl: row.coverImageUrl,
    priceCents: row.priceCents,
    status: (row.status === "ACTIVE" && !(row.expiresAt && row.expiresAt > now) ? "EXPIRED" : row.status) as ListingStatus,
    expiresAt: row.expiresAt,
    viewCount: row.viewCount,
    favoriteCount: row.favoriteCount,
    inquiryCount: row.inquiryCount,
  }));
  return { items, total, page, totalPages };
}

export type DealerPromotionRow = { id: string; type: string; endsAt: Date; listingId: string; title: string; href: string };

export async function getDealerActivePromotions(dealerId: string, limit = 50): Promise<DealerPromotionRow[]> {
  const rows = await db
    .select({
      id: promotions.id,
      type: promotions.type,
      endsAt: promotions.endsAt,
      listingId: listings.id,
      title: listings.title,
      number: listings.number,
      slug: listings.slug,
      categorySlug: categories.slug,
    })
    .from(promotions)
    .innerJoin(listings, eq(listings.id, promotions.listingId))
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .where(and(eq(listings.dealerId, dealerId), isNull(listings.deletedAt), lte(promotions.startsAt, sql`now()`), gt(promotions.endsAt, sql`now()`)))
    .orderBy(asc(promotions.endsAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    endsAt: row.endsAt,
    listingId: row.listingId,
    title: row.title,
    href: listingPath({ categorySlug: row.categorySlug, number: row.number, slug: row.slug }),
  }));
}

export type DealerMemberRow = { userId: string; name: string; email: string; role: "OWNER" | "MEMBER"; createdAt: Date };

export type DealerSettings = {
  id: string;
  slug: string;
  name: string;
  description: string;
  logoUrl: string | null;
  phone: string;
  email: string | null;
  website: string | null;
  regionId: string | null;
  cityId: string | null;
  address: string;
  cityName: string | null;
  regionName: string | null;
  hours: OpeningHoursDay[];
  members: DealerMemberRow[];
};

export async function getDealerSettings(dealerId: string): Promise<DealerSettings | null> {
  const [row] = await db
    .select({
      id: dealers.id,
      slug: dealers.slug,
      name: dealers.name,
      description: dealers.description,
      logoUrl: dealers.logoUrl,
      phone: dealers.phone,
      email: dealers.email,
      website: dealers.website,
      regionId: dealers.regionId,
      cityId: dealers.cityId,
      address: dealers.address,
      cityName: cities.name,
      regionName: regions.name,
    })
    .from(dealers)
    .leftJoin(cities, eq(cities.id, dealers.cityId))
    .leftJoin(regions, eq(regions.id, dealers.regionId))
    .where(and(eq(dealers.id, dealerId), isNull(dealers.deletedAt)))
    .limit(1);
  if (!row) return null;
  const [hours, members] = await Promise.all([
    getOpeningHours(dealerId),
    db
      .select({ userId: users.id, name: users.name, email: users.email, role: dealerMembers.role, createdAt: dealerMembers.createdAt })
      .from(dealerMembers)
      .innerJoin(users, eq(users.id, dealerMembers.userId))
      .where(eq(dealerMembers.dealerId, dealerId))
      .orderBy(asc(dealerMembers.role), asc(dealerMembers.createdAt)),
  ]);
  return { ...row, hours: completeWeek(hours), members };
}

/** Any membership row, including memberships of suspended dealers that getCurrentUser hides. */
export async function getMembershipForUser(userId: string): Promise<{ dealerId: string; dealerName: string; dealerStatus: string } | null> {
  const [row] = await db
    .select({ dealerId: dealers.id, dealerName: dealers.name, dealerStatus: dealers.status })
    .from(dealerMembers)
    .innerJoin(dealers, eq(dealers.id, dealerMembers.dealerId))
    .where(eq(dealerMembers.userId, userId))
    .limit(1);
  return row ?? null;
}
