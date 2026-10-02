"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { messageBodySchema } from "./schemas";
import { markConversationRead, sendMessage, startConversation } from "./service";

export async function startConversationAction(input: { listingId: string; body: string }): Promise<ActionResult<{ conversationId: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    if (!user.emailVerified) throw new AppError("FORBIDDEN", "Потвърди имейла си, за да изпращаш съобщения.");
    const data = parseInput(z.object({ listingId: z.uuid(), body: messageBodySchema }), input);
    const result = await startConversation(user.id, data.listingId, data.body);
    revalidatePath("/suobshteniya");
    return result;
  });
}

export async function sendMessageAction(input: { conversationId: string; body: string }): Promise<ActionResult<{ messageId: string }>> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(z.object({ conversationId: z.uuid(), body: messageBodySchema }), input);
    const result = await sendMessage(user.id, data.conversationId, data.body);
    revalidatePath(`/suobshteniya/${data.conversationId}`);
    return result;
  });
}

export async function markConversationReadAction(conversationId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    await markConversationRead(user.id, parseInput(z.uuid(), conversationId));
  });
}
