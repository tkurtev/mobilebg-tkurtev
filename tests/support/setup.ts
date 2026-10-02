import { vi } from "vitest";
import { TEST_DATABASE_URL } from "./test-env";

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.AUTH_SECRET = "test-secret-for-vitest-only-0123456789";
process.env.MOBITED_DISABLE_RATE_LIMIT = "0";

// Next.js request-scoped APIs are not available outside the framework; tests call services directly.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
  refresh: () => {},
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: (task: (() => unknown) | Promise<unknown>) => (typeof task === "function" ? task() : task) };
});
