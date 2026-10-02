"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "./button";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";

type ConfirmDialogProps = {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  onConfirm: () => Promise<boolean | void>;
  children?: ReactNode;
};

/** Confirmation for destructive or irreversible actions. onConfirm returning false keeps the dialog open. */
export function ConfirmDialog({ trigger, title, description, confirmLabel, tone = "danger", onConfirm, children }: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={title}
        description={description}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Отказ
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "primary"}
              pending={pending}
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
        {children ?? <p className="text-sm text-ink-2">{description}</p>}
      </DialogContent>
    </Dialog>
  );
}
