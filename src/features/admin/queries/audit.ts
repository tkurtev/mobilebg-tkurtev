import "server-only";
import { and, asc, count, desc, eq, ilike, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, users } from "@/db/schema";
import { ADMIN_PAGE_SIZE, likePattern } from "../params";

export type AuditFilters = { action?: string; actorEmail?: string; targetType?: string; targetId?: string; page: number };

export async function getAuditFilterOptions() {
  const [actions, targetTypes] = await Promise.all([
    db.selectDistinct({ value: auditLogs.action }).from(auditLogs).orderBy(asc(auditLogs.action)),
    db.selectDistinct({ value: auditLogs.targetType }).from(auditLogs).orderBy(asc(auditLogs.targetType)),
  ]);
  return { actions: actions.map((row) => row.value), targetTypes: targetTypes.map((row) => row.value) };
}

export async function searchAudit(filters: AuditFilters) {
  const conditions: SQL[] = [];
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.targetType) conditions.push(eq(auditLogs.targetType, filters.targetType));
  if (filters.targetId) conditions.push(eq(auditLogs.targetId, filters.targetId));
  if (filters.actorEmail) conditions.push(ilike(users.email, likePattern(filters.actorEmail)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, [total]] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        targetType: auditLogs.targetType,
        targetId: auditLogs.targetId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorId: auditLogs.actorId,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(ADMIN_PAGE_SIZE)
      .offset((filters.page - 1) * ADMIN_PAGE_SIZE),
    db.select({ value: count() }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(where),
  ]);
  return { items, total: total?.value ?? 0 };
}

export type AuditRow = Awaited<ReturnType<typeof searchAudit>>["items"][number];
