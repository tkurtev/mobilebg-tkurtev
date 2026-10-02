import type { Metadata } from "next";
import Link from "next/link";
import { Input } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatusLabel } from "@/components/ui/status-label";
import { PageHeading } from "@/features/account/components/account-shell";
import { AdminTable, AdminTableHead, EmptyRow, ResultCount, Td, Th, Tr } from "@/features/admin/components/admin-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { FILTER_CONTROL, FilterField } from "@/features/admin/components/filter-field";
import { ActiveToggle, CreateMakeForm, EditMakeDialog } from "@/features/admin/components/taxonomy-controls";
import { hrefWith, pageParam, textParam, totalPages } from "@/features/admin/params";
import { searchMakes } from "@/features/admin/queries/taxonomy";
import { formatNumber } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Марки и модели" };

export default async function AdminVehicleDataPage(props: PageProps<"/admin/vehicle-data">) {
  await requirePermission("taxonomy.manage", "/admin/vehicle-data");
  const raw = await props.searchParams;
  const filters = { q: textParam(raw, "q"), page: pageParam(raw) };
  const result = await searchMakes(filters);

  return (
    <>
      <PageHeading title="Марки и модели" />
      <FilterBar action="/admin/vehicle-data" active={Boolean(filters.q)}>
        <FilterField label="Марка" htmlFor="f-q" className="sm:w-64">
          <Input id="f-q" name="q" type="search" defaultValue={filters.q} className={FILTER_CONTROL} />
        </FilterField>
      </FilterBar>
      <div className="mb-4">
        <CreateMakeForm />
      </div>

      <ResultCount total={result.total} noun={["марка", "марки"]} />
      <AdminTable caption="Марки" minWidth={680}>
        <AdminTableHead>
          <Th>Марка</Th>
          <Th>Адрес</Th>
          <Th className="text-right">Модели</Th>
          <Th className="text-right">Обяви</Th>
          <Th>Статус</Th>
          <Th>
            <span className="sr-only">Действия</span>
          </Th>
        </AdminTableHead>
        <tbody>
          {result.items.length === 0 ? (
            <EmptyRow colSpan={6}>Няма марки по тези критерии.</EmptyRow>
          ) : (
            result.items.map((make) => (
              <Tr key={make.id}>
                <Td>
                  <Link href={`/admin/vehicle-data/${make.id}`} className="font-medium text-brand hover:underline">
                    {make.name}
                  </Link>
                </Td>
                <Td className="text-ink-2">{make.slug}</Td>
                <Td className="text-right tabular">{formatNumber(make.modelCount)}</Td>
                <Td className="text-right tabular">{formatNumber(make.listingCount)}</Td>
                <Td className="whitespace-nowrap">
                  <StatusLabel tone={make.isActive ? "success" : "muted"}>{make.isActive ? "Активна" : "Неактивна"}</StatusLabel>
                </Td>
                <Td className="whitespace-nowrap">
                  <div className="flex items-center justify-end gap-4">
                    <EditMakeDialog id={make.id} name={make.name} slug={make.slug} />
                    <ActiveToggle kind="make" id={make.id} isActive={make.isActive} label={make.name} />
                  </div>
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </AdminTable>
      <div className="mt-4">
        <Pagination page={filters.page} totalPages={totalPages(result.total, result.pageSize)} hrefForPage={(page) => hrefWith("/admin/vehicle-data", { q: filters.q, page })} />
      </div>
    </>
  );
}
