import { Calendar, Eye, Gauge, Fuel, MapPin, Settings2, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getAttributeSet } from "@/config/attribute-sets";
import { groupFeatures } from "@/config/features";
import { LISTING_STATUS_LABELS, type ListingStatus } from "@/config/listing-status";
import { FUEL_OPTIONS, GEARBOX_OPTIONS, optionLabel } from "@/config/options";
import { Alert } from "@/components/ui/alert";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { FavoriteButton } from "@/features/favorites/components/favorite-button";
import { getFavoritedIds } from "@/features/favorites/queries";
import { ContactSeller } from "@/features/listings/components/contact-seller";
import { ListingTile } from "@/features/listings/components/listing-card";
import { ListingGallery } from "@/features/listings/components/listing-gallery";
import { PhoneReveal } from "@/features/listings/components/phone-reveal";
import { Price } from "@/features/listings/components/price";
import { PromotionLabel } from "@/features/listings/components/promotion-label";
import { ReportListing } from "@/features/listings/components/report-listing";
import { ViewTracker } from "@/features/listings/components/view-tracker";
import { getListingByNumber } from "@/features/listings/detail";
import { listingPath, parseListingParam } from "@/features/listings/paths";
import { getSimilarListings } from "@/features/listings/queries";
import { buildSpecRows } from "@/features/listings/specs";
import { findConversationForListing } from "@/features/messages/service";
import { formatDate, formatMileage, formatNumber, formatPower } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { maskBgPhone } from "@/lib/phone";
import { truncate } from "@/lib/text";
import { canManageListing, canViewListing, isPubliclyVisible } from "@/server/auth/policies";
import { getCurrentUser } from "@/server/auth/session";

async function load(props: PageProps<"/[category]/[listing]">) {
  const { category, listing: param } = await props.params;
  const number = parseListingParam(param);
  if (!number) return null;
  const detail = await getListingByNumber(number);
  if (!detail) return null;
  return { detail, categoryParam: category, param };
}

export async function generateMetadata(props: PageProps<"/[category]/[listing]">): Promise<Metadata> {
  const loaded = await load(props);
  if (!loaded) return {};
  const { listing, category, makeName, modelName } = loaded.detail;
  if (!isPubliclyVisible(listing) && listing.status !== "SOLD") return { title: "Обява", robots: { index: false } };
  const price = listing.priceCents !== null ? formatPrice(listing.priceCents) : "по договаряне";
  const vehicle = makeName && modelName && category.attributeSet !== "parts" ? `${makeName} ${modelName}` : listing.title;
  const title = [vehicle, listing.year].filter(Boolean).join(" ");
  const path = listingPath({ categorySlug: category.slug, number: listing.number, slug: listing.slug });
  return {
    title: { absolute: `${title} - ${price} | MobiTed` },
    description: truncate(`${title}, ${price}. ${listing.description}`, 160),
    alternates: { canonical: path },
    openGraph: {
      title: `${title} - ${price}`,
      description: truncate(listing.description, 200),
      url: path,
      type: "website",
      images: listing.coverImageUrl && !listing.coverImageUrl.endsWith(".svg") ? [{ url: listing.coverImageUrl }] : undefined,
    },
    robots: listing.status === "SOLD" ? { index: false, follow: true } : undefined,
  };
}

