import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const FILTER_CONTROL = "h-9 text-sm";

export function FilterField({ label, htmlFor, children, className }: { label: string; htmlFor: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full sm:w-44", className)}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm text-ink-2">
        {label}
      </label>
      {children}
    </div>
  );
}
