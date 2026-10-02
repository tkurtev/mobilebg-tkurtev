"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import type { z } from "zod";
import { db } from "@/db/client";
import { cities, dealers, listings } from "@/db/schema";
import { refreshSearchDocument } from "@/features/listings/service";
import type { ActionResult } from "@/lib/action-result";
import { normalizeBgPhone } from "@/lib/phone";
import { sanitizePlainText, sanitizeSingleLine } from "@/lib/text";
import { parseInput, runAction } from "@/server/action";
import { recordAudit } from "@/server/audit";
import { requireActionPermission } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { dealerStatusSchema, dealerUpdateSchema } from "../schemas";

async function loadDealer(dealerId: string) {
  const [dealer] = await db.select().from(dealers).where(and(eq(dealers.id, dealerId), isNull(dealers.deletedAt))).limit(1);
  if (!dealer) throw new AppError("NOT_FOUND", "Дилърът не е намерен.");
  return dealer;
}

function invalidateDealer(dealerId: string) {
  updateTag("dealers");
  updateTag("listings:aggregates");
  revalidatePath(`/admin/dealers/${dealerId}`);
  revalidatePath("/admin/dealers");
}

export async function updateDealerAction(input: z.input<typeof dealerUpdateSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("dealers.manage");
    const data = parseInput(dealerUpdateSchema, input);
    const dealer = await loadDealer(data.dealerId);

    const regionId = data.regionId || null;
    const cityId = data.cityId || null;
    if (cityId) {
      const [city] = await db.select({ regionId: cities.regionId }).from(cities).where(eq(cities.id, cityId)).limit(1);
      if (!city || city.regionId !== regionId) throw new AppError("VALIDATION", undefined, { cityId: "Градът не е в избраната област." });
    }

    const patch = {
      name: sanitizeSingleLine(data.name, 120),
      phone: normalizeBgPhone(data.phone) ?? dealer.phone,
      email: data.email ? data.email.toLowerCase() : null,
      website: data.website || null,
      address: sanitizeSingleLine(data.address, 200),
      description: sanitizePlainText(data.description, 3000),
      regionId,
      cityId,
    };
    const changed = (Object.keys(patch) as (keyof typeof patch)[]).filter((key) => patch[key] !== dealer[key]);
    if (changed.length === 0) return;

    await db.transaction(async (tx) => {
      await tx.update(dealers).set(patch).where(eq(dealers.id, dealer.id));
      // Dealer names are part of listings.search_document.
      if (changed.includes("name")) {
        const rows = await tx.select({ id: listings.id }).from(listings).where(eq(listings.dealerId, dealer.id));
        for (const row of rows) await refreshSearchDocument(tx, row.id);
      }
      await recordAudit({ actorId: actor.id, action: "dealer.update", targetType: "dealer", targetId: dealer.id, metadata: { fields: changed.join(",") } }, tx);
    });
    invalidateDealer(dealer.id);
  });
}

export async function setDealerStatusAction(input: z.input<typeof dealerStatusSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("dealers.manage");
    const data = parseInput(dealerStatusSchema, input);
    const dealer = await loadDealer(data.dealerId);
    if (dealer.status === data.status) throw new AppError("CONFLICT", data.status === "SUSPENDED" ? "Дилърът вече е спрян." : "Дилърът вече е активен.");
    await db.transaction(async (tx) => {
      await tx.update(dealers).set({ status: data.status }).where(eq(dealers.id, dealer.id));
      await recordAudit(
        { actorId: actor.id, action: data.status === "SUSPENDED" ? "dealer.suspend" : "dealer.restore", targetType: "dealer", targetId: dealer.id, metadata: { name: dealer.name } },
        tx,
      );
    });
    invalidateDealer(dealer.id);
  });
}
