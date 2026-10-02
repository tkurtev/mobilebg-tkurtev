import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/db/client";
import {
  categories,
  cities,
  dealers,
  listingAttributes,
  listingFeatures,
  listingImages,
  listingPriceHistory,
  listings,
  regions,
  users,
  vehicleGenerations,
  vehicleMakes,
  vehicleModels,
} from "@/db/schema";

export const getListingByNumber = cache(async (number: number) => {
  const [row] = await db
    .select({
      listing: listings,
      category: { id: categories.id, slug: categories.slug, name: categories.name, attributeSet: categories.attributeSet },
      makeName: vehicleMakes.name,
      makeSlug: vehicleMakes.slug,
      modelName: vehicleModels.name,
      modelSlug: vehicleModels.slug,
      generationName: vehicleGenerations.name,
      cityName: cities.name,
      regionName: regions.name,
      seller: { id: users.id, name: users.name, createdAt: users.createdAt },
      dealer: {
        id: dealers.id,
        slug: dealers.slug,
        name: dealers.name,
        logoUrl: dealers.logoUrl,
        address: dealers.address,
        phone: dealers.phone,
        status: dealers.status,
      },
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(users, eq(users.id, listings.sellerId))
    .leftJoin(vehicleMakes, eq(vehicleMakes.id, listings.makeId))
    .leftJoin(vehicleModels, eq(vehicleModels.id, listings.modelId))
    .leftJoin(vehicleGenerations, eq(vehicleGenerations.id, listings.generationId))
    .leftJoin(cities, eq(cities.id, listings.cityId))
    .leftJoin(regions, eq(regions.id, listings.regionId))
    .leftJoin(dealers, eq(dealers.id, listings.dealerId))
    .where(eq(listings.number, number))
    .limit(1);
  if (!row) return null;

  const [images, attributes, features, priceHistory] = await Promise.all([
    db
      .select({ id: listingImages.id, url: listingImages.url, thumbUrl: listingImages.thumbUrl, width: listingImages.width, height: listingImages.height })
      .from(listingImages)
      .where(eq(listingImages.listingId, row.listing.id))
      .orderBy(asc(listingImages.position), asc(listingImages.createdAt)),
    db
      .select({ key: listingAttributes.key, valueText: listingAttributes.valueText, valueNumber: listingAttributes.valueNumber, valueBool: listingAttributes.valueBool })
      .from(listingAttributes)
      .where(eq(listingAttributes.listingId, row.listing.id)),
    db.select({ key: listingFeatures.featureKey }).from(listingFeatures).where(eq(listingFeatures.listingId, row.listing.id)),
    db
      .select({ oldPriceCents: listingPriceHistory.oldPriceCents, newPriceCents: listingPriceHistory.newPriceCents, changedAt: listingPriceHistory.changedAt })
      .from(listingPriceHistory)
      .where(eq(listingPriceHistory.listingId, row.listing.id))
      .orderBy(desc(listingPriceHistory.changedAt))
      .limit(10),
  ]);

  return { ...row, images, attributes, features: features.map((feature) => feature.key), priceHistory };
});

export type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListingByNumber>>>;
