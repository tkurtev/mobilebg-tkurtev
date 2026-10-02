import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-lg border border-dashed border-line-strong bg-surface px-6 py-10 text-center", className)}>
      <p className="font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
