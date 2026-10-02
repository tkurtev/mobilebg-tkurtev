import { getMakesForVehicleType } from "@/features/catalog/queries";

export async function GET(request: Request) {
  const vehicleType = new URL(request.url).searchParams.get("vehicleType") ?? "";
  if (!/^[a-z-]{2,20}$/.test(vehicleType)) return Response.json([], { status: 400 });
  const makes = await getMakesForVehicleType(vehicleType);
  return Response.json(makes, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } });
}
