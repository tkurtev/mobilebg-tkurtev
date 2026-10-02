"use client";

import { useEffect } from "react";
import { localRecentlyViewed } from "@/features/favorites/local-store";

export function ViewTracker({ listingId, track }: { listingId: string; track: boolean }) {
  useEffect(() => {
    if (!track) return;
    localRecentlyViewed.pushFront(listingId);
    const key = `mobited:viewed:${listingId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage unavailable: the server still deduplicates per day
    }
    void fetch(`/api/obiavi/${listingId}/view`, { method: "POST", keepalive: true }).catch(() => {});
  }, [listingId, track]);
  return null;
}
