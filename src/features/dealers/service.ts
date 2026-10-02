import "server-only";
import { and, count, eq, isNull, like, or, sql } from "drizzle-orm";
import { db, type DbOrTx } from "@/db/client";
import { cities, dealerLocations, dealerMembers, dealerOpeningHours, dealers, listings, users } from "@/db/schema";
import { refreshSearchDocument } from "@/features/listings/service";
import { slugify } from "@/lib/slug";
import { recordAudit } from "@/server/audit";
import { canManageDealer, type Actor } from "@/server/auth/policies";
import { AppError } from "@/server/errors";
import { DEFAULT_OPENING_HOURS } from "./hours";
import type { DealerProfileData, OpeningHoursInput } from "./schemas";

export type DealerActor = Actor & {
  emailVerified: boolean;
  dealer: { id: string; slug: string; memberRole: "OWNER" | "MEMBER" } | null;
};

const PRIMARY_LOCATION_NAME = "Основен обект";
const ALREADY_MEMBER = "Профилът ти вече е свързан с дилър.";

function assertOwner(actor: DealerActor, dealerId: string): void {
  const memberRole = actor.dealer?.id === dealerId ? actor.dealer.memberRole : null;
  if (!canManageDealer(actor, dealerId, memberRole)) {
    throw new AppError("FORBIDDEN", "Само собственикът на дилъра може да прави промени.");
  }
}

function uniqueViolation(error: unknown): string | null {
  for (let current: unknown = error; current && typeof current === "object"; current = (current as { cause?: unknown }).cause) {
    const candidate = current as { code?: unknown; constraint_name?: unknown };
    if (candidate.code === "23505") return typeof candidate.constraint_name === "string" ? candidate.constraint_name : "";
  }
  return null;
}

async function assertCityInRegion(tx: DbOrTx, regionId: string, cityId: string): Promise<void> {
  const [city] = await tx.select({ id: cities.id }).from(cities).where(and(eq(cities.id, cityId), eq(cities.regionId, regionId))).limit(1);
  if (!city) throw new AppError("VALIDATION", undefined, { cityId: "Избери град от избраната област." });
}

/** Slugs stay unique across deleted dealers too, because the column has a unique constraint. */
async function uniqueDealerSlug(tx: DbOrTx, name: string): Promise<string> {
  const base = slugify(name, 60) || "dilar";
  const rows = await tx.select({ slug: dealers.slug }).from(dealers).where(or(eq(dealers.slug, base), like(dealers.slug, `${base}-%`)));
  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export async function createDealer(actor: DealerActor, input: DealerProfileData): Promise<{ id: string; slug: string }> {
  if (!actor.emailVerified) throw new AppError("FORBIDDEN", "Потвърди имейла си, преди да регистрираш дилър.");

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await db.transaction(async (tx) => {
        const [membership] = await tx.select({ dealerId: dealerMembers.dealerId }).from(dealerMembers).where(eq(dealerMembers.userId, actor.id)).limit(1);
        if (membership) throw new AppError("CONFLICT", ALREADY_MEMBER);
        await assertCityInRegion(tx, input.regionId, input.cityId);

        const slug = await uniqueDealerSlug(tx, input.name);
        const [dealer] = await tx
          .insert(dealers)
          .values({
            slug,
            name: input.name,
            description: input.description,
            phone: input.phone,
            email: input.email,
            website: input.website,
            regionId: input.regionId,
            cityId: input.cityId,
            address: input.address,
            status: "ACTIVE",
          })
          .returning({ id: dealers.id });
        if (!dealer) throw new Error("Dealer insert failed");

        await tx.insert(dealerMembers).values({ dealerId: dealer.id, userId: actor.id, role: "OWNER" });
        await tx.insert(dealerOpeningHours).values(DEFAULT_OPENING_HOURS.map((day) => ({ ...day, dealerId: dealer.id })));
        await tx.insert(dealerLocations).values({
          dealerId: dealer.id,
          name: PRIMARY_LOCATION_NAME,
          address: input.address,
          cityId: input.cityId,
          phone: input.phone,
          isPrimary: true,
        });
        // Staff roles are never downgraded to DEALER.
        await tx.update(users).set({ role: "DEALER" }).where(and(eq(users.id, actor.id), eq(users.role, "USER")));
        await recordAudit({ actorId: actor.id, action: "dealer.create", targetType: "dealer", targetId: dealer.id, metadata: { slug, name: input.name } }, tx);
        return { id: dealer.id, slug };
      });
    } catch (error) {
      const constraint = uniqueViolation(error);
      if (constraint === "dealers_slug_unique" && attempt < 3) continue;
      if (constraint === "dealer_members_user_unique") throw new AppError("CONFLICT", ALREADY_MEMBER);
      throw error;
    }
  }
}

