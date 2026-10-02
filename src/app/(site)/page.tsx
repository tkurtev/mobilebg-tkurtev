import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { getActiveCategories, getMakesForVehicleType, getRegions } from "@/features/catalog/queries";
import { getFavoritedIds } from "@/features/favorites/queries";
import { HomeSearch } from "@/features/home/components/home-search";
import { RecentlyViewedLocal, RecentlyViewedSection } from "@/features/home/components/recently-viewed-local";
import { getCategoryCounts, getFeaturedDealers, getPopularMakes } from "@/features/home/queries";
import { ListingTile } from "@/features/listings/components/listing-card";
import { getCardsByIds, getLatestListings, getPromotedListings } from "@/features/listings/queries";
import { getRecentlyViewedIds } from "@/features/recently-viewed/service";
import { formatNumber } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  alternates: { canonical: "/" },
};

function SectionHeader({ id, title, href, linkLabel }: { id: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {href ? (
        <Link href={href} className="text-sm font-medium text-brand hover:underline">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default async function HomePage() {
  const [user, categories, counts, regions, makes, popularMakes, promoted, latest, dealers] = await Promise.all([
    getCurrentUser(),
    getActiveCategories(),
    getCategoryCounts(),
    getRegions(),
    getMakesForVehicleType("car"),
    getPopularMakes("avtomobili", 18),
    getPromotedListings(8),
    getLatestListings(12),
    getFeaturedDealers(6),
  ]);
  const recent = user ? await getCardsByIds(await getRecentlyViewedIds(user.id, 6)) : [];
  const favorited = await getFavoritedIds(user?.id, [...promoted, ...latest].map((item) => item.id));
  const favorite = (id: string) => ({ authenticated: Boolean(user), active: favorited.has(id) });

  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="container-page grid gap-5 py-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:py-6">
          <HomeSearch
            categories={categories.map((category) => ({ ...category, count: counts[category.id] ?? 0 }))}
            initialMakes={makes}
            regions={regions}
          />
          <section aria-labelledby="popular-makes-heading" className="rounded-lg border border-line bg-surface p-4">
            <h2 id="popular-makes-heading" className="text-sm font-semibold">
              Популярни марки
            </h2>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 sm:grid-cols-3 lg:grid-cols-2">
              {popularMakes.map((make) => (
                <li key={make.slug}>
                  <Link href={`/avtomobili?make=${make.slug}`} className="flex items-baseline justify-between gap-2 py-1 text-sm text-ink hover:text-brand">
                    <span className="truncate">{make.name}</span>
                    <span className="text-[13px] text-muted tabular">{formatNumber(make.count)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="container-page space-y-10 py-8">
        {recent.length > 0 ? <RecentlyViewedSection items={recent} /> : !user ? <RecentlyViewedLocal /> : null}

        {promoted.length > 0 ? (
          <section aria-labelledby="vip-heading">
            <SectionHeader id="vip-heading" title="VIP обяви" />
            <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {promoted.map((item, index) => (
                <li key={item.id}>
                  <ListingTile listing={item} favorite={favorite(item.id)} priority={index < 4} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="latest-heading">
          <SectionHeader id="latest-heading" title="Последни обяви" href="/avtomobili" linkLabel="Виж всички автомобили" />
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {latest.map((item) => (
              <li key={item.id}>
                <ListingTile listing={item} favorite={favorite(item.id)} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="categories-heading">
          <SectionHeader id="categories-heading" title="Категории" />
          <ul className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <li key={category.id} className="bg-surface">
                <Link href={`/${category.slug}`} className="flex h-full flex-col px-4 py-3 hover:bg-subtle">
                  <span className="text-[15px] font-medium">{category.name}</span>
                  <span className="text-sm text-muted tabular">{formatNumber(counts[category.id] ?? 0)} обяви</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {dealers.length > 0 ? (
          <section aria-labelledby="dealers-heading">
            <SectionHeader id="dealers-heading" title="Дилъри" href="/dilari" linkLabel="Всички дилъри" />
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dealers.map((dealer) => (
                <li key={dealer.id}>
                  <Link href={`/dilari/${dealer.slug}`} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3 hover:border-line-strong">
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-subtle text-lg font-semibold text-brand">
                      {dealer.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dealer.logoUrl} alt="" className="size-full object-contain" />
                      ) : (
                        dealer.name.slice(0, 1)
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{dealer.name}</span>
                      <span className="block text-sm text-muted">
                        {[dealer.cityName, `${formatNumber(dealer.activeCount)} активни обяви`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="flex flex-col items-start justify-between gap-4 rounded-lg border border-line bg-surface p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">Продаваш автомобил?</h2>
            <p className="mt-0.5 text-ink-2">Публикуването на обява е безплатно.</p>
          </div>
          <ButtonLink href="/publikuvai">Публикувай обява</ButtonLink>
        </section>
      </div>
    </>
  );
}
