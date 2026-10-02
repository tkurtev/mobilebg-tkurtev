import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/panel";
import { StatusLabel } from "@/components/ui/status-label";
import { getAttributeSet } from "@/config/attribute-sets";
import { groupFeatures } from "@/config/features";
import { LISTING_STATUS_LABELS, LISTING_STATUS_TONES } from "@/config/listing-status";
import { DetailList, SectionHeading } from "@/features/admin/components/admin-table";
import { ModerationHistoryTable } from "@/features/admin/components/history-table";
import { ModerationControls } from "@/features/admin/components/moderation-controls";
import { DismissReportDialog } from "@/features/admin/components/report-actions";
import { DEALER_STATUS_LABELS, REPORT_STATUS_LABELS, REPORT_STATUS_TONES, reportReasonLabel, USER_STATUS_LABELS } from "@/features/admin/labels";
import { uuidParam } from "@/features/admin/params";
import { getAdminListing } from "@/features/admin/queries/listings";
import { getReportsForListing } from "@/features/admin/queries/reports";
import { ListingImage } from "@/features/listings/components/listing-image";
import { listingPath } from "@/features/listings/paths";
import { buildSpecRows } from "@/features/listings/specs";
import { formatDateTime, formatNumber } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { formatBgPhone } from "@/lib/phone";
import { can, ROLE_LABELS } from "@/server/auth/policies";
import { requirePermission } from "@/server/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(props: PageProps<"/admin/listings/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  return { title: UUID.test(id) ? "Обява" : "Не е намерена" };
}

function dateOrDash(date: Date | null): string {
  return date ? formatDateTime(date) : "-";
}

