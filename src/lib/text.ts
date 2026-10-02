const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u2028\u2029\ufeff]/g;
const HTML_TAGS = /<\/?[a-z][^>]*>/gi;

/**
 * User text is stored and rendered as plain text. This strips markup, control and
 * zero-width characters and collapses excessive blank lines. React escapes on render.
 */
export function sanitizePlainText(input: string, maxLength = 10_000): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(HTML_TAGS, "")
    .replace(CONTROL_CHARS, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeSingleLine(input: string, maxLength = 200): string {
  return sanitizePlainText(input, maxLength * 2)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, maxLength - 1).trimEnd()}…`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}
