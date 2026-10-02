import { index, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";
import { createdAt } from "./columns";
import { listings } from "./listings";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid().primaryKey().defaultRandom(),
    listingId: uuid()
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    buyerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sellerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
    lastMessageAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("conversations_listing_buyer_unique").on(t.listingId, t.buyerId),
    index("conversations_last_message_idx").on(t.lastMessageAt),
  ],
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp({ withTimezone: true }),
    archivedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("conversation_participants_user_idx").on(t.userId),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid()
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_conversation_created_idx").on(t.conversationId, t.createdAt)],
);
