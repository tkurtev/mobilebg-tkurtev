import { LISTING_STATUS_LABELS, type ListingStatus } from "@/config/listing-status";
import { formatDateTime } from "@/lib/format";
import { MODERATION_ACTION_LABELS } from "../labels";
import { AdminTable, AdminTableHead, Td, Th, Tr } from "./admin-table";

type HistoryRow = {
  id: string;
  action: string;
  reason: string;
  previousStatus: ListingStatus | null;
  newStatus: ListingStatus | null;
  createdAt: Date;
  moderatorName: string;
};

export function ModerationHistoryTable({ rows }: { rows: HistoryRow[] }) {
  if (rows.length === 0) return <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Няма действия по модерация.</p>;
  return (
    <AdminTable caption="История на модерацията" minWidth={640}>
      <AdminTableHead>
        <Th>Дата</Th>
        <Th>Действие</Th>
        <Th>Модератор</Th>
        <Th>Статус</Th>
        <Th>Причина</Th>
      </AdminTableHead>
      <tbody>
        {rows.map((row) => (
          <Tr key={row.id}>
            <Td className="whitespace-nowrap text-ink-2">{formatDateTime(row.createdAt)}</Td>
            <Td className="whitespace-nowrap">{MODERATION_ACTION_LABELS[row.action] ?? row.action}</Td>
            <Td className="whitespace-nowrap">{row.moderatorName}</Td>
            <Td className="whitespace-nowrap text-ink-2">
              {row.previousStatus && row.newStatus && row.previousStatus !== row.newStatus
                ? `${LISTING_STATUS_LABELS[row.previousStatus]} → ${LISTING_STATUS_LABELS[row.newStatus]}`
                : row.newStatus
                  ? LISTING_STATUS_LABELS[row.newStatus]
                  : "-"}
            </Td>
            <Td className="max-w-80 whitespace-pre-line">{row.reason || <span className="text-muted">-</span>}</Td>
          </Tr>
        ))}
      </tbody>
    </AdminTable>
  );
}
