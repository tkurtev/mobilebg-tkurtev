import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import * as s from "@/db/schema";
import { createDraft, publishListing, saveListing } from "@/features/listings/service";
import { purchasePromotion } from "@/features/payments/service";
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

describe("demo checkout", () => {
  it("records a succeeded DEMO payment and activates VIP", async () => {
    const { seller, id } = await activeListing();
    const result = await purchasePromotion(seller, { listingId: id, promotionType: "VIP" });

    const [payment] = await db.select().from(s.payments).where(eq(s.payments.id, result.paymentId));
    expect(payment).toMatchObject({ status: "SUCCEEDED", provider: "DEMO", amountCents: 999, currency: "EUR", promotionType: "VIP", userId: seller.id });
    expect(Object.keys(payment!)).not.toEqual(expect.arrayContaining(["cardNumber", "cvc", "expiry"]));

    const [listing] = await db.select().from(s.listings).where(eq(s.listings.id, id));
    expect(listing?.vipUntil?.getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);
    const promotions = await db.select().from(s.promotions).where(eq(s.promotions.listingId, id));
    expect(promotions).toHaveLength(1);
    const notes = await db.select().from(s.notifications).where(eq(s.notifications.userId, seller.id));
    expect(notes.some((note) => note.type === "PROMOTION_ACTIVATED")).toBe(true);
  });

  it("refuses to promote someone else's listing", async () => {
    const { id } = await activeListing();
    const stranger = await createUser();
    await expect(purchasePromotion(stranger, { listingId: id, promotionType: "TOP" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.select().from(s.payments).where(eq(s.payments.listingId, id))).toHaveLength(0);
  });

  it("refuses inactive listings and accidental double submits", async () => {
    const { seller, id } = await activeListing();
    await purchasePromotion(seller, { listingId: id, promotionType: "HIGHLIGHT" });
    await expect(purchasePromotion(seller, { listingId: id, promotionType: "HIGHLIGHT" })).rejects.toMatchObject({ code: "CONFLICT" });
    await db.update(s.listings).set({ status: "PAUSED" }).where(eq(s.listings.id, id));
    await expect(purchasePromotion(seller, { listingId: id, promotionType: "TOP" })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("bumps the listing to the top of the newest sort with REFRESH", async () => {
    const { seller, id } = await activeListing();
    await db.update(s.listings).set({ sortDate: new Date(Date.now() - 10 * 86_400_000) }).where(eq(s.listings.id, id));
    await purchasePromotion(seller, { listingId: id, promotionType: "REFRESH" });
    const [listing] = await db.select({ sortDate: s.listings.sortDate }).from(s.listings).where(eq(s.listings.id, id));
    expect(Date.now() - (listing?.sortDate.getTime() ?? 0)).toBeLessThan(60_000);
  });
});
