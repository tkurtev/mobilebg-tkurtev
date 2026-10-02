import { Clock, Globe, Mail, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { appUrl } from "@/config/env";
import { getFavoritedIds } from "@/features/favorites/queries";
import { DealerLogo } from "@/features/dealers/components/dealer-logo";
import { OpeningHoursTable } from "@/features/dealers/components/opening-hours-table";
import { formatDayHours, sofiaIsoWeekday } from "@/features/dealers/hours";
import { pageParam, slugParam } from "@/features/dealers/params";
import { getDealerCategoryCounts, getDealerInventory, getPublicDealerBySlug, type PublicDealer } from "@/features/dealers/queries";
import { ListingRow } from "@/features/listings/components/listing-card";
import { cn } from "@/lib/cn";
import { formatCount, formatNumber } from "@/lib/format";
import { formatBgPhone } from "@/lib/phone";
import { truncate } from "@/lib/text";
import { getCurrentUser } from "@/server/auth/session";

async function loadDealer(params: PageProps<"/dilari/[slug]">["params"]): Promise<PublicDealer | null> {
  const slug = slugParam((await params).slug);
  return slug ? getPublicDealerBySlug(slug) : null;
}

function location(dealer: Pick<PublicDealer, "address" | "cityName">): string {
  return [dealer.address, dealer.cityName].filter(Boolean).join(", ");
}

function websiteLabel(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export async function generateMetadata(props: PageProps<"/dilari/[slug]">): Promise<Metadata> {
  const dealer = await loadDealer(props.params);
  if (!dealer) return {};
  const fallback = `${dealer.name}${dealer.cityName ? `, ${dealer.cityName}` : ""}: автомобили и обяви за продажба, контакти и работно време.`;
  const path = `/dilari/${dealer.slug}`;
  return {
    title: { absolute: `${dealer.name} - автомобили | MobiTed` },
    description: truncate(dealer.description.replace(/\s+/g, " ").trim() || fallback, 160),
    alternates: { canonical: path },
    openGraph: { title: dealer.name, url: path, type: "website", images: dealer.logoUrl ? [{ url: dealer.logoUrl }] : undefined },
  };
}

export default async function DealerPage(props: PageProps<"/dilari/[slug]">) {
  const dealer = await loadDealer(props.params);
  if (!dealer) notFound();

  const raw = await props.searchParams;
  const categories = await getDealerCategoryCounts(dealer.id);
  const selected = categories.find((category) => category.slug === slugParam(raw.category));
  const [inventory, user] = await Promise.all([
    getDealerInventory(dealer.id, { categoryId: selected?.id, page: pageParam(raw.page) }),
    getCurrentUser(),
  ]);
  const favorited = await getFavoritedIds(user?.id, inventory.items.map((item) => item.id));
  const totalActive = categories.reduce((sum, category) => sum + category.count, 0);
  const searchCategory = selected ?? [...categories].sort((a, b) => b.count - a.count)[0];
  const today = sofiaIsoWeekday();
  const basePath = `/dilari/${dealer.slug}`;
  const todayHours = dealer.hours.find((day) => day.dayOfWeek === today);

  const inventoryHref = (categorySlug: string | undefined, page = 1) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (page > 1) params.set("page", String(page));
    return params.size > 0 ? `${basePath}?${params}` : basePath;
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AutoDealer",
    name: dealer.name,
    telephone: dealer.phone,
    url: `${appUrl()}${basePath}`,
    image: dealer.logoUrl ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: dealer.address || undefined, addressLocality: dealer.cityName ?? undefined, addressCountry: "BG" },
  };

  return (
    <div className="container-page py-4 lg:py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ label: "Начало", href: "/" }, { label: "Дилъри", href: "/dilari" }, { label: dealer.name }]} />

      <header className="mt-3 rounded-lg border border-line bg-surface p-4 sm:p-5">
        <div className="flex gap-4">
          <DealerLogo name={dealer.name} logoUrl={dealer.logoUrl} className="size-16 text-2xl sm:size-20" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">{dealer.name}</h1>
            {location(dealer) ? (
              <p className="mt-1 flex items-start gap-1.5 text-ink-2">
                <MapPin className="mt-1 size-4 shrink-0 text-muted" aria-hidden="true" />
                <span>{location(dealer)}</span>
              </p>
            ) : null}
            {todayHours ? (
              <p className="mt-0.5 flex items-start gap-1.5 text-ink-2">
                <Clock className="mt-1 size-4 shrink-0 text-muted" aria-hidden="true" />
                <span>Днес: {todayHours.isClosed ? "почивен ден" : formatDayHours(todayHours)}</span>
              </p>
            ) : null}
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[15px]">
              <li>
                <a href={`tel:${dealer.phone}`} className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
                  <Phone className="size-4" aria-hidden="true" />
                  <span className="tabular">{formatBgPhone(dealer.phone)}</span>
                </a>
              </li>
              {dealer.website ? (
                <li>
                  <a href={dealer.website} target="_blank" rel="nofollow noopener" className="inline-flex items-center gap-1.5 text-brand hover:underline">
                    <Globe className="size-4" aria-hidden="true" />
                    {websiteLabel(dealer.website)}
                  </a>
                </li>
              ) : null}
              {dealer.email ? (
                <li>
                  <a href={`mailto:${dealer.email}`} className="inline-flex items-center gap-1.5 text-brand hover:underline">
                    <Mail className="size-4" aria-hidden="true" />
                    {dealer.email}
                  </a>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
        {dealer.description ? <p className="mt-4 max-w-3xl text-[15px] leading-relaxed whitespace-pre-line text-ink-2">{dealer.description}</p> : null}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="inventory-heading" className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 id="inventory-heading" className="text-lg font-semibold">
              Обяви <span className="font-normal text-muted tabular">({formatNumber(totalActive)})</span>
            </h2>
            {searchCategory ? (
              <Link href={`/${searchCategory.slug}?dealer=${dealer.slug}`} className="text-sm font-medium text-brand hover:underline">
                Търсене с всички филтри в {searchCategory.name}
              </Link>
            ) : null}
          </div>

          {categories.length > 1 ? (
            <nav aria-label="Категории" className="mt-3">
              <ul className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
                {[{ slug: undefined, name: "Всички", count: totalActive }, ...categories].map((category) => {
                  const active = category.slug === selected?.slug;
                  return (
                    <li key={category.slug ?? "all"} className="shrink-0">
                      <Link
                        href={inventoryHref(category.slug)}
                        aria-current={active ? "page" : undefined}
                        scroll={false}
                        className={cn(
                          "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-sm whitespace-nowrap",
                          active ? "border-brand/40 bg-brand-soft font-medium text-brand-ink" : "border-line-strong bg-surface text-ink-2 hover:bg-subtle hover:text-ink",
                        )}
                      >
                        {category.name}
                        <span className="text-muted tabular">{formatNumber(category.count)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          ) : null}

          {inventory.items.length === 0 ? (
            <EmptyState className="mt-3" title="Дилърът няма активни обяви в момента." />
          ) : (
            <>
              {selected ? <p className="mt-3 text-sm text-muted">{formatCount(inventory.total, "обява", "обяви")} в {selected.name}</p> : null}
              <ol className="mt-3 space-y-2.5">
                {inventory.items.map((item, index) => (
                  <li key={item.id}>
                    <ListingRow listing={item} priority={index < 2} headingLevel="h3" favorite={{ authenticated: Boolean(user), active: favorited.has(item.id) }} />
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="mt-6">
            <Pagination page={inventory.page} totalPages={inventory.totalPages} hrefForPage={(page) => inventoryHref(selected?.slug, page)} />
          </div>
        </section>

        <aside className="space-y-4 lg:row-start-1 lg:col-start-2">
          {dealer.hours.length > 0 ? (
            <section aria-labelledby="hours-heading" className="rounded-lg border border-line bg-surface">
              <h2 id="hours-heading" className="border-b border-line px-4 py-3 font-semibold">
                Работно време
              </h2>
              <div className="p-2">
                <OpeningHoursTable hours={dealer.hours} today={today} caption={`Работно време на ${dealer.name}`} />
              </div>
            </section>
          ) : null}

          {dealer.locations.length > 1 ? (
            <section aria-labelledby="locations-heading" className="rounded-lg border border-line bg-surface">
              <h2 id="locations-heading" className="border-b border-line px-4 py-3 font-semibold">
                Обекти
              </h2>
              <ul className="divide-y divide-line">
                {dealer.locations.map((place) => (
                  <li key={place.id} className="px-4 py-3 text-sm">
                    <p className="font-medium text-ink">{place.name}</p>
                    <p className="mt-0.5 text-ink-2">{[place.address, place.cityName].filter(Boolean).join(", ")}</p>
                    {place.phone ? (
                      <a href={`tel:${place.phone}`} className="mt-0.5 inline-block text-brand tabular hover:underline">
                        {formatBgPhone(place.phone)}
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
