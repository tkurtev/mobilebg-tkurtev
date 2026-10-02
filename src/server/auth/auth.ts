import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { appUrl, authSecret, rateLimitDisabled, trustedOrigins } from "@/config/env";
import { db } from "@/db/client";
import { accounts, profiles, sessions, users, verificationTokens } from "@/db/schema";
import { resetPasswordTemplate, verifyEmailTemplate } from "@/emails/templates";
import { sendEmail } from "@/server/email";
import { consumeRateLimit } from "@/server/rate-limit";

function createAuth() {
  return betterAuth({
    appName: "MobiTed",
    baseURL: appUrl(),
    secret: authSecret(),
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: users, session: sessions, account: accounts, verification: verificationTokens },
    }),
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "USER", required: false },
        status: { type: "string", input: false, defaultValue: "ACTIVE", required: false },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...resetPasswordTemplate({ name: user.name, url }) });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({ to: user.email, ...verifyEmailTemplate({ name: user.name, url }) });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: !rateLimitDisabled(),
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 300, max: 10 },
        "/sign-up/email": { window: 3600, max: 5 },
        "/request-password-reset": { window: 900, max: 5 },
        "/reset-password": { window: 900, max: 10 },
        "/send-verification-email": { window: 900, max: 5 },
        "/change-password": { window: 900, max: 10 },
      },
      customStorage: {
        consume: (key, rule) => consumeRateLimit(`auth:${key}`, rule),
      },
    },
    advanced: {
      cookiePrefix: "mobited",
      database: { generateId: "uuid" },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await db.insert(profiles).values({ userId: user.id }).onConflictDoNothing();
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const [owner] = await db
              .select({ status: users.status, deletedAt: users.deletedAt })
              .from(users)
              .where(eq(users.id, session.userId))
              .limit(1);
            if (!owner || owner.deletedAt) {
              throw new APIError("FORBIDDEN", { message: "Профилът не е активен.", code: "ACCOUNT_INACTIVE" });
            }
            if (owner.status === "SUSPENDED") {
              throw new APIError("FORBIDDEN", { message: "Профилът е спрян.", code: "ACCOUNT_SUSPENDED" });
            }
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

type Auth = ReturnType<typeof createAuth>;

let instance: Auth | undefined;

/** Created on first use so that importing modules does not require runtime configuration. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}
