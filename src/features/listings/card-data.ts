import { findAttribute, getAttributeSet } from "@/config/attribute-sets";
import { bodyTypeLabel, FUEL_OPTIONS, GEARBOX_OPTIONS, optionLabel } from "@/config/options";
import { formatEngine, formatMileage, formatNumber, formatPower } from "@/lib/format";
import { listingPath } from "./paths";

export type ListingCardData = {
  id: string;
  number: number;
  href: string;
  title: string;
  priceCents: number | null;
  previousPriceCents: number | null;
  priceNegotiable: boolean;
  coverImageUrl: string | null;
  imageCount: number;
  specs: string[];
  location: string | null;
  sellerType: "dealer" | "private";
  dealerName: string | null;
  publishedAt: string | null;
  promotion: "VIP" | "TOP" | null;
  highlighted: boolean;
  status: string;
};

export type CardSourceRow = {
  id: string;
  number: number;
  slug: string;
  title: string;
  status: string;
  priceCents: number | null;
  previousPriceCents: number | null;
  priceNegotiable: boolean;
  coverImageUrl: string | null;
  imageCount: number;
  year: number | null;
  mileageKm: number | null;
  fuel: string | null;
  gearbox: string | null;
  powerHp: number | null;
  engineCc: number | null;
  bodyType: string | null;
  categorySlug: string;
  attributeSet: string;
  cityName: string | null;
  dealerName: string | null;
  dealerId: string | null;
  publishedAt: Date | null;
  sortDate: Date;
  vipUntil: Date | null;
  topUntil: Date | null;
  highlightUntil: Date | null;
};

export type AttributeValueRow = { key: string; valueText: string | null; valueNumber: number | null; valueBool: boolean | null };

function attributeSpec(attributeSetKey: string, row: AttributeValueRow): string | null {
  const definition = findAttribute(getAttributeSet(attributeSetKey), row.key);
  if (!definition) return null;
  if (definition.type === "select") return optionLabel(definition.options, row.valueText);
  if (definition.type === "number" && row.valueNumber !== null) {
    return definition.unit ? `${formatNumber(row.valueNumber)} ${definition.unit}` : `${definition.label}: ${formatNumber(row.valueNumber)}`;
  }
  if (definition.type === "text" && row.valueText && definition.key !== "vin") return row.valueText;
  return null;
}

const CARD_ATTRIBUTE_KEYS: Record<string, string[]> = {
  tires: ["productType", "season", "quantity"],
  parts: ["partType"],
  agri: ["hours"],
  construction: ["hours"],
  caravan: ["berths", "lengthCm"],
  camper: ["berths"],
  trailer: ["gvwKg", "axles"],
  truck: ["axles"],
};

export function buildCardSpecs(row: CardSourceRow, attributes: AttributeValueRow[]): string[] {
  const specs: string[] = [];
  if (row.year) specs.push(String(row.year));
  if (row.mileageKm !== null && row.mileageKm !== undefined) specs.push(formatMileage(row.mileageKm));
  const fuel = optionLabel(FUEL_OPTIONS, row.fuel);
  if (fuel) specs.push(fuel);
  const gearbox = optionLabel(GEARBOX_OPTIONS, row.gearbox);
  if (gearbox) specs.push(gearbox);
  if (row.powerHp) specs.push(formatPower(row.powerHp));
  else if (row.engineCc && row.attributeSet === "motorcycle") specs.push(formatEngine(row.engineCc));
  if (["agri", "construction", "trailer", "caravan"].includes(row.attributeSet)) {
    const body = bodyTypeLabel(row.bodyType);
    if (body) specs.push(body);
  }
  for (const key of CARD_ATTRIBUTE_KEYS[row.attributeSet] ?? []) {
    const attribute = attributes.find((candidate) => candidate.key === key);
    const spec = attribute ? attributeSpec(row.attributeSet, attribute) : null;
    if (spec) specs.push(key === "quantity" ? `${attribute?.valueNumber} бр.` : spec);
  }
  if (row.attributeSet === "tires") {
    const width = attributes.find((a) => a.key === "width")?.valueNumber;
    const aspect = attributes.find((a) => a.key === "aspect")?.valueNumber;
    const rim = attributes.find((a) => a.key === "rim")?.valueNumber;
    if (width && aspect && rim) specs.push(`${width}/${aspect} R${rim}`);
    else if (rim) specs.push(`${rim}"`);
  }
  return specs;
}

export function toListingCard(row: CardSourceRow, attributes: AttributeValueRow[], now = new Date()): ListingCardData {
  const promotion = row.vipUntil && row.vipUntil > now ? "VIP" : row.topUntil && row.topUntil > now ? "TOP" : null;
  return {
    id: row.id,
    number: row.number,
    href: listingPath({ categorySlug: row.categorySlug, number: row.number, slug: row.slug }),
    title: row.title,
    priceCents: row.priceCents,
    previousPriceCents: row.previousPriceCents && row.priceCents && row.previousPriceCents > row.priceCents ? row.previousPriceCents : null,
    priceNegotiable: row.priceNegotiable,
    coverImageUrl: row.coverImageUrl,
    imageCount: row.imageCount,
    specs: buildCardSpecs(row, attributes),
    location: row.cityName,
    sellerType: row.dealerId ? "dealer" : "private",
    dealerName: row.dealerName,
    publishedAt: (row.publishedAt ?? row.sortDate)?.toISOString() ?? null,
    promotion,
    highlighted: Boolean(row.highlightUntil && row.highlightUntil > now),
    status: row.status,
  };
}
