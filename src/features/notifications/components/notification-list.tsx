"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { markAllNotificationsRead, markNotificationRead } from "../actions";
import { internalLink } from "./internal-link";

export type NotificationEntry = { id: string; title: string; body: string; link: string | null; createdAt: string; unread: boolean };

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function NotificationRow({ item }: { item: NotificationEntry }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [markedRead, setMarkedRead] = useState(false);
  const unread = item.unread && !markedRead;
  const link = internalLink(item.link);

  const content = (
    <>
      <span className={cn("mt-2 size-2 shrink-0 rounded-full", unread ? "bg-brand" : "bg-transparent")} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className={cn("block", unread ? "font-semibold text-ink" : "text-ink")}>
          {item.title}
          {unread ? <span className="sr-only"> (непрочетено)</span> : null}
        </span>
        {item.body ? <span className="mt-0.5 line-clamp-2 block text-sm text-ink-2">{item.body}</span> : null}
        <time dateTime={item.createdAt} className="mt-0.5 block text-[13px] text-muted">
          {formatRelativeDate(new Date(item.createdAt))}
        </time>
      </span>
    </>
  );

  if (link) {
    return (
      <Link
        href={link}
        aria-busy={pending || undefined}
        className={cn("flex gap-3 px-4 py-3 transition-colors hover:bg-subtle", pending && "opacity-70")}
        onClick={(event) => {
          if (!unread) return;
          if (isModifiedClick(event)) {
            void markNotificationRead(item.id).then((result) => result.ok && setMarkedRead(true));
            return;
          }
          event.preventDefault();
          startTransition(async () => {
            await markNotificationRead(item.id);
            router.push(link);
          });
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="flex gap-3 px-4 py-3">
      {content}
      {unread ? (
        <Button
          variant="link"
          className="shrink-0 self-center text-sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await markNotificationRead(item.id);
              if (result.ok) setMarkedRead(true);
            })
          }
        >
          Прочетено
        </Button>
      ) : null}
    </div>
  );
}

export function NotificationList({ items }: { items: NotificationEntry[] }) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {items.map((item) => (
        <li key={item.id}>
          <NotificationRow item={item} />
        </li>
      ))}
    </ul>
  );
}

export function MarkAllNotificationsRead() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end">
      <Button
        variant="secondary"
        size="sm"
        pending={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await markAllNotificationsRead();
            setError(result.ok ? null : result.error);
          })
        }
      >
        Маркирай всички като прочетени
      </Button>
      {error ? (
        <p className="mt-1 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
