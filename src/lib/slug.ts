const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
  ё: "yo", э: "e", ы: "y",
};

/** Bulgarian streamlined transliteration, as used for official romanization. */
export function transliterate(input: string): string {
  let result = "";
  for (const char of input.toLowerCase()) {
    result += CYRILLIC_TO_LATIN[char] ?? char;
  }
  return result;
}

export function slugify(input: string, maxLength = 80): string {
  const slug = transliterate(input)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= maxLength) return slug;
  return slug.slice(0, maxLength).replace(/-+[^-]*$/, "") || slug.slice(0, maxLength);
}
