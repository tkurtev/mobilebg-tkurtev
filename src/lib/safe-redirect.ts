/** Only same-site relative paths are allowed as post-login destinations. */
export function safeRedirectPath(value: string | null | undefined, fallback = "/profil"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/api/")) return fallback;
  return value;
}
