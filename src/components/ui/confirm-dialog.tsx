"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";

type ConfirmDialogProps = {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => Promise<boolean | void>;
  children?: ReactNode;
};

/** Confirmation for destructive or irreversible actions. onConfirm returning false keeps the dialog open. */
export function ConfirmDialog({ trigger, open, onOpenChange, title, description, confirmLabel, tone = "danger", onConfirm, children }: ConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const isOpen = open ?? internalOpen;
  const setOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        title={title}
        description={children ? description : undefined}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Отказ
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              pending={pending}
              data-testid="confirm-action"
              onClick={() =>
                startTransition(async () => {
                  const result = await onConfirm();
                  if (result !== false) setOpen(false);
                })
              }
            >
              {confirmLabel}
            </Button>
          </div>
        }
      >
        {children ?? <p className="text-[15px] text-ink-2">{description}</p>}
      </DialogContent>
    </Dialog>
  );
}
