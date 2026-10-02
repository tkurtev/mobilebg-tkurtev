import "server-only";
import { and, asc, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { getAttributeSet, usesCore } from "@/config/attribute-sets";
import { getFeature } from "@/config/features";
import { LISTING_STATUS_LABELS, type ListingStatus } from "@/config/listing-status";
import { BODY_TYPE_OPTIONS, optionLabel } from "@/config/options";
import { db, type DbOrTx } from "@/db/client";
import {
  categories,
  cities,
  dealers,
  listingAttributes,
  listingFeatures,
  listingImages,
  listingPriceHistory,
  listingReports,
  listings,
  moderationActions,
  regions,
  vehicleGenerations,
  vehicleMakes,
  vehicleModels,
} from "@/db/schema";
import { notify } from "@/features/notifications/service";
import { eurosToCents } from "@/lib/money";
import { normalizeBgPhone } from "@/lib/phone";
import { sanitizePlainText, sanitizeSingleLine } from "@/lib/text";
import { recordAudit } from "@/server/audit";
import { can, canManageListing, type Actor } from "@/server/auth/policies";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";
import { deleteStoredFiles, type StoredImage } from "@/server/storage";
import { listingIssues, type ListingValues, type StepKey } from "./editor";
import { buildListingSlug, listingPath } from "./paths";
import { buildSearchDocument } from "./search-document";

type ListingRow = typeof listings.$inferSelect;
const DAY_MS = 86_400_000;

async function loadOwned(actor: Actor, listingId: string, tx: DbOrTx = db): Promise<ListingRow> {
  const [listing] = await tx.select().from(listings).where(and(eq(listings.id, listingId), isNull(listings.deletedAt))).limit(1);
  if (!listing || !canManageListing(actor, listing)) throw new AppError("NOT_FOUND", "Обявата не е намерена.");
  return listing;
}

async function categoryOf(categoryId: string, tx: DbOrTx = db) {
  const [category] = await tx.select().from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) throw new AppError("NOT_FOUND", "Категорията не съществува.");
  return category;
}

export async function refreshSearchDocument(tx: DbOrTx, listingId: string): Promise<void> {
  const [row] = await tx
    .select({
      title: listings.title,
      bodyType: listings.bodyType,
      categoryName: categories.name,
      makeName: vehicleMakes.name,
      modelName: vehicleModels.name,
      generationName: vehicleGenerations.name,
      cityName: cities.name,
      regionName: regions.name,
      dealerName: dealers.name,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .leftJoin(vehicleMakes, eq(vehicleMakes.id, listings.makeId))
    .leftJoin(vehicleModels, eq(vehicleModels.id, listings.modelId))
    .leftJoin(vehicleGenerations, eq(vehicleGenerations.id, listings.generationId))
    .leftJoin(cities, eq(cities.id, listings.cityId))
    .leftJoin(regions, eq(regions.id, listings.regionId))
    .leftJoin(dealers, eq(dealers.id, listings.dealerId))
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!row) return;
  await tx
    .update(listings)
    .set({
      searchDocument: buildSearchDocument({ ...row, extra: [optionLabel(BODY_TYPE_OPTIONS.car, row.bodyType)] }),
      slug: buildListingSlug(row.title),
    })
    .where(eq(listings.id, listingId));
}

export async function syncImageSummary(tx: DbOrTx, listingId: string): Promise<void> {
  const images = await tx
    .select({ id: listingImages.id, thumbUrl: listingImages.thumbUrl })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(asc(listingImages.position), asc(listingImages.createdAt));
  await tx.update(listings).set({ coverImageUrl: images[0]?.thumbUrl ?? null, imageCount: images.length }).where(eq(listings.id, listingId));
}

export async function createDraft(actor: Actor, categoryId: string): Promise<{ id: string }> {
  await enforceRateLimit("listingCreate", actor.id);
  const category = await categoryOf(categoryId);
  if (!category.isActive) throw new AppError("NOT_FOUND", "Категорията не съществува.");
  const [row] = await db
    .insert(listings)
    .values({ categoryId: category.id, sellerId: actor.id, dealerId: actor.dealerId, status: "DRAFT", draftStep: 2 })
    .returning({ id: listings.id });
  if (!row) throw new Error("draft insert failed");
  return row;
}

/** Changing category is only allowed for drafts and clears category-specific data. */
export async function changeDraftCategory(actor: Actor, listingId: string, categoryId: string): Promise<void> {
  const listing = await loadOwned(actor, listingId);
  if (listing.status !== "DRAFT") throw new AppError("CONFLICT", "Категорията на публикувана обява не може да се сменя.");
  const category = await categoryOf(categoryId);
  if (category.id === listing.categoryId) return;
  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({ categoryId: category.id, makeId: null, modelId: null, generationId: null, bodyType: null, fuel: null, gearbox: null, mileageKm: null, drivetrain: null })
      .where(eq(listings.id, listing.id));
    await tx.delete(listingAttributes).where(eq(listingAttributes.listingId, listing.id));
    await tx.delete(listingFeatures).where(eq(listingFeatures.listingId, listing.id));
  });
}

