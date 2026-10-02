import { z } from "zod";
import { listConversations } from "@/features/messages/queries";
import { getCurrentUser } from "@/server/auth/session";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** Next page of the conversation list ("Покажи още"). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Влез в профила си." }, { status: 401, headers: NO_STORE });
  const cursor = z.uuid().safeParse(new URL(request.url).searchParams.get("cursor"));
  if (!cursor.success) return Response.json({ error: "Невалидна заявка." }, { status: 400, headers: NO_STORE });
  return Response.json(await listConversations(user.id, cursor.data), { headers: NO_STORE });
}
