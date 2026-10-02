import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt } from "./columns";
import { listingStatusEnum, moderationActionTypeEnum, reportReasonEnum, reportStatusEnum } from "./enums";
import { listings } from "./listings";

export const listingReports = pgTable(
  "listing_reports",
  {
    id: uuid().primaryKey().defaultRandom(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    reporterId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: reportReasonEnum().notNull(),
    details: text().notNull().default(""),
    status: reportStatusEnum().notNull().default("OPEN"),
    resolvedById: uuid().references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("listing_reports_status_idx").on(t.status, t.createdAt),
    index("listing_reports_listing_idx").on(t.listingId),
    uniqueIndex("listing_reports_open_unique").on(t.listingId, t.reporterId).where(sql`status = 'OPEN'`),
  ],
);

export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid().primaryKey().defaultRandom(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    reportId: uuid().references(() => listingReports.id, { onDelete: "set null" }),
    moderatorId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: moderationActionTypeEnum().notNull(),
    reason: text().notNull().default(""),
    previousStatus: listingStatusEnum(),
    newStatus: listingStatusEnum(),
    createdAt: createdAt(),
  },
  (t) => [index("moderation_actions_listing_idx").on(t.listingId, t.createdAt)],
);

export type AuditMetadata = Record<string, string | number | boolean | null>;

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    actorId: uuid().references(() => users.id, { onDelete: "set null" }),
    action: text().notNull(),
    targetType: text().notNull(),
    targetId: text().notNull(),
    metadata: jsonb().$type<AuditMetadata>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_target_idx").on(t.targetType, t.targetId),
    index("audit_logs_actor_idx").on(t.actorId),
    index("audit_logs_created_idx").on(t.createdAt),
  ],
);