async function assertTaxonomy(values: ListingValues, vehicleType: string | null) {
  if (values.makeId === undefined && values.modelId === undefined && values.generationId === undefined) return;
  if (values.modelId) {
    const [model] = await db.select({ makeId: vehicleModels.makeId, vehicleType: vehicleModels.vehicleType }).from(vehicleModels).where(eq(vehicleModels.id, values.modelId)).limit(1);
    if (!model || model.makeId !== values.makeId || (vehicleType && model.vehicleType !== vehicleType)) {
      throw new AppError("VALIDATION", undefined, { modelId: "Моделът не съответства на марката." });
    }
  }
  if (values.generationId) {
    const [generation] = await db.select({ modelId: vehicleGenerations.modelId }).from(vehicleGenerations).where(eq(vehicleGenerations.id, values.generationId)).limit(1);
    if (!generation || generation.modelId !== values.modelId) throw new AppError("VALIDATION", undefined, { generationId: "Невалидно поколение." });
  }
}

async function assertLocation(values: ListingValues) {
  if (!values.cityId) return;
  const [city] = await db.select({ regionId: cities.regionId }).from(cities).where(eq(cities.id, values.cityId)).limit(1);
  if (!city || (values.regionId && city.regionId !== values.regionId)) throw new AppError("VALIDATION", undefined, { cityId: "Градът не е в избраната област." });
}

/**
 * Saves the fields present in `values`. Drafts accept incomplete data (autosave); published
 * listings and explicit "next step" saves are validated for the given step.
 */
