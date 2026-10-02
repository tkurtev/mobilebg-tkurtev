import { transliterate } from "@/lib/slug";

type SearchDocumentInput = {
  title: string;
  categoryName?: string | null;
  makeName?: string | null;
  modelName?: string | null;
  generationName?: string | null;
  cityName?: string | null;
  regionName?: string | null;
  dealerName?: string | null;
  extra?: (string | null | undefined)[];
};

/**
 * Text indexed by the listing's tsvector and trigram indexes. Cyrillic parts are also
 * stored transliterated so "sofia" finds "София" and "беларус" finds "Belarus".
 */
export function buildSearchDocument(input: SearchDocumentInput): string {
  const parts = [
    input.title,
    input.categoryName,
    input.makeName,
    input.modelName,
    input.generationName,
    input.cityName,
    input.regionName,
    input.dealerName,
    ...(input.extra ?? []),
  ]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.trim());
  const base = parts.join(" ");
  const latin = transliterate(base);
  const combined = latin === base.toLowerCase() ? base : `${base} ${latin}`;
  return combined.replace(/\s+/g, " ").toLowerCase().slice(0, 2000);
}

/** Converts free text into a prefix tsquery string: "bmw 320" -> "bmw:* & 320:*". */
export function toPrefixTsQuery(query: string): string | null {
  const tokens = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 0)
    .slice(0, 8)
    .map((token) => `${token.replace(/[^\p{L}\p{N}]/gu, "")}:*`)
    .filter((token) => token.length > 2);
  return tokens.length > 0 ? tokens.join(" & ") : null;
}
