import { describe, expect, it } from "vitest";
import { eurosToCents, formatPrice, parseEuroInput } from "@/lib/money";

const NBSP = String.fromCharCode(0xa0);

describe("money", () => {
  it("formats whole euro prices with grouped thousands", () => {
    expect(formatPrice(2_599_000)).toBe(`25${NBSP}990${NBSP}€`);
    expect(formatPrice(100)).toBe(`1${NBSP}€`);
    expect(formatPrice(123_456_700)).toBe(`1${NBSP}234${NBSP}567${NBSP}€`);
  });

  it("formats cents with a decimal comma", () => {
    expect(formatPrice(499)).toBe(`4,99${NBSP}€`);
    expect(formatPrice(1_005)).toBe(`10,05${NBSP}€`);
  });

  it("converts euros to integer cents without floating point", () => {
    expect(eurosToCents(25_990)).toBe(2_599_000);
    expect(() => eurosToCents(1.5)).toThrow();
    expect(() => eurosToCents(-1)).toThrow();
  });

  it("parses user input into cents", () => {
    expect(parseEuroInput("25 990")).toBe(2_599_000);
    expect(parseEuroInput("4,99 €")).toBe(499);
    expect(parseEuroInput("4.9")).toBe(490);
    expect(parseEuroInput("abc")).toBeNull();
    expect(parseEuroInput("1,234")).toBeNull();
  });
});