export async function saveListing(
  actor: Actor,
  listingId: string,
  values: ListingValues,
  options: { step: StepKey; complete: boolean },
): Promise<{ slugPath: string }> {
  const listing = await loadOwned(actor, listingId);
  if (["SOLD", "ARCHIVED"].includes(listing.status)) throw new AppError("CONFLICT", "Обявата не може да бъде редактирана.");
  const category = await categoryOf(listing.categoryId);
  const set = getAttributeSet(category.attributeSet);

  if (options.complete || listing.status !== "DRAFT") {
    const issues = listingIssues(values, category.attributeSet, { step: options.step });
    if (Object.keys(issues).length > 0) throw new AppError("VALIDATION", undefined, issues);
  }
  await assertTaxonomy(values, category.vehicleType);
  await assertLocation(values);

  const patch: Partial<typeof listings.$inferInsert> = {};
  const has = (key: keyof ListingValues) => Object.prototype.hasOwnProperty.call(values, key);
  if (has("makeId") && usesCore(set, "make")) patch.makeId = values.makeId ?? null;
  if (has("modelId") && usesCore(set, "model")) patch.modelId = values.modelId ?? null;
  if (has("generationId")) patch.generationId = values.generationId ?? null;
  if (has("title")) patch.title = sanitizeSingleLine(values.title ?? "", 120);
  if (has("year")) patch.year = values.year ?? null;
  if (has("mileageKm") && usesCore(set, "mileage")) patch.mileageKm = values.mileageKm ?? null;
  if (has("fuel") && usesCore(set, "fuel")) patch.fuel = values.fuel ?? null;
  if (has("gearbox") && usesCore(set, "gearbox")) patch.gearbox = values.gearbox ?? null;
  if (has("powerHp") && usesCore(set, "power")) patch.powerHp = values.powerHp ?? null;
  if (has("engineCc") && usesCore(set, "engine")) patch.engineCc = values.engineCc ?? null;
  if (has("drivetrain") && usesCore(set, "drivetrain")) patch.drivetrain = values.drivetrain ?? null;
  if (has("bodyType") && usesCore(set, "bodyType")) {
    const allowed = set.bodyTypes ? BODY_TYPE_OPTIONS[set.bodyTypes].some((option) => option.value === values.bodyType) : false;
    patch.bodyType = values.bodyType && allowed ? values.bodyType : null;
  }
  if (has("color")) patch.color = values.color ?? null;
  if (has("condition")) patch.condition = values.condition ?? null;
  if (has("priceNegotiable")) patch.priceNegotiable = values.priceNegotiable ?? false;
  if (has("description")) patch.description = sanitizePlainText(values.description ?? "", 5000);
  if (has("regionId")) patch.regionId = values.regionId ?? null;
  if (has("cityId")) patch.cityId = values.cityId ?? null;
  if (has("contactName")) patch.contactName = sanitizeSingleLine(values.contactName ?? "", 80) || null;
  if (has("contactPhone")) patch.contactPhone = values.contactPhone ? normalizeBgPhone(values.contactPhone) : null;
  if (has("priceEuros")) patch.priceCents = values.priceEuros === null || values.priceEuros === undefined ? null : eurosToCents(values.priceEuros);
  if (listing.status === "DRAFT") patch.draftStep = Math.max(listing.draftStep, stepIndexAfter(options.step));

  const priceChanged = patch.priceCents !== undefined && patch.priceCents !== listing.priceCents && listing.priceCents !== null && patch.priceCents !== null && listing.publishedAt !== null;

  await db.transaction(async (tx) => {
    if (priceChanged) {
      await tx.insert(listingPriceHistory).values({ listingId: listing.id, oldPriceCents: listing.priceCents!, newPriceCents: patch.priceCents!, changedById: actor.id });
      patch.previousPriceCents = patch.priceCents! < listing.priceCents! ? listing.priceCents : null;
    }
    if (listing.status === "REJECTED" && Object.keys(patch).length > 0) {
      patch.rejectionReason = listing.rejectionReason;
    }
    if (Object.keys(patch).length > 0) await tx.update(listings).set(patch).where(eq(listings.id, listing.id));

    if (has("attributes")) {
      type AttributeInsert = typeof listingAttributes.$inferInsert;
      const rows = set.attributes.flatMap((definition): AttributeInsert[] => {
        const value = values.attributes?.[definition.key];
        if (value === undefined || value === null || value === "") return [];
        if (definition.type === "select" && typeof value === "string") return [{ listingId: listing.id, key: definition.key, valueText: value }];
        if (definition.type === "number" && typeof value === "number") return [{ listingId: listing.id, key: definition.key, valueNumber: value }];
        if (definition.type === "boolean" && typeof value === "boolean") return [{ listingId: listing.id, key: definition.key, valueBool: value }];
        if (definition.type === "text" && typeof value === "string") {
          const text = sanitizeSingleLine(value, definition.maxLength);
          return text ? [{ listingId: listing.id, key: definition.key, valueText: definition.key === "vin" ? text.toUpperCase() : text }] : [];
        }
        return [];
      });
      await tx.delete(listingAttributes).where(eq(listingAttributes.listingId, listing.id));
      if (rows.length > 0) await tx.insert(listingAttributes).values(rows);
    }

    if (has("features")) {
      const allowed = [...new Set(values.features ?? [])].filter((key) => {
        const feature = getFeature(key);
        return feature !== undefined && set.featureGroups.includes(feature.group);
      });
      await tx.delete(listingFeatures).where(eq(listingFeatures.listingId, listing.id));
      if (allowed.length > 0) await tx.insert(listingFeatures).values(allowed.map((featureKey) => ({ listingId: listing.id, featureKey })));
    }

    await refreshSearchDocument(tx, listing.id);
  });

  const [updated] = await db.select({ number: listings.number, slug: listings.slug }).from(listings).where(eq(listings.id, listing.id)).limit(1);
  return { slugPath: listingPath({ categorySlug: category.slug, number: updated?.number ?? listing.number, slug: updated?.slug ?? "" }) };
}

