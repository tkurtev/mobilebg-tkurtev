import "server-only";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import type { ActionResult, FieldErrors } from "@/lib/action-result";
import { AppError } from "./errors";

export function zodFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.infer<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError("VALIDATION", undefined, zodFieldErrors(parsed.error));
  }
  return parsed.data;
}

/** Runs server action logic and maps known errors to an ActionResult. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof AppError) {
      return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
    }
    console.error("[action] unexpected error", error instanceof Error ? error.stack : error);
    return { ok: false, error: "Възникна грешка. Опитай отново." };
  }
}
