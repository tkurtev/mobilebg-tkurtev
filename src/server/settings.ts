import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { appSettings } from "@/db/schema";
import { DEFAULT_SETTINGS, settingsSchema, type AppSettings } from "@/config/settings";

export const SETTINGS_TAG = "app-settings";

async function loadSettings(): Promise<AppSettings> {
  const rows = await db.select({ key: appSettings.key, value: appSettings.value }).from(appSettings);
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) merged[row.key] = row.value;
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export const getSettings = unstable_cache(loadSettings, ["app-settings"], { tags: [SETTINGS_TAG], revalidate: 300 });
