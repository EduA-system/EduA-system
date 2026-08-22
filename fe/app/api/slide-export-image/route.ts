import {
  parseAllowedExportImageUrl,
  readImageResponse,
} from "@/lib/api/slide-export-image-proxy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let source: unknown;
  try {
    source = (await request.json() as { source?: unknown }).source;
  } catch {
    return Response.json({ message: "Dữ liệu yêu cầu không hợp lệ." }, { status: 400 });
  }

  const url = parseAllowedExportImageUrl(source);
  if (!url) {
    return Response.json({ message: "Nguồn ảnh không được phép dùng để export." }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, { cache: "no-store", redirect: "error" });
    const { bytes, contentType } = await readImageResponse(upstream);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể tải ảnh nguồn.";
    return Response.json({ message }, { status: 502 });
  }
}
