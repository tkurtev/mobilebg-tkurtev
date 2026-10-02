import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt } from "./columns";
import { notificationTypeEnum } from "./enums";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum().notNull(),
    title: text().notNull(),
    body: text().notNull().default(""),
    link: text(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const appSettings = pgTable("app_settings", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedById: uuid().references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Fixed-window counters shared by every serverless instance. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().primaryKey(),
    count: integer().notNull(),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    windowEnd: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limits_window_end_idx").on(t.windowEnd)],
);

/** Development mailbox. Only written when the dev mailbox is enabled. */
export const devEmails = pgTable("dev_emails", {
  id: uuid().primaryKey().defaultRandom(),
  to: text().notNull(),
  subject: text().notNull(),
  text: text().notNull(),
  html: text().notNull(),
  createdAt: createdAt(),
});
