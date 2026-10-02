import { describe, expect, it } from "vitest";
import { initials, sanitizePlainText, sanitizeSingleLine, truncate } from "@/lib/text";
import { buildSearchDocument, toPrefixTsQuery } from "@/features/listings/search-document";

describe("text sanitizing", () => {
  it("removes markup and control characters", () => {
    expect(sanitizePlainText("<script>alert(1)</script>Хубава кола")).toBe("alert(1)Хубава кола");
    expect(sanitizePlainText("ред 1\r\n\r\n\r\n\r\nред 2")).toBe("ред 1\n\nред 2");
    expect(sanitizePlainText(`a${String.fromCharCode(0x200b)}b${String.fromCharCode(0)}c`)).toBe("abc");
  });

  it("collapses single-line input", () => {
    expect(sanitizeSingleLine("  BMW \n 320d  ")).toBe("BMW 320d");
  });

  it("truncates and builds initials", () => {
    expect(truncate("абвгд", 4)).toBe("абв…");
    expect(initials("Иван Петров")).toBe("ИП");
  });
});

describe("search document", () => {
  it("adds a transliterated copy for Cyrillic parts", () => {
    const doc = buildSearchDocument({ title: "BMW 320d", cityName: "Пловдив" });
    expect(doc).toContain("пловдив");
    expect(doc).toContain("plovdiv");
  });

  it("builds a prefix tsquery from free text", () => {
    expect(toPrefixTsQuery("BMW 320")).toBe("bmw:* & 320:*");
    expect(toPrefixTsQuery("  ")).toBeNull();
    expect(toPrefixTsQuery("голф'; DROP")).toBe("голф:* & drop:*");
  });
});
