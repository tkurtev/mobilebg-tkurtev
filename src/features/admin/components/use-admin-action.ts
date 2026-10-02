"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, FieldErrors } from "@/lib/action-result";

/**
 * Runs a server action in a transition. `formError` is the general message, shown only
 * when the failure is not already explained by field errors.
 */
export function useAdminAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function reset() {
    setError(null);
    setFieldErrors({});
  }

  function run<T>(action: () => Promise<ActionResult<T>>, onSuccess?: (data: T) => void): Promise<boolean> {
    return new Promise((resolve) => {
      startTransition(async () => {
        const result = await action();
        if (result.ok) {
          reset();
          onSuccess?.(result.data);
          router.refresh();
          resolve(true);
        } else {
          setError(result.error);
          setFieldErrors(result.fieldErrors ?? {});
          resolve(false);
        }
      });
    });
  }

  const formError = Object.keys(fieldErrors).length > 0 ? null : error;
  return { pending, error, formError, fieldErrors, run, reset };
}
