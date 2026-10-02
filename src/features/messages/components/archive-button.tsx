"use client";

import { Archive } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError } from "@/components/ui/field";
import { setConversationArchivedAction } from "../thread-actions";

export function ArchiveConversationButton({ conversationId, archived }: { conversationId: string; archived: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (archived) {
    return (
      <div className="flex shrink-0 flex-col items-end">
        <Button
          variant="secondary"
          size="sm"
          pending={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setConversationArchivedAction({ conversationId, archived: false });
              setError(result.ok ? null : result.error);
            })
          }
        >
          Върни в списъка
        </Button>
        <FieldError message={error} />
      </div>
    );
  }

  return (
    <ConfirmDialog
      trigger={
        <Button variant="ghost" size="sm" className="shrink-0" icon={<Archive className="size-4" aria-hidden="true" />}>
          Архивирай
        </Button>
      }
      title="Архивиране на разговора"
      confirmLabel="Архивирай"
      tone="primary"
      onConfirm={async () => {
        const result = await setConversationArchivedAction({ conversationId, archived: true });
        if (!result.ok) {
          setError(result.error);
          return false;
        }
        setError(null);
        router.push("/suobshteniya");
      }}
    >
      <p className="text-sm text-ink-2">Разговорът ще бъде скрит от списъка. Ще се появи отново, ако получиш ново съобщение.</p>
      <FieldError message={error} />
    </ConfirmDialog>
  );
}
