import "server-only";
import { eq } from "drizzle-orm";
import { DEFAULT_SETTINGS, settingsSchema, type AppSettings } from "@/config/settings";
import { db } from "@/db/client";
import { appSettings, users } from "@/db/schema";

/** Uncached read, so the form always shows what is stored. Invalid stored values fall back per key. */
export async function getStoredSettings() {
  const rows = await db
    .select({ key: appSettings.key, value: appSettings.value, updatedAt: appSettings.updatedAt, updatedByName: users.name })
    .from(appSettings)
    .leftJoin(users, eq(users.id, appSettings.updatedById));
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  const shape = settingsSchema.shape;
  for (const row of rows) {
    if (row.key in shape) {
      const key = row.key as keyof AppSettings;
      const parsed = shape[key].safeParse(row.value);
      if (parsed.success) Object.assign(settings, { [key]: parsed.data });
    }
  }
  const latest = rows.filter((row) => row.updatedByName).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0] ?? null;
  return { settings, latest };
}
