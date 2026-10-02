import { parseDemoImageFile, renderDemoImage } from "@/features/media/demo-images";

export async function GET(_request: Request, context: RouteContext<"/media/demo/[file]">) {
  const { file } = await context.params;
  const parsed = parseDemoImageFile(file);
  if (!parsed) return new Response("Not found", { status: 404 });
  return new Response(renderDemoImage(parsed.shape, parsed.color, parsed.variant), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
