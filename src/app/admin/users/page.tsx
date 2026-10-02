import type { Metadata } from "next";
import Link from "next/link";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatusLabel } from "@/components/ui/status-label";
import { PageHeading } from "@/features/account/components/account-shell";
import { AdminTable, AdminTableHead, EmptyRow, ResultCount, Td, Th, Tr } from "@/features/admin/components/admin-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { FILTER_CONTROL, FilterField } from "@/features/admin/components/filter-field";
import { USER_STATUS_LABELS, USER_STATUS_TONES, USER_STATUSES } from "@/features/admin/labels";
import { enumParam, hrefWith, pageParam, textParam, totalPages } from "@/features/admin/params";
import { searchUsers } from "@/features/admin/queries/users";
import { formatDate, formatNumber } from "@/lib/format";
import { ROLE_LABELS, ROLES } from "@/server/auth/policies";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Потребители" };

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await requirePermission("users.view", "/admin/users");
  const raw = await props.searchParams;
  const filters = { q: textParam(raw, "q"), role: enumParam(raw, "role", ROLES), status: enumParam(raw, "status", USER_STATUSES), page: pageParam(raw) };
  const result = await searchUsers(filters);
  const query = { q: filters.q, role: filters.role, status: filters.status };

  return (
    <>
      <PageHeading title="Потребители" />
      <FilterBar action="/admin/users" active={Object.values(query).some(Boolean)}>
        <FilterField label="Име или имейл" htmlFor="f-q" className="sm:w-64">
          <Input id="f-q" name="q" type="search" defaultValue={filters.q} className={FILTER_CONTROL} />
        </FilterField>
        <FilterField label="Роля" htmlFor="f-role" className="sm:w-52">
          <Select id="f-role" name="role" defaultValue={filters.role ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Статус" htmlFor="f-status">
          <Select id="f-status" name="status" defaultValue={filters.status ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {USER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {USER_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterBar>

      <ResultCount total={result.total} noun={["потребител", "потребители"]} />
      <AdminTable caption="Потребители" minWidth={760}>
        <AdminTableHead>
          <Th>Име</Th>
          <Th>Имейл</Th>
          <Th>Роля</Th>
          <Th>Статус</Th>
          <Th className="text-right">Обяви</Th>
          <Th>Регистрация</Th>
        </AdminTableHead>
        <tbody>
          {result.items.length === 0 ? (
            <EmptyRow colSpan={6}>Няма потребители по тези критерии.</EmptyRow>
          ) : (
            result.items.map((user) => (
              <Tr key={user.id}>
                <Td>
                  <Link href={`/admin/users/${user.id}`} className="font-medium text-brand hover:underline">
                    {user.name}
                  </Link>
                </Td>
                <Td className="break-all text-ink-2">
                  {user.email}
                  {user.emailVerified ? null : <span className="ml-1.5 text-warning">(непотвърден)</span>}
                </Td>
                <Td className="whitespace-nowrap">{ROLE_LABELS[user.role]}</Td>
                <Td className="whitespace-nowrap">
                  <StatusLabel tone={USER_STATUS_TONES[user.status]}>{USER_STATUS_LABELS[user.status]}</StatusLabel>
                </Td>
                <Td className="text-right tabular">{formatNumber(user.listingCount)}</Td>
                <Td className="whitespace-nowrap text-ink-2">{formatDate(user.createdAt)}</Td>
              </Tr>
            ))
          )}
        </tbody>
      </AdminTable>
      <div className="mt-4">
        <Pagination page={filters.page} totalPages={totalPages(result.total)} hrefForPage={(page) => hrefWith("/admin/users", { ...query, page })} />
      </div>
    </>
  );
}