const STEP_ORDER: StepKey[] = ["category", "vehicle", "details", "features", "price", "photos", "description", "location", "contact", "review"];
function stepIndexAfter(step: StepKey): number {
  return Math.min(STEP_ORDER.indexOf(step) + 2, STEP_ORDER.length);
}

export async function loadListingValues(listingId: string, tx: DbOrTx = db): Promise<ListingValues> {
  const [listing] = await tx.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing) throw new AppError("NOT_FOUND");
  const [attributes, features] = await Promise.all([
    tx.select().from(listingAttributes).where(eq(listingAttributes.listingId, listingId)),
    tx.select({ key: listingFeatures.featureKey }).from(listingFeatures).where(eq(listingFeatures.listingId, listingId)),
  ]);
  return {
    makeId: listing.makeId,
    modelId: listing.modelId,
    generationId: listing.generationId,
    title: listing.title,
    year: listing.year,
    mileageKm: listing.mileageKm,
    fuel: listing.fuel as ListingValues["fuel"],
    gearbox: listing.gearbox as ListingValues["gearbox"],
    powerHp: listing.powerHp,
    engineCc: listing.engineCc,
    drivetrain: listing.drivetrain as ListingValues["drivetrain"],
    bodyType: listing.bodyType,
    color: listing.color as ListingValues["color"],
    condition: listing.condition as ListingValues["condition"],
    attributes: Object.fromEntries(attributes.map((attribute) => [attribute.key, attribute.valueText ?? attribute.valueNumber ?? attribute.valueBool])),
    features: features.map((feature) => feature.key),
    priceEuros: listing.priceCents === null ? null : Math.floor(listing.priceCents / 100),
    priceNegotiable: listing.priceNegotiable,
    description: listing.description,
    regionId: listing.regionId,
    cityId: listing.cityId,
    contactName: listing.contactName ?? "",
    contactPhone: listing.contactPhone ?? "",
  };
}

/** Moves a draft (or a rejected listing after edits) to ACTIVE, or to PENDING under pre-moderation. */
export async function publishListing(actor: Actor, listingId: string): Promise<{ status: ListingStatus; path: string }> {
  const listing = await loadOwned(actor, listingId);
  if (!["DRAFT", "REJECTED"].includes(listing.status)) throw new AppError("CONFLICT", "Обявата вече е публикувана.");
  const category = await categoryOf(listing.categoryId);
  const values = await loadListingValues(listing.id);
  const [imageCount] = await db.select({ value: count() }).from(listingImages).where(eq(listingImages.listingId, listing.id));
  const issues = listingIssues(values, category.attributeSet, { imageCount: imageCount?.value ?? 0 });
  if (Object.keys(issues).length > 0) throw new AppError("VALIDATION", "Попълни всички задължителни полета преди публикуване.", issues);

  const settings = await getSettings();
  const needsReview = settings.moderationMode === "pre" || listing.status === "REJECTED";
  const now = new Date();
  const status: ListingStatus = needsReview ? "PENDING" : "ACTIVE";
  await db
    .update(listings)
    .set({
      status,
      publishedAt: needsReview ? listing.publishedAt : (listing.publishedAt ?? now),
      expiresAt: needsReview ? listing.expiresAt : new Date(now.getTime() + settings.listingDurationDays * DAY_MS),
      sortDate: now,
      rejectionReason: null,
      draftStep: 11,
    })
    .where(eq(listings.id, listing.id));
  const [fresh] = await db.select({ number: listings.number, slug: listings.slug }).from(listings).where(eq(listings.id, listing.id)).limit(1);
  return { status, path: listingPath({ categorySlug: category.slug, number: fresh?.number ?? listing.number, slug: fresh?.slug ?? listing.slug }) };
}

