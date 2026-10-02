"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

type DialogContentProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** "sheet" slides in from the side on small screens; used for filters and the mobile menu. */
  variant?: "modal" | "sheet";
  side?: "left" | "right";
  footer?: ReactNode;
};

export function DialogContent({ title, description, children, className, variant = "modal", side = "right", footer }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/45 data-[state=open]:animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col bg-surface shadow-md focus:outline-none",
          variant === "modal" &&
            "top-1/2 left-1/2 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg",
          variant === "sheet" && "inset-y-0 w-full max-w-md",
          variant === "sheet" && (side === "right" ? "right-0" : "left-0"),
          className,
        )}
        aria-describedby={description ? undefined : undefined}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <DialogPrimitive.Title className="text-lg font-semibold">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-sm text-muted">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close className="-mt-1 -mr-2 rounded-md p-2 text-muted hover:bg-subtle hover:text-ink" aria-label="Затвори">
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <div className="border-t border-line px-5 py-3">{footer}</div> : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
