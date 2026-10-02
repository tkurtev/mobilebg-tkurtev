import { slugify } from "@/lib/slug";

export function buildListingSlug(title: string): string {
  return slugify(title, 70) || "obiava";
}

/** "/avtomobili/10023451-bmw-320d-xdrive". The number is the identity; the slug is cosmetic. */
export function listingPath(listing: { categorySlug: string; number: number; slug: string }): string {
  return `/${listing.categorySlug}/${listing.number}${listing.slug ? `-${listing.slug}` : ""}`;
}

export function parseListingParam(param: string): number | null {
  const match = /^(\d{6,15})(?:-[a-z0-9-]*)?$/.exec(param);
  if (!match?.[1]) return null;
  const value = Number(match[1]);
  return Number.isSafeInteger(value) ? value : null;
}
