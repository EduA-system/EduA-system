import type { LibraryType } from "@/lib/library";

export type ExportPdfRequest = {
  type: Extract<LibraryType, "LESSON_PLAN" | "TEST">;
  title: string;
  documentHtml: string;
  marginLeft?: number;
  marginRight?: number;
};

export type ExportPdfResponse = {
  fileName: string;
  downloadUrl: string;
};

type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function exportDocumentPdf(authFetch: AuthFetch, request: ExportPdfRequest): Promise<ExportPdfResponse> {
  const response = await authFetch("/api/document-exports/pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? "Không thể xuất PDF.");
  }
  return response.json() as Promise<ExportPdfResponse>;
}

export function openExportedPdf(result: ExportPdfResponse) {
  const link = document.createElement("a");
  link.href = result.downloadUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.download = result.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
