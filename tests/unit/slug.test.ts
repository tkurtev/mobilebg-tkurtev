import { describe, expect, it } from "vitest";
import { slugify, transliterate } from "@/lib/slug";
import { buildListingSlug, listingPath, parseListingParam } from "@/features/listings/paths";

describe("slugs and listing URLs", () => {
  it("transliterates Bulgarian Cyrillic", () => {
    expect(transliterate("Велико Търново")).toBe("veliko tarnovo");
    expect(transliterate("Щастие")).toBe("shtastie");
    expect(slugify("Селскостопанска техника")).toBe("selskostopanska-tehnika");
  });

  it("builds slugs from listing titles", () => {
    expect(buildListingSlug("BMW 320d xDrive")).toBe("bmw-320d-xdrive");
    expect(buildListingSlug("!!!")).toBe("obiava");
  });

  it("uses the number as identity and the slug as decoration", () => {
    const path = listingPath({ categorySlug: "avtomobili", number: 10000254, slug: "bmw-320d" });
    expect(path).toBe("/avtomobili/10000254-bmw-320d");
    expect(parseListingParam("10000254-bmw-320d")).toBe(10000254);
    expect(parseListingParam("10000254")).toBe(10000254);
    expect(parseListingParam("bmw-320d")).toBeNull();
    expect(parseListingParam("10000254-<script>")).toBeNull();
  });
});
