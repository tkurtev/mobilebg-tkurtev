import { getAttributeSet } from "@/config/attribute-sets";
import { getCategoryBySlug } from "@/features/catalog/queries";
import { parseSearchParams } from "@/features/search/params";
import { countListings } from "@/features/search/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = await getCategoryBySlug(url.searchParams.get("category") ?? "");
  if (!category) return Response.json({ count: 0 }, { status: 404 });
  const raw: Record<string, string> = Object.fromEntries(url.searchParams);
  const { filters } = parseSearchParams(raw, getAttributeSet(category.attributeSet));
  const count = await countListings(category, filters);
  return Response.json({ count }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
}
