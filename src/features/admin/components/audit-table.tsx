import Link from "next/link";
import type { AuditMetadata } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { AUDIT_TARGET_LABELS, auditActionLabel, auditTargetHref } from "../labels";
import { AdminTable, AdminTableHead, Td, Th, Tr } from "./admin-table";

type AuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: AuditMetadata;
  createdAt: Date;
  actorId: string | null;
  actorName: string | null;
  actorEmail?: string | null;
};

function formatValue(value: AuditMetadata[string]): string {
  if (value === null) return "-";
  if (typeof value === "boolean") return value ? "да" : "не";
  return String(value);
}

export function MetadataList({ metadata }: { metadata: AuditMetadata }) {
  const entries = Object.entries(metadata ?? {});
  if (entries.length === 0) return <span className="text-muted">-</span>;
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <dt className="text-muted">{key}:</dt>
          <dd className="break-all text-ink-2">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AuditTable({ entries, emptyText = "Няма записи." }: { entries: AuditEntry[]; emptyText?: string }) {
  if (entries.length === 0) return <p className="rounded-lg border border-line bg-surface px-4 py-6 text-center text-sm text-muted">{emptyText}</p>;
  return (
    <AdminTable caption="Одит" minWidth={860}>
      <AdminTableHead>
        <Th>Дата</Th>
        <Th>Действие</Th>
        <Th>Изпълнил</Th>
        <Th>Обект</Th>
        <Th>Данни</Th>
      </AdminTableHead>
      <tbody>
        {entries.map((entry) => {
          const href = auditTargetHref(entry.targetType, entry.targetId);
          const typeLabel = AUDIT_TARGET_LABELS[entry.targetType] ?? entry.targetType;
          const targetLabel = entry.targetType === "settings" ? typeLabel : `${typeLabel} ${entry.targetId.slice(0, 8)}`;
          return (
            <Tr key={entry.id} data-testid="audit-row">
              <Td className="whitespace-nowrap text-ink-2">{formatDateTime(entry.createdAt)}</Td>
              <Td>
                <span className="block">{auditActionLabel(entry.action)}</span>
                <code className="text-xs text-muted">{entry.action}</code>
              </Td>
              <Td>
                {entry.actorId && entry.actorName ? (
                  <>
                    <Link href={`/admin/users/${entry.actorId}`} className="hover:underline">
                      {entry.actorName}
                    </Link>
                    {entry.actorEmail ? <span className="block text-xs break-all text-muted">{entry.actorEmail}</span> : null}
                  </>
                ) : (
                  <span className="text-muted">Система</span>
                )}
              </Td>
              <Td className="whitespace-nowrap">
                {href ? (
                  <Link href={href} className="text-brand hover:underline" title={entry.targetId}>
                    {targetLabel}
                  </Link>
                ) : (
                  <span title={entry.targetId}>{targetLabel}</span>
                )}
              </Td>
              <Td className="min-w-56">
                <MetadataList metadata={entry.metadata} />
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </AdminTable>
  );
}
