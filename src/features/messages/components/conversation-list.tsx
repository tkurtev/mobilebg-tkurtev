"use client";

import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ConversationListPage } from "../queries";
import { ConversationItem } from "./conversation-item";

const LIST_REFRESH_MS = 30_000;

export function ConversationList({ initial }: { initial: ConversationListPage }) {
  const router = useRouter();
  const activeId = useSelectedLayoutSegment();
  const [extra, setExtra] = useState<ConversationListPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const initialIds = new Set(initial.items.map((item) => item.id));
  const items = [...initial.items, ...(extra?.items.filter((item) => !initialIds.has(item.id)) ?? [])];
  const nextCursor = extra ? extra.nextCursor : initial.nextCursor;

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, LIST_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [router]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/suobshteniya?cursor=${encodeURIComponent(nextCursor)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const page = (await response.json()) as ConversationListPage;
      setExtra((previous) => ({ items: [...(previous?.items ?? []), ...page.items], nextCursor: page.nextCursor }));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <nav aria-label="Разговори">
      <ul data-testid="conversation-list">
        {items.map((item) => (
          <ConversationItem key={item.id} item={item} active={item.id === activeId} />
        ))}
      </ul>
      {nextCursor ? (
        <div className="border-t border-line p-3">
          <Button variant="secondary" size="sm" className="w-full" pending={loading} onClick={() => void loadMore()}>
            Покажи още
          </Button>
          {failed ? (
            <p className="mt-2 text-sm text-danger" role="alert">
              Разговорите не се заредиха. Опитай отново.
            </p>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}
