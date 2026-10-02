import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { detectImageType, processImage } from "@/server/storage/image";

describe("image upload validation", () => {
  it("detects image types by signature, not by name", async () => {
    const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#336699" } }).jpeg().toBuffer();
    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#336699" } }).png().toBuffer();
    expect(detectImageType(jpeg)).toBe("jpeg");
    expect(detectImageType(png)).toBe("png");
    expect(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectImageType(Buffer.from("GIF89a....."))).toBeNull();
  });

  it("re-encodes listing photos to WebP within size limits", async () => {
    const jpeg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#aa3322" } }).jpeg().toBuffer();
    const result = await processImage(jpeg, "listing");
    expect(result.width).toBe(1600);
    expect(detectImageType(result.main)).toBe("webp");
    expect((await sharp(result.thumb).metadata()).width).toBe(640);
  });

  it("rejects photos that are too small or not images", async () => {
    const tiny = await sharp({ create: { width: 200, height: 150, channels: 3, background: "#000" } }).jpeg().toBuffer();
    await expect(processImage(tiny, "listing")).rejects.toThrow(/поне/);
    await expect(processImage(Buffer.from("not an image at all, just text"), "listing")).rejects.toThrow();
  });
});
