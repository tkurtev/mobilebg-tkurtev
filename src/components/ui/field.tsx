import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-md border border-line-strong bg-surface text-ink placeholder:text-muted/80 transition-colors " +
  "hover:border-ink-2/40 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 " +
  "disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted aria-invalid:border-danger aria-invalid:focus:ring-danger/20";

export const controlClasses = (className?: string) => cn(CONTROL, "h-10 px-3 text-[15px]", className);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={controlClasses(className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-28 px-3 py-2 text-[15px] leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        CONTROL,
        "h-10 appearance-none bg-size-[16px] bg-position-[right_10px_center] bg-no-repeat pr-9 pl-3 text-[15px]",
        "bg-[image:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2366707c' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, children, required, ...props }: ComponentProps<"label"> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-sm font-medium text-ink-2", className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-danger" aria-hidden="true">*</span> : null}
    </label>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-sm text-danger" role="alert">
      {message}
    </p>
  );
}

export function FieldHint({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 text-sm text-muted">
      {children}
    </p>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, error, hint, required, className, children }: FieldProps) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error ? <FieldError id={`${htmlFor}-error`} message={error} /> : hint ? <FieldHint id={`${htmlFor}-hint`}>{hint}</FieldHint> : null}
    </div>
  );
}

export function Checkbox({ className, label, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-[15px] text-ink select-none", className)}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-sm border-line-strong accent-brand"
        {...props}
      />
      <span className="leading-snug">{label}</span>
    </label>
  );
}
