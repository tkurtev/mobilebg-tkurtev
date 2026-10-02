export const CURRENCY = "EUR" as const;

const NBSP = "\u00a0";

/** Converts a whole-euro amount entered by a user into integer cents. */
export function eurosToCents(euros: number): number {
  if (!Number.isSafeInteger(euros) || euros < 0) {
    throw new RangeError("Price must be a non-negative whole number of euros");
  }
  return euros * 100;
}

/** Parses "25 990", "25990", "4,99" or "4.99" into integer cents without float arithmetic. */
export function parseEuroInput(input: string): number | null {
  const normalized = input.replace(/[\s\u00a0\u202f€]/g, "").replace(",", ".");
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;
  const whole = Number.parseInt(match[1] ?? "0", 10);
  const fraction = Number.parseInt((match[2] ?? "").padEnd(2, "0") || "0", 10);
  return whole * 100 + fraction;
}

export function centsToWholeEuros(cents: number): number {
  return Math.floor(cents / 100);
}

function groupThousands(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** "2599000" -> "25 990 €", "499" -> "4,99 €". Integer math only. */
export function formatPrice(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const body = fraction === 0 ? groupThousands(whole) : `${groupThousands(whole)},${String(fraction).padStart(2, "0")}`;
  return `${negative ? "-" : ""}${body}${NBSP}€`;
}
