import { z } from "zod";
import { getCardsByIds } from "@/features/listings/queries";

/** Card data for ids kept in the browser (anonymous favorites and recently viewed). */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const parsed = z.array(z.uuid()).max(60).safeParse(raw.split(",").filter(Boolean));
  if (!parsed.success) return Response.json([], { status: 400 });
  const cards = await getCardsByIds(parsed.data);
  return Response.json(cards, { headers: { "Cache-Control": "private, max-age=30" } });
}
