"use client";

import { useEffect, useState } from "react";
import { localRecentlyViewed } from "@/features/favorites/local-store";
import type { ListingCardData } from "@/features/listings/card-data";
import { ListingTile } from "@/features/listings/components/listing-card";

/** Recently viewed listings for anonymous visitors, read from localStorage. */
export function RecentlyViewedLocal() {
  const ids = localRecentlyViewed.useIds();
  const key = ids.slice(0, 6).join(",");
  const [cards, setCards] = useState<{ key: string; items: ListingCardData[] }>({ key: "", items: [] });

  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    fetch(`/api/obiavi/kartichki?ids=${key}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((items: ListingCardData[]) => setCards({ key, items }))
      .catch(() => {});
    return () => controller.abort();
  }, [key]);

  const items = cards.key === key ? cards.items : [];
  if (!key || items.length === 0) return null;
  return <RecentlyViewedSection items={items} />;
}

export function RecentlyViewedSection({ items }: { items: ListingCardData[] }) {
  return (
    <section aria-labelledby="recent-heading">
      <h2 id="recent-heading" className="text-lg font-semibold">
        Наскоро разгледани
      </h2>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((item) => (
          <li key={item.id}>
            <ListingTile listing={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
