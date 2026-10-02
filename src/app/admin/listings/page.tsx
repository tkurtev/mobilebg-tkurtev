import type { Metadata } from "next";
import Link from "next/link";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatusLabel } from "@/components/ui/status-label";
import { LISTING_STATUS_LABELS, LISTING_STATUS_TONES, type ListingStatus } from "@/config/listing-status";
import { PageHeading } from "@/features/account/components/account-shell";
import { AdminTable, AdminTableHead, EmptyRow, ResultCount, Td, Th, Tr } from "@/features/admin/components/admin-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { FILTER_CONTROL, FilterField } from "@/features/admin/components/filter-field";
import { SELLER_TYPE_LABELS, SELLER_TYPES } from "@/features/admin/labels";
import { enumParam, hrefWith, pageParam, textParam, totalPages, uuidParam } from "@/features/admin/params";
import { getAdminCategoryOptions, searchAdminListings } from "@/features/admin/queries/listings";
import { formatDate } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Обяви" };

const STATUSES = Object.keys(LISTING_STATUS_LABELS) as ListingStatus[];

export default async function AdminListingsPage(props: PageProps<"/admin/listings">) {
  await requirePermission("listings.moderate", "/admin/listings");
  const raw = await props.searchParams;
  const filters = {
    q: textParam(raw, "q"),
    status: enumParam(raw, "status", STATUSES),
    categoryId: uuidParam(raw, "category"),
    sellerType: enumParam(raw, "seller", SELLER_TYPES),
    sellerId: uuidParam(raw, "sellerId"),
    page: pageParam(raw),
  };
  const [result, categoryOptions] = await Promise.all([searchAdminListings(filters), getAdminCategoryOptions()]);
  const query = { q: filters.q, status: filters.status, category: filters.categoryId, seller: filters.sellerType, sellerId: filters.sellerId };
  const active = Object.values(query).some(Boolean);

  return (
    <>
      <PageHeading title="Обяви" />
      <FilterBar action="/admin/listings" active={active}>
        {filters.sellerId ? <input type="hidden" name="sellerId" value={filters.sellerId} /> : null}
        <FilterField label="Номер или заглавие" htmlFor="f-q" className="sm:w-64">
          <Input id="f-q" name="q" type="search" defaultValue={filters.q} className={FILTER_CONTROL} />
        </FilterField>
        <FilterField label="Статус" htmlFor="f-status">
          <Select id="f-status" name="status" defaultValue={filters.status ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {LISTING_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Категория" htmlFor="f-category">
          <Select id="f-category" name="category" defaultValue={filters.categoryId ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {category.isActive ? "" : " (неактивна)"}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Продавач" htmlFor="f-seller">
          <Select id="f-seller" name="seller" defaultValue={filters.sellerType ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {SELLER_TYPES.map((type) => (
              <option key={type} value={type}>
                {SELLER_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterBar>

      {filters.sellerId ? (
        <p className="mb-2 text-sm text-ink-2">
          Показани са само обявите на един продавач.{" "}
          <Link href={hrefWith("/admin/listings", { ...query, sellerId: undefined })} className="text-brand hover:underline">
            Покажи всички
          </Link>
        </p>
      ) : null}
      <ResultCount total={result.total} noun={["обява", "обяви"]} />
      <AdminTable caption="Обяви" minWidth={880}>
        <AdminTableHead>
          <Th>№</Th>
          <Th>Заглавие</Th>
          <Th>Категория</Th>
          <Th>Продавач</Th>
          <Th className="text-right">Цена</Th>
          <Th>Статус</Th>
          <Th>Създадена</Th>
        </AdminTableHead>
        <tbody>
          {result.items.length === 0 ? (
            <EmptyRow colSpan={7}>Няма обяви по тези критерии.</EmptyRow>
          ) : (
            result.items.map((listing) => (
              <Tr key={listing.id}>
                <Td className="text-ink-2 tabular">{listing.number}</Td>
                <Td className="max-w-80">
                  <Link href={`/admin/listings/${listing.id}`} className="font-medium text-brand hover:underline">
                    {listing.title || "Без заглавие"}
                  </Link>
                  {listing.deletedAt ? <span className="ml-1.5 text-muted">(изтрита)</span> : null}
                </Td>
                <Td className="whitespace-nowrap">{listing.categoryName}</Td>
                <Td>
                  <Link href={`/admin/users/${listing.sellerId}`} className="hover:underline">
                    {listing.sellerName}
                  </Link>
                  {listing.dealerName ? <span className="block text-muted">{listing.dealerName}</span> : null}
                </Td>
                <Td className="text-right whitespace-nowrap tabular">{listing.priceCents !== null ? formatPrice(listing.priceCents) : "-"}</Td>
                <Td className="whitespace-nowrap">
                  <StatusLabel tone={LISTING_STATUS_TONES[listing.status]}>{LISTING_STATUS_LABELS[listing.status]}</StatusLabel>
                </Td>
                <Td className="whitespace-nowrap text-ink-2">{formatDate(listing.createdAt)}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </AdminTable>
      <div className="mt-4">
        <Pagination page={filters.page} totalPages={totalPages(result.total)} hrefForPage={(page) => hrefWith("/admin/listings", { ...query, page })} />
      </div>
    </>
  );
}
