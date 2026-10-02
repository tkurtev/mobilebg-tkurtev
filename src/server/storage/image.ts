import "server-only";
import sharp, { type Metadata } from "sharp";
import { AppError } from "@/server/errors";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MIN_LISTING_WIDTH = 400;
const MIN_LISTING_HEIGHT = 300;
const MAX_DIMENSION = 12_000;

type DetectedType = "jpeg" | "png" | "webp" | "avif";

/** Checks magic bytes instead of trusting the client-provided MIME type or extension. */
export function detectImageType(bytes: Uint8Array): DetectedType | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(8, 12))) return "avif";
  return null;
}

export type ProcessedImage = { main: Buffer; thumb: Buffer; width: number; height: number; sizeBytes: number };

export async function processImage(bytes: Buffer, variant: "listing" | "logo"): Promise<ProcessedImage> {
  if (bytes.length > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "Файлът е по-голям от 8 MB.");
  if (!detectImageType(bytes)) throw new AppError("VALIDATION", "Позволени са само JPEG, PNG, WebP и AVIF изображения.");

  let metadata: Metadata;
  try {
    metadata = await sharp(bytes, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION }).metadata();
  } catch {
    throw new AppError("VALIDATION", "Файлът не е валидно изображение.");
  }
  const rotated = (metadata.orientation ?? 1) >= 5;
  const width = (rotated ? metadata.height : metadata.width) ?? 0;
  const height = (rotated ? metadata.width : metadata.height) ?? 0;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) throw new AppError("VALIDATION", "Изображението е твърде голямо.");
  if (variant === "listing" && (width < MIN_LISTING_WIDTH || height < MIN_LISTING_HEIGHT)) {
    throw new AppError("VALIDATION", `Снимката трябва да е поне ${MIN_LISTING_WIDTH}x${MIN_LISTING_HEIGHT} пиксела.`);
  }

  // rotate() applies EXIF orientation; metadata (including GPS) is dropped because withMetadata is not used.
  const base = () => sharp(bytes, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION }).rotate();
  if (variant === "logo") {
    const main = await base().resize(400, 400, { fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
    return { main: main.data, thumb: main.data, width: main.info.width, height: main.info.height, sizeBytes: main.data.length };
  }
  const main = await base().resize(1600, 1200, { fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await base().resize(640, 480, { fit: "cover", position: "attention" }).webp({ quality: 76 }).toBuffer();
  return { main: main.data, thumb, width: main.info.width, height: main.info.height, sizeBytes: main.data.length };
}
