import { rmSync } from "node:fs";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import { ATTRIBUTE_SETS, getAttributeSet, type AttributeSet } from "@/config/attribute-sets";
import { FEATURES } from "@/config/features";
import { BODY_TYPE_OPTIONS, COLOR_OPTIONS, optionLabel } from "@/config/options";
import { PROMOTION_PRODUCTS } from "@/config/promotions";
import { DEFAULT_SETTINGS } from "@/config/settings";
import { closeDb, db } from "@/db/client";
import * as s from "@/db/schema";
import { buildListingSlug } from "@/features/listings/paths";
import { buildSearchDocument } from "@/features/listings/search-document";
import { demoImageFile, demoShapeFor } from "@/features/media/demo-images";
import { slugify } from "@/lib/slug";
import { DEALERS, FEMALE_FIRST_NAMES, LISTING_DESCRIPTION_SENTENCES, MALE_FIRST_NAMES, MALE_LAST_NAMES, femaleLastName } from "./data/people";
import { type EngineSeed } from "./data/taxonomy";
import { chunk, createRandom, type Random } from "./random";
import { insertCategories, insertLocations, insertMissingSettings, insertTaxonomy, type InsertedModel } from "./reference";

/** Development-only credentials. Never use these accounts in production. */
export const DEV_PASSWORD = "MobiTed123!";

const LISTING_COUNT = Number(process.env.SEED_LISTINGS ?? 800);
const NOW = new Date();
const CURRENT_YEAR = NOW.getFullYear();
const DAY = 86_400_000;

const CATEGORY_SHARE: Record<string, number> = {
  avtomobili: 0.6,
  dzhipove: 0.11,
  busove: 0.06,
  kamioni: 0.03,
  motocikleti: 0.05,
  karavani: 0.015,
  kemperi: 0.015,
  "selskostopanska-tehnika": 0.02,
  "stroitelna-tehnika": 0.02,
  remarketa: 0.02,
  chasti: 0.025,
  "gumi-i-dzhanti": 0.025,
};

type Ids = { id: string };
type CityRow = { id: string; name: string; regionId: string; regionName: string; weight: number };
type ModelRow = InsertedModel;
type UserRow = { id: string; name: string; phone: string };
type DealerRow = { id: string; name: string; phone: string; cityId: string; focus: readonly string[]; ownerId: string };

function assertSafeEnvironment() {
  const force = process.argv.includes("--force");
  if (process.env.NODE_ENV === "production" && !force) {
    throw new Error("Refusing to seed with NODE_ENV=production. Pass --force for a disposable database.");
  }
}

