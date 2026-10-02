import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { ATTRIBUTE_SETS } from "@/config/attribute-sets";
import { db } from "@/db/client";
import * as s from "@/db/schema";
import type { CategoryRecord } from "@/features/catalog/queries";
import { createDraft, publishListing, saveListing } from "@/features/listings/service";
import { parseSearchParams } from "@/features/search/params";
import { countListings, searchListings } from "@/features/search/queries";
import { attachFakeImage, completeCarValues, createReferenceData, createUser, type ReferenceData } from "../support/fixtures";

let ref: ReferenceData;
let category: CategoryRecord;
const ids: Record<string, string> = {};

async function publish(key: string, overrides: Record<string, unknown>) {
  const seller = await createUser();
  const draft = await createDraft(seller, ref.category.id);
  await saveListing(seller, draft.id, { ...completeCarValues(ref), ...overrides }, { step: "review", complete: false });
  await attachFakeImage(draft.id);
  await publishListing(seller, draft.id);
  ids[key] = draft.id;
}

beforeAll(async () => {
  ref = await createReferenceData();
  category = { id: ref.category.id, slug: ref.category.slug, name: ref.category.name, attributeSet: "car", vehicleType: "car", sortOrder: 0 };
  await publish("cheapDiesel", { priceEuros: 5000, fuel: "diesel", title: "Евтин дизел комби" });
  await publish("petrol", { priceEuros: 9000, fuel: "petrol", title: "Бензинова кола" });
  await publish("expensiveDiesel", { priceEuros: 30000, fuel: "diesel", year: 2023, title: "Нов дизел" });
  await publish("vip", { priceEuros: 20000, fuel: "petrol", title: "VIP кола" });
  await db.update(s.listings).set({ vipUntil: new Date(Date.now() + 86_400_000) }).where(eq(s.listings.id, ids.vip!));
  await publish("expired", { priceEuros: 1000, title: "Изтекла" });
  await db.update(s.listings).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(s.listings.id, ids.expired!));
});

const search = (raw: Record<string, string>) => searchListings(category, parseSearchParams(raw, ATTRIBUTE_SETS.car));

describe("search", () => {
  it("returns only public listings and ranks VIP first", async () => {
    const result = await search({});
    const resultIds = result.items.map((item) => item.id);
    expect(resultIds).not.toContain(ids.expired);
    expect(result.total).toBe(4);
    expect(resultIds[0]).toBe(ids.vip);
  });

  it("filters by fuel and price range in euros", async () => {
    const result = await search({ fuel: "diesel", priceTo: "10000" });
    expect(result.items.map((item) => item.id)).toEqual([ids.cheapDiesel]);
  });

  it("sorts by price within the promotion rank", async () => {
    const result = await search({ sort: "price-asc" });
    expect(result.items.map((item) => item.id)).toEqual([ids.vip, ids.cheapDiesel, ids.petrol, ids.expensiveDiesel]);
  });

  it("filters by make slug, features and attributes", async () => {
    expect((await search({ make: ref.make.slug, model: ref.model.slug })).total).toBe(4);
    expect((await search({ make: "missing-make" })).total).toBe(0);
    expect((await search({ features: "navigation" })).total).toBe(4);
    expect((await search({ features: "panoramic-roof" })).total).toBe(0);
    expect((await search({ registered: "1" })).total).toBe(4);
  });

  it("supports free text with prefix matching", async () => {
    expect((await search({ q: "дизе" })).total).toBe(2);
    expect((await search({ q: ref.city.name.split(" ")[1] ?? "" })).total).toBe(4);
  });

  it("counts results for the live filter preview", async () => {
    const { filters } = parseSearchParams({ fuel: "petrol" }, ATTRIBUTE_SETS.car);
    expect(await countListings(category, filters)).toBe(2);
  });
});