export type OwnerAction = "pause" | "resume" | "sold" | "archive" | "renew";

export async function changeStatusAsOwner(actor: Actor, listingId: string, action: OwnerAction): Promise<ListingStatus> {
  const listing = await loadOwned(actor, listingId);
  const now = new Date();
  const settings = await getSettings();
  const expired = listing.expiresAt !== null && listing.expiresAt <= now;
  let patch: Partial<typeof listings.$inferInsert>;

  switch (action) {
    case "pause":
      if (listing.status !== "ACTIVE") throw new AppError("CONFLICT", "Само активни обяви могат да бъдат паузирани.");
      patch = { status: "PAUSED" };
      break;
    case "resume":
      if (listing.status !== "PAUSED") throw new AppError("CONFLICT", "Обявата не е паузирана.");
      if (listing.moderationLock) throw new AppError("FORBIDDEN", "Обявата е спряна от модератор и не може да бъде активирана.");
      patch = { status: expired ? "EXPIRED" : "ACTIVE" };
      break;
    case "sold":
      if (!["ACTIVE", "PAUSED", "EXPIRED"].includes(listing.status)) throw new AppError("CONFLICT", "Обявата не може да бъде отбелязана като продадена.");
      patch = { status: "SOLD", soldAt: now, vipUntil: null, topUntil: null, highlightUntil: null };
      break;
    case "archive":
      if (listing.status === "DRAFT") {
        const images = await db.select({ a: listingImages.storagePath, b: listingImages.thumbStoragePath }).from(listingImages).where(eq(listingImages.listingId, listing.id));
        await db.update(listings).set({ deletedAt: now, status: "ARCHIVED" }).where(eq(listings.id, listing.id));
        await db.delete(listingImages).where(eq(listingImages.listingId, listing.id));
        await deleteStoredFiles(images.flatMap((image) => [image.a, image.b]));
        return "ARCHIVED";
      }
      patch = { status: "ARCHIVED", vipUntil: null, topUntil: null, highlightUntil: null };
      break;
    case "renew":
      if (!["EXPIRED", "ACTIVE"].includes(listing.status)) throw new AppError("CONFLICT", "Обявата не може да бъде подновена.");
      if (listing.moderationLock) throw new AppError("FORBIDDEN", "Обявата е спряна от модератор.");
      patch = {
        status: settings.moderationMode === "pre" && listing.status === "EXPIRED" ? "PENDING" : "ACTIVE",
        expiresAt: new Date(now.getTime() + settings.listingDurationDays * DAY_MS),
      };
      break;
  }
  await db.update(listings).set(patch).where(eq(listings.id, listing.id));
  return patch.status as ListingStatus;
}

export type ModerationAction = "approve" | "reject" | "pause" | "restore" | "archive";

const MODERATION_TARGET: Record<ModerationAction, { from: ListingStatus[]; to: ListingStatus }> = {
  approve: { from: ["PENDING"], to: "ACTIVE" },
  reject: { from: ["PENDING", "ACTIVE", "PAUSED"], to: "REJECTED" },
  pause: { from: ["ACTIVE"], to: "PAUSED" },
  restore: { from: ["PAUSED", "REJECTED", "ARCHIVED", "EXPIRED"], to: "ACTIVE" },
  archive: { from: ["DRAFT", "PENDING", "ACTIVE", "REJECTED", "PAUSED", "SOLD", "EXPIRED"], to: "ARCHIVED" },
};

const MODERATION_ENUM: Record<ModerationAction, (typeof moderationActions.$inferInsert)["action"]> = {
  approve: "APPROVE",
  reject: "REJECT",
  pause: "PAUSE",
  restore: "RESTORE",
  archive: "ARCHIVE",
};

const NOTIFICATION_FOR: Partial<Record<ModerationAction, { type: "LISTING_APPROVED" | "LISTING_REJECTED" | "LISTING_PAUSED" | "LISTING_RESTORED"; title: string }>> = {
  approve: { type: "LISTING_APPROVED", title: "Обявата ти е одобрена" },
  reject: { type: "LISTING_REJECTED", title: "Обявата ти е отказана" },
  pause: { type: "LISTING_PAUSED", title: "Обявата ти е спряна от модератор" },
  restore: { type: "LISTING_RESTORED", title: "Обявата ти е възстановена" },
};

