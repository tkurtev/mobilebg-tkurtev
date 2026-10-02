import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPromotionProduct } from "@/config/promotions";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PageHeading } from "@/features/account/components/account-shell";
import { DealerListingsTable } from "@/features/dealers/components/dealer-listings-table";
import { DealerListingsToolbar } from "@/features/dealers/components/dealer-listings-toolbar";
import { DealerStatsStrip } from "@/features/dealers/components/dealer-stats-strip";
import { firstParam, pageParam, parseDealerListingFilter, type DealerListingFilter } from "@/features/dealers/params";
import { getDealerActivePromotions, getDealerListings, getDealerStats } from "@/features/dealers/queries";
import { formatDate, formatCount } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Дилърски панел" };

function listingsHref(status: DealerListingFilter, q: string | undefined, page: number): string {
  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  return params.size > 0 ? `/profil/dilar?${params}#obiavi` : "/profil/dilar#obiavi";
}

export default async function DealerDashboardPage(props: PageProps<"/profil/dilar">) {
  const user = await requireUser("/profil/dilar");
  if (!user.dealer) redirect("/profil/dilar/nov");
  const dealer = user.dealer;

  const raw = await props.searchParams;
  const status = parseDealerListingFilter(raw.status);
  const q = firstParam(raw.q)?.slice(0, 100);
  const [stats, listings, promotions] = await Promise.all([
    getDealerStats(dealer.id),
    getDealerListings(dealer.id, { filter: status, q, page: pageParam(raw.page) }),
    getDealerActivePromotions(dealer.id),
  ]);
  const filtered = status !== "all" || Boolean(q);

  return (
    <div data-testid="dealer-dashboard">
      <PageHeading
        title={dealer.name}
        description={
          <>
            Дилърски панел ·{" "}
            <Link href={`/dilari/${dealer.slug}`} className="text-brand hover:underline">
              Публична страница
            </Link>{" "}
            ·{" "}
            <Link href="/profil/dilar/nastroiki" className="text-brand hover:underline">
              Настройки
            </Link>
          </>
        }
        actions={
          <ButtonLink href="/publikuvai" icon={<Plus className="size-4" aria-hidden="true" />} data-testid="dealer-add-listing">
            Добави обява
          </ButtonLink>
        }
      />

      <DealerStatsStrip stats={stats} />

      <section aria-labelledby="dealer-listings-heading" className="mt-6 scroll-mt-20" id="obiavi">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="dealer-listings-heading" className="text-lg font-semibold">
            Обяви <span className="text-sm font-normal text-muted">{formatCount(listings.total, "обява", "обяви")}</span>
          </h2>
          <DealerListingsToolbar key={`${status}|${q ?? ""}`} status={status} q={q ?? ""} />
        </div>
        {listings.items.length === 0 ? (
          <EmptyState
            title={filtered ? "Няма обяви по избраните критерии." : "Все още няма обяви."}
            action={
              filtered ? (
                <Link href="/profil/dilar#obiavi" className="font-medium text-brand hover:underline">
                  Изчисти филтъра
                </Link>
              ) : (
                <ButtonLink href="/publikuvai">Добави обява</ButtonLink>
              )
            }
          />
        ) : (
          <DealerListingsTable items={listings.items} />
        )}
        <div className="mt-4">
          <Pagination page={listings.page} totalPages={listings.totalPages} hrefForPage={(page) => listingsHref(status, q, page)} />
        </div>
      </section>

      <section aria-labelledby="dealer-promotions-heading" className="mt-6 rounded-lg border border-line bg-surface" data-testid="dealer-promotions">
        <h2 id="dealer-promotions-heading" className="border-b border-line px-4 py-3 font-semibold">
          Активни промоции
        </h2>
        {promotions.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted">Няма активни промоции.</p>
        ) : (
          <ul className="divide-y divide-line">
            {promotions.map((promotion) => (
              <li key={promotion.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
                <span className="w-24 shrink-0 font-medium text-ink">{getPromotionProduct(promotion.type)?.name ?? promotion.type}</span>
                <Link href={promotion.href} className="min-w-0 flex-1 truncate text-ink hover:text-brand hover:underline">
                  {promotion.title}
                </Link>
                <span className="text-ink-2 tabular">до {formatDate(promotion.endsAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
