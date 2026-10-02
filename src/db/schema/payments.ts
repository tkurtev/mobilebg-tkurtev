import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt } from "./columns";
import { paymentProviderEnum, paymentStatusEnum, promotionTypeEnum } from "./enums";
import { listings } from "./listings";

/** Demo payment records. Card data never reaches the server and is never stored. */
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "restrict" }),
    promotionType: promotionTypeEnum().notNull(),
    amountCents: integer().notNull(),
    currency: text().notNull().default("EUR"),
    status: paymentStatusEnum().notNull().default("PENDING"),
    provider: paymentProviderEnum().notNull().default("DEMO"),
    providerReference: text(),
    createdAt: createdAt(),
  },
  (t) => [
    index("payments_user_idx").on(t.userId, t.createdAt),
    index("payments_listing_idx").on(t.listingId),
    check("payments_currency_eur", sql`${t.currency} = 'EUR'`),
    check("payments_amount_positive", sql`${t.amountCents} > 0`),
  ],
);

export const promotions = pgTable(
  "promotions",
  {
    id: uuid().primaryKey().defaultRandom(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    paymentId: uuid().references(() => payments.id, { onDelete: "set null" }),
    type: promotionTypeEnum().notNull(),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    createdById: uuid().references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("promotions_listing_idx").on(t.listingId, t.endsAt), index("promotions_ends_at_idx").on(t.endsAt)],
);
