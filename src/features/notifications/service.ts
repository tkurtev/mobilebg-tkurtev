import "server-only";
import { db, type DbOrTx } from "@/db/client";
import { notifications } from "@/db/schema";

type NotificationType = (typeof notifications.$inferInsert)["type"];

export async function notify(
  input: { userId: string; type: NotificationType; title: string; body?: string; link?: string },
  tx: DbOrTx = db,
): Promise<void> {
  await tx.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    link: input.link ?? null,
  });
}
