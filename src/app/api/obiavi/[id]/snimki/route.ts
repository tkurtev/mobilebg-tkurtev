import { z } from "zod";
import { addListingImage, assertCanUpload } from "@/features/listings/service";
import { getCurrentUser } from "@/server/auth/session";
import { AppError } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { isSameOrigin } from "@/server/request";
import { MAX_UPLOAD_BYTES } from "@/server/storage/image";
import { storeImage } from "@/server/storage";

/** Image upload for a listing. Files are validated by signature and re-encoded before storage. */
export async function POST(request: Request, context: RouteContext<"/api/obiavi/[id]/snimki">) {
  if (!isSameOrigin(request)) return Response.json({ error: "Забранено." }, { status: 403 });
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return Response.json({ error: "Не е намерено." }, { status: 404 });
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Влез в профила си." }, { status: 401 });

  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) throw new AppError("VALIDATION", "Файлът е по-голям от 8 MB.");
    await enforceRateLimit("imageUpload", user.id);
    await assertCanUpload(user, id);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("VALIDATION", "Липсва файл.");
    if (file.size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "Файлът е по-голям от 8 MB.");
    const stored = await storeImage(Buffer.from(await file.arrayBuffer()), { folder: `listings/${id}`, variant: "listing" });
    const image = await addListingImage(user, id, stored);
    return Response.json({ id: image.id, url: stored.url, thumbUrl: stored.thumbUrl, width: stored.width, height: stored.height });
  } catch (error) {
    if (error instanceof AppError) {
      const status = { UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION: 422, RATE_LIMITED: 429, CONFLICT: 409 }[error.code];
      return Response.json({ error: error.message }, { status });
    }
    console.error("[upload] failed", error);
    return Response.json({ error: "Снимката не можа да бъде качена." }, { status: 500 });
  }
}
