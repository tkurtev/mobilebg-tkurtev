import "server-only";
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, type SQL } from "drizzle-orm";
import type { ListingStatus } from "@/config/listing-status";
import { db } from "@/db/client";
import {
  categories,
  cities,
  dealers,
  listingAttributes,
  listingFeatures,
  listingImages,
  listings,
  moderationActions,
  regions,
  users,
  vehicleGenerations,
  vehicleMakes,
  vehicleModels,
} from "@/db/schema";
import { ADMIN_PAGE_SIZE, likePattern } from "../params";
import type { SellerType } from "../labels";

export type AdminListingFilters = {
  q?: string;
  status?: ListingStatus;
  categoryId?: string;
  sellerType?: SellerType;
  sellerId?: string;
  page: number;
};

function listingConditions(filters: AdminListingFilters): SQL | undefined {
  const conditions: SQL[] = [];
  // Owner-deleted drafts are noise; they only show up when archived listings are requested.
  if (filters.status !== "ARCHIVED") conditions.push(isNull(listings.deletedAt));
  if (filters.status) conditions.push(eq(listings.status, filters.status));
  if (filters.categoryId) conditions.push(eq(listings.categoryId, filters.categoryId));
  if (filters.sellerType === "dealer") conditions.push(isNotNull(listings.dealerId));
  if (filters.sellerType === "private") conditions.push(isNull(listings.dealerId));
  if (filters.sellerId) conditions.push(eq(listings.sellerId, filters.sellerId));
  if (filters.q) {
    const number = /^\d{6,15}$/.test(filters.q) ? Number(filters.q) : null;
    if (number !== null && Number.isSafeInteger(number)) {
      conditions.push(eq(listings.number, number));
    } else {
      const pattern = likePattern(filters.q);
      const match = or(ilike(listings.title, pattern), ilike(listings.searchDocument, pattern));
      if (match) conditions.push(match);
    }
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function searchAdminListings(filters: AdminListingFilters) {
  const where = listingConditions(filters);
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: listings.id,
        number: listings.number,
        title: listings.title,
        status: listings.status,
        priceCents: listings.priceCents,
        createdAt: listings.createdAt,
        deletedAt: listings.deletedAt,
        categoryName: categories.name,
        sellerId: users.id,
        sellerName: users.name,
        dealerName: dealers.name,
      })
      .from(listings)
      .innerJoin(categories, eq(categories.id, listings.categoryId))
      .innerJoin(users, eq(users.id, listings.sellerId))
      .leftJoin(dealers, eq(dealers.id, listings.dealerId))
      .where(where)
      .orderBy(desc(listings.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((filters.page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(listings).where(where),
  ]);
  return { items, total: total?.value ?? 0 };
}

export async function getAdminCategoryOptions() {
  return db
    .select({ id: categories.id, name: categories.name, isActive: categories.isActive })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getAdminListing(id: string) {
  const [row] = await db
    .select({
      listing: listings,
      category: { id: categories.id, slug: categories.slug, name: categories.name, attributeSet: categories.attributeSet },
      makeName: vehicleMakes.name,
      modelName: vehicleModels.name,
      generationName: vehicleGenerations.name,
      cityName: cities.name,
      regionName: regions.name,
      seller: { id: users.id, name: users.name, email: users.email, role: users.role, status: users.status },
      dealer: { id: dealers.id, name: dealers.name, slug: dealers.slug, status: dealers.status },
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(users, eq(users.id, listings.sellerId))
    .leftJoin(dealers, eq(dealers.id, listings.dealerId))
    .leftJoin(vehicleMakes, eq(vehicleMakes.id, listings.makeId))
    .leftJoin(vehicleModels, eq(vehicleModels.id, listings.modelId))
    .leftJoin(vehicleGenerations, eq(vehicleGenerations.id, listings.generationId))
    .leftJoin(cities, eq(cities.id, listings.cityId))
    .leftJoin(regions, eq(regions.id, listings.regionId))
    .where(eq(listings.id, id))
    .limit(1);
  if (!row) return null;

  const [images, attributes, features, history] = await Promise.all([
    db
      .select({ id: listingImages.id, url: listingImages.url, thumbUrl: listingImages.thumbUrl, width: listingImages.width, height: listingImages.height })
      .from(listingImages)
      .where(eq(listingImages.listingId, id))
      .orderBy(asc(listingImages.position), asc(listingImages.createdAt)),
    db
      .select({ key: listingAttributes.key, valueText: listingAttributes.valueText, valueNumber: listingAttributes.valueNumber, valueBool: listingAttributes.valueBool })
      .from(listingAttributes)
      .where(eq(listingAttributes.listingId, id)),
    db.select({ key: listingFeatures.featureKey }).from(listingFeatures).where(eq(listingFeatures.listingId, id)),
    db
      .select({
        id: moderationActions.id,
        action: moderationActions.action,
        reason: moderationActions.reason,
        previousStatus: moderationActions.previousStatus,
        newStatus: moderationActions.newStatus,
        reportId: moderationActions.reportId,
        createdAt: moderationActions.createdAt,
        moderatorId: users.id,
        moderatorName: users.name,
      })
      .from(moderationActions)
      .innerJoin(users, eq(users.id, moderationActions.moderatorId))
      .where(eq(moderationActions.listingId, id))
      .orderBy(desc(moderationActions.createdAt)),
  ]);

  return { ...row, images, attributes, features: features.map((feature) => feature.key), history };
}

export type AdminListingDetail = NonNullable<Awaited<ReturnType<typeof getAdminListing>>>;
