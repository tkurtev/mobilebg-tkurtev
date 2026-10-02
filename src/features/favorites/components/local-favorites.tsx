"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { ListingCardData } from "@/features/listings/card-data";
import { ListingRow } from "@/features/listings/components/listing-card";
import { localFavorites } from "../local-store";

/** Favorites of anonymous visitors, kept in localStorage until they sign in. */
export function LocalFavorites() {
  const ids = localFavorites.useIds();
  const key = ids.join(",");
  const [state, setState] = useState<{ key: string; items: ListingCardData[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/obiavi/kartichki?ids=${key.split(",").slice(0, 60).join(",")}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: ListingCardData[]) => setState({ key, items }))
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  if (!key) {
    return <EmptyState title="Все още нямаш любими обяви." description="Натисни сърцето на обява, за да я запазиш тук." action={<Link href="/avtomobili" className="font-medium text-brand hover:underline">Разгледай обявите</Link>} />;
  }
  if (!state || state.key !== key) {
    return (
      <div className="space-y-2.5">
        {ids.slice(0, 3).map((id) => (
          <Skeleton key={id} className="h-32" />
        ))}
      </div>
    );
  }
  const missing = ids.length - state.items.length;
  return (
    <>
      <ul className="space-y-2.5">
        {state.items.map((item) => (
          <li key={item.id}>
            <ListingRow listing={item} favorite={{ authenticated: false, active: true }} />
          </li>
        ))}
      </ul>
      {missing > 0 ? <p className="mt-3 text-sm text-muted">{missing === 1 ? "1 обява вече не е активна." : `${missing} обяви вече не са активни.`}</p> : null}
    </>
  );
}
