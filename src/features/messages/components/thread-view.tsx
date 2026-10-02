import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/money";
import type { ConversationThread } from "../queries";
import { ArchiveConversationButton } from "./archive-button";
import { ListingThumb } from "./listing-thumb";
import { ThreadClient } from "./thread-client";

const ROLE_LABELS: Record<ConversationThread["otherPartyRole"], string> = { dealer: "Дилър", seller: "Продавач", buyer: "Купувач" };

export function ThreadView({ thread }: { thread: ConversationThread }) {
  const { listing } = thread;
  return (
    <>
      <div className="border-b border-line px-3 py-2.5 sm:px-4">
        <Link href="/suobshteniya" className="-ml-1 mb-1 inline-flex items-center gap-0.5 rounded-sm text-sm text-brand hover:underline lg:hidden">
          <ChevronLeft className="size-4" aria-hidden="true" />
          Всички съобщения
        </Link>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{thread.otherPartyName}</h2>
            <p className="text-xs text-muted">{ROLE_LABELS[thread.otherPartyRole]}</p>
          </div>
          <ArchiveConversationButton conversationId={thread.id} archived={thread.archived} />
        </div>
      </div>
      <div className="flex items-center gap-3 border-b border-line px-3 py-2 sm:px-4">
        <ListingThumb src={listing.imageUrl} className="w-14" />
        <div className="min-w-0 flex-1 text-sm">
          {listing.href ? (
            <Link href={listing.href} className="block truncate font-medium text-ink hover:text-brand hover:underline">
              {listing.title}
            </Link>
          ) : (
            <p className="truncate font-medium text-ink">{listing.title}</p>
          )}
          <p className="flex flex-wrap gap-x-3 text-ink-2">
            <span className="font-semibold text-ink tabular">{listing.priceCents !== null ? formatPrice(listing.priceCents) : "По договаряне"}</span>
            {listing.active ? null : <span className="text-warning">Обявата вече не е активна</span>}
          </p>
        </div>
      </div>
      <ThreadClient
        key={thread.id}
        conversationId={thread.id}
        otherPartyName={thread.otherPartyName}
        initialMessages={thread.messages}
        needsMarkRead={thread.needsMarkRead}
        truncated={thread.truncated}
      />
    </>
  );
}
