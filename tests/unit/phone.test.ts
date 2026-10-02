import { describe, expect, it } from "vitest";
import { formatBgPhone, isMobileBgPhone, maskBgPhone, normalizeBgPhone } from "@/lib/phone";

const NBSP = String.fromCharCode(0xa0);

describe("Bulgarian phone numbers", () => {
  it.each([
    ["0888123456", "+359888123456"],
    ["+359888123456", "+359888123456"],
    ["00359 888 123 456", "+359888123456"],
    ["359888123456", "+359888123456"],
    ["088-812-3456", "+359888123456"],
    ["02 123 4567", "+35921234567"],
    ["032 123 456", "+35932123456"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeBgPhone(input)).toBe(expected);
  });

  it.each(["", "12345", "0088812345", "+44 20 7946 0958", "08881234567", "abc"])("rejects %s", (input) => {
    expect(normalizeBgPhone(input)).toBeNull();
  });

  it("formats mobile and Sofia numbers", () => {
    expect(formatBgPhone("+359888123456")).toBe(`0888${NBSP}123${NBSP}456`);
    expect(formatBgPhone("+35921234567")).toBe(`02${NBSP}123${NBSP}4567`);
    expect(isMobileBgPhone("+359888123456")).toBe(true);
    expect(isMobileBgPhone("+35921234567")).toBe(false);
  });

  it("masks the subscriber part", () => {
    expect(maskBgPhone("+359888123456")).toBe(`0888${NBSP}1XX${NBSP}XXX`);
  });
});
