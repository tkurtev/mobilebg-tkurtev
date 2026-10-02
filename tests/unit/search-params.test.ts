import { describe, expect, it } from "vitest";
import { ATTRIBUTE_SETS } from "@/config/attribute-sets";
import { countActiveFilters, emptyFilters, parseSearchParams, searchHref, serializeSearch } from "@/features/search/params";

describe("search URL state", () => {
  it("parses a typical car search", () => {
    const state = parseSearchParams({ make: "bmw", model: "3-series", fuel: "diesel,petrol", priceTo: "25000", sort: "price-asc", page: "2" }, ATTRIBUTE_SETS.car);
    expect(state.filters.make).toBe("bmw");
    expect(state.filters.model).toBe("3-series");
    expect(state.filters.fuel).toEqual(["diesel", "petrol"]);
    expect(state.filters.price).toEqual({ from: undefined, to: 25000 });
    expect(state.sort).toBe("price-asc");
    expect(state.page).toBe(2);
  });

  it("drops invalid and unknown values", () => {
    const state = parseSearchParams({ fuel: "diesel,rocket", make: "BMW<script>", sort: "random", page: "-3", priceFrom: "abc", body: "sedan" }, ATTRIBUTE_SETS.car);
    expect(state.filters.fuel).toEqual(["diesel"]);
    expect(state.filters.make).toBeUndefined();
    expect(state.sort).toBe("newest");
    expect(state.page).toBe(1);
    expect(state.filters.price.from).toBeUndefined();
    expect(state.filters.body).toEqual(["sedan"]);
  });

  it("ignores a model without a make and swaps inverted ranges", () => {
    const state = parseSearchParams({ model: "golf", yearFrom: "2020", yearTo: "2010" }, ATTRIBUTE_SETS.car);
    expect(state.filters.model).toBeUndefined();
    expect(state.filters.year).toEqual({ from: 2010, to: 2020 });
  });

  it("parses attribute filters defined by the attribute set", () => {
    const state = parseSearchParams({ season: "winter", rimFrom: "16", registered: "1" }, ATTRIBUTE_SETS.tires);
    expect(state.filters.attributes.season).toEqual({ kind: "select", values: ["winter"] });
    expect(state.filters.attributes.rim).toEqual({ kind: "range", from: 16, to: undefined });
    expect(state.filters.attributes.registered).toBeUndefined();
  });

  it("serializes to a canonical, round-trippable query string", () => {
    const raw = { priceTo: "25000", make: "bmw", fuel: "diesel", sort: "year-desc" };
    const state = parseSearchParams(raw, ATTRIBUTE_SETS.car);
    const query = serializeSearch(state.filters, { sort: state.sort });
    expect(query.toString()).toBe("make=bmw&priceTo=25000&fuel=diesel&sort=year-desc");
    const again = parseSearchParams(Object.fromEntries(query), ATTRIBUTE_SETS.car);
    expect(again).toEqual(state);
  });

  it("builds hrefs and counts active filters", () => {
    const filters = { ...emptyFilters(), make: "audi", fuel: ["diesel"], price: { to: 10000 } };
    expect(searchHref("avtomobili", filters, { page: 3 })).toBe("/avtomobili?make=audi&priceTo=10000&fuel=diesel&page=3");
    expect(searchHref("avtomobili", emptyFilters())).toBe("/avtomobili");
    expect(countActiveFilters(filters)).toBe(3);
  });
});
