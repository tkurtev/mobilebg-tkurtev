import { describe, expect, it } from "vitest";
import { firstIncompleteStep, listingIssues, listingValuesSchema, stepsForSet, type ListingValues } from "@/features/listings/editor";
import { ATTRIBUTE_SETS } from "@/config/attribute-sets";

const completeCar: ListingValues = {
  makeId: "00000000-0000-4000-8000-000000000001",
  modelId: "00000000-0000-4000-8000-000000000002",
  title: "BMW 3 Series 320d",
  year: 2019,
  mileageKm: 120000,
  fuel: "diesel",
  gearbox: "automatic",
  bodyType: "sedan",
  condition: "used",
  priceEuros: 21900,
  description: "Отлично състояние, пълна сервизна история.",
  regionId: "00000000-0000-4000-8000-000000000003",
  cityId: "00000000-0000-4000-8000-000000000004",
  contactName: "Иван",
  contactPhone: "0888123456",
};

describe("listing editor validation", () => {
  it("accepts a complete car listing with photos", () => {
    expect(listingIssues(completeCar, "car", { imageCount: 3 })).toEqual({});
    expect(firstIncompleteStep(completeCar, "car", 3)).toBeNull();
  });

  it("reports missing required fields per step", () => {
    const issues = listingIssues({ ...completeCar, fuel: null, mileageKm: null }, "car", { step: "details" });
    expect(Object.keys(issues).sort()).toEqual(["fuel", "mileageKm"]);
    expect(listingIssues(completeCar, "car", { imageCount: 0 }).photos).toBeDefined();
  });

  it("applies category-specific requirements", () => {
    const tires: ListingValues = { title: "4 бр. зимни гуми", condition: "used", priceEuros: 200, description: "Гуми с 6 мм грайфер, без кръпки.", regionId: completeCar.regionId, cityId: completeCar.cityId, contactName: "Иван", contactPhone: "0888123456", attributes: {} };
    expect(listingIssues(tires, "tires", { imageCount: 1 })["attributes.productType"]).toBeDefined();
    expect(listingIssues({ ...tires, attributes: { productType: "tires" } }, "tires", { imageCount: 1 })).toEqual({});
    expect(stepsForSet(ATTRIBUTE_SETS.tires).map((step) => step.key)).not.toContain("features");
  });

  it("rejects invalid phone numbers, VINs and out-of-range attributes", () => {
    expect(listingIssues({ ...completeCar, contactPhone: "12345" }, "car", { step: "contact" }).contactPhone).toBeDefined();
    expect(listingIssues({ ...completeCar, attributes: { vin: "IOQ" } }, "car", { step: "details" })["attributes.vin"]).toBeDefined();
    expect(listingIssues({ ...completeCar, attributes: { seats: 500 } }, "car", { step: "details" })["attributes.seats"]).toBeDefined();
  });

  it("strips unknown keys to prevent mass assignment", () => {
    const parsed = listingValuesSchema.parse({ title: "Кола", sellerId: "attacker", status: "ACTIVE", viewCount: 1_000_000 });
    expect(parsed).toEqual({ title: "Кола" });
  });
});
