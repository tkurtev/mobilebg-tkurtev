"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/cn";
import { createDraftAction } from "../actions";

export function CategoryPicker({ categories }: { categories: { id: string; name: string; slug: string }[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div>
      {error ? (
        <Alert tone="danger" className="mb-3">
          {error}
        </Alert>
      ) : null}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="category-picker">
        {categories.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              disabled={pendingId !== null}
              data-category={category.slug}
              onClick={() => {
                setError(null);
                setPendingId(category.id);
                startTransition(async () => {
                  const result = await createDraftAction({ categoryId: category.id });
                  if (result.ok) router.push(`/publikuvai/${result.data.id}?stap=vehicle`);
                  else {
                    setError(result.error);
                    setPendingId(null);
                  }
                });
              }}
              className={cn(
                "flex h-14 w-full items-center justify-between gap-2 rounded-md border bg-surface px-4 text-left text-[15px] font-medium transition-colors hover:border-brand hover:text-brand disabled:cursor-wait",
                pendingId === category.id ? "border-brand" : "border-line",
              )}
            >
              {category.name}
              {pendingId === category.id ? <Spinner className="size-4 text-brand" /> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