/** Moderator status change with moderation history, audit log and seller notification in one transaction. */
export async function moderateListing(
  moderator: Actor,
  input: { listingId: string; action: ModerationAction; reason: string; reportId?: string | null },
): Promise<ListingStatus> {
  if (!can(moderator, "listings.moderate")) throw new AppError("FORBIDDEN");
  const reason = sanitizePlainText(input.reason, 500);
  if ((input.action === "reject" || input.action === "pause") && reason.length < 3) {
    throw new AppError("VALIDATION", undefined, { reason: "Посочи причина." });
  }
  const settings = await getSettings();
  return db.transaction(async (tx) => {
    const [listing] = await tx.select().from(listings).where(eq(listings.id, input.listingId)).for("update").limit(1);
    if (!listing) throw new AppError("NOT_FOUND", "Обявата не е намерена.");
    const transition = MODERATION_TARGET[input.action];
    if (!transition.from.includes(listing.status as ListingStatus)) {
      throw new AppError("CONFLICT", `Действието не е възможно при статус „${LISTING_STATUS_LABELS[listing.status as ListingStatus]}“.`);
    }
    const now = new Date();
    const patch: Partial<typeof listings.$inferInsert> = { status: transition.to };
    if (input.action === "approve" || input.action === "restore") {
      patch.moderationLock = false;
      patch.rejectionReason = null;
      patch.deletedAt = null;
      patch.publishedAt = listing.publishedAt ?? now;
      if (!listing.expiresAt || listing.expiresAt <= now) patch.expiresAt = new Date(now.getTime() + settings.listingDurationDays * DAY_MS);
      if (input.action === "approve") patch.sortDate = now;
    }
    if (input.action === "reject") {
      patch.rejectionReason = reason;
      patch.moderationLock = true;
    }
    if (input.action === "pause") patch.moderationLock = true;
    if (input.action === "archive") Object.assign(patch, { vipUntil: null, topUntil: null, highlightUntil: null });

    await tx.update(listings).set(patch).where(eq(listings.id, listing.id));
    await tx.insert(moderationActions).values({
      listingId: listing.id,
      reportId: input.reportId ?? null,
      moderatorId: moderator.id,
      action: MODERATION_ENUM[input.action],
      reason,
      previousStatus: listing.status,
      newStatus: transition.to,
    });
    if (input.reportId) {
      await tx
        .update(listingReports)
        .set({ status: "RESOLVED", resolvedById: moderator.id, resolvedAt: now })
        .where(and(eq(listingReports.id, input.reportId), eq(listingReports.listingId, listing.id)));
    }
    await recordAudit(
      { actorId: moderator.id, action: `listing.${input.action}`, targetType: "listing", targetId: listing.id, metadata: { previousStatus: listing.status, newStatus: transition.to, reportId: input.reportId ?? null } },
      tx,
    );
    const notification = NOTIFICATION_FOR[input.action];
    if (notification) {
      await notify(
        { userId: listing.sellerId, type: notification.type, title: notification.title, body: reason ? `${listing.title}: ${reason}` : listing.title, link: "/profil/obiavi" },
        tx,
      );
    }
    return transition.to;
  });
}

export async function dismissReport(moderator: Actor, reportId: string, note: string): Promise<void> {
  if (!can(moderator, "reports.manage")) throw new AppError("FORBIDDEN");
  await db.transaction(async (tx) => {
    const [report] = await tx.select().from(listingReports).where(eq(listingReports.id, reportId)).limit(1);
    if (!report) throw new AppError("NOT_FOUND", "Сигналът не е намерен.");
    if (report.status !== "OPEN") throw new AppError("CONFLICT", "Сигналът вече е обработен.");
    const [listing] = await tx.select({ status: listings.status }).from(listings).where(eq(listings.id, report.listingId)).limit(1);
    await tx.update(listingReports).set({ status: "DISMISSED", resolvedById: moderator.id, resolvedAt: new Date() }).where(eq(listingReports.id, reportId));
    await tx.insert(moderationActions).values({
      listingId: report.listingId,
      reportId,
      moderatorId: moderator.id,
      action: "DISMISS_REPORT",
      reason: sanitizePlainText(note, 500),
      previousStatus: listing?.status ?? null,
      newStatus: listing?.status ?? null,
    });
    await recordAudit({ actorId: moderator.id, action: "report.dismiss", targetType: "report", targetId: reportId, metadata: { listingId: report.listingId } }, tx);
  });
}