export async function updateDealerProfile(actor: DealerActor, dealerId: string, input: DealerProfileData): Promise<{ slug: string }> {
  assertOwner(actor, dealerId);
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(dealers).where(and(eq(dealers.id, dealerId), isNull(dealers.deletedAt))).limit(1);
    if (!current) throw new AppError("NOT_FOUND", "Дилърът не е намерен.");
    await assertCityInRegion(tx, input.regionId, input.cityId);

    const next = {
      name: input.name,
      phone: input.phone,
      email: input.email,
      website: input.website,
      regionId: input.regionId,
      cityId: input.cityId,
      address: input.address,
      description: input.description,
    };
    const changed = (Object.keys(next) as (keyof typeof next)[]).filter((key) => current[key] !== next[key]);
    if (changed.length === 0) return { slug: current.slug };

    await tx.update(dealers).set(next).where(eq(dealers.id, dealerId));
    const updatedLocations = await tx
      .update(dealerLocations)
      .set({ address: input.address, cityId: input.cityId, phone: input.phone })
      .where(and(eq(dealerLocations.dealerId, dealerId), eq(dealerLocations.isPrimary, true)))
      .returning({ id: dealerLocations.id });
    if (updatedLocations.length === 0) {
      await tx.insert(dealerLocations).values({ dealerId, name: PRIMARY_LOCATION_NAME, address: input.address, cityId: input.cityId, phone: input.phone, isPrimary: true });
    }

    // The dealer name is part of every listing's search document.
    if (changed.includes("name")) {
      const owned = await tx.select({ id: listings.id }).from(listings).where(and(eq(listings.dealerId, dealerId), isNull(listings.deletedAt)));
      for (const listing of owned) await refreshSearchDocument(tx, listing.id);
    }

    await recordAudit(
      { actorId: actor.id, action: "dealer.update", targetType: "dealer", targetId: dealerId, metadata: { section: "profile", fields: changed.join(",") } },
      tx,
    );
    return { slug: current.slug };
  });
}

export async function updateOpeningHours(actor: DealerActor, dealerId: string, input: OpeningHoursInput): Promise<void> {
  assertOwner(actor, dealerId);
  const values = input.days.map((day) => ({
    dealerId,
    dayOfWeek: day.dayOfWeek,
    isClosed: day.isClosed,
    opensAt: day.isClosed ? null : day.opensAt,
    closesAt: day.isClosed ? null : day.closesAt,
  }));
  await db.transaction(async (tx) => {
    await tx
      .insert(dealerOpeningHours)
      .values(values)
      .onConflictDoUpdate({
        target: [dealerOpeningHours.dealerId, dealerOpeningHours.dayOfWeek],
        set: { opensAt: sql`excluded.opens_at`, closesAt: sql`excluded.closes_at`, isClosed: sql`excluded.is_closed` },
      });
    await recordAudit({ actorId: actor.id, action: "dealer.update", targetType: "dealer", targetId: dealerId, metadata: { section: "opening_hours" } }, tx);
  });
}

