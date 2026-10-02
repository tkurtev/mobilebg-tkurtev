"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { markConversationReadAction } from "@/features/messages/actions";
import { formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ThreadMessage } from "../queries";
import { MessageComposer } from "./message-composer";
import { groupByDay, mergeMessages } from "./thread-timeline";

const POLL_MS = 8_000;
const STICK_TO_BOTTOM_PX = 120;

type ThreadClientProps = {
  conversationId: string;
  otherPartyName: string;
  initialMessages: ThreadMessage[];
  needsMarkRead: boolean;
  truncated: boolean;
};

function isThreadMessage(value: unknown): value is ThreadMessage {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.body === "string" && typeof record.mine === "boolean" && typeof record.createdAt === "string";
}

export function ThreadClient({ conversationId, otherPartyName, initialMessages, needsMarkRead, truncated }: ThreadClientProps) {
  const router = useRouter();
  const [sent, setSent] = useState<ThreadMessage[]>([]);
  const [polled, setPolled] = useState<ThreadMessage[]>([]);
  // Later sources win: server render over polled over locally appended sent messages.
  const messages = useMemo(() => mergeMessages(mergeMessages(sent, polled), initialMessages), [sent, polled, initialMessages]);
  const groups = useMemo(() => groupByDay(messages), [messages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);
  const forceScrollRef = useRef(true);
  const markingRef = useRef(false);
  const pollingRef = useRef(false);

  useEffect(() => {
    lastIdRef.current = messages.at(-1)?.id ?? null;
  }, [messages]);

  const markRead = useCallback(async () => {
    if (markingRef.current) return;
    markingRef.current = true;
    try {
      const result = await markConversationReadAction(conversationId);
      // Refresh so the header badge, account nav badge and conversation list drop the unread state.
      if (result.ok) router.refresh();
    } finally {
      markingRef.current = false;
    }
  }, [conversationId, router]);

  useEffect(() => {
    if (needsMarkRead) void markRead();
  }, [needsMarkRead, markRead]);

  const poll = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const after = lastIdRef.current;
      const response = await fetch(`/api/suobshteniya/${conversationId}/messages${after ? `?after=${after}` : ""}`, { cache: "no-store" });
      if (!response.ok) return;
      const data: unknown = await response.json();
      const incoming = typeof data === "object" && data !== null && "messages" in data && Array.isArray(data.messages) ? data.messages.filter(isThreadMessage) : [];
      if (incoming.length === 0) return;
      setPolled((previous) => mergeMessages(previous, incoming));
      if (incoming.some((message) => !message.mine)) void markRead();
    } catch {
      // Network hiccups are retried on the next tick.
    } finally {
      pollingRef.current = false;
    }
  }, [conversationId, markRead]);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void poll();
    };
    const timer = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [poll]);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    if (forceScrollRef.current || stickToBottomRef.current) container.scrollTop = container.scrollHeight;
    forceScrollRef.current = false;
  }, [messages]);

  return (
    <>
      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < STICK_TO_BOTTOM_PX;
        }}
        role="log"
        aria-label="Съобщения"
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto bg-canvas/60 px-3 pt-1 pb-4 sm:px-4"
      >
        {truncated ? <p className="pt-3 text-center text-xs text-muted">Показани са последните {messages.length} съобщения.</p> : null}
        {groups.map((group) => (
          <div key={group.key}>
            <p className="my-3 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
              {group.label}
              <span className="h-px flex-1 bg-line" aria-hidden="true" />
            </p>
            <ul className="space-y-2">
              {group.messages.map((message) => (
                <li key={message.id} className={cn("flex flex-col", message.mine ? "items-end" : "items-start")}>
                  <div
                    data-testid="message-bubble"
                    data-mine={message.mine ? "true" : "false"}
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-[15px] leading-snug whitespace-pre-wrap wrap-anywhere sm:max-w-[75%]",
                      message.mine ? "bg-brand-soft text-ink" : "border border-line bg-surface text-ink",
                    )}
                  >
                    <span className="sr-only">{message.mine ? "Ти" : otherPartyName}: </span>
                    {message.body}
                  </div>
                  <time dateTime={message.createdAt} className="mt-0.5 px-1 text-xs text-muted tabular">
                    {formatTime(new Date(message.createdAt))}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <MessageComposer
        conversationId={conversationId}
        onSent={(message) => {
          setSent((previous) => mergeMessages(previous, [{ id: message.id, body: message.body, mine: true, createdAt: new Date().toISOString() }]));
          forceScrollRef.current = true;
          stickToBottomRef.current = true;
          void poll();
        }}
      />
    </>
  );
}
