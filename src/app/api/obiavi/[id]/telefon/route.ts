import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { listings } from "@/db/schema";
import { formatBgPhone } from "@/lib/phone";
import { isPubliclyVisible } from "@/server/auth/policies";
import { consumeRateLimit, RATE_LIMITS } from "@/server/rate-limit";
import { clientIpFromHeaders, isSameOrigin } from "@/server/request";

/** Phone numbers are revealed on request to make bulk scraping of seller contacts harder. */
export async function POST(request: Request, context: RouteContext<"/api/obiavi/[id]/telefon">) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Не е намерено." }, { status: 404 });
  const limit = await consumeRateLimit(`phoneReveal:${clientIpFromHeaders(request.headers)}`, RATE_LIMITS.phoneReveal);
  if (!limit.allowed) return Response.json({ error: "Твърде много заявки. Опитай по-късно." }, { status: 429 });
  const [listing] = await db
    .select({ phone: listings.contactPhone, status: listings.status, expiresAt: listings.expiresAt, deletedAt: listings.deletedAt })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!listing?.phone || !isPubliclyVisible(listing)) return Response.json({ error: "Няма телефон." }, { status: 404 });
  return Response.json({ display: formatBgPhone(listing.phone), tel: listing.phone }, { headers: { "Cache-Control": "private, no-store" } });
}
