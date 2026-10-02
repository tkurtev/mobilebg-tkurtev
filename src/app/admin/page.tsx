import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/features/account/components/account-shell";
import { SectionHeading } from "@/features/admin/components/admin-table";
import { reportReasonLabel } from "@/features/admin/labels";
import { getDashboardCounts, getOldestPendingListings, getRecentPaymentTotals } from "@/features/admin/queries/dashboard";
import { getNewestOpenReports } from "@/features/admin/queries/reports";
import { formatDateTime, formatNumber, formatRelativeDate } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { can } from "@/server/auth/policies";
import { requirePermission } from "@/server/auth/session";

export const metadata: Metadata = { title: "Табло" };

const ROW = "flex items-center justify-between gap-4 px-4 py-2.5";

export default async function AdminDashboardPage() {
  const user = await requirePermission("admin.access", "/admin");
  const showPayments = can(user, "payments.view");
  const [counts, pending, reports, paymentTotals] = await Promise.all([
    getDashboardCounts(),
    getOldestPendingListings(5),
    getNewestOpenReports(5),
    showPayments ? getRecentPaymentTotals() : Promise.resolve(null),
  ]);

  const rows: { label: string; value: string; href: string }[] = [
    { label: "Обяви, чакащи преглед", value: formatNumber(counts.pending), href: "/admin/listings?status=PENDING" },
    { label: "Отворени сигнали", value: formatNumber(counts.openReports), href: "/admin/reports" },
    { label: "Активни обяви", value: formatNumber(counts.active), href: "/admin/listings?status=ACTIVE" },
    { label: "Нови потребители за 7 дни", value: formatNumber(counts.newUsers), href: "/admin/users" },
  ];
  if (paymentTotals) {
    rows.push({
      label: "Успешни демо плащания за 30 дни",
      value: `${formatNumber(paymentTotals.count)} / ${formatPrice(paymentTotals.sumCents)}`,
      href: `/admin/payments?status=SUCCEEDED&from=${paymentTotals.fromDay}`,
    });
  }

  return (
    <>
      <PageHeading title="Табло" />
      <ul className="max-w-2xl divide-y divide-line rounded-lg border border-line bg-surface">
        {rows.map((row) => (
          <li key={row.label}>
            <Link href={row.href} className={`${ROW} hover:bg-subtle`}>
              <span className="text-ink-2">{row.label}</span>
              <span className="font-semibold whitespace-nowrap text-ink tabular">{row.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2">
        <section aria-labelledby="pending-heading">
          <SectionHeading
            id="pending-heading"
            actions={
              <Link href="/admin/listings?status=PENDING" className="text-sm text-brand hover:underline">
                Всички чакащи
              </Link>
            }
          >
            Най-дълго чакащи обяви
          </SectionHeading>
          {pending.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Няма обяви за преглед.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {pending.map((listing) => (
                <li key={listing.id} className={ROW}>
                  <div className="min-w-0">
                    <Link href={`/admin/listings/${listing.id}`} className="block truncate font-medium text-brand hover:underline">
                      {listing.title || "Без заглавие"}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      № {listing.number} · {listing.categoryName} · {listing.sellerName}
                    </p>
                  </div>
                  <time dateTime={listing.updatedAt.toISOString()} title={formatDateTime(listing.updatedAt)} className="shrink-0 text-sm text-ink-2">
                    {formatRelativeDate(listing.updatedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="reports-heading">
          <SectionHeading
            id="reports-heading"
            actions={
              <Link href="/admin/reports" className="text-sm text-brand hover:underline">
                Всички сигнали
              </Link>
            }
          >
            Нови сигнали
          </SectionHeading>
          {reports.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-muted">Няма отворени сигнали.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
              {reports.map((report) => (
                <li key={report.id} className={ROW}>
                  <div className="min-w-0">
                    <Link href={`/admin/listings/${report.listingId}?report=${report.id}`} className="block truncate font-medium text-brand hover:underline">
                      {report.listingTitle || "Без заглавие"}
                    </Link>
                    <p className="truncate text-sm text-muted">
                      {reportReasonLabel(report.reason)} · {report.reporterName}
                    </p>
                  </div>
                  <time dateTime={report.createdAt.toISOString()} title={formatDateTime(report.createdAt)} className="shrink-0 text-sm text-ink-2">
                    {formatRelativeDate(report.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
