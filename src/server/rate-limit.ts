import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { rateLimitDisabled } from "@/config/env";
import { AppError } from "./errors";

export type RateLimitRule = { window: number; max: number };

export type RateLimitResult = { allowed: boolean; retryAfter: number | null };

/**
 * Atomic fixed-window counter in PostgreSQL. Works across serverless instances without
 * extra infrastructure; swap for Redis/Upstash later by keeping this signature.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  if (rateLimitDisabled()) return { allowed: true, retryAfter: null };
  const rows = await db.execute<{ count: number; retry_after: number }>(sql`
    INSERT INTO rate_limits (key, count, window_start, window_end)
    VALUES (${key}, 1, now(), now() + make_interval(secs => ${rule.window}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_end <= now() THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_end <= now() THEN now() ELSE rate_limits.window_start END,
      window_end = CASE WHEN rate_limits.window_end <= now()
        THEN now() + make_interval(secs => ${rule.window}) ELSE rate_limits.window_end END
    RETURNING count, CEIL(EXTRACT(EPOCH FROM (window_end - now())))::int AS retry_after
  `);
  const row = rows[0];
  if (!row) return { allowed: true, retryAfter: null };
  const allowed = Number(row.count) <= rule.max;
  return { allowed, retryAfter: allowed ? null : Math.max(1, Number(row.retry_after)) };
}

export const RATE_LIMITS = {
  messageSend: { window: 600, max: 30 },
  conversationStart: { window: 3600, max: 15 },
  listingCreate: { window: 86_400, max: 30 },
  reportSubmit: { window: 3600, max: 10 },
  phoneReveal: { window: 3600, max: 60 },
  imageUpload: { window: 3600, max: 300 },
  savedSearchCreate: { window: 3600, max: 30 },
  checkout: { window: 3600, max: 20 },
  dealerMemberAdd: { window: 3600, max: 20 },
  messagePoll: { window: 60, max: 30 },
} as const satisfies Record<string, RateLimitRule>;

export async function enforceRateLimit(name: keyof typeof RATE_LIMITS, subject: string): Promise<void> {
  const result = await consumeRateLimit(`${name}:${subject}`, RATE_LIMITS[name]);
  if (!result.allowed) {
    const minutes = Math.ceil((result.retryAfter ?? 60) / 60);
    throw new AppError("RATE_LIMITED", `Твърде много опити. Опитай отново след ${minutes} мин.`);
  }
}
