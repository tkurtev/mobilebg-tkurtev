/** Only same-site paths are followed; "//host" and "/\host" would leave the site. */
export function internalLink(link: string | null): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//") || link.startsWith("/\\")) return null;
  return link;
}