export async function addListingImage(actor: Actor, listingId: string, stored: StoredImage): Promise<{ id: string; position: number }> {
  const listing = await loadOwned(actor, listingId);
  return db.transaction(async (tx) => {
    const [maxRow] = await tx.select({ max: sql<number | null>`max(${listingImages.position})` }).from(listingImages).where(eq(listingImages.listingId, listing.id));
    const position = (maxRow?.max ?? -1) + 1;
    const [image] = await tx.insert(listingImages).values({ listingId: listing.id, ...stored, position }).returning({ id: listingImages.id });
    if (!image) throw new Error("image insert failed");
    await syncImageSummary(tx, listing.id);
    return { id: image.id, position };
  });
}

export async function countListingImages(listingId: string): Promise<number> {
  const [row] = await db.select({ value: count() }).from(listingImages).where(eq(listingImages.listingId, listingId));
  return row?.value ?? 0;
}

export async function assertCanUpload(actor: Actor, listingId: string): Promise<void> {
  const listing = await loadOwned(actor, listingId);
  if (["SOLD", "ARCHIVED"].includes(listing.status)) throw new AppError("CONFLICT", "Обявата не може да бъде редактирана.");
  const settings = await getSettings();
  if ((await countListingImages(listingId)) >= settings.maxImagesPerListing) {
    throw new AppError("CONFLICT", `Можеш да добавиш до ${settings.maxImagesPerListing} снимки.`);
  }
}

export async function deleteListingImage(actor: Actor, imageId: string): Promise<void> {
  const [image] = await db.select().from(listingImages).where(eq(listingImages.id, imageId)).limit(1);
  if (!image) throw new AppError("NOT_FOUND", "Снимката не е намерена.");
  await loadOwned(actor, image.listingId);
  await db.transaction(async (tx) => {
    await tx.delete(listingImages).where(eq(listingImages.id, image.id));
    await syncImageSummary(tx, image.listingId);
  });
  await deleteStoredFiles([image.storagePath, image.thumbStoragePath]);
}

export async function reorderListingImages(actor: Actor, listingId: string, orderedIds: string[]): Promise<void> {
  await loadOwned(actor, listingId);
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: listingImages.id }).from(listingImages).where(eq(listingImages.listingId, listingId));
    const known = new Set(existing.map((image) => image.id));
    const ordered = [...orderedIds.filter((id) => known.has(id)), ...existing.map((image) => image.id).filter((id) => !orderedIds.includes(id))];
    for (const [position, id] of ordered.entries()) {
      await tx.update(listingImages).set({ position }).where(and(eq(listingImages.id, id), eq(listingImages.listingId, listingId)));
    }
    await syncImageSummary(tx, listingId);
  });
}

export async function getListingImages(listingId: string) {
  return db
    .select({ id: listingImages.id, url: listingImages.url, thumbUrl: listingImages.thumbUrl, width: listingImages.width, height: listingImages.height })
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(asc(listingImages.position), asc(listingImages.createdAt));
}

export async function deleteListingsImagesFor(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const images = await db.select({ a: listingImages.storagePath, b: listingImages.thumbStoragePath }).from(listingImages).where(inArray(listingImages.listingId, ids));
  await deleteStoredFiles(images.flatMap((image) => [image.a, image.b]));
}

export async function loadOwnedListing(actor: Actor, listingId: string) {
  const listing = await loadOwned(actor, listingId);
  const category = await categoryOf(listing.categoryId);
  return { listing, category };
}
