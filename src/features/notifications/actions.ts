"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const notificationId = parseInput(z.uuid(), id);
    const [row] = await db
      .select({ readAt: notifications.readAt })
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)))
      .limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Известието не е намерено.");
    if (row.readAt) return;
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, user.id)));
    refresh();
  });
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)));
    refresh();
  });
}
