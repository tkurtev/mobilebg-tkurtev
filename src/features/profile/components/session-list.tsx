"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { revokeOtherSessionsAction, revokeSessionAction } from "../actions";

type SessionItem = { id: string; device: string; ipAddress: string | null; createdAt: string; updatedAt: string; current: boolean };

export function SessionList({ sessions }: { sessions: SessionItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const others = sessions.filter((session) => !session.current).length;

  return (
    <div className="space-y-3">
      {message ? <Alert tone="info">{message}</Alert> : null}
      <ul className="divide-y divide-line rounded-md border border-line">
        {sessions.map((session) => (
          <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0 text-sm">
              <p className="font-medium text-ink">
                {session.device}
                {session.current ? <span className="ml-2 font-normal text-success">Текуща сесия</span> : null}
              </p>
              <p className="text-muted">
                Активна {formatDateTime(new Date(session.updatedAt))}
                {session.ipAddress ? ` · IP ${session.ipAddress}` : ""}
              </p>
            </div>
            {!session.current ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await revokeSessionAction(session.id);
                    if (!result.ok) setMessage(result.error);
                    router.refresh();
                  })
                }
              >
                Прекрати
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {others > 0 ? (
        <Button
          variant="secondary"
          size="sm"
          pending={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await revokeOtherSessionsAction();
              setMessage(result.ok ? `Прекратени сесии: ${result.data.revoked}.` : result.error);
              router.refresh();
            })
          }
        >
          Изход от всички други устройства
        </Button>
      ) : null}
    </div>
  );
}
