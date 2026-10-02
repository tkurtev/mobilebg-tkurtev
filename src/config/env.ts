import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16).optional(),
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  APP_URL: z.url().optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  MOBITED_DEV_MAILBOX: z.enum(["0", "1"]).optional(),
  MOBITED_LOCAL_UPLOADS: z.enum(["0", "1"]).optional(),
  MOBITED_DISABLE_RATE_LIMIT: z.enum(["0", "1"]).optional(),
  MOBITED_SKIP_EMAIL_VERIFICATION: z.enum(["0", "1"]).optional(),
  VERCEL_ENV: z.string().optional(),
  VERCEL_URL: z.string().optional(),
  VERCEL_BRANCH_URL: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (!cached) {
    const raw = Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => value !== undefined && value !== ""),
    );
    const parsed = serverEnvSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      throw new Error(`Invalid environment configuration:\n${issues.join("\n")}`);
    }
    cached = parsed.data;
  }
  return cached;
}

export function isProduction(): boolean {
  return env().NODE_ENV === "production";
}

/**
 * For deployments without an email provider yet: new accounts are created as verified and
 * can sign in right away. Accounts created this way stay verified after the flag is removed.
 */
export function emailVerificationSkipped(): boolean {
  return env().MOBITED_SKIP_EMAIL_VERIFICATION === "1";
}

export function appUrl(): string {
  const e = env();
  if (e.APP_URL) return e.APP_URL.replace(/\/$/, "");
  if (e.VERCEL_ENV === "production" && e.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${e.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (e.VERCEL_BRANCH_URL) return `https://${e.VERCEL_BRANCH_URL}`;
  if (e.VERCEL_URL) return `https://${e.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function trustedOrigins(): string[] {
  const e = env();
  const origins = new Set<string>([appUrl()]);
  for (const host of [e.VERCEL_URL, e.VERCEL_BRANCH_URL, e.VERCEL_PROJECT_PRODUCTION_URL]) {
    if (host) origins.add(`https://${host}`);
  }
  if (!isProduction()) {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return [...origins];
}

export function authSecret(): string {
  const secret = env().AUTH_SECRET;
  if (secret) return secret;
  if (isProduction()) {
    throw new Error("AUTH_SECRET must be set in production");
  }
  return "mobited-development-secret-do-not-use-in-production";
}

export function devMailboxEnabled(): boolean {
  const flag = env().MOBITED_DEV_MAILBOX;
  if (flag) return flag === "1";
  return !isProduction();
}

export function rateLimitDisabled(): boolean {
  return env().MOBITED_DISABLE_RATE_LIMIT === "1";
}

export function localUploadsEnabled(): boolean {
  const e = env();
  if (e.BLOB_READ_WRITE_TOKEN) return false;
  if (e.MOBITED_LOCAL_UPLOADS) return e.MOBITED_LOCAL_UPLOADS === "1";
  return !isProduction();
}
