"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { sanitizeSingleLine } from "@/lib/text";
import { parseInput, runAction } from "@/server/action";
import { recordAudit } from "@/server/audit";
import { canAssignRole, canSuspendUser, type Role } from "@/server/auth/policies";
import { requireActionPermission } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { roleChangeSchema, suspendUserSchema } from "../schemas";

async function loadTarget(userId: string) {
  const [target] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  if (!target) throw new AppError("NOT_FOUND", "Потребителят не е намерен.");
  return { ...target, role: target.role as Role };
}

function revalidateUser(userId: string) {
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
}

/** Role changes never create or remove dealer records; dealer membership is managed separately. */
export async function changeUserRoleAction(input: z.input<typeof roleChangeSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("users.changeRole");
    const data = parseInput(roleChangeSchema, input);
    const target = await loadTarget(data.userId);
    if (target.role === data.role) throw new AppError("CONFLICT", "Потребителят вече има тази роля.");
    if (!canAssignRole(actor, target, data.role)) throw new AppError("FORBIDDEN", "Нямаш права да зададеш тази роля.");
    await db.transaction(async (tx) => {
      await tx.update(users).set({ role: data.role }).where(eq(users.id, target.id));
      await recordAudit({ actorId: actor.id, action: "user.role_change", targetType: "user", targetId: target.id, metadata: { from: target.role, to: data.role } }, tx);
    });
    revalidateUser(target.id);
  });
}

/** Suspension deletes every session row, so the user is signed out on the next request. */
export async function suspendUserAction(input: z.input<typeof suspendUserSchema>): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("users.suspend");
    const data = parseInput(suspendUserSchema, input);
    const target = await loadTarget(data.userId);
    if (!canSuspendUser(actor, target)) throw new AppError("FORBIDDEN", "Нямаш права да спреш този потребител.");
    if (target.status === "SUSPENDED") throw new AppError("CONFLICT", "Потребителят вече е спрян.");
    const reason = sanitizeSingleLine(data.reason, 300);
    await db.transaction(async (tx) => {
      await tx.update(users).set({ status: "SUSPENDED", suspendedAt: new Date(), suspensionReason: reason }).where(eq(users.id, target.id));
      await tx.delete(sessions).where(eq(sessions.userId, target.id));
      await recordAudit({ actorId: actor.id, action: "user.suspend", targetType: "user", targetId: target.id, metadata: { reason } }, tx);
    });
    revalidateUser(target.id);
  });
}

export async function unsuspendUserAction(input: { userId: string }): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await requireActionPermission("users.suspend");
    const data = parseInput(z.object({ userId: z.uuid() }), input);
    const target = await loadTarget(data.userId);
    if (!canSuspendUser(actor, target)) throw new AppError("FORBIDDEN", "Нямаш права да възстановиш този потребител.");
    if (target.status !== "SUSPENDED") throw new AppError("CONFLICT", "Потребителят не е спрян.");
    await db.transaction(async (tx) => {
      await tx.update(users).set({ status: "ACTIVE", suspendedAt: null, suspensionReason: null }).where(eq(users.id, target.id));
      await recordAudit({ actorId: actor.id, action: "user.unsuspend", targetType: "user", targetId: target.id }, tx);
    });
    revalidateUser(target.id);
  });
}
