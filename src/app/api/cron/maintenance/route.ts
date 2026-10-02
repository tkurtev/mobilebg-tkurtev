import { revalidateTag } from "next/cache";
import { env, isProduction } from "@/config/env";
import { runMaintenance } from "@/features/maintenance/service";

/**
 * Called daily by Vercel Cron (see vercel.json). Vercel sends `Authorization: Bearer <CRON_SECRET>`
 * when CRON_SECRET is configured. In production the endpoint refuses to run without it.
 */
export async function GET(request: Request) {
  const secret = env().CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  } else if (isProduction()) {
    return new Response("CRON_SECRET is not configured", { status: 503 });
  }
  const report = await runMaintenance();
  revalidateTag("listings:aggregates", "max");
  return Response.json(report);
}
