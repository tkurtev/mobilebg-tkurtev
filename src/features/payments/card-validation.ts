import { z } from "zod";

/**
 * Format checks for the demo card form. They run in the browser only: card data is never sent
 * to the server. There is intentionally no Luhn check and no issuer lookup, so any
 * syntactically valid card passes.
 */

export const CARD_NUMBER_MIN_DIGITS = 13;
export const CARD_NUMBER_MAX_DIGITS = 19;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** "4111111111111111" -> "4111 1111 1111 1111". Extra digits beyond 19 are dropped. */
export function formatCardNumber(value: string): string {
  return digitsOnly(value)
    .slice(0, CARD_NUMBER_MAX_DIGITS)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function isValidCardNumberFormat(value: string): boolean {
  if (!/^[\d ]+$/.test(value.trim())) return false;
  const length = digitsOnly(value).length;
  return length >= CARD_NUMBER_MIN_DIGITS && length <= CARD_NUMBER_MAX_DIGITS;
}

/** Typing helper for "ММ/ГГ": "4" -> "04", "1230" -> "12/30", autofilled "12/2030" -> "12/30". */
export function formatExpiryInput(value: string): string {
  const autofilled = /^(\d{2})\s*\/\s*\d{2}(\d{2})$/.exec(value.trim());
  if (autofilled) return `${autofilled[1]}/${autofilled[2]}`;
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length === 1 && digits > "1") return `0${digits}`;
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export type CardExpiry = { month: number; year: number };

const EXPIRY_PATTERN = /^(\d{2})\s*\/\s*(\d{2})$/;

export function parseExpiry(value: string): CardExpiry | null {
  const match = EXPIRY_PATTERN.exec(value.trim());
  if (!match) return null;
  const month = Number(match[1]);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + Number(match[2]) };
}

/** Cards are valid through the last day of the printed month. */
export function isExpiryCurrentOrFuture(expiry: CardExpiry, now: Date = new Date()): boolean {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return expiry.year > year || (expiry.year === year && expiry.month >= month);
}

export function isValidCvc(value: string): boolean {
  return /^\d{3,4}$/.test(value.trim());
}

export function isValidCardholderName(value: string): boolean {
  const name = value.trim();
  return name.length >= 2 && name.length <= 80 && /^\p{L}[\p{L} .'’-]*$/u.test(name);
}

export function cardFormSchema(now: () => Date = () => new Date()) {
  return z.object({
    cardholderName: z
      .string()
      .trim()
      .min(1, "Въведи името на картодържателя.")
      .refine(isValidCardholderName, "Въведи името, както е изписано на картата."),
    cardNumber: z.string().trim().min(1, "Въведи номера на картата.").refine(isValidCardNumberFormat, "Номерът трябва да е от 13 до 19 цифри."),
    expiry: z
      .string()
      .trim()
      .min(1, "Въведи валидността на картата.")
      .superRefine((value, ctx) => {
        const expiry = parseExpiry(value);
        if (!EXPIRY_PATTERN.test(value)) ctx.addIssue({ code: "custom", message: "Използвай формат ММ/ГГ." });
        else if (!expiry) ctx.addIssue({ code: "custom", message: "Месецът трябва да е от 01 до 12." });
        else if (!isExpiryCurrentOrFuture(expiry, now())) ctx.addIssue({ code: "custom", message: "Валидността на картата е изтекла." });
      }),
    cvc: z.string().trim().min(1, "Въведи CVC.").refine(isValidCvc, "CVC е 3 или 4 цифри."),
  });
}

export type CardFormValues = z.infer<ReturnType<typeof cardFormSchema>>;
