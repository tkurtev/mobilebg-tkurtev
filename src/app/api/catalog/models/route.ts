import { z } from "zod";
import { getModelsForMake } from "@/features/catalog/queries";

const querySchema = z.object({ makeId: z.uuid(), vehicleType: z.string().regex(/^[a-z-]{2,20}$/) });

export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return Response.json([], { status: 400 });
  const models = await getModelsForMake(parsed.data.makeId, parsed.data.vehicleType);
  return Response.json(models, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
