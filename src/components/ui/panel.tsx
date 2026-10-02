import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("rounded-lg border border-line bg-surface", className)} {...props} />;
}

export function PanelHeader({ title, actions, className, as: Heading = "h2" }: { title: ReactNode; actions?: ReactNode; className?: string; as?: "h1" | "h2" | "h3" }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5", className)}>
      <Heading className="text-base font-semibold">{title}</Heading>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function PanelBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-4 py-4 sm:px-5", className)} {...props} />;
}
