"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationParticipants } from "@/db/schema";
import type { ActionResult } from "@/lib/action-result";
import { parseInput, runAction } from "@/server/action";
import { requireActionUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";

/** Archiving is per participant; sendMessage clears archivedAt for both sides when a new message arrives. */
export async function setConversationArchivedAction(input: { conversationId: string; archived: boolean }): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireActionUser();
    const data = parseInput(z.object({ conversationId: z.uuid(), archived: z.boolean() }), input);
    const updated = await db
      .update(conversationParticipants)
      .set({ archivedAt: data.archived ? new Date() : null })
      .where(and(eq(conversationParticipants.conversationId, data.conversationId), eq(conversationParticipants.userId, user.id)))
      .returning({ conversationId: conversationParticipants.conversationId });
    if (updated.length === 0) throw new AppError("NOT_FOUND", "Разговорът не е намерен.");
    revalidatePath("/suobshteniya", "layout");
  });
}
