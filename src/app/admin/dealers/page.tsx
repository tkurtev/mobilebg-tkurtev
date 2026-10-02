import type { Metadata } from "next";
import Link from "next/link";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatusLabel } from "@/components/ui/status-label";
import { PageHeading } from "@/features/account/components/account-shell";
import { AdminTable, AdminTableHead, EmptyRow, ResultCount, Td, Th, Tr } from "@/features/admin/components/admin-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { FILTER_CONTROL, FilterField } from "@/features/admin/components/filter-field";
import { DEALER_STATUS_LABELS, DEALER_STATUS_TONES, DEALER_STATUSES } from "@/features/admin/labels";
import { enumParam, hrefWith, pageParam, textParam, totalPages } from "@/features/admin/params";
import { searchDealers } from "@/features/admin/queries/dealers";
import { formatDate, formatNumber } from "@/lib/format";
import { formatBgPhone } from "@/lib/phone";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Дилъри" };

export default async function AdminDealersPage(props: PageProps<"/admin/dealers">) {
  await requirePermission("dealers.manage", "/admin/dealers");
  const raw = await props.searchParams;
  const filters = { q: textParam(raw, "q"), status: enumParam(raw, "status", DEALER_STATUSES), page: pageParam(raw) };
  const result = await searchDealers(filters);
  const query = { q: filters.q, status: filters.status };

  return (
    <>
      <PageHeading title="Дилъри" />
      <FilterBar action="/admin/dealers" active={Object.values(query).some(Boolean)}>
        <FilterField label="Име, адрес или имейл" htmlFor="f-q" className="sm:w-64">
          <Input id="f-q" name="q" type="search" defaultValue={filters.q} className={FILTER_CONTROL} />
        </FilterField>
        <FilterField label="Статус" htmlFor="f-status">
          <Select id="f-status" name="status" defaultValue={filters.status ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {DEALER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {DEALER_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterBar>

      <ResultCount total={result.total} noun={["дилър", "дилъра"]} />
      <AdminTable caption="Дилъри" minWidth={760}>
        <AdminTableHead>
          <Th>Име</Th>
          <Th>Град</Th>
          <Th>Телефон</Th>
          <Th className="text-right">Активни обяви</Th>
          <Th className="text-right">Служители</Th>
          <Th>Статус</Th>
          <Th>Създаден</Th>
        </AdminTableHead>
        <tbody>
          {result.items.length === 0 ? (
            <EmptyRow colSpan={7}>Няма дилъри по тези критерии.</EmptyRow>
          ) : (
            result.items.map((dealer) => (
              <Tr key={dealer.id}>
                <Td>
                  <Link href={`/admin/dealers/${dealer.id}`} className="font-medium text-brand hover:underline">
                    {dealer.name}
                  </Link>
                  <span className="block text-xs text-muted">{dealer.slug}</span>
                </Td>
                <Td>{dealer.cityName ?? "-"}</Td>
                <Td className="whitespace-nowrap">{formatBgPhone(dealer.phone)}</Td>
                <Td className="text-right tabular">{formatNumber(dealer.activeListings)}</Td>
                <Td className="text-right tabular">{formatNumber(dealer.memberCount)}</Td>
                <Td className="whitespace-nowrap">
                  <StatusLabel tone={DEALER_STATUS_TONES[dealer.status]}>{DEALER_STATUS_LABELS[dealer.status]}</StatusLabel>
                </Td>
                <Td className="whitespace-nowrap text-ink-2">{formatDate(dealer.createdAt)}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </AdminTable>
      <div className="mt-4">
        <Pagination page={filters.page} totalPages={totalPages(result.total)} hrefForPage={(page) => hrefWith("/admin/dealers", { ...query, page })} />
      </div>
    </>
  );
}
