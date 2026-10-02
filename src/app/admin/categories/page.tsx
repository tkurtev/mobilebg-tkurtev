import type { Metadata } from "next";
import Link from "next/link";
import { StatusLabel } from "@/components/ui/status-label";
import { ATTRIBUTE_SETS, type AttributeSetKey } from "@/config/attribute-sets";
import { VEHICLE_TYPES, type VehicleType } from "@/config/categories";
import { PageHeading } from "@/features/account/components/account-shell";
import { AdminTable, AdminTableHead, EmptyRow, Td, Th, Tr } from "@/features/admin/components/admin-table";
import { CategoryDialog } from "@/features/admin/components/category-dialog";
import { listAllCategories } from "@/features/admin/queries/categories";
import { formatNumber } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Категории" };

function attributeSetLabel(key: string): string {
  return key in ATTRIBUTE_SETS ? ATTRIBUTE_SETS[key as AttributeSetKey].label : key;
}

function vehicleTypeLabel(value: string | null): string {
  return VEHICLE_TYPES.find((type) => type.value === value)?.label ?? "-";
}

export default async function AdminCategoriesPage() {
  await requirePermission("categories.manage", "/admin/categories");
  const rows = await listAllCategories();
  const nextSortOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 10;

  return (
    <>
      <PageHeading
        title="Категории"
        description="Категории с обяви не се изтриват. Скрий ги, като ги направиш неактивни."
        actions={<CategoryDialog mode="create" nextSortOrder={nextSortOrder} />}
      />
      <AdminTable caption="Категории" minWidth={880}>
        <AdminTableHead>
          <Th className="text-right">Ред</Th>
          <Th>Име</Th>
          <Th>Адрес</Th>
          <Th>Характеристики</Th>
          <Th>Марки и модели</Th>
          <Th className="text-right">Обяви (активни)</Th>
          <Th>Статус</Th>
          <Th>
            <span className="sr-only">Действия</span>
          </Th>
        </AdminTableHead>
        <tbody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={8}>Няма категории.</EmptyRow>
          ) : (
            rows.map((row) => (
              <Tr key={row.id}>
                <Td className="text-right text-ink-2 tabular">{row.sortOrder}</Td>
                <Td className="font-medium">{row.name}</Td>
                <Td>
                  {row.isActive ? (
                    <Link href={`/${row.slug}`} className="text-brand hover:underline" target="_blank" rel="noreferrer">
                      /{row.slug}
                    </Link>
                  ) : (
                    <span className="text-ink-2">/{row.slug}</span>
                  )}
                </Td>
                <Td>{attributeSetLabel(row.attributeSet)}</Td>
                <Td>{vehicleTypeLabel(row.vehicleType)}</Td>
                <Td className="text-right whitespace-nowrap tabular">
                  {formatNumber(row.listingCount)} ({formatNumber(row.activeCount)})
                </Td>
                <Td className="whitespace-nowrap">
                  <StatusLabel tone={row.isActive ? "success" : "muted"}>{row.isActive ? "Активна" : "Неактивна"}</StatusLabel>
                </Td>
                <Td className="text-right">
                  <CategoryDialog
                    mode="edit"
                    categoryId={row.id}
                    listingCount={row.listingCount}
                    defaults={{
                      name: row.name,
                      slug: row.slug,
                      sortOrder: row.sortOrder,
                      isActive: row.isActive,
                      attributeSet: (row.attributeSet in ATTRIBUTE_SETS ? row.attributeSet : "car") as AttributeSetKey,
                      vehicleType: (VEHICLE_TYPES.some((type) => type.value === row.vehicleType) ? row.vehicleType : "") as VehicleType | "",
                    }}
                  />
                </Td>
              </Tr>
            ))
          )}
        </tbody>
      </AdminTable>
    </>
  );
}
