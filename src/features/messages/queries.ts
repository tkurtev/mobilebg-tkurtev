import "server-only";
import { and, asc, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { categories, conversationParticipants, conversations, dealers, listings, messages, notifications, users } from "@/db/schema";
import { listingPath } from "@/features/listings/paths";
import { truncate } from "@/lib/text";
import { canViewListing, isPubliclyVisible, type Actor } from "@/server/auth/policies";

export const CONVERSATION_PAGE_SIZE = 50;
export const THREAD_MESSAGE_LIMIT = 300;
const POLL_MESSAGE_LIMIT = 200;
const DELETED_USER_NAME = "Изтрит профил";

/** Serializable shapes shared with client components. Email addresses are never selected. */
export type ConversationListItem = {
  id: string;
  otherPartyName: string;
  listingTitle: string;
  listingHref: string;
  listingImageUrl: string | null;
  listingPriceCents: number | null;
  listingActive: boolean;
  lastMessagePreview: string;
  lastMessageMine: boolean;
  lastMessageAt: string;
  unread: boolean;
};

export type ConversationListPage = { items: ConversationListItem[]; nextCursor: string | null };

export type ThreadMessage = { id: string; body: string; mine: boolean; createdAt: string };

export type ConversationThread = {
  id: string;
  otherPartyName: string;
  otherPartyRole: "dealer" | "seller" | "buyer";
  archived: boolean;
  needsMarkRead: boolean;
  listing: { title: string; href: string | null; imageUrl: string | null; priceCents: number | null; active: boolean };
  messages: ThreadMessage[];
  truncated: boolean;
};

const buyer = alias(users, "buyer");
const seller = alias(users, "seller");

type PartyRow = {
  buyerId: string;
  dealerName: string | null;
  buyerName: string;
  buyerDeletedAt: Date | null;
  sellerName: string;
  sellerDeletedAt: Date | null;
};

/** The buyer talks to the dealer when the listing belongs to one, otherwise to the seller. */
function otherParty(row: PartyRow, userId: string): { name: string; role: ConversationThread["otherPartyRole"] } {
  if (row.buyerId === userId) {
    if (row.dealerName) return { name: row.dealerName, role: "dealer" };
    return { name: row.sellerDeletedAt ? DELETED_USER_NAME : row.sellerName, role: "seller" };
  }
  return { name: row.buyerDeletedAt ? DELETED_USER_NAME : row.buyerName, role: "buyer" };
}

/** True when a message from the other side is newer than the participant's lastReadAt. */
function unreadCondition(userId: string) {
  return sql<boolean>`EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = ${conversations.id} AND m.sender_id <> ${userId} AND (${conversationParticipants.lastReadAt} IS NULL OR m.created_at > ${conversationParticipants.lastReadAt}))`;
}

const partySelect = {
  buyerId: conversations.buyerId,
  dealerName: dealers.name,
  buyerName: buyer.name,
  buyerDeletedAt: buyer.deletedAt,
  sellerName: seller.name,
  sellerDeletedAt: seller.deletedAt,
};

const listingSelect = {
  listingNumber: listings.number,
  listingSlug: listings.slug,
  categorySlug: categories.slug,
  listingTitle: listings.title,
  coverImageUrl: listings.coverImageUrl,
  priceCents: listings.priceCents,
  status: listings.status,
  expiresAt: listings.expiresAt,
  deletedAt: listings.deletedAt,
  sellerId: listings.sellerId,
  dealerId: listings.dealerId,
};

function previewText(body: string | null): string {
  return truncate((body ?? "").replace(/\s+/g, " ").trim(), 90);
}

/** Conversations the user takes part in and has not archived, newest activity first. Cursor is the last item's id. */
export async function listConversations(userId: string, cursor: string | null = null, limit = CONVERSATION_PAGE_SIZE): Promise<ConversationListPage> {
  const conditions: SQL[] = [eq(conversationParticipants.userId, userId), isNull(conversationParticipants.archivedAt)];
  if (cursor) {
    conditions.push(sql`(${conversations.lastMessageAt}, ${conversations.id}) < (SELECT c2.last_message_at, c2.id FROM conversations c2 WHERE c2.id = ${cursor})`);
  }
  const rows = await db
    .select({
      id: conversations.id,
      lastMessageAt: conversations.lastMessageAt,
      ...partySelect,
      ...listingSelect,
      lastBody: sql<string | null>`(SELECT left(m.body, 200) FROM messages m WHERE m.conversation_id = ${conversations.id} ORDER BY m.created_at DESC, m.id DESC LIMIT 1)`,
      lastSenderId: sql<string | null>`(SELECT m.sender_id FROM messages m WHERE m.conversation_id = ${conversations.id} ORDER BY m.created_at DESC, m.id DESC LIMIT 1)`,
      unread: unreadCondition(userId),
    })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
    .innerJoin(listings, eq(listings.id, conversations.listingId))
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(buyer, eq(buyer.id, conversations.buyerId))
    .innerJoin(seller, eq(seller.id, conversations.sellerId))
    .leftJoin(dealers, and(eq(dealers.id, listings.dealerId), isNull(dealers.deletedAt)))
    .where(and(...conditions))
    .orderBy(desc(conversations.lastMessageAt), desc(conversations.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const items = page.map((row) => ({
    id: row.id,
    otherPartyName: otherParty(row, userId).name,
    listingTitle: row.listingTitle || "Обява",
    listingHref: listingPath({ categorySlug: row.categorySlug, number: row.listingNumber, slug: row.listingSlug }),
    listingImageUrl: row.coverImageUrl,
    listingPriceCents: row.priceCents,
    listingActive: isPubliclyVisible(row),
    lastMessagePreview: previewText(row.lastBody),
    lastMessageMine: row.lastSenderId === userId,
    lastMessageAt: row.lastMessageAt.toISOString(),
    unread: Boolean(row.unread),
  }));
  return { items, nextCursor: rows.length > limit ? (page.at(-1)?.id ?? null) : null };
}

const messageSelect = { id: messages.id, body: messages.body, senderId: messages.senderId, createdAt: messages.createdAt };

function toThreadMessage(row: { id: string; body: string; senderId: string; createdAt: Date }, userId: string): ThreadMessage {
  return { id: row.id, body: row.body, mine: row.senderId === userId, createdAt: row.createdAt.toISOString() };
}

/** Returns null unless the user is a participant, so callers can 404 without trusting the id. */
export async function getConversationThread(user: Actor, conversationId: string): Promise<ConversationThread | null> {
  const [row] = await db
    .select({
      id: conversations.id,
      archivedAt: conversationParticipants.archivedAt,
      ...partySelect,
      ...listingSelect,
      unread: unreadCondition(user.id),
      unreadNotification: sql<boolean>`EXISTS (SELECT 1 FROM ${notifications} WHERE ${notifications.userId} = ${user.id} AND ${notifications.link} = ${`/suobshteniya/${conversationId}`} AND ${notifications.readAt} IS NULL)`,
    })
    .from(conversationParticipants)
    .innerJoin(conversations, eq(conversations.id, conversationParticipants.conversationId))
    .innerJoin(listings, eq(listings.id, conversations.listingId))
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(buyer, eq(buyer.id, conversations.buyerId))
    .innerJoin(seller, eq(seller.id, conversations.sellerId))
    .leftJoin(dealers, and(eq(dealers.id, listings.dealerId), isNull(dealers.deletedAt)))
    .where(and(eq(conversationParticipants.userId, user.id), eq(conversations.id, conversationId)))
    .limit(1);
  if (!row) return null;

  const latest = await db
    .select(messageSelect)
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(THREAD_MESSAGE_LIMIT + 1);

  const party = otherParty(row, user.id);
  const href = listingPath({ categorySlug: row.categorySlug, number: row.listingNumber, slug: row.listingSlug });
  return {
    id: row.id,
    otherPartyName: party.name,
    otherPartyRole: party.role,
    archived: row.archivedAt !== null,
    needsMarkRead: Boolean(row.unread) || Boolean(row.unreadNotification),
    listing: {
      title: row.listingTitle || "Обява",
      href: canViewListing(user, row) ? href : null,
      imageUrl: row.coverImageUrl,
      priceCents: row.priceCents,
      active: isPubliclyVisible(row),
    },
    messages: latest.slice(0, THREAD_MESSAGE_LIMIT).reverse().map((message) => toThreadMessage(message, user.id)),
    truncated: latest.length > THREAD_MESSAGE_LIMIT,
  };
}

/**
 * Messages newer than `afterId` for polling. The comparison runs in SQL against the anchor row
 * because JS dates drop the microseconds Postgres stores. Returns null for non-participants.
 */
export async function getMessagesAfter(userId: string, conversationId: string, afterId: string | null): Promise<ThreadMessage[] | null> {
  const [participant] = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)))
    .limit(1);
  if (!participant) return null;

  const conditions: SQL[] = [eq(messages.conversationId, conversationId)];
  if (afterId) {
    conditions.push(sql`(${messages.createdAt}, ${messages.id}) > (SELECT a.created_at, a.id FROM messages a WHERE a.id = ${afterId} AND a.conversation_id = ${conversationId})`);
  }
  const rows = await db
    .select(messageSelect)
    .from(messages)
    .where(and(...conditions))
    .orderBy(afterId ? asc(messages.createdAt) : desc(messages.createdAt), afterId ? asc(messages.id) : desc(messages.id))
    .limit(POLL_MESSAGE_LIMIT);
  const ordered = afterId ? rows : rows.reverse();
  return ordered.map((row) => toThreadMessage(row, userId));
}
