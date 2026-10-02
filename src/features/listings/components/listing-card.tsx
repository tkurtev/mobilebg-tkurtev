import Link from "next/link";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ListingCardData } from "../card-data";
import { ListingImage } from "./listing-image";
import { Price } from "./price";
import { PromotionLabel } from "./promotion-label";

type CardProps = {
  listing: ListingCardData;
  favorite?: { authenticated: boolean; active: boolean } | null;
  priority?: boolean;
  headingLevel?: "h2" | "h3";
};

function SellerLine({ listing }: { listing: ListingCardData }) {
  return listing.sellerType === "dealer" ? <span>Дилър{listing.dealerName ? `: ${listing.dealerName}` : ""}</span> : <span>Частно лице</span>;
}

/** Horizontal row used in search results. */
export function ListingRow({ listing, favorite, priority, headingLevel: Heading = "h2" }: CardProps) {
  return (
    <article
      className={cn(
        "relative flex gap-3 rounded-lg border p-2.5 transition-colors sm:gap-4 sm:p-3",
        listing.highlighted ? "border-highlight-line bg-highlight" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <ListingImage
        src={listing.coverImageUrl}
        alt={listing.title}
        count={listing.imageCount}
        priority={priority}
        className="w-32 shrink-0 self-start rounded-md sm:w-56 md:w-60"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <Heading className="min-w-0 flex-1 text-[15px] leading-snug font-semibold sm:text-base">
            <Link href={listing.href} className="line-clamp-2 after:absolute after:inset-0 after:content-[''] hover:text-brand">
              {listing.title}
            </Link>
          </Heading>
          {favorite ? (
            <FavoriteButton listingId={listing.id} authenticated={favorite.authenticated} initialFavorited={favorite.active} className="relative z-10 -mt-1 -mr-1" />
          ) : null}
        </div>
        <Price priceCents={listing.priceCents} previousPriceCents={listing.previousPriceCents} negotiable={listing.priceNegotiable} className="mt-0.5" />
        {listing.specs.length > 0 ? <p className="mt-1 text-sm text-ink-2">{listing.specs.join(" · ")}</p> : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[13px] text-muted">
          {listing.promotion ? <PromotionLabel type={listing.promotion} /> : null}
          {listing.location ? <span>{listing.location}</span> : null}
          <span className="hidden sm:inline">
            <SellerLine listing={listing} />
          </span>
          {listing.publishedAt ? <time dateTime={listing.publishedAt}>{formatRelativeDate(new Date(listing.publishedAt))}</time> : null}
        </div>
      </div>
    </article>
  );
}

/** Compact vertical card used on the homepage, dealer pages and similar listings. */
export function ListingTile({ listing, favorite, priority, headingLevel: Heading = "h3" }: CardProps) {
  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border transition-colors",
        listing.highlighted ? "border-highlight-line bg-highlight" : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <ListingImage src={listing.coverImageUrl} alt={listing.title} count={listing.imageCount} priority={priority} sizes="(max-width: 640px) 50vw, 300px" />
      {listing.promotion ? <PromotionLabel type={listing.promotion} className="absolute top-2 left-2" /> : null}
      {favorite ? (
        <FavoriteButton
          listingId={listing.id}
          authenticated={favorite.authenticated}
          initialFavorited={favorite.active}
          className="absolute top-1.5 right-1.5 z-10 bg-surface/90 hover:bg-surface"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-3">
        <Heading className="text-[15px] leading-snug font-semibold">
          <Link href={listing.href} className="line-clamp-2 after:absolute after:inset-0 after:content-[''] group-hover:text-brand">
            {listing.title}
          </Link>
        </Heading>
        <Price priceCents={listing.priceCents} previousPriceCents={listing.previousPriceCents} size="sm" className="mt-1" />
        {listing.specs.length > 0 ? <p className="mt-1 line-clamp-1 text-[13px] text-ink-2">{listing.specs.slice(0, 3).join(" · ")}</p> : null}
        <p className="mt-auto truncate pt-1.5 text-[13px] text-muted">
          {[listing.location, listing.sellerType === "dealer" ? "Дилър" : null].filter(Boolean).join(" · ")}
        </p>
      </div>
    </article>
  );
}
