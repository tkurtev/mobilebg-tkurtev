import type { FieldErrors } from "@/lib/action-result";

export type AppErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "RATE_LIMITED" | "CONFLICT";

const DEFAULT_MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHORIZED: "Влез в профила си, за да продължиш.",
  FORBIDDEN: "Нямаш права за това действие.",
  NOT_FOUND: "Не е намерено.",
  VALIDATION: "Провери въведените данни.",
  RATE_LIMITED: "Твърде много опити. Опитай отново след малко.",
  CONFLICT: "Действието не може да бъде изпълнено в момента.",
};

/** Errors with user-facing Bulgarian messages. Anything else is logged and hidden from users. */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: AppErrorCode, message?: string, fieldErrors?: FieldErrors) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function unauthorized(message?: string): never {
  throw new AppError("UNAUTHORIZED", message);
}

export function forbiddenError(message?: string): never {
  throw new AppError("FORBIDDEN", message);
}

export function notFoundError(message?: string): never {
  throw new AppError("NOT_FOUND", message);
}

export function validationError(fieldErrors: FieldErrors, message?: string): never {
  throw new AppError("VALIDATION", message, fieldErrors);
}
