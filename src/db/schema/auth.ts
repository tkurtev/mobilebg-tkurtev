import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { userRoleEnum, userStatusEnum } from "./enums";
import { cities } from "./locations";

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: userRoleEnum().notNull().default("USER"),
    status: userStatusEnum().notNull().default("ACTIVE"),
    suspendedAt: timestamp({ withTimezone: true }),
    suspensionReason: text(),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps(),
  },
  (t) => [index("users_role_idx").on(t.role), index("users_created_at_idx").on(t.createdAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    ...timestamps(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text().notNull(),
    providerId: text().notNull(),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps(),
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

/**
 * Better Auth "verification" model. Password reset tokens are stored here with a
 * `reset-password:` identifier prefix. Email verification links use signed,
 * expiring tokens and do not need a row.
 */
export const verificationTokens = pgTable(
  "verification_tokens",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps(),
  },
  (t) => [index("verification_tokens_identifier_idx").on(t.identifier)],
);

export const profiles = pgTable("profiles", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: text(),
  cityId: uuid().references(() => cities.id, { onDelete: "set null" }),
  about: text(),
  ...timestamps(),
});
