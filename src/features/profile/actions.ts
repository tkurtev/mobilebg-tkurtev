"use server";

import { and, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { cities, listings, profiles, sessions, users } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { normalizeBgPhone } from "@/lib/phone";
import { parseInput, runAction } from "@/server/action";
import { getCurrentSession, requireActionUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { profileSchema, type ProfileInput } from "./schemas";

export async function updateProfileAction(input: ProfileInput): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(profileSchema, input);
    if (data.cityId) {
      const [city] = await db.select({ regionId: cities.regionId }).from(cities).where(eq(cities.id, data.cityId)).limit(1);
      if (!city || (data.regionId && city.regionId !== data.regionId)) throw new AppError("VALIDATION", undefined, { cityId: "Градът не е в избраната област." });
    }
    await db.transaction(async (tx) => {
      await tx.update(users).set({ name: data.name }).where(eq(users.id, user.id));
      await tx
        .insert(profiles)
        .values({ userId: user.id, phone: data.phone ? normalizeBgPhone(data.phone) : null, cityId: data.cityId })
        .onConflictDoUpdate({ target: profiles.userId, set: { phone: data.phone ? normalizeBgPhone(data.phone) : null, cityId: data.cityId, updatedAt: new Date() } });
    });
    revalidatePath("/profil", "layout");
  });
}

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const id = parseInput(z.uuid(), sessionId);
    const current = await getCurrentSession();
    if (current?.session.id === id) throw new AppError("CONFLICT", "Използвай „Изход“, за да прекратиш текущата сесия.");
    await db.delete(sessions).where(and(eq(sessions.id, id), eq(sessions.userId, user.id)));
    revalidatePath("/profil/nastroiki");
  });
}

export async function revokeOtherSessionsAction(): Promise<ActionResult<{ revoked: number }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    const current = await getCurrentSession();
    if (!current) throw new AppError("UNAUTHORIZED");
    const removed = await db
      .delete(sessions)
      .where(and(eq(sessions.userId, user.id), ne(sessions.id, current.session.id)))
      .returning({ id: sessions.id });
    revalidatePath("/profil/nastroiki");
    return { revoked: removed.length };
  });
}

/** Soft delete: the account is disabled, listings are archived and every session is removed. */
export async function deleteAccountAction(input: { confirmEmail: string }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(z.object({ confirmEmail: z.string().trim().toLowerCase() }), input);
    if (data.confirmEmail !== user.email.toLowerCase()) throw new AppError("VALIDATION", undefined, { confirmEmail: "Имейлът не съвпада." });
    if (user.dealer?.memberRole === "OWNER") throw new AppError("CONFLICT", "Профилът е собственик на дилър. Свържи се с поддръжката, за да прехвърлиш дилъра.");
    await db.transaction(async (tx) => {
      await tx
        .update(listings)
        .set({ status: "ARCHIVED", vipUntil: null, topUntil: null, highlightUntil: null })
        .where(and(eq(listings.sellerId, user.id), inArray(listings.status, ["DRAFT", "PENDING", "ACTIVE", "PAUSED", "EXPIRED", "REJECTED"])));
      await tx.update(users).set({ deletedAt: new Date(), status: "SUSPENDED", suspensionReason: "Изтрит от потребителя" }).where(eq(users.id, user.id));
      await tx.delete(sessions).where(eq(sessions.userId, user.id));
    });
  });
}
