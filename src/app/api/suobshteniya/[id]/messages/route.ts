import { z } from "zod";
import { getMessagesAfter } from "@/features/messages/queries";
import { getCurrentUser } from "@/server/auth/session";
import { consumeRateLimit, RATE_LIMITS } from "@/server/rate-limit";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Polled by the open thread. Participation is re-checked on every request. */
export async function GET(request: Request, context: RouteContext<"/api/suobshteniya/[id]/messages">) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Влез в профила си." }, { status: 401, headers: NO_STORE });
  const limit = await consumeRateLimit(`messagePoll:${user.id}`, RATE_LIMITS.messagePoll);
  if (!limit.allowed) return Response.json({ messages: [] }, { status: 429, headers: { ...NO_STORE, "Retry-After": String(limit.retryAfter ?? 60) } });
  const { id } = await context.params;
  const after = new URL(request.url).searchParams.get("after");
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Не е намерено." }, { status: 404, headers: NO_STORE });
  if (after !== null && !z.uuid().safeParse(after).success) return Response.json({ error: "Невалидна заявка." }, { status: 400, headers: NO_STORE });
  const messages = await getMessagesAfter(user.id, id, after);
  if (!messages) return Response.json({ error: "Не е намерено." }, { status: 404, headers: NO_STORE });
  return Response.json({ messages }, { headers: NO_STORE });
}
