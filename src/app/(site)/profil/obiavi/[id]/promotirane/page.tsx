import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isPromotionType } from "@/config/promotions";
import { LISTING_STATUS_LABELS, LISTING_STATUS_TONES } from "@/config/listing-status";
import { Alert } from "@/components/ui/alert";
import { Panel } from "@/components/ui/panel";
import { StatusLabel } from "@/components/ui/status-label";
import { PageHeading } from "@/features/account/components/account-shell";
import { ListingImage } from "@/features/listings/components/listing-image";
import { Price } from "@/features/listings/components/price";
import { promotionName } from "@/features/promotions/catalog";
import { PromotionPicker } from "@/features/promotions/components/promotion-picker";
import { getPromotableListing } from "@/features/promotions/queries";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Промотиране" };

export default async function PromoteListingPage(props: PageProps<"/profil/obiavi/[id]/promotirane">) {
  const { id } = await props.params;
  const user = await requireUser(`/profil/obiavi/${id}/promotirane`);
  const listing = await getPromotableListing(user, id);
  if (!listing) notFound();

  const query = await props.searchParams;
  const requested = typeof query.paket === "string" && isPromotionType(query.paket) ? query.paket : "VIP";
  const title = listing.title || `Обява № ${listing.number}`;

  return (
    <>
      <Link href="/profil/obiavi" className="mb-2 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink hover:underline">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Моите обяви
      </Link>
      <PageHeading title="Промотиране" />

      <Panel className="mb-6">
        <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
          <ListingImage src={listing.coverImageUrl} alt="" sizes="128px" className="w-24 shrink-0 self-start rounded-md sm:w-32" />
          <div className="min-w-0 flex-1">
            <p className="leading-snug font-semibold break-words">
              {listing.promotable ? (
                <Link href={listing.path} className="hover:text-brand hover:underline">
                  {title}
                </Link>
              ) : (
                title
              )}
            </p>
            <Price priceCents={listing.priceCents} size="sm" className="mt-0.5" />
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <StatusLabel tone={LISTING_STATUS_TONES[listing.displayStatus]}>{LISTING_STATUS_LABELS[listing.displayStatus]}</StatusLabel>
              <span className="text-sm text-muted">№ {listing.number}</span>
            </div>
          </div>
        </div>
        <div className="border-t border-line px-3 py-2.5 text-sm sm:px-4">
          <h2 className="sr-only">Активни промоции</h2>
          {listing.activePromotions.length > 0 ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {listing.activePromotions.map((promotion) => (
                <li key={promotion.type}>
                  <span className="font-medium">{promotionName(promotion.type)}</span>{" "}
                  <span className="text-ink-2">до {formatDate(promotion.endsAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">Няма активни промоции.</p>
          )}
        </div>
      </Panel>

      <h2 className="mb-3 text-lg font-semibold">Избери промоция</h2>
      {listing.promotable ? null : (
        <Alert tone="warning" className="mb-3">
          Само активни обяви могат да бъдат промотирани. Активирай или поднови обявата от{" "}
          <Link href="/profil/obiavi" className="font-medium underline">
            Моите обяви
          </Link>
          .
        </Alert>
      )}
      <PromotionPicker listing={listing} defaultType={requested} />
    </>
  );
}
