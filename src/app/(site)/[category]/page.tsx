import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttributeSet } from "@/config/attribute-sets";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getCategoryBySlug, getCities, getGenerationsForModel, getMakesForVehicleType, getModelsForMake, getRegions } from "@/features/catalog/queries";
import { getFavoritedIds } from "@/features/favorites/queries";
import { ListingRow } from "@/features/listings/components/listing-card";
import { SaveSearchButton } from "@/features/saved-searches/components/save-search-button";
import { buildFilterChips, searchTitle } from "@/features/search/chips";
import { MobileFilters } from "@/features/search/components/mobile-filters";
import { SearchFilterPanel } from "@/features/search/components/search-filters";
import { SortSelect } from "@/features/search/components/sort-select";
import { countActiveFilters, parseSearchParams, searchHref, serializeSearch } from "@/features/search/params";
import { resolveRefs, searchListings } from "@/features/search/queries";
import { formatCount } from "@/lib/format";
import { getCurrentUser } from "@/server/auth/session";

export async function generateMetadata(props: PageProps<"/[category]">): Promise<Metadata> {
  const { category: slug } = await props.params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  const raw = await props.searchParams;
  const { filters } = parseSearchParams(raw, getAttributeSet(category.attributeSet));
  const refs = await resolveRefs(category, filters);
  const title = searchTitle(category.name, refs);
  const canonical = new URLSearchParams();
  if (filters.make && refs.make) canonical.set("make", filters.make);
  if (filters.model && refs.model) canonical.set("model", filters.model);
  return {
    title: title === category.name ? `${category.name} - обяви` : `${title} - обяви`,
    description: `${title}: обяви за продажба в България с цени в евро. Филтрирай по цена, година, пробег и местоположение.`,
    alternates: { canonical: canonical.size > 0 ? `/${category.slug}?${canonical}` : `/${category.slug}` },
    robots: countActiveFilters(filters) > 3 ? { index: false, follow: true } : undefined,
  };
}

export default async function CategorySearchPage(props: PageProps<"/[category]">) {
  const { category: slug } = await props.params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const raw = await props.searchParams;
  const set = getAttributeSet(category.attributeSet);
  const state = parseSearchParams(raw, set);
  const [result, user, regions, cities, makes] = await Promise.all([
    searchListings(category, state),
    getCurrentUser(),
    getRegions(),
    getCities(),
    category.vehicleType ? getMakesForVehicleType(category.vehicleType) : Promise.resolve([]),
  ]);
  const { refs } = result;
  const [models, generations, favorited] = await Promise.all([
    refs.make && category.vehicleType ? getModelsForMake(refs.make.id, category.vehicleType) : Promise.resolve([]),
    refs.model ? getGenerationsForModel(refs.model.id) : Promise.resolve([]),
    getFavoritedIds(user?.id, result.items.map((item) => item.id)),
  ]);

  const title = searchTitle(category.name, refs);
  const chips = buildFilterChips(category.slug, set, state.filters, refs, state.sort);
  const activeCount = countActiveFilters(state.filters);
  const currentHref = searchHref(category.slug, state.filters, { sort: state.sort, page: result.page });
  const filterProps = {
    categorySlug: category.slug,
    attributeSetKey: category.attributeSet,
    vehicleType: category.vehicleType,
    filters: state.filters,
    sort: state.sort,
    makes,
    models,
    generations,
    regions,
    cities,
  };

  return (
    <div className="container-page py-4 lg:py-6">
      <Breadcrumbs
        items={[
          { label: "Начало", href: "/" },
          { label: category.name, href: `/${category.slug}` },
          ...(refs.make ? [{ label: refs.make.name, href: searchHref(category.slug, { ...state.filters, model: undefined, generation: undefined }) }] : []),
          ...(refs.model ? [{ label: refs.model.name }] : []),
        ]}
      />
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted" aria-live="polite">
          {formatCount(result.total, "обява", "обяви")}
        </p>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <aside className="hidden lg:block" aria-label="Филтри">
          <div className="rounded-lg border border-line bg-surface p-4">
            <SearchFilterPanel {...filterProps} mode="instant" idPrefix="d" />
          </div>
        </aside>

        <section aria-label="Резултати">
          <div className="flex items-center gap-2">
            <MobileFilters {...filterProps} activeCount={activeCount} />
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <SaveSearchButton
                authenticated={Boolean(user)}
                categorySlug={category.slug}
                query={serializeSearch(state.filters, { sort: state.sort }).toString()}
                suggestedName={chips.length > 0 ? `${title}: ${chips.slice(0, 3).map((chip) => chip.label).join(", ")}`.slice(0, 80) : title}
                loginHref={`/vhod?next=${encodeURIComponent(currentHref)}`}
              />
              <SortSelect value={state.sort} />
            </div>
          </div>

          {chips.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {chips.map((chip) => (
                <Link
                  key={chip.key}
                  href={chip.href}
                  scroll={false}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 text-[13px] text-ink hover:border-danger hover:text-danger"
                  aria-label={`Премахни филтър ${chip.label}`}
                >
                  {chip.label}
                  <span aria-hidden="true" className="text-muted">
                    ×
                  </span>
                </Link>
              ))}
              <Link href={`/${category.slug}`} className="ml-1 text-[13px] font-medium text-brand hover:underline">
                Изчисти всички
              </Link>
            </div>
          ) : null}

          {result.items.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="Няма обяви по избраните критерии."
              description="Промени или изчисти част от филтрите."
              action={
                activeCount > 0 ? (
                  <Link href={`/${category.slug}`} className="font-medium text-brand hover:underline">
                    Изчисти филтрите
                  </Link>
                ) : null
              }
            />
          ) : (
            <ol className="mt-3 space-y-2.5" aria-label="Резултати">
              {result.items.map((item, index) => (
                <li key={item.id}>
                  <ListingRow listing={item} priority={index < 2} favorite={{ authenticated: Boolean(user), active: favorited.has(item.id) }} />
                </li>
              ))}
            </ol>
          )}

          <div className="mt-6">
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              hrefForPage={(page) => searchHref(category.slug, state.filters, { sort: state.sort, page })}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
