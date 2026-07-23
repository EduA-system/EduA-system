import type { ExamMatrixWorkspace } from "./types";

const SESSION_KEY = "edua:examMatrixWorkspace:v1";

export function storeExamWorkspace(workspace: ExamMatrixWorkspace): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(workspace));
}

export function readExamWorkspace(): ExamMatrixWorkspace | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExamMatrixWorkspace;
    return parsed.workspaceVersion === 1 && Array.isArray(parsed.chapters) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearExamWorkspace(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}
