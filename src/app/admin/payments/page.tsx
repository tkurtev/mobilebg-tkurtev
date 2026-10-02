import type { Metadata } from "next";
import Link from "next/link";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatusLabel } from "@/components/ui/status-label";
import { PageHeading } from "@/features/account/components/account-shell";
import { AdminTable, AdminTableHead, EmptyRow, Td, Th, Tr } from "@/features/admin/components/admin-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { FILTER_CONTROL, FilterField } from "@/features/admin/components/filter-field";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES, PAYMENT_STATUSES, PROMOTION_TYPE_VALUES, promotionLabel } from "@/features/admin/labels";
import { dateParam, enumParam, hrefWith, pageParam, totalPages } from "@/features/admin/params";
import { searchPayments } from "@/features/admin/queries/payments";
import { formatCount, formatDateTime } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Плащания" };

function shortReference(reference: string | null): string {
  if (!reference) return "-";
  return reference.length > 14 ? `${reference.slice(0, 12)}…` : reference;
}

export default async function AdminPaymentsPage(props: PageProps<"/admin/payments">) {
  await requirePermission("payments.view", "/admin/payments");
  const raw = await props.searchParams;
  const filters = {
    status: enumParam(raw, "status", PAYMENT_STATUSES),
    type: enumParam(raw, "type", PROMOTION_TYPE_VALUES),
    from: dateParam(raw, "from"),
    to: dateParam(raw, "to"),
    page: pageParam(raw),
  };
  const result = await searchPayments(filters);
  const query = { status: filters.status, type: filters.type, from: filters.from, to: filters.to };

  return (
    <>
      <PageHeading title="Плащания" description="Демо доставчик: плащанията са симулирани и данни за карти не се приемат и не се пазят." />
      <FilterBar action="/admin/payments" active={Object.values(query).some(Boolean)}>
        <FilterField label="Статус" htmlFor="f-status">
          <Select id="f-status" name="status" defaultValue={filters.status ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Промоция" htmlFor="f-type">
          <Select id="f-type" name="type" defaultValue={filters.type ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {PROMOTION_TYPE_VALUES.map((type) => (
              <option key={type} value={type}>
                {promotionLabel(type)}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="От дата" htmlFor="f-from" className="sm:w-40">
          <Input id="f-from" name="from" type="date" defaultValue={filters.from} className={FILTER_CONTROL} />
        </FilterField>
        <FilterField label="До дата" htmlFor="f-to" className="sm:w-40">
          <Input id="f-to" name="to" type="date" defaultValue={filters.to} className={FILTER_CONTROL} />
        </FilterField>
      </FilterBar>

      <p className="mb-2 text-sm text-ink-2" aria-live="polite">
        {formatCount(result.total, "плащане", "плащания")} на обща стойност <span className="font-semibold text-ink tabular">{formatPrice(result.sumCents)}</span>
        {filters.status !== "SUCCEEDED" ? (
          <>
            , от тях успешни <span className="font-semibold text-ink tabular">{formatPrice(result.succeededCents)}</span>
          </>
        ) : null}
      </p>
      <AdminTable caption="Демо плащания" minWidth={960}>
        <AdminTableHead>
          <Th>Дата</Th>
          <Th>Потребител</Th>
          <Th>Обява</Th>
          <Th>Промоция</Th>
          <Th className="text-right">Сума</Th>
          <Th>Статус</Th>
          <Th>Доставчик</Th>
          <Th>Референция</Th>
        </AdminTableHead>
        <tbody>
          {result.items.length === 0 ? (
            <EmptyRow colSpan={8}>Няма плащания по тези критерии.</EmptyRow>
          ) : (
            result.items.map((payment) => (
              <Tr key={payment.id}>
                <Td className="whitespace-nowrap text-ink-2">{formatDateTime(payment.createdAt)}</Td>
                <Td>
                  <Link href={`/admin/users/${payment.userId}`} className="hover:underline">
                    {payment.userName}
                  </Link>
                  <span className="block text-xs break-all text-muted">{payment.userEmail}</span>
                </Td>
                <Td className="max-w-64">
                  <Link href={`/admin/listings/${payment.listingId}`} className="text-brand hover:underline">
                    {payment.listingTitle || "Без заглавие"}
                  </Link>
                  <span className="block text-xs text-muted tabular">№ {payment.listingNumber}</span>
                </Td>
                <Td className="whitespace-nowrap">{promotionLabel(payment.promotionType)}</Td>
                <Td className="text-right whitespace-nowrap tabular">{formatPrice(payment.amountCents)}</Td>
                <Td className="whitespace-nowrap">
                  <StatusLabel tone={PAYMENT_STATUS_TONES[payment.status]}>{PAYMENT_STATUS_LABELS[payment.status]}</StatusLabel>
                </Td>
                <Td className="whitespace-nowrap text-ink-2">{payment.provider}</Td>
                <Td className="whitespace-nowrap">
                  <code className="text-xs text-ink-2" title={payment.providerReference ?? undefined}>
                    {shortReference(payment.providerReference)}
                  </code>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </AdminTable>
      <div className="mt-4">
        <Pagination page={filters.page} totalPages={totalPages(result.total)} hrefForPage={(page) => hrefWith("/admin/payments", { ...query, page })} />
      </div>
    </>
  );
}
