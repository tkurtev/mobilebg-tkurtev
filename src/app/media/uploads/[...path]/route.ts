import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { localUploadsEnabled } from "@/config/env";
import { LOCAL_UPLOAD_DIR } from "@/server/storage";

/** Serves locally stored uploads in development. Production uses Vercel Blob URLs directly. */
export async function GET(_request: Request, context: RouteContext<"/media/uploads/[...path]">) {
  if (!localUploadsEnabled()) return new Response("Not found", { status: 404 });
  const { path } = await context.params;
  if (path.some((segment) => !/^[a-zA-Z0-9._-]+$/.test(segment))) return new Response("Not found", { status: 404 });
  const target = normalize(join(LOCAL_UPLOAD_DIR, ...path));
  if (!target.startsWith(LOCAL_UPLOAD_DIR) || !target.endsWith(".webp")) return new Response("Not found", { status: 404 });
  try {
    const data = await readFile(target);
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
