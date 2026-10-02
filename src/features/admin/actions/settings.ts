"use server";

import { revalidatePath, updateTag } from "next/cache";
import { DEFAULT_SETTINGS, settingsSchema, type AppSettings } from "@/config/settings";
import { db } from "@/db/client";
import { appSettings, type AuditMetadata } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { recordAudit } from "@/server/audit";
import { requireActionPermission } from "@/server/auth/session";
import { SETTINGS_TAG } from "@/server/settings";

export async function updateSettingsAction(input: AppSettings): Promise<ActionResult<{ changed: number }>> {
  return runAction(async () => {
    const actor = await requireActionPermission("settings.manage");
    const data = parseInput(settingsSchema, input);
    // Compare against the stored rows, not the cached getSettings() result.
    const rows = await db.select({ key: appSettings.key, value: appSettings.value }).from(appSettings);
    const current: Record<string, unknown> = { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) };
    const changed = (Object.keys(data) as (keyof AppSettings)[]).filter((key) => current[key] !== data[key]);
    if (changed.length === 0) return { changed: 0 };

    const now = new Date();
    await db.transaction(async (tx) => {
      for (const key of changed) {
        await tx
          .insert(appSettings)
          .values({ key, value: data[key], updatedById: actor.id, updatedAt: now })
          .onConflictDoUpdate({ target: appSettings.key, set: { value: data[key], updatedById: actor.id, updatedAt: now } });
      }
      const metadata: AuditMetadata = Object.fromEntries(changed.map((key) => [key, data[key]]));
      await recordAudit({ actorId: actor.id, action: "settings.update", targetType: "settings", targetId: "app", metadata }, tx);
    });
    updateTag(SETTINGS_TAG);
    revalidatePath("/admin/settings");
    return { changed: changed.length };
  });
}
