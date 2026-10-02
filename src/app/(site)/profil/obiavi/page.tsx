import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LISTING_STATUS_LABELS, LISTING_STATUS_TONES, type ListingStatus } from "@/config/listing-status";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusLabel } from "@/components/ui/status-label";
import { PageHeading } from "@/features/account/components/account-shell";
import { OwnerListingActions } from "@/features/listings/components/owner-listing-actions";
import { PromotionLabel } from "@/features/listings/components/promotion-label";
import { countOwnerListingsByFilter, getOwnerListings, OWNER_FILTERS, type OwnerFilter } from "@/features/listings/owner-queries";
import { cn } from "@/lib/cn";
import { formatDate, formatNumber } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Моите обяви" };

export default async function MyListingsPage(props: PageProps<"/profil/obiavi">) {
  const user = await requireUser("/profil/obiavi");
  const params = await props.searchParams;
  const filter = (typeof params.status === "string" && params.status in OWNER_FILTERS ? params.status : "all") as OwnerFilter;
  const [items, counts] = await Promise.all([getOwnerListings(user, filter), countOwnerListingsByFilter(user)]);

  return (
    <>
      <PageHeading
        title="Моите обяви"
        description={user.dealer ? `Включва всички обяви на ${user.dealer.name}.` : undefined}
        actions={<ButtonLink href="/publikuvai">Публикувай обява</ButtonLink>}
      />
      <nav aria-label="Филтър по статус" className="scrollbar-none -mx-4 mb-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ul className="flex gap-1 border-b border-line">
          {(Object.entries(OWNER_FILTERS) as [OwnerFilter, (typeof OWNER_FILTERS)[OwnerFilter]][]).map(([key, config]) =>
            key === "all" || counts[key] > 0 ? (
              <li key={key}>
                <Link
                  href={key === "all" ? "/profil/obiavi" : `/profil/obiavi?status=${key}`}
                  aria-current={filter === key ? "page" : undefined}
                  className={cn(
                    "-mb-px flex h-10 items-center gap-1.5 border-b-2 px-3 text-sm whitespace-nowrap",
                    filter === key ? "border-brand font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink",
                  )}
                >
                  {config.label}
                  <span className="text-muted tabular">{counts[key]}</span>
                </Link>
              </li>
            ) : null,
          )}
        </ul>
      </nav>

      {items.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "Все още нямаш обяви." : "Няма обяви в тази група."}
          action={filter === "all" ? <ButtonLink href="/publikuvai">Публикувай първата си обява</ButtonLink> : null}
        />
      ) : (
        <ul className="space-y-2.5" data-testid="my-listings">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 rounded-lg border border-line bg-surface p-3" data-testid="my-listing" data-listing-id={item.id}>
              <Link href={item.status === "DRAFT" ? `/publikuvai/${item.id}` : item.path} className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md bg-subtle sm:w-36">
                {item.coverImageUrl ? <Image src={item.coverImageUrl} alt="" fill unoptimized sizes="144px" className="object-cover" /> : null}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link href={item.status === "DRAFT" ? `/publikuvai/${item.id}` : item.path} className="line-clamp-2 font-semibold hover:text-brand">
                    {item.title || "Без заглавие"}
                  </Link>
                  <p className="mt-0.5 font-semibold tabular" data-testid="my-listing-price">
                    {item.priceCents !== null ? formatPrice(item.priceCents) : "Без цена"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <StatusLabel tone={item.expired ? "muted" : LISTING_STATUS_TONES[item.status as ListingStatus]}>
                      {item.expired ? LISTING_STATUS_LABELS.EXPIRED : LISTING_STATUS_LABELS[item.status as ListingStatus]}
                    </StatusLabel>
                    {item.promotion === "VIP" || item.promotion === "TOP" ? <PromotionLabel type={item.promotion} /> : item.promotion === "HIGHLIGHT" ? <span className="text-promo">Открояване</span> : null}
                    <span>№ {item.number}</span>
                    {item.status !== "DRAFT" ? (
                      <span>
                        {formatNumber(item.viewCount)} прегл. · {formatNumber(item.favoriteCount)} люб. · {formatNumber(item.inquiryCount)} запитв.
                      </span>
                    ) : null}
                    {item.status === "ACTIVE" && item.expiresAt && !item.expired ? <span>Изтича {formatDate(item.expiresAt)}</span> : null}
                  </div>
                  {item.status === "REJECTED" && item.rejectionReason ? <p className="mt-1 text-sm text-danger">Причина: {item.rejectionReason}</p> : null}
                  {item.status === "PAUSED" && item.moderationLock ? <p className="mt-1 text-sm text-danger">Спряна от модератор.</p> : null}
                </div>
                <OwnerListingActions
                  listing={{
                    id: item.id,
                    status: item.status,
                    path: item.path,
                    priceEuros: item.priceCents !== null ? Math.floor(item.priceCents / 100) : null,
                    expired: item.expired,
                    moderationLock: item.moderationLock,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
