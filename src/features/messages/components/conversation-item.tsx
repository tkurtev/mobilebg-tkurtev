import Link from "next/link";
import { formatRelativeDate } from "@/lib/format";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { ConversationListItem } from "../queries";
import { ListingThumb } from "./listing-thumb";

export function ConversationItem({ item, active }: { item: ConversationListItem; active: boolean }) {
  // The open thread is marked read on mount, so it never shows as unread in the list.
  const unread = item.unread && !active;
  return (
    <li data-testid="conversation-item" className="border-b border-line last:border-b-0">
      <Link
        href={`/suobshteniya/${item.id}`}
        aria-current={active ? "page" : undefined}
        className={cn("flex gap-3 px-3 py-3 transition-colors sm:px-4", active ? "bg-brand-soft" : "hover:bg-subtle")}
      >
        <ListingThumb src={item.listingImageUrl} className="mt-0.5 w-14 self-start" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn("min-w-0 flex-1 truncate", unread ? "font-semibold text-ink" : "font-medium text-ink")}>{item.otherPartyName}</span>
            <time dateTime={item.lastMessageAt} className="shrink-0 text-xs text-muted tabular">
              {formatRelativeDate(new Date(item.lastMessageAt))}
            </time>
          </div>
          <div className="flex items-baseline gap-2 text-sm">
            <span className={cn("min-w-0 flex-1 truncate", unread ? "font-semibold text-ink" : "text-ink-2")}>{item.listingTitle}</span>
            {item.listingActive ? (
              item.listingPriceCents !== null ? <span className="shrink-0 text-muted tabular">{formatPrice(item.listingPriceCents)}</span> : null
            ) : (
              <span className="shrink-0 text-muted">Неактивна</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={cn("min-w-0 flex-1 truncate", unread ? "text-ink" : "text-muted")}>
              {item.lastMessageMine ? "Ти: " : ""}
              {item.lastMessagePreview}
            </span>
            {unread ? (
              <>
                <span className="size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                <span className="sr-only">непрочетено</span>
              </>
            ) : null}
          </div>
        </div>
      </Link>
    </li>
  );
}
