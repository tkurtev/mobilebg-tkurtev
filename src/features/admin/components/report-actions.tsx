"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/field";
import type { ListingStatus } from "@/config/listing-status";
import { dismissReportAction } from "../actions/moderation";
import { canApplyModeration } from "../moderation";
import { ModerationDialog } from "./moderation-controls";
import { useAdminAction } from "./use-admin-action";

export function DismissReportDialog({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const { pending, error, run, reset } = useAdminAction();
  const fieldId = `dismiss-note-${reportId}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setNote("");
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" data-testid="report-dismiss">
          Отхвърли сигнала
        </Button>
      </DialogTrigger>
      <DialogContent title="Отхвърляне на сигнала" description="Обявата остава непроменена. Сигналът се маркира като отхвърлен.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => dismissReportAction({ reportId, note }), () => setOpen(false));
          }}
        >
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <Field label="Бележка (по желание)" htmlFor={fieldId}>
            <Textarea id={fieldId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={500} rows={3} className="min-h-20" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Отказ
            </Button>
            <Button type="submit" pending={pending} data-testid="report-dismiss-submit">
              Отхвърли сигнала
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ReportActions({ reportId, listingId, listingStatus }: { reportId: string; listingId: string; listingStatus: ListingStatus }) {
  return (
    <div className="flex flex-wrap gap-2">
      <DismissReportDialog reportId={reportId} />
      {canApplyModeration("pause", listingStatus) ? <ModerationDialog listingId={listingId} action="pause" reportId={reportId} label="Паузирай обявата" /> : null}
      {canApplyModeration("reject", listingStatus) ? <ModerationDialog listingId={listingId} action="reject" reportId={reportId} label="Откажи обявата" /> : null}
    </div>
  );
}
