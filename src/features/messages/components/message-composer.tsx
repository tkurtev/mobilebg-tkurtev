"use client";

import { SendHorizontal } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { sendMessageAction } from "@/features/messages/actions";
import { cn } from "@/lib/cn";
import { sanitizePlainText } from "@/lib/text";

const MAX_LENGTH = 2000;
const COUNTER_FROM = 1800;
const MAX_HEIGHT_PX = 168;

type ComposerProps = { conversationId: string; onSent: (message: { id: string; body: string }) => void };

export function MessageComposer({ conversationId, onSent }: ComposerProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Plain state instead of useTransition: background router refreshes from polling would otherwise keep the button pending.
  const [pending, setPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT_PX)}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
  }, [body]);

  const canSend = body.trim().length > 0 && !pending;

  async function submit() {
    if (!canSend) return;
    setError(null);
    setPending(true);
    try {
      const result = await sendMessageAction({ conversationId, body });
      if (result.ok) {
        // Same transform as messageBodySchema, so the bubble matches what the server stored.
        onSent({ id: result.data.messageId, body: sanitizePlainText(body, MAX_LENGTH) });
        setBody("");
        textareaRef.current?.focus();
      } else {
        setError(result.fieldErrors?.body ?? result.error);
      }
    } catch {
      setError("Съобщението не беше изпратено. Опитай отново.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      data-testid="message-composer"
      className="border-t border-line bg-surface px-3 py-3 sm:px-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <div className="flex items-end gap-2">
        <label htmlFor="message-body" className="sr-only">
          Съобщение
        </label>
        <textarea
          id="message-body"
          ref={textareaRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit();
            }
          }}
          rows={1}
          maxLength={MAX_LENGTH}
          readOnly={pending}
          placeholder="Напиши съобщение"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "message-body-error" : "message-body-hint"}
          className={cn(
            "max-h-42 min-h-10 w-full resize-none rounded-md border border-line-strong bg-surface px-3 py-2 text-[15px] leading-6 text-ink placeholder:text-muted/80",
            "transition-colors hover:border-ink-2/40 focus:border-brand focus:ring-2 focus:ring-brand/20 focus:outline-none aria-invalid:border-danger",
          )}
        />
        <Button type="submit" data-testid="message-send" pending={pending} disabled={!canSend} icon={<SendHorizontal className="size-4" aria-hidden="true" />}>
          <span className="max-sm:sr-only">Изпрати</span>
        </Button>
      </div>
      <p id="message-body-hint" className="sr-only">
        Enter изпраща, Shift и Enter добавя нов ред.
      </p>
      <FieldError id="message-body-error" message={error} />
      {body.length >= COUNTER_FROM ? (
        <p className={cn("mt-1 text-right text-xs tabular", body.length >= MAX_LENGTH ? "text-danger" : "text-muted")} aria-live="polite">
          {body.length}/{MAX_LENGTH}
        </p>
      ) : null}
    </form>
  );
}
