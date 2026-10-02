const NBSP = "\u00a0";

/**
 * Normalizes Bulgarian phone numbers to E.164 (+359...).
 * Accepts 0888123456, +359888123456, 00359888123456, 359888123456 with spaces, dashes or dots.
 * National significant numbers are 8 or 9 digits and never start with 0.
 */
export function normalizeBgPhone(input: string): string | null {
  const compact = input.trim().replace(/[\s\-().\/]/g, "");
  let national: string;
  if (/^\+359\d+$/.test(compact)) national = compact.slice(4);
  else if (/^00359\d+$/.test(compact)) national = compact.slice(5);
  else if (/^359\d{8,9}$/.test(compact)) national = compact.slice(3);
  else if (/^0\d+$/.test(compact)) national = compact.slice(1);
  else return null;

  if (!/^[1-9]\d{7,8}$/.test(national)) return null;
  if (/^(87|88|89|98)/.test(national) && national.length !== 9) return null;
  return `+359${national}`;
}

export function isMobileBgPhone(e164: string): boolean {
  return /^\+359(87|88|89|98)\d{7}$/.test(e164);
}

/** "+359888123456" -> "0888 123 456", "+35921234567" -> "02 123 4567". */
export function formatBgPhone(e164: string): string {
  if (!e164.startsWith("+359")) return e164;
  const national = `0${e164.slice(4)}`;
  if (isMobileBgPhone(e164)) {
    return `${national.slice(0, 4)}${NBSP}${national.slice(4, 7)}${NBSP}${national.slice(7)}`;
  }
  if (national.startsWith("02")) {
    return `02${NBSP}${national.slice(2, 5)}${NBSP}${national.slice(5)}`;
  }
  return `${national.slice(0, 3)}${NBSP}${national.slice(3, 6)}${NBSP}${national.slice(6)}`;
}

export function maskBgPhone(e164: string): string {
  const formatted = formatBgPhone(e164);
  return formatted.slice(0, 6) + formatted.slice(6).replace(/\d/g, "X");
}
