import { MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getCities, getRegions } from "@/features/catalog/queries";
import { DealerFilterBar } from "@/features/dealers/components/dealer-filter-bar";
import { DealerLogo } from "@/features/dealers/components/dealer-logo";
import { firstParam, pageParam, slugParam } from "@/features/dealers/params";
import { searchDealers } from "@/features/dealers/queries";
import { formatCount, formatNumber } from "@/lib/format";
import { formatBgPhone } from "@/lib/phone";

type Filters = { q?: string; region?: string; city?: string };

async function parseFilters(searchParams: PageProps<"/dilari">["searchParams"]): Promise<Filters & { page: number }> {
  const raw = await searchParams;
  return {
    q: firstParam(raw.q)?.slice(0, 80),
    region: slugParam(raw.region),
    city: slugParam(raw.city),
    page: pageParam(raw.page),
  };
}

function directoryHref(filters: Filters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.region) params.set("region", filters.region);
  if (filters.city) params.set("city", filters.city);
  if (page > 1) params.set("page", String(page));
  return params.size > 0 ? `/dilari?${params}` : "/dilari";
}

export async function generateMetadata(props: PageProps<"/dilari">): Promise<Metadata> {
  const filters = await parseFilters(props.searchParams);
  const filtered = Boolean(filters.q || filters.region || filters.city || filters.page > 1);
  return {
    title: "Дилъри",
    description: "Автокъщи и дилъри на автомобили, бусове и техника в България. Контакти, адреси, работно време и активни обяви.",
    alternates: { canonical: "/dilari" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function DealersPage(props: PageProps<"/dilari">) {
  const parsed = await parseFilters(props.searchParams);
  const [regions, cities] = await Promise.all([getRegions(), getCities()]);
  const requestedCity = cities.find((option) => option.slug === parsed.city);
  const region = regions.find((option) => (parsed.region ? option.slug === parsed.region : option.id === requestedCity?.regionId));
  const city = requestedCity && requestedCity.regionId === region?.id ? requestedCity : undefined;
  const filters: Filters = { q: parsed.q, region: region?.slug, city: city?.slug };
  const result = await searchDealers({ ...filters, page: parsed.page });
  const hasFilters = Boolean(filters.q || filters.region || filters.city);

  return (
    <div className="container-page py-4 lg:py-6">
      <Breadcrumbs items={[{ label: "Начало", href: "/" }, { label: "Дилъри" }]} />
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Дилъри</h1>
        <p className="text-sm text-muted" aria-live="polite">
          {formatCount(result.total, "дилър", "дилъра")}
        </p>
      </div>

      <div className="mt-4">
        <DealerFilterBar
          key={`${filters.q ?? ""}|${filters.region ?? ""}|${filters.city ?? ""}`}
          regions={regions}
          cities={cities.map((option) => ({ slug: option.slug, name: option.name, regionId: option.regionId }))}
          values={filters}
        />
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          className="mt-4"
          title="Няма дилъри по избраните критерии."
          action={
            hasFilters ? (
              <Link href="/dilari" className="font-medium text-brand hover:underline">
                Изчисти филтрите
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface" aria-label="Дилъри">
          {result.items.map((dealer) => (
            <li key={dealer.id} className="relative flex gap-3 px-3 py-3 hover:bg-subtle/60 sm:gap-4 sm:px-4">
              <DealerLogo name={dealer.name} logoUrl={dealer.logoUrl} className="size-14" />
              <div className="grid min-w-0 flex-1 gap-x-6 gap-y-1 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="min-w-0">
                  <h2 className="text-base leading-snug font-semibold">
                    <Link href={`/dilari/${dealer.slug}`} className="after:absolute after:inset-0 after:content-[''] hover:text-brand">
                      {dealer.name}
                    </Link>
                  </h2>
                  <p className="mt-0.5 flex items-start gap-1.5 text-sm text-ink-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden="true" />
                    <span>{[dealer.cityName, dealer.address].filter(Boolean).join(", ") || "Няма посочен адрес"}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm md:justify-end">
                  <span className="text-ink-2">
                    <span className="font-semibold text-ink tabular">{formatNumber(dealer.activeCount)}</span>{" "}
                    {dealer.activeCount === 1 ? "активна обява" : "активни обяви"}
                  </span>
                  <a href={`tel:${dealer.phone}`} className="relative z-10 inline-flex items-center gap-1.5 text-brand hover:underline">
                    <Phone className="size-3.5" aria-hidden="true" />
                    <span className="tabular">{formatBgPhone(dealer.phone)}</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6">
        <Pagination page={result.page} totalPages={result.totalPages} hrefForPage={(page) => directoryHref(filters, page)} />
      </div>
    </div>
  );
}
