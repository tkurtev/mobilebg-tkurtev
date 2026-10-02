import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { consumeRateLimit } from "@/server/rate-limit";

describe("Postgres rate limiter", () => {
  it("allows requests up to the limit within the window", async () => {
    const key = `test:${randomUUID()}`;
    const rule = { window: 60, max: 3 };
    const results = [];
    for (let i = 0; i < 4; i += 1) results.push(await consumeRateLimit(key, rule));
    expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
    expect(results[3]?.retryAfter).toBeGreaterThan(0);
  });

  it("is atomic under concurrent requests", async () => {
    const key = `test:${randomUUID()}`;
    const results = await Promise.all(Array.from({ length: 10 }, () => consumeRateLimit(key, { window: 60, max: 5 })));
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
  });
});
