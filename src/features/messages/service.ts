import "server-only";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { after } from "next/server";
import { appUrl } from "@/config/env";
import { db } from "@/db/client";
import { conversationParticipants, conversations, listings, messages, notifications, users } from "@/db/schema";
import { newMessageTemplate } from "@/emails/templates";
import { isPubliclyVisible } from "@/server/auth/policies";
import { sendEmail } from "@/server/email";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { notify } from "@/features/notifications/service";

const NOTIFY_THROTTLE_MS = 30 * 60 * 1000;

async function notifyRecipient(input: { recipientId: string; conversationId: string; listingTitle: string; isNewConversation: boolean }) {
  const link = `/suobshteniya/${input.conversationId}`;
  const [recent] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, input.recipientId),
        eq(notifications.link, link),
        sql`${notifications.readAt} IS NULL`,
        gt(notifications.createdAt, new Date(Date.now() - NOTIFY_THROTTLE_MS)),
      ),
    )
    .limit(1);
  if (recent) return;
  await notify({ userId: input.recipientId, type: "MESSAGE_RECEIVED", title: "Ново съобщение", body: input.listingTitle, link });

  if (input.isNewConversation) {
    const [recipient] = await db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, input.recipientId)).limit(1);
    if (recipient) {
      after(() =>
        sendEmail({ to: recipient.email, ...newMessageTemplate({ name: recipient.name, listingTitle: input.listingTitle, url: `${appUrl()}${link}` }) }).catch((error: unknown) =>
          console.error("[messages] email notification failed", error),
        ),
      );
    }
  }
}

export async function startConversation(buyerId: string, listingId: string, body: string): Promise<{ conversationId: string }> {
  const [listing] = await db
    .select({ id: listings.id, sellerId: listings.sellerId, title: listings.title, status: listings.status, expiresAt: listings.expiresAt, deletedAt: listings.deletedAt })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!listing || !isPubliclyVisible(listing)) throw new AppError("NOT_FOUND", "Обявата не е активна.");
  if (listing.sellerId === buyerId) throw new AppError("CONFLICT", "Не можеш да изпратиш съобщение до собствената си обява.");

  await enforceRateLimit("messageSend", buyerId);

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.listingId, listing.id), eq(conversations.buyerId, buyerId)))
      .limit(1);
    const now = new Date();
    let conversationId = existing?.id;
    const isNew = !conversationId;
    if (!conversationId) {
      await enforceRateLimit("conversationStart", buyerId);
      const [created] = await tx
        .insert(conversations)
        .values({ listingId: listing.id, buyerId, sellerId: listing.sellerId, lastMessageAt: now })
        .returning({ id: conversations.id });
      if (!created) throw new Error("conversation insert failed");
      conversationId = created.id;
      await tx.insert(conversationParticipants).values([
        { conversationId, userId: buyerId, lastReadAt: now },
        { conversationId, userId: listing.sellerId, lastReadAt: null },
      ]);
      await tx.update(listings).set({ inquiryCount: sql`${listings.inquiryCount} + 1` }).where(eq(listings.id, listing.id));
    } else {
      await tx.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conversationId));
      await tx
        .update(conversationParticipants)
        .set({ lastReadAt: now, archivedAt: null })
        .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, buyerId)));
    }
    await tx.insert(messages).values({ conversationId, senderId: buyerId, body, createdAt: now });
    return { conversationId, isNew };
  });

  await notifyRecipient({ recipientId: listing.sellerId, conversationId: result.conversationId, listingTitle: listing.title, isNewConversation: result.isNew });
  return { conversationId: result.conversationId };
}

export async function sendMessage(senderId: string, conversationId: string, body: string): Promise<{ messageId: string }> {
  const [conversation] = await db
    .select({ id: conversations.id, buyerId: conversations.buyerId, sellerId: conversations.sellerId, listingTitle: listings.title })
    .from(conversations)
    .innerJoin(listings, eq(listings.id, conversations.listingId))
    .innerJoin(conversationParticipants, and(eq(conversationParticipants.conversationId, conversations.id), eq(conversationParticipants.userId, senderId)))
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conversation) throw new AppError("NOT_FOUND", "Разговорът не е намерен.");

  await enforceRateLimit("messageSend", senderId);
  const now = new Date();
  const messageId = await db.transaction(async (tx) => {
    const [message] = await tx.insert(messages).values({ conversationId, senderId, body, createdAt: now }).returning({ id: messages.id });
    await tx.update(conversations).set({ lastMessageAt: now }).where(eq(conversations.id, conversationId));
    await tx
      .update(conversationParticipants)
      .set({ lastReadAt: now })
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, senderId)));
    await tx.update(conversationParticipants).set({ archivedAt: null }).where(eq(conversationParticipants.conversationId, conversationId));
    if (!message) throw new Error("message insert failed");
    return message.id;
  });

  const recipientId = conversation.buyerId === senderId ? conversation.sellerId : conversation.buyerId;
  await notifyRecipient({ recipientId, conversationId, listingTitle: conversation.listingTitle, isNewConversation: false });
  return { messageId };
}

export async function markConversationRead(userId: string, conversationId: string): Promise<void> {
  await db
    .update(conversationParticipants)
    .set({ lastReadAt: new Date() })
    .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.link, `/suobshteniya/${conversationId}`), sql`${notifications.readAt} IS NULL`));
}

export async function findConversationForListing(buyerId: string, listingId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(and(eq(conversations.listingId, listingId), eq(conversations.buyerId, buyerId)))
    .orderBy(desc(conversations.createdAt))
    .limit(1);
  return row?.id ?? null;
}
