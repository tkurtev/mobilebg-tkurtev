import type { Metadata } from "next";
import Link from "next/link";
import { Select } from "@/components/ui/field";
import { Pagination } from "@/components/ui/pagination";
import { StatusLabel } from "@/components/ui/status-label";
import { LISTING_STATUS_LABELS, LISTING_STATUS_TONES, REPORT_REASONS } from "@/config/listing-status";
import { PageHeading } from "@/features/account/components/account-shell";
import { ResultCount } from "@/features/admin/components/admin-table";
import { FilterBar } from "@/features/admin/components/filter-bar";
import { FILTER_CONTROL, FilterField } from "@/features/admin/components/filter-field";
import { ReportActions } from "@/features/admin/components/report-actions";
import { REPORT_REASON_VALUES, REPORT_STATUS_LABELS, REPORT_STATUS_TONES, REPORT_STATUSES, reportReasonLabel } from "@/features/admin/labels";
import { enumParam, hrefWith, pageParam, totalPages } from "@/features/admin/params";
import { listReports } from "@/features/admin/queries/reports";
import { formatDateTime } from "@/lib/format";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Сигнали" };

const STATUS_FILTERS = [...REPORT_STATUSES, "all"] as const;

export default async function AdminReportsPage(props: PageProps<"/admin/reports">) {
  await requirePermission("reports.manage", "/admin/reports");
  const raw = await props.searchParams;
  const statusFilter = enumParam(raw, "status", STATUS_FILTERS) ?? "OPEN";
  const reason = enumParam(raw, "reason", REPORT_REASON_VALUES);
  const page = pageParam(raw);
  const result = await listReports({ status: statusFilter === "all" ? undefined : statusFilter, reason, page });
  const query = { status: statusFilter === "OPEN" ? undefined : statusFilter, reason };

  return (
    <>
      <PageHeading title="Сигнали" />
      <FilterBar action="/admin/reports" active={Boolean(query.status || query.reason)}>
        <FilterField label="Статус" htmlFor="f-status">
          <Select id="f-status" name="status" defaultValue={statusFilter === "OPEN" ? "" : statusFilter} className={FILTER_CONTROL}>
            <option value="">{REPORT_STATUS_LABELS.OPEN}</option>
            <option value="RESOLVED">{REPORT_STATUS_LABELS.RESOLVED}</option>
            <option value="DISMISSED">{REPORT_STATUS_LABELS.DISMISSED}</option>
            <option value="all">Всички</option>
          </Select>
        </FilterField>
        <FilterField label="Причина" htmlFor="f-reason" className="sm:w-56">
          <Select id="f-reason" name="reason" defaultValue={reason ?? ""} className={FILTER_CONTROL}>
            <option value="">Всички</option>
            {REPORT_REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FilterField>
      </FilterBar>

      <ResultCount total={result.total} noun={["сигнал", "сигнала"]} />
      {result.items.length === 0 ? (
        <p className="rounded-lg border border-line bg-surface px-4 py-8 text-center text-sm text-muted">Няма сигнали по тези критерии.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {result.items.map((report) => (
            <li key={report.id} className="px-4 py-3" data-testid="report-row">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-6">
                <div className="min-w-0">
                  <Link
                    href={`/admin/listings/${report.listingId}${report.status === "OPEN" ? `?report=${report.id}` : ""}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {report.listingTitle || "Без заглавие"}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-ink-2">
                    <span className="tabular">№ {report.listingNumber}</span>
                    <StatusLabel tone={LISTING_STATUS_TONES[report.listingStatus]}>{LISTING_STATUS_LABELS[report.listingStatus]}</StatusLabel>
                  </p>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-x-3">
                    <span className="font-medium text-ink">{reportReasonLabel(report.reason)}</span>
                    {report.status !== "OPEN" ? <StatusLabel tone={REPORT_STATUS_TONES[report.status]}>{REPORT_STATUS_LABELS[report.status]}</StatusLabel> : null}
                  </p>
                  {report.details ? <p className="mt-0.5 whitespace-pre-line text-ink-2">{report.details}</p> : null}
                  <p className="mt-0.5 text-muted">
                    {report.reporterName}, {report.reporterEmail}, {formatDateTime(report.createdAt)}
                    {report.resolverName && report.resolvedAt ? `. Обработен от ${report.resolverName}, ${formatDateTime(report.resolvedAt)}` : ""}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {report.status === "OPEN" ? <ReportActions reportId={report.id} listingId={report.listingId} listingStatus={report.listingStatus} /> : null}
                <Link
                  href={`/admin/listings/${report.listingId}${report.status === "OPEN" ? `?report=${report.id}` : ""}`}
                  className="inline-flex h-8 items-center text-sm text-brand hover:underline"
                  data-testid="report-open-listing"
                >
                  Отвори обявата
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Pagination page={page} totalPages={totalPages(result.total)} hrefForPage={(next) => hrefWith("/admin/reports", { ...query, page: next })} />
      </div>
    </>
  );
}
