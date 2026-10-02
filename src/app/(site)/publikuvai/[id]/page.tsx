import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { getActiveCategories, getCities, getGenerationsForModel, getMakesForVehicleType, getModelsForMake, getRegions } from "@/features/catalog/queries";
import { firstIncompleteStep, LISTING_STEPS, stepsForSet, type StepKey } from "@/features/listings/editor";
import { ListingEditor } from "@/features/listings/editor/listing-editor";
import { listingPath } from "@/features/listings/paths";
import { getListingImages, loadListingValues, loadOwnedListing } from "@/features/listings/service";
import { getAttributeSet } from "@/config/attribute-sets";
import { formatBgPhone } from "@/lib/phone";
import { AppError } from "@/server/errors";
import { requireUser } from "@/server/auth/session";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Редакция на обява", robots: { index: false } };

export default async function EditListingPage(props: PageProps<"/publikuvai/[id]">) {
  const { id } = await props.params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/publikuvai/${id}`);
  const owned = await loadOwnedListing(user, id).catch((error: unknown) => {
    if (error instanceof AppError) return null;
    throw error;
  });
  if (!owned || ["SOLD", "ARCHIVED"].includes(owned.listing.status)) notFound();
  const { listing, category } = owned;
  const set = getAttributeSet(category.attributeSet);

  const [values, images, allCategories, regions, cities, settings, makes, profileRow] = await Promise.all([
    loadListingValues(listing.id),
    getListingImages(listing.id),
    getActiveCategories(),
    getRegions(),
    getCities(),
    getSettings(),
    category.vehicleType ? getMakesForVehicleType(category.vehicleType) : Promise.resolve([]),
    db.select({ phone: profiles.phone, cityId: profiles.cityId }).from(profiles).where(eq(profiles.userId, user.id)).limit(1),
  ]);
  const [models, generations] = await Promise.all([
    values.makeId && category.vehicleType ? getModelsForMake(values.makeId, category.vehicleType) : Promise.resolve([]),
    values.modelId ? getGenerationsForModel(values.modelId) : Promise.resolve([]),
  ]);

  const profile = profileRow[0];
  if (listing.status === "DRAFT") {
    if (!values.contactName) values.contactName = listing.dealerId && user.dealer ? user.name : user.name;
    if (!values.contactPhone && profile?.phone) values.contactPhone = formatBgPhone(profile.phone);
    if (!values.cityId && profile?.cityId) {
      const city = cities.find((candidate) => candidate.id === profile.cityId);
      if (city) {
        values.cityId = city.id;
        values.regionId = city.regionId;
      }
    }
  } else if (values.contactPhone) {
    values.contactPhone = formatBgPhone(values.contactPhone);
  }

  const params = await props.searchParams;
  const requested = typeof params.stap === "string" ? params.stap : null;
  const available = stepsForSet(set).map((step) => step.key);
  const fallback: StepKey = listing.status === "DRAFT" ? (firstIncompleteStep(values, category.attributeSet, images.length) ?? "review") : "vehicle";
  const initialStep = requested && available.includes(requested as StepKey) && LISTING_STEPS.some((step) => step.key === requested) ? (requested as StepKey) : fallback;

  return (
    <div className="container-page py-4 lg:py-6">
      <Breadcrumbs items={[{ label: "Моите обяви", href: "/profil/obiavi" }, { label: listing.status === "DRAFT" ? "Нова обява" : "Редакция" }]} />
      <h1 className="mt-2 mb-5 text-2xl font-semibold tracking-tight">
        {listing.status === "DRAFT" ? `Нова обява в ${category.name}` : `Редакция: ${listing.title || "обява"}`}
      </h1>
      <ListingEditor
        key={`${listing.id}-${category.id}`}
        listing={{
          id: listing.id,
          status: listing.status,
          number: listing.number,
          draftStep: listing.draftStep,
          publicPath: listingPath({ categorySlug: category.slug, number: listing.number, slug: listing.slug }),
          rejectionReason: listing.rejectionReason,
        }}
        category={{ id: category.id, slug: category.slug, name: category.name, attributeSet: category.attributeSet, vehicleType: category.vehicleType }}
        categories={allCategories}
        initialValues={values}
        images={images}
        makes={makes}
        models={models}
        generations={generations}
        regions={regions}
        cities={cities}
        initialStep={initialStep}
        maxImages={settings.maxImagesPerListing}
        isDealerListing={listing.dealerId !== null}
      />
    </div>
  );
}