export default async function ListingPage(props: PageProps<"/[category]/[listing]">) {
  const loaded = await load(props);
  if (!loaded) notFound();
  const { detail } = loaded;
  const { listing, category } = detail;
  const user = await getCurrentUser();
  if (!canViewListing(user, listing)) notFound();

  const path = listingPath({ categorySlug: category.slug, number: listing.number, slug: listing.slug });
  if (loaded.categoryParam !== category.slug || loaded.param !== path.split("/")[2]) permanentRedirect(path);

  const isOwner = canManageListing(user, listing);
  const isPublic = isPubliclyVisible(listing);
  const set = getAttributeSet(category.attributeSet);
  const [similar, favorited, conversationId] = await Promise.all([
    isPublic || listing.status === "SOLD" ? getSimilarListings(listing) : Promise.resolve([]),
    getFavoritedIds(user?.id, [listing.id]),
    user && !isOwner ? findConversationForListing(user.id, listing.id) : Promise.resolve(null),
  ]);
  const similarFavorites = await getFavoritedIds(user?.id, similar.map((item) => item.id));

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
  const promotion = listing.vipUntil && listing.vipUntil > now ? "VIP" : listing.topUntil && listing.topUntil > now ? "TOP" : null;
  const lastChange = detail.priceHistory[0];
  const priceDrop = lastChange && listing.priceCents !== null && lastChange.oldPriceCents > lastChange.newPriceCents && lastChange.newPriceCents === listing.priceCents ? lastChange : null;
  const loginHref = `/vhod?next=${encodeURIComponent(path)}`;
  const contactState = !user ? "anonymous" : isOwner ? "own" : user.emailVerified ? "ready" : "unverified";
  const dealer = detail.dealer?.id && detail.dealer.status === "ACTIVE" ? detail.dealer : null;
  const location = [detail.cityName, detail.regionName && detail.regionName !== detail.cityName ? `обл. ${detail.regionName}` : null].filter(Boolean).join(", ");

  const keyFacts = [
    listing.year ? { icon: Calendar, label: "Година", value: String(listing.year) } : null,
    listing.mileageKm !== null ? { icon: Gauge, label: "Пробег", value: formatMileage(listing.mileageKm) } : null,
    listing.fuel ? { icon: Fuel, label: "Гориво", value: optionLabel(FUEL_OPTIONS, listing.fuel) ?? "" } : null,
    listing.gearbox ? { icon: Settings2, label: "Скоростна кутия", value: optionLabel(GEARBOX_OPTIONS, listing.gearbox) ?? "" } : null,
    listing.powerHp ? { icon: Zap, label: "Мощност", value: formatPower(listing.powerHp) } : null,
  ].filter((fact): fact is NonNullable<typeof fact> => fact !== null);

  const sellerCard = (
    <section aria-labelledby="seller-heading" className="rounded-lg border border-line bg-surface p-4">
      <h2 id="seller-heading" className="sr-only">
        Продавач
      </h2>
      {dealer ? (
        <div className="flex gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-subtle text-lg font-semibold text-brand">
            {dealer.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dealer.logoUrl} alt="" className="size-full object-contain" />
            ) : (
              dealer.name.slice(0, 1)
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted">Дилър</p>
            <Link href={`/dilari/${dealer.slug}`} className="font-semibold hover:text-brand hover:underline">
              {dealer.name}
            </Link>
            {dealer.address ? <p className="mt-0.5 text-sm text-ink-2">{[dealer.address, detail.cityName].filter(Boolean).join(", ")}</p> : null}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-muted">Частно лице</p>
          <p className="font-semibold">{listing.contactName ?? detail.seller.name}</p>
          <p className="mt-0.5 text-sm text-muted">В MobiTed от {detail.seller.createdAt.getFullYear()} г.</p>
        </div>
      )}
      {location ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-2">
          <MapPin className="size-4 text-muted" aria-hidden="true" />
          {location}
        </p>
      ) : null}
      {isPublic ? (
        <div className="mt-4 space-y-2">
          {listing.contactPhone ? <PhoneReveal listingId={listing.id} masked={maskBgPhone(listing.contactPhone)} /> : null}
          <ContactSeller listingId={listing.id} listingTitle={listing.title} state={contactState} existingConversationId={conversationId} loginHref={loginHref} />
        </div>
      ) : null}
      {dealer ? (
        <Link href={`/dilari/${dealer.slug}`} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
          Всички обяви на дилъра
        </Link>
      ) : null}
    </section>
  );

  return (
    <div className="container-page py-4 pb-24 lg:py-6 lg:pb-6">
      <ViewTracker listingId={listing.id} track={isPublic && !isOwner} />
      <Breadcrumbs
        items={[
          { label: "Начало", href: "/" },
          { label: category.name, href: `/${category.slug}` },
          ...(detail.makeName && detail.makeSlug ? [{ label: detail.makeName, href: `/${category.slug}?make=${detail.makeSlug}` }] : []),
          ...(detail.modelName && detail.makeSlug && detail.modelSlug ? [{ label: detail.modelName, href: `/${category.slug}?make=${detail.makeSlug}&model=${detail.modelSlug}` }] : []),
          { label: `№ ${listing.number}` },
        ]}
      />

      {listing.status === "SOLD" ? (
        <Alert tone="info" title="Продадена" className="mt-3">
          Тази обява вече не е активна. Разгледай подобните обяви по-долу.
        </Alert>
      ) : !isPublic ? (
        <Alert tone="warning" title={`Статус: ${LISTING_STATUS_LABELS[listing.status as ListingStatus]}`} className="mt-3">
          {listing.status === "REJECTED" && listing.rejectionReason ? `Причина: ${listing.rejectionReason}` : "Обявата не се вижда публично."}
          {isOwner ? (
            <>
              {" "}
              <Link href="/profil/obiavi" className="font-medium underline">
                Управлявай обявите си
              </Link>
            </>
          ) : null}
        </Alert>
      ) : null}

      <div className="mt-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] leading-tight font-semibold tracking-tight sm:text-2xl">{listing.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {[detail.generationName, location].filter(Boolean).join(" · ")}
          </p>
        </div>
        <FavoriteButton listingId={listing.id} authenticated={Boolean(user)} initialFavorited={favorited.has(listing.id)} withLabel className="hidden sm:inline-flex" />
        <FavoriteButton listingId={listing.id} authenticated={Boolean(user)} initialFavorited={favorited.has(listing.id)} className="sm:hidden" />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <ListingGallery images={detail.images} title={listing.title} />

          <div className="rounded-lg border border-line bg-surface p-4 lg:hidden">
            <div className="flex items-center gap-2">
              {promotion ? <PromotionLabel type={promotion} /> : null}
            </div>
            <Price priceCents={listing.priceCents} size="lg" />
            {priceDrop ? (
              <p className="mt-1 text-sm text-success tabular">
                {formatPrice(priceDrop.oldPriceCents)} -&gt; {formatPrice(priceDrop.newPriceCents)}
              </p>
            ) : null}
            {listing.priceNegotiable ? <p className="mt-1 text-sm text-muted">Цената подлежи на договаряне</p> : null}
          </div>

          {keyFacts.length > 0 ? (
            <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 xl:grid-cols-5" aria-label="Основни данни">
              {keyFacts.map((fact) => (
                <li key={fact.label} className="flex items-center gap-2.5 bg-surface px-3.5 py-3">
                  <fact.icon className="size-5 shrink-0 text-muted" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[13px] text-muted">{fact.label}</p>
                    <p className="truncate font-semibold tabular">{fact.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}

          <section aria-labelledby="specs-heading" className="rounded-lg border border-line bg-surface">
            <h2 id="specs-heading" className="border-b border-line px-4 py-3 font-semibold">
              Технически данни
            </h2>
            <dl className="grid sm:grid-cols-2">
              {specs.map((row) => (
                <div key={row.label} className="flex justify-between gap-4 border-b border-line px-4 py-2.5 text-[15px] sm:odd:border-r">
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="text-right font-medium tabular">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {featureGroups.length > 0 ? (
            <section aria-labelledby="features-heading" className="rounded-lg border border-line bg-surface">
              <h2 id="features-heading" className="border-b border-line px-4 py-3 font-semibold">
                Оборудване
              </h2>
              <div className="grid gap-5 px-4 py-4 sm:grid-cols-2">
                {featureGroups.map((group) => (
                  <div key={group.key}>
                    <h3 className="text-sm font-semibold text-ink-2">{group.label}</h3>
                    <ul className="mt-1.5 space-y-1 text-[15px]">
                      {group.features.map((feature) => (
                        <li key={feature.key} className="flex gap-2">
                          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                          {feature.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {listing.description ? (
            <section aria-labelledby="description-heading" className="rounded-lg border border-line bg-surface">
              <h2 id="description-heading" className="border-b border-line px-4 py-3 font-semibold">
                Описание
              </h2>
              <p className="px-4 py-4 text-[15px] leading-relaxed break-words whitespace-pre-line">{listing.description}</p>
            </section>
          ) : null}

          {detail.priceHistory.length > 0 ? (
            <section aria-labelledby="price-history-heading" className="rounded-lg border border-line bg-surface">
              <h2 id="price-history-heading" className="border-b border-line px-4 py-3 font-semibold">
                История на цената
              </h2>
              <ul className="divide-y divide-line">
                {detail.priceHistory.map((change) => (
                  <li key={change.changedAt.toISOString()} className="flex justify-between gap-4 px-4 py-2.5 text-[15px]">
                    <span className="text-muted">{formatDate(change.changedAt)}</span>
                    <span className="tabular">
                      {formatPrice(change.oldPriceCents)} -&gt; <strong className={change.newPriceCents < change.oldPriceCents ? "text-success" : ""}>{formatPrice(change.newPriceCents)}</strong>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Обява № {listing.number}</span>
              {listing.publishedAt ? <span>Публикувана {formatDate(listing.publishedAt)}</span> : null}
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" aria-hidden="true" />
                {formatNumber(listing.viewCount)} преглеждания
              </span>
            </p>
            {isPublic && !isOwner ? <ReportListing listingId={listing.id} authenticated={Boolean(user)} loginHref={loginHref} /> : null}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start" aria-label="Цена и продавач">
          <div className="hidden rounded-lg border border-line bg-surface p-4 lg:block">
            {promotion ? <PromotionLabel type={promotion} className="mb-2" /> : null}
            <Price priceCents={listing.priceCents} size="lg" />
            {priceDrop ? (
              <p className="mt-1 text-sm text-success tabular">
                {formatPrice(priceDrop.oldPriceCents)} -&gt; {formatPrice(priceDrop.newPriceCents)}
              </p>
            ) : null}
            {listing.priceNegotiable ? <p className="mt-1 text-sm text-muted">Цената подлежи на договаряне</p> : null}
          </div>
          {isOwner ? (
            <div className="rounded-lg border border-brand/30 bg-brand-soft p-4">
              <p className="text-sm font-semibold text-brand-ink">Това е твоя обява</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ButtonLink href={`/publikuvai/${listing.id}`} variant="secondary" size="sm">
                  Редактирай
                </ButtonLink>
                <ButtonLink href={`/profil/obiavi/${listing.id}/promotirane`} size="sm">
                  Промотирай
                </ButtonLink>
              </div>
            </div>
          ) : null}
          {sellerCard}
        </aside>
      </div>

      {similar.length > 0 ? (
        <section aria-labelledby="similar-heading" className="mt-10">
          <h2 id="similar-heading" className="text-lg font-semibold">
            Подобни обяви
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {similar.map((item) => (
              <li key={item.id}>
                <ListingTile listing={item} favorite={{ authenticated: Boolean(user), active: similarFavorites.has(item.id) }} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isPublic && !isOwner ? (
        <div className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t border-line bg-surface p-3 lg:hidden">
          {listing.contactPhone ? <PhoneReveal listingId={listing.id} masked={maskBgPhone(listing.contactPhone)} /> : <span />}
          <ContactSeller listingId={listing.id} listingTitle={listing.title} state={contactState} existingConversationId={conversationId} loginHref={loginHref} variant="secondary" />
        </div>
      ) : null}
    </div>
  );
}