export async function addDealerMember(actor: DealerActor, dealerId: string, email: string): Promise<void> {
  assertOwner(actor, dealerId);
  try {
    await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ id: users.id, role: users.role, status: users.status, emailVerified: users.emailVerified, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (!target || target.deletedAt || target.status !== "ACTIVE" || !target.emailVerified) {
        throw new AppError("NOT_FOUND", undefined, { email: "Няма активен профил с потвърден имейл на този адрес." });
      }
      const [existing] = await tx.select({ dealerId: dealerMembers.dealerId }).from(dealerMembers).where(eq(dealerMembers.userId, target.id)).limit(1);
      if (existing) {
        throw new AppError("CONFLICT", undefined, {
          email: existing.dealerId === dealerId ? "Потребителят вече е член на дилъра." : "Потребителят вече е член на друг дилър.",
        });
      }
      await tx.insert(dealerMembers).values({ dealerId, userId: target.id, role: "MEMBER" });
      await tx.update(users).set({ role: "DEALER" }).where(and(eq(users.id, target.id), eq(users.role, "USER")));
      await recordAudit({ actorId: actor.id, action: "dealer.member_add", targetType: "dealer", targetId: dealerId, metadata: { userId: target.id, role: "MEMBER" } }, tx);
    });
  } catch (error) {
    if (uniqueViolation(error) !== null) throw new AppError("CONFLICT", undefined, { email: "Потребителят вече е член на дилър." });
    throw error;
  }
}

export async function removeDealerMember(actor: DealerActor, dealerId: string, userId: string): Promise<void> {
  assertOwner(actor, dealerId);
  if (userId === actor.id) throw new AppError("CONFLICT", "Не можеш да премахнеш себе си.");
  await db.transaction(async (tx) => {
    const [member] = await tx
      .select({ role: dealerMembers.role })
      .from(dealerMembers)
      .where(and(eq(dealerMembers.dealerId, dealerId), eq(dealerMembers.userId, userId)))
      .for("update")
      .limit(1);
    if (!member) throw new AppError("NOT_FOUND", "Служителят не е намерен.");
    if (member.role === "OWNER") {
      const [owners] = await tx
        .select({ value: count() })
        .from(dealerMembers)
        .where(and(eq(dealerMembers.dealerId, dealerId), eq(dealerMembers.role, "OWNER")));
      if ((owners?.value ?? 0) <= 1) throw new AppError("CONFLICT", "Дилърът трябва да има поне един собственик.");
    }
    await tx.delete(dealerMembers).where(and(eq(dealerMembers.dealerId, dealerId), eq(dealerMembers.userId, userId)));
    await tx.update(users).set({ role: "USER" }).where(and(eq(users.id, userId), eq(users.role, "DEALER")));
    await recordAudit({ actorId: actor.id, action: "dealer.member_remove", targetType: "dealer", targetId: dealerId, metadata: { userId, role: member.role } }, tx);
  });
}

/** Returns the previous logo's storage path so the caller can delete the file after the commit. */
export async function setDealerLogo(actor: DealerActor, dealerId: string, logo: { url: string; storagePath: string } | null): Promise<{ slug: string; previousPath: string | null }> {
  assertOwner(actor, dealerId);
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ slug: dealers.slug, logoStoragePath: dealers.logoStoragePath })
      .from(dealers)
      .where(and(eq(dealers.id, dealerId), isNull(dealers.deletedAt)))
      .for("update")
      .limit(1);
    if (!current) throw new AppError("NOT_FOUND", "Дилърът не е намерен.");
    await tx
      .update(dealers)
      .set({ logoUrl: logo?.url ?? null, logoStoragePath: logo?.storagePath ?? null })
      .where(eq(dealers.id, dealerId));
    await recordAudit(
      { actorId: actor.id, action: "dealer.update", targetType: "dealer", targetId: dealerId, metadata: { section: logo ? "logo" : "logo_remove" } },
      tx,
    );
    return { slug: current.slug, previousPath: current.logoStoragePath };
  });
}
