"use client";

import { Flag } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Label, Textarea } from "@/components/ui/field";
import { REPORT_REASONS } from "@/config/listing-status";
import { reportListingAction } from "@/features/moderation/report-actions";

export function ReportListing({ listingId, authenticated, loginHref }: { listingId: string; authenticated: boolean; loginHref: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [errors, setErrors] = useState<{ form?: string; reason?: string; details?: string }>({});
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const triggerClass = "inline-flex items-center gap-1.5 text-sm text-muted hover:text-danger hover:underline";
  const trigger = (
    <>
      <Flag className="size-3.5" aria-hidden="true" />
      Сигнализирай за нередност
    </>
  );

  if (!authenticated) {
    return (
      <Link href={loginHref} className={triggerClass}>
        {trigger}
      </Link>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={triggerClass}>{trigger}</DialogTrigger>
      <DialogContent title="Сигнал за обява">
        {done ? (
          <div className="space-y-4">
            <Alert tone="success" title="Сигналът е изпратен">
              Модераторите ще прегледат обявата.
            </Alert>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Затвори
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!reason) {
                setErrors({ reason: "Избери причина." });
                return;
              }
              startTransition(async () => {
                const result = await reportListingAction({ listingId, reason, details });
                if (result.ok) setDone(true);
                else setErrors({ form: result.fieldErrors ? undefined : result.error, reason: result.fieldErrors?.reason, details: result.fieldErrors?.details });
              });
            }}
          >
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-ink-2">Причина</legend>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((option) => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 text-[15px]">
                    <input type="radio" name="report-reason" value={option.value} checked={reason === option.value} onChange={() => setReason(option.value)} className="size-4 accent-brand" />
                    {option.label}
                  </label>
                ))}
              </div>
              <FieldError message={errors.reason} />
            </fieldset>
            <div>
              <Label htmlFor="report-details">Подробности</Label>
              <Textarea id="report-details" value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={1000} />
              <FieldError message={errors.details} />
            </div>
            {errors.form ? <Alert tone="danger">{errors.form}</Alert> : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Отказ
              </Button>
              <Button type="submit" pending={pending}>
                Изпрати сигнал
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
