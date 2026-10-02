import "server-only";
import { and, eq, gt, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationParticipants, messages } from "@/db/schema";

/** Number of conversations with at least one message from the other side newer than lastReadAt. */
export async function countUnreadConversations(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(DISTINCT ${messages.conversationId})::int` })
    .from(conversationParticipants)
    .innerJoin(messages, eq(messages.conversationId, conversationParticipants.conversationId))
    .where(
      and(
        eq(conversationParticipants.userId, userId),
        isNull(conversationParticipants.archivedAt),
        ne(messages.senderId, userId),
        or(isNull(conversationParticipants.lastReadAt), gt(messages.createdAt, conversationParticipants.lastReadAt)),
      ),
    );
  return row?.count ?? 0;
}
