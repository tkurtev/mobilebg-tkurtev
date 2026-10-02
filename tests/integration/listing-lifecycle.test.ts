import { and, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import * as s from "@/db/schema";
import { changeStatusAsOwner, createDraft, loadListingValues, publishListing, saveListing } from "@/features/listings/service";
import { AppError } from "@/server/errors";
import { attachFakeImage, completeCarValues, createReferenceData, createUser, type ReferenceData } from "../support/fixtures";

let ref: ReferenceData;

beforeAll(async () => {
  ref = await createReferenceData();
});

async function publishedListing() {
  const seller = await createUser();
  const draft = await createDraft(seller, ref.category.id);
  await saveListing(seller, draft.id, completeCarValues(ref), { step: "review", complete: false });
  await attachFakeImage(draft.id);
  await publishListing(seller, draft.id);
  return { seller, id: draft.id };
}

describe("listing lifecycle", () => {
  it("creates a draft that accepts partial data", async () => {
    const seller = await createUser();
    const draft = await createDraft(seller, ref.category.id);
    await saveListing(seller, draft.id, { title: "Чернова" }, { step: "vehicle", complete: false });
    const [row] = await db.select().from(s.listings).where(eq(s.listings.id, draft.id));
    expect(row?.status).toBe("DRAFT");
    expect(row?.title).toBe("Чернова");
  });

  it("refuses to publish incomplete listings", async () => {
    const seller = await createUser();
    const draft = await createDraft(seller, ref.category.id);
    await saveListing(seller, draft.id, completeCarValues(ref), { step: "review", complete: false });
    await expect(publishListing(seller, draft.id)).rejects.toMatchObject({ code: "VALIDATION", fieldErrors: { photos: expect.any(String) } });
  });

  it("publishes, normalizes data and drops unknown features and attributes", async () => {
    const { id } = await publishedListing();
    const [row] = await db.select().from(s.listings).where(eq(s.listings.id, id));
    expect(row?.status).toBe("ACTIVE");
    expect(row?.priceCents).toBe(1_450_000);
    expect(row?.contactPhone).toBe("+359888111222");
    expect(row?.expiresAt?.getTime()).toBeGreaterThan(Date.now());
    expect(row?.searchDocument).toContain(ref.make.name.toLowerCase());
    const values = await loadListingValues(id);
    expect(values.features?.sort()).toEqual(["abs", "navigation"]);
    expect(values.attributes).toEqual({ doors: "4-5", registered: true, seats: 5 });
  });

  it("records price history when a published price changes", async () => {
    const { seller, id } = await publishedListing();
    await saveListing(seller, id, { priceEuros: 13900 }, { step: "price", complete: true });
    const history = await db.select().from(s.listingPriceHistory).where(eq(s.listingPriceHistory.listingId, id));
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ oldPriceCents: 1_450_000, newPriceCents: 1_390_000 });
    const [row] = await db.select({ previous: s.listings.previousPriceCents }).from(s.listings).where(eq(s.listings.id, id));
    expect(row?.previous).toBe(1_450_000);
  });

  it("does not let another user edit or change the status of a listing", async () => {
    const { id } = await publishedListing();
    const intruder = await createUser();
    await expect(saveListing(intruder, id, { priceEuros: 1 }, { step: "price", complete: true })).rejects.toBeInstanceOf(AppError);
    await expect(changeStatusAsOwner(intruder, id, "sold")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("supports pause, resume and mark as sold", async () => {
    const { seller, id } = await publishedListing();
    expect(await changeStatusAsOwner(seller, id, "pause")).toBe("PAUSED");
    expect(await changeStatusAsOwner(seller, id, "resume")).toBe("ACTIVE");
    expect(await changeStatusAsOwner(seller, id, "sold")).toBe("SOLD");
    await expect(changeStatusAsOwner(seller, id, "pause")).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("lets dealer members manage listings of their dealer", async () => {
    const [dealer] = await db.insert(s.dealers).values({ slug: `dealer-${Date.now()}`, name: "Тест дилър", phone: "+35921234567" }).returning();
    const owner = await createUser("DEALER", { dealerId: dealer!.id });
    const colleague = { ...(await createUser("DEALER")), dealerId: dealer!.id };
    const draft = await createDraft(owner, ref.category.id);
    const [row] = await db.select({ dealerId: s.listings.dealerId }).from(s.listings).where(and(eq(s.listings.id, draft.id)));
    expect(row?.dealerId).toBe(dealer!.id);
    await expect(saveListing(colleague, draft.id, { title: "Обява на дилъра" }, { step: "vehicle", complete: false })).resolves.toBeDefined();
  });
});
