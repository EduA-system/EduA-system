const DEFAULT_R2_HOST = "pub-d762c5a8e44243f4aec497849f319ca4.r2.dev";

export const MAX_EXPORT_IMAGE_BYTES = 15 * 1024 * 1024;

function configuredHosts(): Set<string> {
  const hosts = new Set([DEFAULT_R2_HOST]);
  const publicUrl = process.env.APP_R2_PUBLIC_URL?.trim();
  if (publicUrl) {
    try {
      hosts.add(new URL(publicUrl).hostname.toLowerCase());
    } catch {
      // A malformed optional environment value must not widen proxy access.
    }
  }
  for (const host of (process.env.SLIDE_EXPORT_IMAGE_HOSTS ?? "").split(",")) {
    if (host.trim()) hosts.add(host.trim().toLowerCase());
  }
  return hosts;
}

export function parseAllowedExportImageUrl(source: unknown): URL | null {
  if (typeof source !== "string") return null;
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || !configuredHosts().has(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

export async function readImageResponse(response: Response): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string }> {
  if (!response.ok) throw new Error(`Không thể tải ảnh nguồn (HTTP ${response.status})`);

  const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() ?? "";
  if (!contentType.startsWith("image/")) throw new Error("URL nguồn không trả về hình ảnh");

  const declaredSize = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_EXPORT_IMAGE_BYTES) {
    throw new Error("Ảnh vượt quá giới hạn 15 MB");
  }

  if (!response.body) return { bytes: new Uint8Array(), contentType };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_EXPORT_IMAGE_BYTES) throw new Error("Ảnh vượt quá giới hạn 15 MB");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, contentType };
}
