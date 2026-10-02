import "server-only";
import { db, type DbOrTx } from "@/db/client";
import { auditLogs, type AuditMetadata } from "@/db/schema";

export type AuditAction =
  | "user.role_change"
  | "user.suspend"
  | "user.unsuspend"
  | "user.delete"
  | "listing.approve"
  | "listing.reject"
  | "listing.pause"
  | "listing.restore"
  | "listing.archive"
  | "report.dismiss"
  | "report.resolve"
  | "dealer.create"
  | "dealer.update"
  | "dealer.suspend"
  | "dealer.restore"
  | "dealer.member_add"
  | "dealer.member_remove"
  | "category.create"
  | "category.update"
  | "taxonomy.make_create"
  | "taxonomy.make_update"
  | "taxonomy.model_create"
  | "taxonomy.model_update"
  | "taxonomy.generation_create"
  | "taxonomy.generation_update"
  | "taxonomy.generation_delete"
  | "settings.update";

/** Metadata must never contain secrets, passwords, tokens or card data. */
export async function recordAudit(
  entry: { actorId: string | null; action: AuditAction; targetType: string; targetId: string; metadata?: AuditMetadata },
  tx: DbOrTx = db,
): Promise<void> {
  await tx.insert(auditLogs).values({
    actorId: entry.actorId,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata: entry.metadata ?? {},
  });
}
