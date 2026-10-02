"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import type { ListingStatus } from "@/config/listing-status";
import { moderateListingAction } from "../actions/moderation";
import { availableModerationActions, MODERATION_COPY, REASON_REQUIRED, type AdminModerationAction } from "../moderation";
import { useAdminAction } from "./use-admin-action";

type ModerationDialogProps = {
  listingId: string;
  action: AdminModerationAction;
  reportId?: string | null;
  /** Overrides the trigger text, e.g. "Паузирай обявата" in the report queue. */
  label?: string;
  size?: "sm" | "md";
};

export function ModerationDialog({ listingId, action, reportId, label, size = "sm" }: ModerationDialogProps) {
  const copy = MODERATION_COPY[action];
  const required = REASON_REQUIRED[action];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const { pending, formError, fieldErrors, run, reset } = useAdminAction();
  const fieldId = `moderation-reason-${action}-${reportId ?? listingId}`;
  const reasonError = localError ?? fieldErrors.reason ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setReason("");
          setLocalError(null);
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={copy.tone === "danger" ? "danger" : "secondary"} size={size} data-testid={`moderation-${action}`}>
          {label ?? copy.button}
        </Button>
      </DialogTrigger>
      <DialogContent title={copy.title} description={copy.description}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (required && reason.trim().length < 3) {
              setLocalError("Посочи причина (поне 3 символа).");
              return;
            }
            setLocalError(null);
            void run(() => moderateListingAction({ listingId, action, reason, reportId: reportId ?? null }), () => setOpen(false));
          }}
        >
          {formError ? <Alert tone="danger">{formError}</Alert> : null}
          {reportId ? <p className="text-sm text-ink-2">Сигналът ще бъде отбелязан като решен.</p> : null}
          <Field
            label={required ? "Причина" : "Причина (по желание)"}
            htmlFor={fieldId}
            required={required}
            error={reasonError}
            hint={required ? "Продавачът ще види причината в известието." : undefined}
          >
            <Textarea
              id={fieldId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={3}
              className="min-h-20"
              aria-invalid={Boolean(reasonError)}
              aria-describedby={reasonError ? `${fieldId}-error` : undefined}
              data-testid="moderation-reason"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Отказ
            </Button>
            <Button type="submit" variant={copy.tone === "danger" ? "danger" : "primary"} pending={pending} data-testid="moderation-submit">
              {copy.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Every moderation action valid for the listing's current status. */
export function ModerationControls({ listingId, status, reportId }: { listingId: string; status: ListingStatus; reportId?: string | null }) {
  const actions = availableModerationActions(status);
  if (actions.length === 0) return <p className="text-sm text-muted">Няма налични действия за този статус.</p>;
  return (
    <div className="flex flex-wrap gap-2" data-testid="moderation-controls">
      {actions.map((action) => (
        <ModerationDialog key={action} listingId={listingId} action={action} reportId={reportId} size="md" />
      ))}
    </div>
  );
}
