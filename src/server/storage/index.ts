import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { del, put } from "@vercel/blob";
import { env, localUploadsEnabled } from "@/config/env";
import { AppError } from "@/server/errors";
import { processImage } from "./image";

export type StoredImage = {
  url: string;
  thumbUrl: string;
  storagePath: string;
  thumbStoragePath: string;
  width: number;
  height: number;
  sizeBytes: number;
};

export const LOCAL_UPLOAD_DIR = join(process.cwd(), ".uploads");
const LOCAL_URL_PREFIX = "/media/uploads/";

interface ObjectStorage {
  put(path: string, data: Buffer, contentType: string): Promise<{ url: string; path: string }>;
  delete(paths: string[]): Promise<void>;
}

class VercelBlobStorage implements ObjectStorage {
  constructor(private readonly token: string) {}

  async put(path: string, data: Buffer, contentType: string) {
    const blob = await put(path, data, { access: "public", contentType, token: this.token, addRandomSuffix: false, cacheControlMaxAge: 31_536_000 });
    return { url: blob.url, path: blob.url };
  }

  async delete(paths: string[]) {
    const urls = paths.filter((path) => path.startsWith("https://"));
    if (urls.length > 0) await del(urls, { token: this.token });
  }
}

/** Development fallback when BLOB_READ_WRITE_TOKEN is not configured. Never used in production. */
class LocalDiskStorage implements ObjectStorage {
  async put(path: string, data: Buffer) {
    const target = normalize(join(LOCAL_UPLOAD_DIR, path));
    if (!target.startsWith(LOCAL_UPLOAD_DIR)) throw new Error("Invalid storage path");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    return { url: `${LOCAL_URL_PREFIX}${path}`, path };
  }

  async delete(paths: string[]) {
    for (const path of paths) {
      if (path.startsWith("demo/") || path.startsWith("https://")) continue;
      const target = normalize(join(LOCAL_UPLOAD_DIR, path));
      if (target.startsWith(LOCAL_UPLOAD_DIR)) await rm(target, { force: true });
    }
  }
}

function getStorage(): ObjectStorage {
  const token = env().BLOB_READ_WRITE_TOKEN;
  if (token) return new VercelBlobStorage(token);
  if (localUploadsEnabled()) return new LocalDiskStorage();
  throw new AppError("CONFLICT", "Качването на снимки не е конфигурирано.");
}

export async function storeImage(bytes: Buffer, options: { folder: string; variant: "listing" | "logo" }): Promise<StoredImage> {
  const processed = await processImage(bytes, options.variant);
  const storage = getStorage();
  const id = randomUUID();
  const main = await storage.put(`${options.folder}/${id}.webp`, processed.main, "image/webp");
  const thumb =
    options.variant === "logo" ? main : await storage.put(`${options.folder}/${id}-thumb.webp`, processed.thumb, "image/webp");
  return {
    url: main.url,
    thumbUrl: thumb.url,
    storagePath: main.path,
    thumbStoragePath: thumb.path,
    width: processed.width,
    height: processed.height,
    sizeBytes: processed.sizeBytes,
  };
}

export async function deleteStoredFiles(paths: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path) && !path!.startsWith("demo/")))];
  if (unique.length === 0) return;
  try {
    await getStorage().delete(unique);
  } catch (error) {
    console.error("[storage] delete failed", error);
  }
}
