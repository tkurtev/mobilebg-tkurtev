import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import * as s from "@/db/schema";
import type { Actor, Role } from "@/server/auth/policies";

const suffix = () => randomUUID().slice(0, 8);

export async function createUser(role: Role = "USER", options: { dealerId?: string } = {}): Promise<Actor & { name: string }> {
  const name = `Тест ${suffix()}`;
  const [user] = await db
    .insert(s.users)
    .values({ name, email: `${suffix()}@test.local`, emailVerified: true, role })
    .returning({ id: s.users.id });
  if (!user) throw new Error("user insert failed");
  if (options.dealerId) await db.insert(s.dealerMembers).values({ dealerId: options.dealerId, userId: user.id, role: "OWNER" });
  return { id: user.id, role, dealerId: options.dealerId ?? null, name };
}

export async function createReferenceData() {
  const id = suffix();
  const [region] = await db.insert(s.regions).values({ name: `Област ${id}`, slug: `region-${id}` }).returning();
  const [city] = await db.insert(s.cities).values({ regionId: region!.id, name: `Град ${id}`, slug: `city-${id}` }).returning();
  const [category] = await db.insert(s.categories).values({ slug: `cars-${id}`, name: `Автомобили ${id}`, attributeSet: "car", vehicleType: "car" }).returning();
  const [make] = await db.insert(s.vehicleMakes).values({ name: `Марка ${id}`, slug: `make-${id}` }).returning();
  const [model] = await db.insert(s.vehicleModels).values({ makeId: make!.id, name: `Модел ${id}`, slug: `model-${id}`, vehicleType: "car" }).returning();
  return { region: region!, city: city!, category: category!, make: make!, model: model! };
}

export type ReferenceData = Awaited<ReturnType<typeof createReferenceData>>;

export function completeCarValues(ref: ReferenceData) {
  return {
    makeId: ref.make.id,
    modelId: ref.model.id,
    title: `${ref.make.name} ${ref.model.name} 2.0 TDI`,
    year: 2018,
    mileageKm: 150000,
    fuel: "diesel" as const,
    gearbox: "manual" as const,
    bodyType: "wagon",
    condition: "used" as const,
    priceEuros: 14500,
    description: "Колата е в много добро състояние, обслужена.",
    regionId: ref.region.id,
    cityId: ref.city.id,
    contactName: "Тест Продавач",
    contactPhone: "0888 111 222",
    features: ["abs", "navigation", "not-a-feature"],
    attributes: { doors: "4-5", registered: true, seats: 5, unknownKey: "x" },
  };
}

export async function attachFakeImage(listingId: string) {
  await db.insert(s.listingImages).values({
    listingId,
    url: "/media/demo/sedan-black-1.svg",
    thumbUrl: "/media/demo/sedan-black-1.svg",
    storagePath: "demo/sedan-black-1.svg",
    thumbStoragePath: "demo/sedan-black-1.svg",
    width: 800,
    height: 600,
    sizeBytes: 1000,
    position: 0,
  });
  await db.update(s.listings).set({ imageCount: 1, coverImageUrl: "/media/demo/sedan-black-1.svg" }).where(eq(s.listings.id, listingId));
}
