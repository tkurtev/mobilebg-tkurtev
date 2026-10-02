import type { ReactNode } from "react";

export function AuthCard({ title, description, children, footer }: { title: string; description?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-page flex justify-center py-8 sm:py-14">
      <div className="w-full max-w-[420px]">
        <div className="rounded-lg border border-line bg-surface p-5 sm:p-7">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-sm text-ink-2">{description}</p> : null}
          <div className="mt-5">{children}</div>
        </div>
        {footer ? <div className="mt-4 text-center text-sm text-ink-2">{footer}</div> : null}
      </div>
    </div>
  );
}
