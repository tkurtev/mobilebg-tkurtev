import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import * as s from "@/db/schema";
import { createDraft, publishListing, saveListing } from "@/features/listings/service";
import { countUnreadConversations } from "@/features/messages/unread";
import { markConversationRead, sendMessage, startConversation } from "@/features/messages/service";
import { attachFakeImage, completeCarValues, createReferenceData, createUser, type ReferenceData } from "../support/fixtures";

let ref: ReferenceData;

beforeAll(async () => {
  ref = await createReferenceData();
});

async function activeListing() {
  const seller = await createUser();
  const draft = await createDraft(seller, ref.category.id);
  await saveListing(seller, draft.id, completeCarValues(ref), { step: "review", complete: false });
  await attachFakeImage(draft.id);
  await publishListing(seller, draft.id);
  return { seller, id: draft.id };
}

describe("messaging", () => {
  it("starts one conversation per buyer and listing and tracks unread state", async () => {
    const { seller, id } = await activeListing();
    const buyer = await createUser();
    const first = await startConversation(buyer.id, id, "Здравейте, наличен ли е?");
    const second = await startConversation(buyer.id, id, "Може ли оглед утре?");
    expect(second.conversationId).toBe(first.conversationId);

    expect(await countUnreadConversations(seller.id)).toBe(1);
    expect(await countUnreadConversations(buyer.id)).toBe(0);

    await markConversationRead(seller.id, first.conversationId);
    expect(await countUnreadConversations(seller.id)).toBe(0);

    await sendMessage(seller.id, first.conversationId, "Да, заповядайте.");
    expect(await countUnreadConversations(buyer.id)).toBe(1);

    const [listing] = await db.select({ inquiries: s.listings.inquiryCount }).from(s.listings).where(eq(s.listings.id, id));
    expect(listing?.inquiries).toBe(1);
    const notes = await db.select().from(s.notifications).where(and(eq(s.notifications.userId, seller.id), eq(s.notifications.type, "MESSAGE_RECEIVED")));
    expect(notes.length).toBeGreaterThan(0);
  });

  it("blocks messages to own listings and from non-participants", async () => {
    const { seller, id } = await activeListing();
    await expect(startConversation(seller.id, id, "Здравей")).rejects.toMatchObject({ code: "CONFLICT" });
    const buyer = await createUser();
    const { conversationId } = await startConversation(buyer.id, id, "Здравейте");
    const stranger = await createUser();
    await expect(sendMessage(stranger.id, conversationId, "Аз също")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rate limits message bursts", async () => {
    const { id } = await activeListing();
    const buyer = await createUser();
    const { conversationId } = await startConversation(buyer.id, id, "Първо съобщение");
    let blocked = false;
    for (let i = 0; i < 40 && !blocked; i += 1) {
      try {
        await sendMessage(buyer.id, conversationId, `Съобщение ${i}`);
      } catch (error) {
        blocked = (error as { code?: string }).code === "RATE_LIMITED";
      }
    }
    expect(blocked).toBe(true);
  });
});
