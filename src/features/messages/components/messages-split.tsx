"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

/**
 * Two panes on desktop (list + thread). On mobile only one pane is visible: the list on
 * /suobshteniya and the thread on /suobshteniya/[id]. `list` is null when there are no
 * active conversations; an archived thread opened by URL still renders on its own.
 */
export function MessagesSplit({ list, children }: { list: ReactNode | null; children: ReactNode }) {
  const hasThread = useSelectedLayoutSegment() !== null;

  return (
    <>
      <h1 className={cn("mb-4 text-2xl font-semibold tracking-tight", hasThread && "max-lg:sr-only")}>Съобщения</h1>
      {list === null && !hasThread ? (
        <EmptyState
          title="Все още нямаш съобщения."
          action={
            <ButtonLink href="/avtomobili" variant="secondary">
              Разгледай обявите
            </ButtonLink>
          }
        />
      ) : (
        <div
          className={cn(
            "overflow-hidden rounded-lg border border-line bg-surface lg:grid lg:h-[calc(100dvh-12.5rem)] lg:min-h-[32rem]",
            list !== null && "lg:grid-cols-[340px_minmax(0,1fr)]",
            hasThread && "flex h-[calc(100dvh-11rem)] min-h-[26rem] flex-col",
          )}
        >
          {list !== null ? <div className={cn("min-h-0 lg:overflow-y-auto lg:border-r lg:border-line", hasThread && "max-lg:hidden")}>{list}</div> : null}
          <div className={cn("flex min-h-0 flex-1 flex-col", !hasThread && "max-lg:hidden")}>{children}</div>
        </div>
      )}
    </>
  );
}
