import { cn } from "@/lib/cn";
import type { StatusTone } from "@/config/listing-status";

const DOT: Record<StatusTone, string> = {
  neutral: "bg-ink-2",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  muted: "bg-line-strong",
};

export function StatusLabel({ tone, children, className }: { tone: StatusTone; children: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-ink-2", className)}>
      <span className={cn("size-2 rounded-full", DOT[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}
