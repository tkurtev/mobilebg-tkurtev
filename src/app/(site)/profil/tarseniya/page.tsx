import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/features/account/components/account-shell";
import { SavedSearchActions } from "@/features/saved-searches/components/saved-search-actions";
import { getSavedSearchesWithSummary } from "@/features/saved-searches/queries";
import { formatCount, formatDate } from "@/lib/format";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Запазени търсения" };

export default async function SavedSearchesPage() {
  const user = await requireUser("/profil/tarseniya");
  const searches = await getSavedSearchesWithSummary(user.id);

  return (
    <>
      <PageHeading title="Запазени търсения" />
      {searches.length === 0 ? (
        <EmptyState
          title="Нямаш запазени търсения."
          description="Задай филтри в търсенето и натисни „Запази търсенето“."
          action={<Link href="/avtomobili" className="font-medium text-brand hover:underline">Към търсенето</Link>}
        />
      ) : (
        <ul className="space-y-2.5" data-testid="saved-searches">
          {searches.map((search) => (
            <li key={search.id} className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold">{search.name}</h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {search.categoryName} · {formatCount(search.total, "обява", "обяви")} · запазено {formatDate(search.createdAt)}
                    {search.newCount > 0 ? <span className="ml-1 font-medium text-success">· {search.newCount} нови</span> : null}
                  </p>
                  {search.chips.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {search.chips.map((chip) => (
                        <li key={chip} className="rounded-sm border border-line bg-subtle px-1.5 py-0.5 text-[13px] text-ink-2">
                          {chip}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                {search.href ? (
                  <Link href={`/profil/tarseniya/${search.id}/izpalni`} prefetch={false} className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-hover">
                    Покажи резултатите
                  </Link>
                ) : null}
              </div>
              <div className="mt-3 border-t border-line pt-2">
                <SavedSearchActions id={search.id} name={search.name} active={search.isActive} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
