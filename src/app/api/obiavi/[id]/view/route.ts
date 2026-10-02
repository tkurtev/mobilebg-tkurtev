import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { listings } from "@/db/schema";
import { recordListingView } from "@/features/listings/views";
import { recordRecentlyViewed } from "@/features/recently-viewed/service";
import { isPubliclyVisible } from "@/server/auth/policies";
import { getCurrentUser } from "@/server/auth/session";
import { clientIpFromHeaders, isSameOrigin } from "@/server/request";

export async function POST(request: Request, context: RouteContext<"/api/obiavi/[id]/view">) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return new Response(null, { status: 404 });
  const [listing] = await db
    .select({ id: listings.id, sellerId: listings.sellerId, status: listings.status, expiresAt: listings.expiresAt, deletedAt: listings.deletedAt })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (!listing || !isPubliclyVisible(listing)) return new Response(null, { status: 204 });
  const user = await getCurrentUser();
  await recordListingView({
    listingId: listing.id,
    sellerId: listing.sellerId,
    userId: user?.id ?? null,
    ip: clientIpFromHeaders(request.headers),
    userAgent: request.headers.get("user-agent") ?? "",
  });
  if (user) await recordRecentlyViewed(user.id, listing.id);
  return new Response(null, { status: 204 });
}
