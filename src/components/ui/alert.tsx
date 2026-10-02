import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, { className: string; icon: typeof Info }> = {
  info: { className: "border-line bg-subtle text-ink-2", icon: Info },
  success: { className: "border-success/25 bg-success-soft text-success", icon: CheckCircle2 },
  warning: { className: "border-warning/25 bg-warning-soft text-warning", icon: TriangleAlert },
  danger: { className: "border-danger/25 bg-danger-soft text-danger", icon: AlertCircle },
};

export function Alert({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  const { className: toneClass, icon: Icon } = TONES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex gap-2.5 rounded-md border px-3.5 py-3 text-sm", toneClass, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "text-ink-2")}>{children}</div> : null}
      </div>
    </div>
  );
}