export default async function AdminListingPage(props: PageProps<"/admin/listings/[id]">) {
  const { id } = await props.params;
  const user = await requirePermission("listings.moderate", `/admin/listings/${id}`);
  if (!UUID.test(id)) notFound();
  const [detail, reports] = await Promise.all([getAdminListing(id), getReportsForListing(id)]);
  if (!detail) notFound();

  const { listing, category } = detail;
  const canManageReports = can(user, "reports.manage");
  const requestedReportId = uuidParam(await props.searchParams, "report");
  const activeReport = canManageReports ? reports.find((report) => report.id === requestedReportId && report.status === "OPEN") : undefined;
  const publicPath = listingPath({ categorySlug: category.slug, number: listing.number, slug: listing.slug });
  const set = getAttributeSet(category.attributeSet);
  const specs = buildSpecRows({
    attributeSet: category.attributeSet,
    makeName: detail.makeName,
    modelName: detail.modelName,
    generationName: detail.generationName,
    year: listing.year,
    mileageKm: listing.mileageKm,
    fuel: listing.fuel,
    gearbox: listing.gearbox,
    powerHp: listing.powerHp,
    engineCc: listing.engineCc,
    drivetrain: listing.drivetrain,
    bodyType: listing.bodyType,
    color: listing.color,
    condition: listing.condition,
    attributes: detail.attributes,
  });
  const featureGroups = groupFeatures(detail.features, set.featureGroups);
  const now = new Date();
  const promotions = [
    listing.vipUntil && listing.vipUntil > now ? `VIP до ${formatDateTime(listing.vipUntil)}` : null,
    listing.topUntil && listing.topUntil > now ? `TOP до ${formatDateTime(listing.topUntil)}` : null,
    listing.highlightUntil && listing.highlightUntil > now ? `Открояване до ${formatDateTime(listing.highlightUntil)}` : null,
  ].filter(Boolean);

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Администрация", href: "/admin" },
          { label: "Обяви", href: "/admin/listings" },
          { label: `№ ${listing.number}` },
        ]}
      />
      <div className="mt-2 mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words">{listing.title || "Без заглавие"}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span className="tabular">№ {listing.number}</span>
            <StatusLabel tone={LISTING_STATUS_TONES[listing.status]}>{LISTING_STATUS_LABELS[listing.status]}</StatusLabel>
            {listing.moderationLock ? <span className="text-danger">Спряна от модератор</span> : null}
            {listing.deletedAt ? <span className="text-muted">Изтрита от продавача {formatDateTime(listing.deletedAt)}</span> : null}
            <Link href={publicPath} className="text-brand hover:underline" target="_blank" rel="noreferrer">
              Публична страница
            </Link>
          </p>
        </div>
      </div>

      {activeReport ? (
        <Alert tone="warning" title={`Сигнал: ${reportReasonLabel(activeReport.reason)}`} className="mb-4">
          {activeReport.details ? <p className="whitespace-pre-line">{activeReport.details}</p> : null}
          <p className="mt-1 text-muted">
            От {activeReport.reporterName}, {formatDateTime(activeReport.createdAt)}. Действието по-долу ще затвори сигнала.
          </p>
        </Alert>
      ) : null}
      {listing.status === "REJECTED" && listing.rejectionReason ? (
        <Alert tone="danger" title="Причина за отказ" className="mb-4">
          <p className="whitespace-pre-line">{listing.rejectionReason}</p>
        </Alert>
      ) : null}

      <Panel className="mb-6">
        <PanelHeader title="Модерация" />
        <PanelBody>
          <ModerationControls listingId={listing.id} status={listing.status} reportId={activeReport?.id ?? null} />
        </PanelBody>
      </Panel>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="images-heading">
            <SectionHeading id="images-heading">Снимки ({detail.images.length})</SectionHeading>
            {detail.images.length === 0 ? (
              <p className="text-sm text-muted">Няма снимки.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {detail.images.map((image, index) => (
                  <li key={image.id}>
                    <a href={image.url} target="_blank" rel="noreferrer" className="block w-28 overflow-hidden rounded-md border border-line hover:border-brand sm:w-32">
                      <ListingImage src={image.thumbUrl} alt={`Снимка ${index + 1}`} sizes="128px" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="main-heading" className="rounded-lg border border-line bg-surface p-4">
            <SectionHeading id="main-heading">Основни данни</SectionHeading>
            <DetailList
              items={[
                { label: "Категория", value: category.name },
                { label: "Цена", value: listing.priceCents !== null ? `${formatPrice(listing.priceCents)}${listing.priceNegotiable ? ", по договаряне" : ""}` : "-" },
                { label: "Местоположение", value: [detail.cityName, detail.regionName].filter(Boolean).join(", ") || "-" },
                { label: "Контакт", value: [listing.contactName, listing.contactPhone ? formatBgPhone(listing.contactPhone) : null].filter(Boolean).join(", ") || "-" },
                { label: "Създадена", value: dateOrDash(listing.createdAt) },
                { label: "Публикувана", value: dateOrDash(listing.publishedAt) },
                { label: "Изтича", value: dateOrDash(listing.expiresAt) },
                { label: "Последна промяна", value: dateOrDash(listing.updatedAt) },
                { label: "Прегледи / любими / запитвания", value: `${formatNumber(listing.viewCount)} / ${formatNumber(listing.favoriteCount)} / ${formatNumber(listing.inquiryCount)}` },
                { label: "Промоции", value: promotions.length > 0 ? promotions.join("; ") : "-" },
              ]}
            />
          </section>

          <section aria-labelledby="specs-heading" className="rounded-lg border border-line bg-surface p-4">
            <SectionHeading id="specs-heading">Характеристики</SectionHeading>
            {specs.length === 0 ? <p className="text-sm text-muted">Няма попълнени характеристики.</p> : <DetailList items={specs} />}
            {featureGroups.length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-line pt-3">
                {featureGroups.map((group) => (
                  <p key={group.key} className="text-sm">
                    <span className="text-muted">{group.label}: </span>
                    {group.features.map((feature) => feature.label).join(", ")}
                  </p>
                ))}
              </div>
            ) : null}
          </section>

          <section aria-labelledby="description-heading" className="rounded-lg border border-line bg-surface p-4">
            <SectionHeading id="description-heading">Описание</SectionHeading>
            {listing.description ? <p className="text-sm leading-relaxed whitespace-pre-line">{listing.description}</p> : <p className="text-sm text-muted">Няма описание.</p>}
          </section>

          <section aria-labelledby="history-heading">
            <SectionHeading id="history-heading">История на модерацията</SectionHeading>
            <ModerationHistoryTable rows={detail.history} />
          </section>
        </div>

        <aside className="space-y-6">
          <section aria-labelledby="seller-heading" className="rounded-lg border border-line bg-surface p-4">
            <SectionHeading id="seller-heading">Продавач</SectionHeading>
            <DetailList
              items={[
                {
                  label: "Име",
                  value: can(user, "users.view") ? (
                    <Link href={`/admin/users/${detail.seller.id}`} className="text-brand hover:underline">
                      {detail.seller.name}
                    </Link>
                  ) : (
                    detail.seller.name
                  ),
                },
                { label: "Имейл", value: detail.seller.email },
                { label: "Роля", value: ROLE_LABELS[detail.seller.role] },
                { label: "Статус", value: USER_STATUS_LABELS[detail.seller.status] },
                {
                  label: "Дилър",
                  value: detail.dealer?.id ? (
                    <>
                      {can(user, "dealers.manage") ? (
                        <Link href={`/admin/dealers/${detail.dealer.id}`} className="text-brand hover:underline">
                          {detail.dealer.name}
                        </Link>
                      ) : (
                        detail.dealer.name
                      )}
                      {detail.dealer.status ? <span className="text-muted"> ({DEALER_STATUS_LABELS[detail.dealer.status]})</span> : null}
                    </>
                  ) : (
                    "-"
                  ),
                },
              ]}
            />
          </section>

          <section aria-labelledby="reports-heading">
            <SectionHeading id="reports-heading">Сигнали ({reports.length})</SectionHeading>
            {reports.length === 0 ? (
              <p className="text-sm text-muted">Няма сигнали за тази обява.</p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
                {reports.map((report) => (
                  <li key={report.id} className={report.id === activeReport?.id ? "bg-warning-soft px-4 py-3" : "px-4 py-3"}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{reportReasonLabel(report.reason)}</span>
                      <StatusLabel tone={REPORT_STATUS_TONES[report.status]}>{REPORT_STATUS_LABELS[report.status]}</StatusLabel>
                    </div>
                    {report.details ? <p className="mt-1 text-sm whitespace-pre-line text-ink-2">{report.details}</p> : null}
                    <p className="mt-1 text-sm text-muted">
                      {report.reporterName}, {formatDateTime(report.createdAt)}
                      {report.resolverName ? `. Обработен от ${report.resolverName}` : ""}
                    </p>
                    {report.status === "OPEN" && canManageReports ? (
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <DismissReportDialog reportId={report.id} />
                        {report.id !== activeReport?.id ? (
                          <Link href={`/admin/listings/${listing.id}?report=${report.id}`} className="text-sm text-brand hover:underline">
                            Действие по този сигнал
                          </Link>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
