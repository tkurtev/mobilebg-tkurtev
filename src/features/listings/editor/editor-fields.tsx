"use client";

import type { ReactNode } from "react";
import { FieldError, Label } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export function EditorField({
  id,
  label,
  error,
  required,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className} data-field={id}>
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children}
      {error ? <FieldError id={`${id}-error`} message={error} /> : hint ? <p className="mt-1.5 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function StepSection({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-4", className)}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-ink-2">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function numberOrNull(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const digits = String(value).replace(/[\s\u00a0]/g, "");
  if (!/^\d+$/.test(digits)) return Number.NaN;
  return Number.parseInt(digits, 10);
}

export function emptyToNull(value: unknown): string | null {
  return value === "" || value === undefined || value === null ? null : String(value);
}
