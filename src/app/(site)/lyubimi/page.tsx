import type { Metadata } from "next";
import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountShell, PageHeading } from "@/features/account/components/account-shell";
import { LocalFavorites } from "@/features/favorites/components/local-favorites";
import { getFavoriteListingIds } from "@/features/favorites/queries";
import { ListingRow } from "@/features/listings/components/listing-card";
import { getCardsByIds } from "@/features/listings/queries";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Любими", robots: { index: false } };

export default async function FavoritesPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="container-page max-w-4xl py-4 lg:py-6">
        <PageHeading title="Любими" />
        <Alert tone="info" className="mb-4">
          Любимите обяви се пазят само в този браузър.{" "}
          <Link href="/vhod?next=/lyubimi" className="font-medium underline">
            Влез
          </Link>
          , за да ги имаш на всички устройства.
        </Alert>
        <LocalFavorites />
      </div>
    );
  }

  const ids = await getFavoriteListingIds(user.id);
  const cards = await getCardsByIds(ids, { publicOnly: false });
  const active = cards.filter((card) => card.status === "ACTIVE");
  const inactive = cards.filter((card) => card.status !== "ACTIVE");

  return (
    <AccountShell user={user}>
      <PageHeading title="Любими" description={ids.length > 0 ? `${ids.length} запазени обяви` : undefined} />
      {cards.length === 0 ? (
        <EmptyState title="Все още нямаш любими обяви." description="Натисни сърцето на обява, за да я запазиш тук." action={<Link href="/avtomobili" className="font-medium text-brand hover:underline">Разгледай обявите</Link>} />
      ) : (
        <ul className="space-y-2.5" data-testid="favorites-list">
          {active.map((item) => (
            <li key={item.id}>
              <ListingRow listing={item} favorite={{ authenticated: true, active: true }} />
            </li>
          ))}
        </ul>
      )}
      {inactive.length > 0 ? (
        <section className="mt-8" aria-labelledby="inactive-favorites">
          <h2 id="inactive-favorites" className="mb-3 text-lg font-semibold">
            Неактивни
          </h2>
          <ul className="space-y-2.5 opacity-75">
            {inactive.map((item) => (
              <li key={item.id}>
                <ListingRow listing={item} favorite={{ authenticated: true, active: true }} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AccountShell>
  );
}