async function truncateAll() {
  const tables = await db.execute<{ tablename: string }>(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE '__drizzle%'`,
  );
  const names = tables.map((row) => `"${row.tablename}"`).join(", ");
  if (names) await db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
}

const CITY_WEIGHTS: Record<string, number> = { София: 30, Пловдив: 12, Варна: 11, Бургас: 9, Русе: 5, "Стара Загора": 5, Плевен: 4 };

async function seedLocations(): Promise<CityRow[]> {
  const cities = await insertLocations();
  return cities.map((city) => ({ ...city, weight: CITY_WEIGHTS[city.name] ?? (city.isRegionCenter ? 2 : 0.6) }));
}

function randomPhone(random: Random): string {
  const prefix = random.pick(["87", "88", "89", "98"]);
  return `+359${prefix}${random.int(1000000, 9999999)}`;
}

async function seedUsers(random: Random, cities: CityRow[]) {
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const staff = [
    { email: "superadmin@mobited.local", name: "Теодор Костов", role: "SUPER_ADMIN" as const },
    { email: "admin@mobited.local", name: "Анна Петрова", role: "ADMIN" as const },
    { email: "moderator@mobited.local", name: "Стефан Илиев", role: "MODERATOR" as const },
    { email: "dealer@mobited.local", name: "Кирил Марков", role: "DEALER" as const },
    { email: "user@mobited.local", name: "Ивана Димитрова", role: "USER" as const },
  ];

  const people: { email: string; name: string; role: "USER" | "DEALER" }[] = [];
  DEALERS.slice(1).forEach((dealer) => {
    const male = random.chance(0.75);
    const last = random.pick(MALE_LAST_NAMES);
    people.push({
      email: `${dealer.slug}@mobited.local`,
      name: `${male ? random.pick(MALE_FIRST_NAMES) : random.pick(FEMALE_FIRST_NAMES)} ${male ? last : femaleLastName(last)}`,
      role: "DEALER",
    });
  });
  for (let i = 0; i < 90; i += 1) {
    const male = random.chance(0.78);
    const first = male ? random.pick(MALE_FIRST_NAMES) : random.pick(FEMALE_FIRST_NAMES);
    const lastMale = random.pick(MALE_LAST_NAMES);
    const last = male ? lastMale : femaleLastName(lastMale);
    people.push({ email: `${slugify(first)}.${slugify(last)}.${i + 1}@mobited.local`.replace(/-/g, ""), name: `${first} ${last}`, role: "USER" });
  }

  const all = [...staff, ...people];
  const createdAt = (index: number) => new Date(NOW.getTime() - (400 - (index % 380)) * DAY);
  const users = await db
    .insert(s.users)
    .values(all.map((user, index) => ({ email: user.email, name: user.name, role: user.role, emailVerified: true, createdAt: createdAt(index) })))
    .returning({ id: s.users.id, email: s.users.email, name: s.users.name, role: s.users.role });

  await db.insert(s.accounts).values(users.map((user) => ({ userId: user.id, accountId: user.id, providerId: "credential", password: passwordHash })));

  const withPhones: (UserRow & { email: string; role: string })[] = users.map((user) => ({ ...user, phone: randomPhone(random) }));
  await db.insert(s.profiles).values(
    withPhones.map((user) => ({ userId: user.id, phone: user.phone, cityId: random.weighted(cities, (city) => city.weight).id })),
  );
  return withPhones;
}

async function seedDealers(random: Random, cities: CityRow[], users: (UserRow & { email: string })[]): Promise<DealerRow[]> {
  const dealers: DealerRow[] = [];
  for (const [index, dealer] of DEALERS.entries()) {
    const owner = index === 0 ? users.find((user) => user.email === "dealer@mobited.local") : users.find((user) => user.email === `${dealer.slug}@mobited.local`);
    const city = cities.find((candidate) => candidate.name === dealer.city);
    if (!owner || !city) throw new Error(`dealer seed mismatch for ${dealer.slug}`);
    const [row] = await db
      .insert(s.dealers)
      .values({
        slug: dealer.slug,
        name: dealer.name,
        description: dealer.description,
        phone: dealer.phone,
        email: `kontakt@${dealer.slug}.example`,
        website: dealer.website ?? null,
        regionId: city.regionId,
        cityId: city.id,
        address: dealer.address,
        createdAt: new Date(NOW.getTime() - random.int(200, 900) * DAY),
      })
      .returning({ id: s.dealers.id });
    if (!row) throw new Error("dealer insert failed");
    await db.insert(s.dealerMembers).values({ dealerId: row.id, userId: owner.id, role: "OWNER" });
    await db.insert(s.dealerLocations).values({ dealerId: row.id, name: "Основен обект", address: dealer.address, cityId: city.id, phone: dealer.phone, isPrimary: true });
    await db.insert(s.dealerOpeningHours).values(
      [1, 2, 3, 4, 5, 6, 7].map((day) => ({
        dealerId: row.id,
        dayOfWeek: day,
        opensAt: day <= 5 ? "09:00" : day === 6 ? "10:00" : null,
        closesAt: day <= 5 ? "19:00" : day === 6 ? "15:00" : null,
        isClosed: day === 7,
      })),
    );
    dealers.push({ id: row.id, name: dealer.name, phone: dealer.phone, cityId: city.id, focus: dealer.focus, ownerId: owner.id });
  }
  return dealers;
}

function roundPrice(euros: number, random: Random): number {
  if (euros < 2000) return Math.max(100, Math.round(euros / 50) * 50);
  const step = euros < 20000 ? 100 : euros < 100000 ? 500 : 1000;
  let rounded = Math.max(step, Math.round(euros / step) * step);
  if (step === 100 && random.chance(0.35)) rounded -= 100;
  return Math.max(step, rounded);
}

function emissionFor(year: number): string {
  if (year >= 2015) return "euro6";
  if (year >= 2011) return "euro5";
  if (year >= 2006) return "euro4";
  if (year >= 2001) return "euro3";
  if (year >= 1997) return "euro2";
  return "euro1";
}

function vin(random: Random): string {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  return Array.from({ length: 17 }, () => chars[random.int(0, chars.length - 1)]).join("");
}

function describe(random: Random, attributeSet: string): string {
  const pools = LISTING_DESCRIPTION_SENTENCES;
  if (["car", "suv", "van", "camper"].includes(attributeSet)) {
    return [random.pick(pools.opening), ...random.sample(pools.service, random.int(1, 2)), ...random.sample(pools.extras, random.int(1, 3)), random.pick(pools.closing)]
      .filter(Boolean)
      .join(" ");
  }
  const generic = [
    "Техниката е в добро работно състояние.",
    "Редовно обслужвана, с документи за произход.",
    "Възможен оглед на място и тест.",
    "Цената е без ДДС за фирми.",
    "Доставка в цялата страна срещу заплащане.",
    "Възможен лизинг.",
  ];
  return random.sample(generic, random.int(2, 4)).join(" ");
}

type ListingDraft = typeof s.listings.$inferInsert & {
  _attributes: { key: string; valueText?: string; valueNumber?: number; valueBool?: boolean }[];
  _features: string[];
  _images: { url: string; thumbUrl: string; storagePath: string; thumbStoragePath: string; width: number; height: number; sizeBytes: number; position: number }[];
  _priceChange: { oldPriceCents: number; changedAt: Date } | null;
};

function pickFeatures(random: Random, set: AttributeSet, year: number, premium: boolean): string[] {
  if (set.featureGroups.length === 0) return [];
  const pool = FEATURES.filter((feature) => set.featureGroups.includes(feature.group));
  const base = ["abs", "airbags", "air-conditioning", "bluetooth"].filter((key) => pool.some((feature) => feature.key === key));
  const modern = year >= 2015 ? ["esp", "parking-sensors", "cruise-control", "led-lights", "isofix"] : year >= 2008 ? ["esp", "parking-sensors"] : [];
  const extraCount = premium ? random.int(8, 14) : random.int(2, 7);
  const extras = random.sample(pool.map((feature) => feature.key), extraCount);
  return [...new Set([...base, ...modern, ...extras])].filter((key) => pool.some((feature) => feature.key === key));
}

function buildVehicleListing(
  random: Random,
  category: { id: string; slug: string; name: string; attributeSet: string },
  model: ModelRow,
): Omit<ListingDraft, "sellerId" | "categoryId"> & { modelRow: ModelRow } {
  const set = getAttributeSet(category.attributeSet);
  const generation = model.generations.length > 0 && random.chance(0.9) ? random.pick(model.generations) : null;
  const [minYear, maxYear] = generation
    ? [generation.yearFrom, Math.min(generation.yearTo ?? CURRENT_YEAR, CURRENT_YEAR)]
    : (model.seed.years ?? [2006, CURRENT_YEAR]);
  const year = random.int(Math.max(minYear, 1995), Math.max(Math.min(maxYear, CURRENT_YEAR), Math.max(minYear, 1995)));
  const age = Math.max(0, CURRENT_YEAR - year);
  const isNew = age <= 1 && random.chance(0.25);
  const engine: EngineSeed | null = model.seed.engines && model.seed.engines.length > 0 ? random.pick(model.seed.engines) : null;
  const bodyChoices = model.seed.bodies.filter((body) => (set.bodyTypes ? BODY_TYPE_OPTIONS[set.bodyTypes].some((option) => option.value === body) : true));
  const bodyType = bodyChoices.length > 0 ? random.pick(bodyChoices) : (model.seed.bodies[0] ?? null);

  const yearlyKm: Record<string, [number, number]> = { truck: [70000, 130000], motorcycle: [2000, 7000], van: [15000, 35000], camper: [5000, 12000] };
  const [kmMin, kmMax] = yearlyKm[set.key] ?? [9000, 23000];
  const usesMileage = "mileage" in set.core;
  const mileageKm = usesMileage ? (isNew ? random.int(5, 90) : Math.max(500, Math.round((age + random.next() * 0.8) * random.int(kmMin, kmMax) / 100) * 100)) : null;

  const depreciation = isNew ? 1 : (age <= 10 ? Math.pow(0.87, age) : Math.pow(0.87, 10) * Math.pow(0.93, age - 10)) * (age === 0 ? 0.92 : 1);
  const mileageFactor = mileageKm ? 1 - Math.min(0.25, (mileageKm / (set.key === "truck" ? 2_000_000 : 350_000)) * 0.25) : 1;
  const condition = isNew ? "new" : random.chance(0.04) ? "damaged" : "used";
  const conditionFactor = condition === "damaged" ? 0.55 : 1;
  const priceEuros = roundPrice(model.seed.price * depreciation * mileageFactor * conditionFactor * (0.9 + random.next() * 0.2), random);

  const fuel = engine?.[1] ?? ("fuel" in set.core ? "diesel" : null);
  const gearbox = "gearbox" in set.core
    ? (fuel === "electric" || model.seed.price > 55000 ? "automatic" : set.key === "truck" ? random.pick(["automatic", "semi-automatic"]) : random.chance(Math.min(0.85, 0.12 + (year - 2005) * 0.02 + (model.seed.price > 30000 ? 0.35 : 0))) ? "automatic" : "manual")
    : null;
  const drivetrain = "drivetrain" in set.core
    ? engine?.[0].match(/xDrive|4MATIC|quattro|4Motion|4x4|AWD|AllGrip|4WD/i) || bodyType === "suv" || bodyType === "pickup"
      ? "awd"
      : model.makeName === "BMW" || model.makeName === "Mercedes-Benz" ? "rwd" : "fwd"
    : null;
  const color = random.weighted(COLOR_OPTIONS, (option) => ({ black: 5, white: 4, silver: 4, gray: 5, blue: 3, red: 2 } as Record<string, number>)[option.value] ?? 0.6).value;
  const premium = model.seed.price >= 50000;

  const attributes: ListingDraft["_attributes"] = [];
  const has = (key: string) => set.attributes.some((attribute) => attribute.key === key);
  if (has("doors")) attributes.push({ key: "doors", valueText: bodyType === "coupe" || (bodyType === "hatchback" && random.chance(0.2)) ? "2-3" : "4-5" });
  if (has("seats")) attributes.push({ key: "seats", valueNumber: bodyType === "minivan" ? 7 : set.key === "van" ? random.pick([3, 6, 9]) : set.key === "camper" ? 4 : 5 });
  if (has("euro") && fuel !== "electric") attributes.push({ key: "euro", valueText: emissionFor(year) });
  if (has("registered")) attributes.push({ key: "registered", valueBool: random.chance(0.7) });
  if (has("serviceHistory") && random.chance(0.6)) attributes.push({ key: "serviceHistory", valueBool: true });
  if (has("vin") && random.chance(0.35)) attributes.push({ key: "vin", valueText: vin(random) });
  if (has("payloadKg")) attributes.push({ key: "payloadKg", valueNumber: set.key === "truck" ? random.int(8000, 26000) : set.key === "trailer" ? random.int(1000, 30000) : random.int(900, 1600) });
  if (has("gvwKg")) attributes.push({ key: "gvwKg", valueNumber: set.key === "truck" ? random.pick([18000, 26000, 40000]) : set.key === "caravan" ? random.int(1300, 2000) : set.key === "trailer" ? random.pick([750, 1300, 3500, 39000]) : 3500 });
  if (has("axles")) attributes.push({ key: "axles", valueText: set.key === "truck" ? random.pick(["2", "3"]) : set.key === "caravan" ? (bodyType === "twin-axle" ? "2" : "1") : random.pick(["1", "2", "3"]) });
  if (has("berths")) attributes.push({ key: "berths", valueNumber: random.int(2, 6) });
  if (has("lengthCm")) attributes.push({ key: "lengthCm", valueNumber: random.int(540, 820) });
  if (has("hours")) attributes.push({ key: "hours", valueNumber: isNew ? random.int(1, 40) : age * random.int(250, 700) });
  if (has("operatingWeightKg")) attributes.push({ key: "operatingWeightKg", valueNumber: bodyType === "mini-excavator" ? random.int(1500, 3500) : random.int(8000, 24000) });

  const modification = engine?.[0] ?? "";
  const includesModel = modification.toLowerCase().startsWith(model.name.toLowerCase());
  const title = [model.makeName, includesModel ? "" : model.name, modification].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const shape = demoShapeFor(set.key, bodyType);
  const imageCount = set.key === "car" || set.key === "suv" ? 3 : 2;
  const images = Array.from({ length: imageCount }, (_, index) => {
    const url = `/media/demo/${demoImageFile(shape, color, index + 1)}`;
    return { url, thumbUrl: url, storagePath: `demo/${demoImageFile(shape, color, index + 1)}`, thumbStoragePath: `demo/${demoImageFile(shape, color, index + 1)}`, width: 800, height: 600, sizeBytes: 4000, position: index };
  });

  return {
    title,
    slug: buildListingSlug(title),
    description: describe(random, set.key),
    priceCents: priceEuros * 100,
    priceNegotiable: random.chance(0.3),
    condition,
    makeId: model.makeId,
    modelId: model.id,
    generationId: generation?.id ?? null,
    year,
    mileageKm,
    fuel: "fuel" in set.core ? fuel : null,
    gearbox,
    powerHp: "power" in set.core && engine ? engine[3] : null,
    engineCc: "engine" in set.core && engine && engine[2] > 0 ? engine[2] : null,
    drivetrain,
    bodyType,
    color: "color" in set.core || set.key === "caravan" ? color : color,
    _attributes: attributes,
    _features: pickFeatures(random, set, year, premium),
    _images: images,
    _priceChange: null,
    modelRow: model,
  };
}

const TIRE_BRANDS = ["Michelin", "Continental", "Bridgestone", "Pirelli", "Goodyear", "Hankook", "Nokian", "Dunlop"];

function buildTireListing(random: Random): Omit<ListingDraft, "sellerId" | "categoryId"> {
  const productType = random.weighted(["tires", "rims", "wheels"] as const, (value) => (value === "tires" ? 6 : 2));
  const width = random.pick([185, 195, 205, 215, 225, 235, 245, 255, 275]);
  const aspect = random.pick([40, 45, 50, 55, 60, 65]);
  const rim = random.pick([15, 16, 17, 18, 19, 20]);
  const season = random.pick(["summer", "winter", "all-season"] as const);
  const quantity = random.pick([2, 4, 4, 4]);
  const brand = random.pick(TIRE_BRANDS);
  const condition = random.chance(0.3) ? "new" : "used";
  const seasonLabel = { summer: "летни", winter: "зимни", "all-season": "всесезонни" }[season];
  const title =
    productType === "rims"
      ? `Джанти ${rim}" ${random.pick(["5x112", "5x120", "5x114.3", "5x108"])}`
      : productType === "wheels"
        ? `${quantity} бр. ${seasonLabel} гуми с джанти ${width}/${aspect} R${rim}`
        : `${quantity} бр. ${seasonLabel} гуми ${brand} ${width}/${aspect} R${rim}`;
  const attributes: ListingDraft["_attributes"] = [
    { key: "productType", valueText: productType },
    { key: "quantity", valueNumber: quantity },
    { key: "rim", valueNumber: rim },
  ];
  if (productType !== "rims") {
    attributes.push({ key: "season", valueText: season }, { key: "width", valueNumber: width }, { key: "aspect", valueNumber: aspect }, { key: "tireBrand", valueText: brand });
  }
  const priceEuros = roundPrice((productType === "rims" ? 350 : 70 * quantity) * (condition === "new" ? 1.6 : 0.8) * (rim / 16), random);
  const url = (variant: number) => `/media/demo/${demoImageFile("wheel", "black", variant)}`;
  return {
    title,
    slug: buildListingSlug(title),
    description: describe(random, "tires"),
    priceCents: priceEuros * 100,
    priceNegotiable: random.chance(0.4),
    condition,
    _attributes: attributes,
    _features: [],
    _images: [1, 2].map((variant, index) => ({ url: url(variant), thumbUrl: url(variant), storagePath: `demo/wheel-${variant}`, thumbStoragePath: `demo/wheel-${variant}`, width: 800, height: 600, sizeBytes: 4000, position: index })),
    _priceChange: null,
  };
}

function buildPartListing(random: Random, model: ModelRow): Omit<ListingDraft, "sellerId" | "categoryId"> {
  const partTypes = ATTRIBUTE_SETS.parts.attributes[0].options;
  const part = random.pick(partTypes);
  const title = `${part.label} за ${model.makeName} ${model.name}`;
  const condition = random.chance(0.25) ? "new" : "used";
  const base: Record<string, number> = { engine: 1800, gearbox: 900, body: 250, suspension: 180, brakes: 120, electrical: 150, interior: 200, lighting: 220, exhaust: 160, cooling: 140, other: 90 };
  const priceEuros = roundPrice((base[part.value] ?? 150) * (0.6 + random.next()), random);
  const color = random.pick(["red", "blue", "gray", "black"]);
  const url = (variant: number) => `/media/demo/${demoImageFile("part", color, variant)}`;
  return {
    title,
    slug: buildListingSlug(title),
    description: describe(random, "parts"),
    priceCents: priceEuros * 100,
    priceNegotiable: random.chance(0.5),
    condition,
    makeId: model.makeId,
    modelId: model.id,
    _attributes: [{ key: "partType", valueText: part.value }, ...(random.chance(0.4) ? [{ key: "partNumber", valueText: `${random.int(10, 99)}${random.int(100, 999)}${random.int(100, 999)}` }] : [])],
    _features: [],
    _images: [1, 2].map((variant, index) => ({ url: url(variant), thumbUrl: url(variant), storagePath: `demo/part-${variant}`, thumbStoragePath: `demo/part-${variant}`, width: 800, height: 600, sizeBytes: 4000, position: index })),
    _priceChange: null,
  };
}

async function seedListings(
  random: Random,
  context: {
    categories: Awaited<ReturnType<typeof insertCategories>>;
    models: ModelRow[];
    cities: CityRow[];
    users: (UserRow & { email: string; role: string })[];
    dealers: DealerRow[];
  },
) {
  const { categories, models, cities, users, dealers } = context;
  const privateSellers = users.filter((user) => user.role === "USER");
  const devUser = users.find((user) => user.email === "user@mobited.local");
  if (!devUser) throw new Error("dev user missing");
  const cityById = new Map(cities.map((city) => [city.id, city]));
  const drafts: (ListingDraft & { _category: (typeof categories)[number]; _dealerName: string | null; _modelRow?: ModelRow })[] = [];

  const categoryPlan: (typeof categories)[number][] = [];
  for (const category of categories) {
    const count = Math.max(4, Math.round(LISTING_COUNT * (CATEGORY_SHARE[category.slug] ?? 0.02)));
    for (let i = 0; i < count; i += 1) categoryPlan.push(category);
  }

  for (const [index, category] of categoryPlan.entries()) {
    const set = getAttributeSet(category.attributeSet);
    const vehicleType = category.vehicleType;
    let candidates = vehicleType ? models.filter((model) => model.vehicleType === vehicleType) : [];
    if (set.bodyTypes && vehicleType === "car") {
      const allowed = BODY_TYPE_OPTIONS[set.bodyTypes].map((option) => option.value as string);
      const filtered = candidates.filter((model) => model.seed.bodies.some((body) => allowed.includes(body)));
      if (set.key === "suv") candidates = filtered;
      else candidates = candidates.filter((model) => model.seed.bodies.some((body) => !["suv", "pickup", "crossover"].includes(body)) || random.chance(0.15));
    }

    const dealer = random.chance(category.slug === "kamioni" || category.slug === "remarketa" || category.slug.includes("tehnika") ? 0.7 : 0.42)
      ? (() => {
          const matching = dealers.filter((candidate) => candidates.some((model) => candidate.focus.includes(model.makeName)));
          return matching.length > 0 ? random.pick(matching) : null;
        })()
      : null;
    if (dealer) {
      const focused = candidates.filter((model) => dealer.focus.includes(model.makeName));
      if (focused.length > 0) candidates = focused;
    }

    let draft: Omit<ListingDraft, "sellerId" | "categoryId"> & { modelRow?: ModelRow };
    if (set.key === "tires") draft = buildTireListing(random);
    else if (set.key === "parts") draft = buildPartListing(random, random.pick(models.filter((model) => model.vehicleType === "car")));
    else draft = buildVehicleListing(random, category, random.weighted(candidates, (model) => model.seed.popularity ?? 1));

    const seller = dealer ? { id: dealer.ownerId, name: dealer.name, phone: dealer.phone } : index % 23 === 0 ? devUser : random.pick(privateSellers);
    const city = dealer ? cityById.get(dealer.cityId) : random.weighted(cities, (candidate) => candidate.weight);
    if (!city) throw new Error("city missing");

    const ageDays = random.int(0, 55);
    const publishedAt = new Date(NOW.getTime() - ageDays * DAY - random.int(0, 86_000) * 1000);
    const statusRoll = random.next();
    const status: (typeof s.listings.$inferInsert)["status"] =
      statusRoll < 0.9 ? "ACTIVE" : statusRoll < 0.925 ? "SOLD" : statusRoll < 0.945 ? "PAUSED" : statusRoll < 0.965 ? "PENDING" : statusRoll < 0.975 ? "REJECTED" : statusRoll < 0.99 ? "EXPIRED" : "DRAFT";
    const expiresAt = status === "EXPIRED" ? new Date(NOW.getTime() - random.int(1, 10) * DAY) : new Date(publishedAt.getTime() + DEFAULT_SETTINGS.listingDurationDays * DAY);

    let priceChange: ListingDraft["_priceChange"] = null;
    let previousPriceCents: number | null = null;
    if (status === "ACTIVE" && draft.priceCents && random.chance(0.16) && ageDays > 3) {
      const oldPrice = Math.round((draft.priceCents / 100) * (1.04 + random.next() * 0.08) / 100) * 100 * 100;
      priceChange = { oldPriceCents: oldPrice, changedAt: new Date(publishedAt.getTime() + random.int(1, ageDays) * DAY) };
      previousPriceCents = oldPrice;
    }

    drafts.push({
      ...draft,
      categoryId: category.id,
      sellerId: seller.id,
      dealerId: dealer?.id ?? null,
      status,
      regionId: city.regionId,
      cityId: city.id,
      contactName: seller.name,
      contactPhone: seller.phone,
      publishedAt: status === "DRAFT" ? null : publishedAt,
      expiresAt: status === "DRAFT" ? null : expiresAt,
      soldAt: status === "SOLD" ? new Date(NOW.getTime() - random.int(0, 5) * DAY) : null,
      sortDate: publishedAt,
      rejectionReason: status === "REJECTED" ? "Снимките не съответстват на описания автомобил." : null,
      viewCount: status === "DRAFT" ? 0 : Math.round((ageDays + 1) * random.int(4, 40) * (draft.priceCents && draft.priceCents < 1_500_000 ? 1.3 : 1)),
      previousPriceCents,
      createdAt: new Date(publishedAt.getTime() - random.int(5, 120) * 60_000),
      draftStep: status === "DRAFT" ? 6 : 11,
      _priceChange: priceChange,
      _category: category,
      _dealerName: dealer?.name ?? null,
      _modelRow: "modelRow" in draft ? draft.modelRow : undefined,
    });
  }

  const inserted: { id: string; status: string; sellerId: string; dealerId: string | null; categorySlug: string; priceCents: number | null; title: string }[] = [];
  for (const batch of chunk(drafts, 150)) {
    const rows = await db
      .insert(s.listings)
      .values(
        batch.map((draft) => {
          const city = draft.cityId ? cityById.get(draft.cityId) : undefined;
          const model = draft._modelRow;
          const { _attributes, _features, _images, _priceChange, _category, _dealerName, _modelRow, ...listing } = draft;
          void _attributes; void _features; void _images; void _priceChange; void _modelRow;
          const cover = draft._images[0];
          return {
            ...listing,
            coverImageUrl: cover?.thumbUrl ?? null,
            imageCount: draft._images.length,
            searchDocument: buildSearchDocument({
              title: listing.title ?? "",
              categoryName: _category.name,
              makeName: model?.makeName,
              modelName: model?.name,
              cityName: city?.name,
              regionName: city?.regionName,
              dealerName: _dealerName,
              extra: [optionLabel(BODY_TYPE_OPTIONS.car, listing.bodyType)],
            }),
          };
        }),
      )
      .returning({ id: s.listings.id, status: s.listings.status, sellerId: s.listings.sellerId, dealerId: s.listings.dealerId, priceCents: s.listings.priceCents, title: s.listings.title });
    rows.forEach((row, index) => {
      const draft = batch[index];
      if (!draft) return;
      inserted.push({ ...row, categorySlug: draft._category.slug });
      (draft as { _id?: string })._id = row.id;
    });
  }

  const attributeRows = drafts.flatMap((draft) => draft._attributes.map((attribute) => ({ listingId: (draft as { _id?: string })._id as string, key: attribute.key, valueText: attribute.valueText ?? null, valueNumber: attribute.valueNumber ?? null, valueBool: attribute.valueBool ?? null })));
  for (const batch of chunk(attributeRows, 1000)) await db.insert(s.listingAttributes).values(batch);
  const featureRows = drafts.flatMap((draft) => draft._features.map((featureKey) => ({ listingId: (draft as { _id?: string })._id as string, featureKey })));
  for (const batch of chunk(featureRows, 2000)) await db.insert(s.listingFeatures).values(batch);
  const imageRows = drafts.flatMap((draft) => draft._images.map((image) => ({ ...image, listingId: (draft as { _id?: string })._id as string })));
  for (const batch of chunk(imageRows, 1000)) await db.insert(s.listingImages).values(batch);
  const priceRows = drafts
    .filter((draft) => draft._priceChange && draft.priceCents)
    .map((draft) => ({ listingId: (draft as { _id?: string })._id as string, oldPriceCents: draft._priceChange!.oldPriceCents, newPriceCents: draft.priceCents!, changedById: draft.sellerId, changedAt: draft._priceChange!.changedAt }));
  if (priceRows.length > 0) await db.insert(s.listingPriceHistory).values(priceRows);

  return inserted;
}

async function seedEngagement(
  random: Random,
  listings: Awaited<ReturnType<typeof seedListings>>,
  users: (UserRow & { email: string; role: string })[],
) {
  const active = listings.filter((listing) => listing.status === "ACTIVE");
  const buyers = users.filter((user) => user.role === "USER");
  const devUser = users.find((user) => user.email === "user@mobited.local")!;
  const dealerUser = users.find((user) => user.email === "dealer@mobited.local")!;
  const admin = users.find((user) => user.email === "admin@mobited.local")!;
  const moderator = users.find((user) => user.email === "moderator@mobited.local")!;

  const favoriteRows = new Map<string, { userId: string; listingId: string }>();
  for (const listing of random.sample(active, 8)) favoriteRows.set(`${devUser.id}:${listing.id}`, { userId: devUser.id, listingId: listing.id });
  for (let i = 0; i < 900; i += 1) {
    const user = random.pick(buyers);
    const listing = random.pick(active);
    if (listing.sellerId !== user.id) favoriteRows.set(`${user.id}:${listing.id}`, { userId: user.id, listingId: listing.id });
  }
  for (const batch of chunk([...favoriteRows.values()], 1000)) await db.insert(s.favorites).values(batch);
  await db.execute(sql`UPDATE listings SET favorite_count = sub.count FROM (SELECT listing_id, count(*)::int AS count FROM favorites GROUP BY listing_id) sub WHERE listings.id = sub.listing_id`);

  await db.insert(s.recentlyViewed).values(random.sample(active, 6).map((listing, index) => ({ userId: devUser.id, listingId: listing.id, viewedAt: new Date(NOW.getTime() - index * 3_600_000) })));

  await db.insert(s.savedSearches).values([
    { userId: devUser.id, name: "BMW 3 Series до 25 000 €", categorySlug: "avtomobili", filters: { make: "bmw", model: "3-series", priceTo: "25000" } },
    { userId: devUser.id, name: "Дизелови комбита след 2016", categorySlug: "avtomobili", filters: { fuel: "diesel", body: "wagon", yearFrom: "2016" } },
    { userId: devUser.id, name: "Джипове в Пловдив", categorySlug: "dzhipove", filters: { region: "plovdiv" }, isActive: false },
  ]);

  const dealerListings = active.filter((listing) => listing.dealerId && listing.sellerId === dealerUser.id);
  const conversationTargets = [...random.sample(dealerListings, 3).map((listing) => ({ listing, buyer: devUser })), ...random.sample(active, 25).map((listing) => ({ listing, buyer: random.pick(buyers) }))];
  const openers = ["Здравейте, автомобилът наличен ли е още?", "Здравейте, възможен ли е оглед в събота?", "Каква е последната цена?", "Има ли сервизна история?", "Възможен ли е лизинг?"];
  const replies = ["Здравейте, да, наличен е.", "Да, заповядайте в събота след 10 ч.", "При оглед ще се разберем за цената.", "Да, има пълна сервизна история.", "Да, работим с няколко лизингови компании."];
  const seen = new Set<string>();
  for (const { listing, buyer } of conversationTargets) {
    if (listing.sellerId === buyer.id || seen.has(`${listing.id}:${buyer.id}`)) continue;
    seen.add(`${listing.id}:${buyer.id}`);
    const startedAt = new Date(NOW.getTime() - random.int(1, 20) * DAY);
    const replied = random.chance(0.7);
    const lastAt = replied ? new Date(startedAt.getTime() + random.int(10, 600) * 60_000) : startedAt;
    const [conversation] = await db.insert(s.conversations).values({ listingId: listing.id, buyerId: buyer.id, sellerId: listing.sellerId, createdAt: startedAt, lastMessageAt: lastAt }).returning({ id: s.conversations.id });
    if (!conversation) continue;
    const index = random.int(0, openers.length - 1);
    await db.insert(s.messages).values([
      { conversationId: conversation.id, senderId: buyer.id, body: openers[index]!, createdAt: startedAt },
      ...(replied ? [{ conversationId: conversation.id, senderId: listing.sellerId, body: replies[index]!, createdAt: lastAt }] : []),
    ]);
    await db.insert(s.conversationParticipants).values([
      { conversationId: conversation.id, userId: buyer.id, lastReadAt: replied && random.chance(0.5) ? null : lastAt },
      { conversationId: conversation.id, userId: listing.sellerId, lastReadAt: replied ? lastAt : null },
    ]);
  }
  await db.execute(sql`UPDATE listings SET inquiry_count = sub.count FROM (SELECT listing_id, count(*)::int AS count FROM conversations GROUP BY listing_id) sub WHERE listings.id = sub.listing_id`);

  const promotionTargets = random.sample(active, 110);
  for (const [index, listing] of promotionTargets.entries()) {
    const type = index < 24 ? "VIP" : index < 62 ? "TOP" : index < 92 ? "HIGHLIGHT" : "REFRESH";
    const product = PROMOTION_PRODUCTS.find((candidate) => candidate.type === type)!;
    const startsAt = new Date(NOW.getTime() - random.int(0, Math.max(0, product.durationDays - 1)) * DAY - random.int(0, 20) * 3_600_000);
    const endsAt = new Date(startsAt.getTime() + product.durationDays * DAY);
    const [payment] = await db
      .insert(s.payments)
      .values({ userId: listing.sellerId, listingId: listing.id, promotionType: type, amountCents: product.priceCents, currency: "EUR", status: "SUCCEEDED", provider: "DEMO", providerReference: crypto.randomUUID(), createdAt: startsAt })
      .returning({ id: s.payments.id });
    await db.insert(s.promotions).values({ listingId: listing.id, paymentId: payment?.id ?? null, type, startsAt, endsAt: type === "REFRESH" ? startsAt : endsAt, createdById: listing.sellerId, createdAt: startsAt });
    const patch =
      type === "VIP" ? { vipUntil: endsAt } : type === "TOP" ? { topUntil: endsAt } : type === "HIGHLIGHT" ? { highlightUntil: endsAt } : { sortDate: startsAt };
    await db.update(s.listings).set(patch).where(eq(s.listings.id, listing.id));
  }

  const reasons = ["FAKE", "INCORRECT_INFO", "DUPLICATE", "SUSPICIOUS_SELLER", "SOLD", "OTHER"] as const;
  const details: Record<(typeof reasons)[number], string> = {
    FAKE: "Същите снимки са публикувани с друга цена в друг град.",
    INCORRECT_INFO: "Пробегът в описанието не съвпада с този в обявата.",
    DUPLICATE: "Обявата е публикувана два пъти.",
    SUSPICIOUS_SELLER: "Продавачът иска капаро преди оглед.",
    SOLD: "Обадих се и ми казаха, че колата е продадена.",
    OTHER: "Телефонът за контакт не отговаря.",
  };
  for (const listing of random.sample(active, 14)) {
    const reason = random.pick(reasons);
    const reporter = random.pick(buyers.filter((buyer) => buyer.id !== listing.sellerId));
    await db.insert(s.listingReports).values({ listingId: listing.id, reporterId: reporter.id, reason, details: details[reason], createdAt: new Date(NOW.getTime() - random.int(0, 6) * DAY) });
  }

  const rejected = listings.filter((listing) => listing.status === "REJECTED");
  for (const listing of rejected) {
    await db.insert(s.moderationActions).values({ listingId: listing.id, moderatorId: moderator.id, action: "REJECT", reason: "Снимките не съответстват на описания автомобил.", previousStatus: "PENDING", newStatus: "REJECTED" });
    await db.insert(s.auditLogs).values({ actorId: moderator.id, action: "listing.reject", targetType: "listing", targetId: listing.id, metadata: { previousStatus: "PENDING" } });
  }
  await db.insert(s.auditLogs).values({ actorId: admin.id, action: "user.role_change", targetType: "user", targetId: moderator.id, metadata: { from: "USER", to: "MODERATOR" } });

  const devActive = listings.filter((listing) => listing.sellerId === devUser.id && listing.status === "ACTIVE");
  await db.insert(s.notifications).values([
    { userId: devUser.id, type: "LISTING_APPROVED", title: "Обявата ти е одобрена", body: devActive[0]?.title ?? "", link: "/profil/obiavi", createdAt: new Date(NOW.getTime() - 2 * DAY) },
    { userId: dealerUser.id, type: "MESSAGE_RECEIVED", title: "Ново съобщение", body: "Имаш ново запитване за обява.", link: "/suobshteniya", createdAt: new Date(NOW.getTime() - DAY) },
  ]);
}

async function main() {
  assertSafeEnvironment();
  const started = Date.now();
  const random = createRandom(20261002);
  await truncateAll();
  const cities = await seedLocations();
  const categories = await insertCategories();
  const models = await insertTaxonomy();
  const users = await seedUsers(random, cities);
  const dealers = await seedDealers(random, cities, users);
  const listings = await seedListings(random, { categories, models, cities, users, dealers });
  await seedEngagement(random, listings, users);
  await insertMissingSettings();
  // Every id changes on reseed, so catalog data cached by an earlier build or dev server is stale.
  rmSync(".next/cache/fetch-cache", { recursive: true, force: true });
  console.log(`Seeded ${listings.length} listings, ${users.length} users, ${dealers.length} dealers in ${((Date.now() - started) / 1000).toFixed(1)} s`);
  console.log(`Development accounts (password "${DEV_PASSWORD}"): superadmin@, admin@, moderator@, dealer@, user@mobited.local`);
  console.log("Restart the app server if it is running.");
}

main()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());

export type { Ids };
