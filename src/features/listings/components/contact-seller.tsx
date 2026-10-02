"use client";

import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Label, Textarea } from "@/components/ui/field";
import { startConversationAction } from "@/features/messages/actions";

type ContactSellerProps = {
  listingId: string;
  listingTitle: string;
  state: "anonymous" | "own" | "unverified" | "ready";
  existingConversationId: string | null;
  loginHref: string;
  variant?: "primary" | "secondary";
  className?: string;
};

export function ContactSeller({ listingId, listingTitle, state, existingConversationId, loginHref, variant = "secondary", className }: ContactSellerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("Здравейте, обявата актуална ли е?");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const classes = buttonClasses({ variant, className: `w-full ${className ?? ""}` });
  const label = (
    <>
      <MessageSquare className="size-4" aria-hidden="true" />
      Изпрати съобщение
    </>
  );

  if (state === "own") return null;
  if (state === "anonymous") {
    return (
      <Link href={loginHref} className={classes}>
        {label}
      </Link>
    );
  }
  if (existingConversationId) {
    return (
      <Link href={`/suobshteniya/${existingConversationId}`} className={classes}>
        <MessageSquare className="size-4" aria-hidden="true" />
        Към разговора
      </Link>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={classes}>{label}</DialogTrigger>
      <DialogContent title="Съобщение до продавача" description={listingTitle}>
        {state === "unverified" ? (
          <Alert tone="warning" title="Потвърди имейла си">
            За да изпращаш съобщения, потвърди имейл адреса си от линка, който ти изпратихме.
          </Alert>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await startConversationAction({ listingId, body });
                if (result.ok) router.push(`/suobshteniya/${result.data.conversationId}`);
                else setError(result.fieldErrors?.body ?? result.error);
              });
            }}
          >
            <div>
              <Label htmlFor="contact-message">Съобщение</Label>
              <Textarea
                id="contact-message"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={5}
                maxLength={2000}
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "contact-message-error" : undefined}
              />
              <FieldError id="contact-message-error" message={error} />
              <p className="mt-1.5 text-sm text-muted">Имейлът ти не се показва на продавача.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" pending={pending}>
                Изпрати
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
