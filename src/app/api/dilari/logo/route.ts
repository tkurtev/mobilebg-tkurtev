import { revalidatePath, revalidateTag } from "next/cache";
import { setDealerLogo } from "@/features/dealers/service";
import { requireActionUser } from "@/server/auth/session";
import { AppError, type AppErrorCode } from "@/server/errors";
import { enforceRateLimit } from "@/server/rate-limit";
import { isSameOrigin } from "@/server/request";
import { deleteStoredFiles, storeImage } from "@/server/storage";
import { MAX_UPLOAD_BYTES } from "@/server/storage/image";

const STATUS: Record<AppErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 400,
  RATE_LIMITED: 429,
  CONFLICT: 409,
};

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Заявката е отказана." }, { status: 403, headers: NO_STORE });
  try {
    const user = await requireActionUser();
    if (!user.dealer || user.dealer.memberRole !== "OWNER") throw new AppError("FORBIDDEN", "Само собственикът на дилъра може да сменя логото.");
    const dealerId = user.dealer.id;
    await enforceRateLimit("imageUpload", user.id);

    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_UPLOAD_BYTES + 64 * 1024) throw new AppError("VALIDATION", "Файлът е по-голям от 8 MB.");
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File) || file.size === 0) throw new AppError("VALIDATION", "Избери изображение.");
    if (file.size > MAX_UPLOAD_BYTES) throw new AppError("VALIDATION", "Файлът е по-голям от 8 MB.");

    const stored = await storeImage(Buffer.from(await file.arrayBuffer()), { folder: `dealers/${dealerId}`, variant: "logo" });
    let result: Awaited<ReturnType<typeof setDealerLogo>>;
    try {
      result = await setDealerLogo(user, dealerId, { url: stored.url, storagePath: stored.storagePath });
    } catch (error) {
      await deleteStoredFiles([stored.storagePath]);
      throw error;
    }
    await deleteStoredFiles([result.previousPath]);

    revalidateTag("dealers", "max");
    revalidatePath("/dilari");
    revalidatePath(`/dilari/${result.slug}`);
    revalidatePath("/profil/dilar", "layout");
    return Response.json({ url: stored.url }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof AppError) return Response.json({ error: error.message }, { status: STATUS[error.code], headers: NO_STORE });
    console.error("[dealer-logo] upload failed", error);
    return Response.json({ error: "Качването не успя. Опитай отново." }, { status: 500, headers: NO_STORE });
  }
}
