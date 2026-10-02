import type { Metadata } from "next";
import Link from "next/link";
import { Input, Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { PageHeading } from "@/features/account/components/account-shell";
import { ResultCount } from "@/features/admin/components/admin-table";
import { AuditTable } from "@/features/admin/components/audit-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { FILTER_CONTROL, FilterField } from "@/features/admin/components/filter-field";
import { AUDIT_TARGET_LABELS, auditActionLabel } from "@/features/admin/labels";
import { firstParam, hrefWith, pageParam, textParam, totalPages } from "@/features/admin/params";
import { getAuditFilterOptions, searchAudit } from "@/features/admin/queries/audit";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Одит" };

export default async function AdminAuditPage(props: PageProps<"/admin/audit">) {
  await requirePermission("audit.view", "/admin/audit");
  const raw = await props.searchParams;
  const options = await getAuditFilterOptions();
  const action = firstParam(raw, "action");
  const targetType = firstParam(raw, "targetType");
  const filters = {
    action: action && options.actions.includes(action) ? action : undefined,
    targetType: targetType && options.targetTypes.includes(targetType) ? targetType : undefined,
    targetId: textParam(raw, "targetId", 64),
    actorEmail: textParam(raw, "actor", 254),
    page: pageParam(raw),
  };
  const result = await searchAudit(filters);
  const query = { action: filters.action, targetType: filters.targetType, targetId: filters.targetId, actor: filters.actorEmail };

  return (
    <>
      <PageHeading title="Одит" />
      <FilterBar action="/admin/audit" active={Object.values(query).some(Boolean)}>
        {filters.targetId ? <input type="hidden" name="targetId" value={filters.targetId} /> : null}
        <FilterField label="Действие" htmlFor="f-action" className="sm:w-60">
          <Select id="f-action" name="action" defaultValue={filters.action ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {options.actions.map((value) => (
              <option key={value} value={value}>
                {auditActionLabel(value)}
              </option>
            ))}
          </Select>
        </FilterField>
        <FilterField label="Имейл на изпълнителя" htmlFor="f-actor" className="sm:w-56">
          <Input id="f-actor" name="actor" type="search" defaultValue={filters.actorEmail} className={FILTER_CONTROL} />
        </FilterField>
        <FilterField label="Обект" htmlFor="f-target">
          <Select id="f-target" name="targetType" defaultValue={filters.targetType ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {options.targetTypes.map((value) => (
              <option key={value} value={value}>
                {AUDIT_TARGET_LABELS[value] ?? value}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterBar>

      {filters.targetId ? (
        <p className="mb-2 text-sm text-ink-2">
          Показани са записите за един обект.{" "}
          <Link href={hrefWith("/admin/audit", { ...query, targetId: undefined })} className="text-brand hover:underline">
            Покажи всички
          </Link>
        </p>
      ) : null}
      <ResultCount total={result.total} noun={["запис", "записа"]} />
      <AuditTable entries={result.items} emptyText="Няма записи по тези критерии." />
      <div className="mt-4">
        <Pagination page={filters.page} totalPages={totalPages(result.total)} hrefForPage={(page) => hrefWith("/admin/audit", { ...query, page })} />
      </div>
    </>
  );
}
