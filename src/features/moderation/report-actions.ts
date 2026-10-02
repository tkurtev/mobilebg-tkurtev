"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { REPORT_REASONS } from "@/config/listing-status";
import { db } from "@/db/client";
import { listingReports, listings } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { sanitizePlainText } from "@/lib/text";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";

const reportSchema = z.object({
  listingId: z.uuid(),
  reason: z.enum(REPORT_REASONS.map((reason) => reason.value) as [string, ...string[]], "Избери причина."),
  details: z
    .string()
    .transform((value) => sanitizePlainText(value, 1000))
    .pipe(z.string().max(1000)),
});

export async function reportListingAction(input: z.input<typeof reportSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(reportSchema, input);
    if (data.reason === "OTHER" && data.details.length < 5) {
      throw new AppError("VALIDATION", undefined, { details: "Опиши накратко проблема." });
    }
    await enforceRateLimit("reportSubmit", user.id);
    const [listing] = await db.select({ id: listings.id, sellerId: listings.sellerId }).from(listings).where(eq(listings.id, data.listingId)).limit(1);
    if (!listing) throw new AppError("NOT_FOUND", "Обявата не е намерена.");
    if (listing.sellerId === user.id) throw new AppError("CONFLICT", "Не можеш да сигнализираш за собствена обява.");
    const [existing] = await db
      .select({ id: listingReports.id })
      .from(listingReports)
      .where(and(eq(listingReports.listingId, listing.id), eq(listingReports.reporterId, user.id), eq(listingReports.status, "OPEN")))
      .limit(1);
    if (existing) throw new AppError("CONFLICT", "Вече имаш подаден сигнал за тази обява.");
    await db.insert(listingReports).values({
      listingId: listing.id,
      reporterId: user.id,
      reason: data.reason as (typeof listingReports.$inferInsert)["reason"],
      details: data.details,
    });
  });
}
