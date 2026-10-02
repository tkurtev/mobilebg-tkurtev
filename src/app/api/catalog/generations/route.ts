import { z } from "zod";
import { getGenerationsForModel } from "@/features/catalog/queries";

export async function GET(request: Request) {
  const parsed = z.uuid().safeParse(new URL(request.url).searchParams.get("modelId"));
  if (!parsed.success) return Response.json([], { status: 400 });
  const generations = await getGenerationsForModel(parsed.data);
  return Response.json(generations, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
