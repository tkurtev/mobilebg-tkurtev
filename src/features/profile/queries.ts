import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cities, profiles, sessions } from "@/db/schema";

export async function getProfile(userId: string) {
  const [row] = await db
    .select({ phone: profiles.phone, cityId: profiles.cityId, regionId: cities.regionId })
    .from(profiles)
    .leftJoin(cities, eq(cities.id, profiles.cityId))
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row ?? { phone: null, cityId: null, regionId: null };
}

function describeDevice(userAgent: string | null): string {
  if (!userAgent) return "Неизвестно устройство";
  const browser = /Edg\//.test(userAgent) ? "Edge" : /Chrome\//.test(userAgent) ? "Chrome" : /Firefox\//.test(userAgent) ? "Firefox" : /Safari\//.test(userAgent) ? "Safari" : "Браузър";
  const os = /Android/.test(userAgent) ? "Android" : /iPhone|iPad/.test(userAgent) ? "iOS" : /Windows/.test(userAgent) ? "Windows" : /Mac OS X/.test(userAgent) ? "macOS" : /Linux/.test(userAgent) ? "Linux" : "";
  return [browser, os].filter(Boolean).join(", ");
}

/** Session list without tokens; only ids are exposed to the browser. */
export async function getUserSessions(userId: string) {
  const rows = await db
    .select({ id: sessions.id, userAgent: sessions.userAgent, ipAddress: sessions.ipAddress, createdAt: sessions.createdAt, updatedAt: sessions.updatedAt, expiresAt: sessions.expiresAt })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.updatedAt));
  const now = new Date();
  return rows.filter((row) => row.expiresAt > now).map((row) => ({ ...row, device: describeDevice(row.userAgent) }));
}
