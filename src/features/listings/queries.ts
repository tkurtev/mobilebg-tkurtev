import "server-only";
import { and, desc, eq, gt, inArray, isNull, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, cities, dealers, listingAttributes, listings } from "@/db/schema";
import { toListingCard, type AttributeValueRow, type CardSourceRow, type ListingCardData } from "./card-data";

export const cardSelect = {
  id: listings.id,
  number: listings.number,
  slug: listings.slug,
  title: listings.title,
  status: listings.status,
  priceCents: listings.priceCents,
  previousPriceCents: listings.previousPriceCents,
  priceNegotiable: listings.priceNegotiable,
  coverImageUrl: listings.coverImageUrl,
  imageCount: listings.imageCount,
  year: listings.year,
  mileageKm: listings.mileageKm,
  fuel: listings.fuel,
  gearbox: listings.gearbox,
  powerHp: listings.powerHp,
  engineCc: listings.engineCc,
  bodyType: listings.bodyType,
  categorySlug: categories.slug,
  attributeSet: categories.attributeSet,
  cityName: cities.name,
  dealerName: dealers.name,
  dealerId: listings.dealerId,
  publishedAt: listings.publishedAt,
  sortDate: listings.sortDate,
  vipUntil: listings.vipUntil,
  topUntil: listings.topUntil,
  highlightUntil: listings.highlightUntil,
};

export function cardQuery() {
  return db
    .select(cardSelect)
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .leftJoin(cities, eq(cities.id, listings.cityId))
    .leftJoin(dealers, eq(dealers.id, listings.dealerId));
}

/** Listings visible to the public: active, not deleted and not past their expiry date. */
export function publicListingCondition(): SQL {
  return and(eq(listings.status, "ACTIVE"), isNull(listings.deletedAt), gt(listings.expiresAt, sql`now()`)) as SQL;
}

export const promotionRank = sql<number>`CASE WHEN ${listings.vipUntil} > now() THEN 2 WHEN ${listings.topUntil} > now() THEN 1 ELSE 0 END`;

export async function hydrateCards(rows: CardSourceRow[]): Promise<ListingCardData[]> {
  if (rows.length === 0) return [];
  const attributeRows = await db
    .select({ listingId: listingAttributes.listingId, key: listingAttributes.key, valueText: listingAttributes.valueText, valueNumber: listingAttributes.valueNumber, valueBool: listingAttributes.valueBool })
    .from(listingAttributes)
    .where(inArray(listingAttributes.listingId, rows.map((row) => row.id)));
  const byListing = new Map<string, AttributeValueRow[]>();
  for (const attribute of attributeRows) {
    const list = byListing.get(attribute.listingId) ?? [];
    list.push(attribute);
    byListing.set(attribute.listingId, list);
  }
  const now = new Date();
  return rows.map((row) => toListingCard(row, byListing.get(row.id) ?? [], now));
}

export async function getLatestListings(limit = 12): Promise<ListingCardData[]> {
  const rows = await cardQuery().where(publicListingCondition()).orderBy(desc(listings.sortDate)).limit(limit);
  return hydrateCards(rows);
}

export async function getPromotedListings(limit = 8): Promise<ListingCardData[]> {
  const rows = await cardQuery()
    .where(and(publicListingCondition(), gt(listings.vipUntil, sql`now()`)))
    .orderBy(sql`md5(${listings.id}::text || to_char(now(), 'YYYY-MM-DD HH24'))`)
    .limit(limit);
  return hydrateCards(rows);
}

export async function getCardsByIds(ids: string[], options: { publicOnly?: boolean } = {}): Promise<ListingCardData[]> {
  if (ids.length === 0) return [];
  const condition = options.publicOnly === false ? inArray(listings.id, ids) : and(inArray(listings.id, ids), publicListingCondition());
  const rows = await cardQuery().where(condition);
  const cards = await hydrateCards(rows);
  const order = new Map(ids.map((id, index) => [id, index]));
  return cards.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Rule-based similarity: same model first, then same make and category, close in price and year. */
export async function getSimilarListings(listing: {
  id: string;
  categoryId: string;
  makeId: string | null;
  modelId: string | null;
  priceCents: number | null;
  year: number | null;
}, limit = 4): Promise<ListingCardData[]> {
  const price = listing.priceCents ?? 0;
  const year = listing.year ?? 0;
  const rows = await cardQuery()
    .where(and(publicListingCondition(), eq(listings.categoryId, listing.categoryId), ne(listings.id, listing.id)))
    .orderBy(
      sql`(CASE WHEN ${listings.modelId} = ${listing.modelId} THEN 0 WHEN ${listings.makeId} = ${listing.makeId} THEN 1 ELSE 2 END)`,
      sql`abs(coalesce(${listings.priceCents}, 0) - ${price}) / greatest(${price}, 100000)::float + abs(coalesce(${listings.year}, 0) - ${year}) * 0.05`,
    )
    .limit(limit);
  return hydrateCards(rows);
}
