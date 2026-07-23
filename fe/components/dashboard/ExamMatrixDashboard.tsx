"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AssistantPanel } from "../layout/AssistantPanel";
import { Sidebar } from "../layout/Sidebar";
import { ExamMatrixTables } from "../exam-matrix/ExamMatrixTables";
import { readExamWorkspace, storeExamWorkspace } from "@/lib/exam-matrix/session";
import { validateWorkspace } from "@/lib/exam-matrix/validation";
import type { ExamMatrixWorkspace } from "@/lib/exam-matrix/types";

export function ExamMatrixDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [workspace, setWorkspace] = useState<ExamMatrixWorkspace | null>(() => readExamWorkspace());
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const validation = useMemo(() => workspace ? validateWorkspace(workspace) : null, [workspace]);

  useEffect(() => {
    if (!workspace) return;
    const timer = window.setTimeout(() => storeExamWorkspace(workspace), 250);
    return () => window.clearTimeout(timer);
  }, [workspace]);

  function save() {
    if (!workspace) return;
    storeExamWorkspace(workspace); setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  if (!workspace) {
    return <main className="grid min-h-screen place-items-center bg-[#f7f5f2] p-6"><div className="max-w-md rounded-2xl border border-[#e0d9d0] bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-semibold">Chưa có Ma trận trong phiên này</h1><p className="mt-3 text-sm leading-6 text-[#6b6b6b]">Hãy quay lại bước cấu hình, xác nhận phạm vi SGK và tạo Ma trận/Bản đặc tả.</p><Link href="/exam-create" className="mt-5 inline-flex rounded-lg bg-[#d97757] px-4 py-2 text-sm font-medium text-white">Quay lại tạo đề</Link></div></main>;
  }

  return <main className="relative h-screen w-full overflow-hidden bg-[#f7f5f2] text-[#2b2926]">
    <div className="flex h-full"><Sidebar collapsed={sidebarCollapsed} />
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 shrink-0 border-b border-[#e8e2d9] bg-[#fbfaf8] shadow-sm">
          <div className="flex h-12 items-center gap-2 px-3">
            <button type="button" onClick={() => setSidebarCollapsed((value) => !value)} className="header-icon" aria-label={sidebarCollapsed ? "Hiện thanh bên" : "Ẩn thanh bên"}>☰</button>
            <button type="button" onClick={save} className="header-action">{saved ? "Đã lưu phiên" : "Lưu"}</button>
            <Link href="/exam-create" className="header-action">Sửa cấu hình</Link>
            <div className="min-w-0 flex-1 text-center text-[12px] text-[#6b6b6b]">{workspace.metadata.subjectLabel} — Lớp {workspace.metadata.grade} — {workspace.metadata.examTypeLabel}</div>
            <button type="button" disabled={!validation?.valid} onClick={() => setNotice("Chức năng sinh đề thi sẽ được triển khai ở giai đoạn tiếp theo.")} className="header-action primary disabled:cursor-not-allowed disabled:opacity-40" title={!validation?.valid ? "Cần sửa hết lỗi trước khi tạo đề" : "Tạo đề thi"}>Tạo đề thi</button>
            <button type="button" onClick={() => setAiCollapsed((value) => !value)} className="header-icon text-[#d97757]" aria-label="Bật/tắt trợ lý AI">✦</button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-[1800px]">
          <section className="mb-5 grid gap-3 rounded-xl border border-[#e0d9d0] bg-white p-4 text-[12px] sm:grid-cols-4">
            <LockedInfo label="Độ khó" value={difficultyLabel(workspace.configuration.difficulty)} />
            <LockedInfo label="Cấu trúc" value={Object.values(workspace.configuration.questionTypes).map((value) => `${value.questionCount} ${value.label}`).join(" · ")} />
            <LockedInfo label="Tỉ lệ nhận thức" value={`${workspace.configuration.assessmentRatios.recognition}% – ${workspace.configuration.assessmentRatios.comprehension}% – ${workspace.configuration.assessmentRatios.application}%`} />
            <LockedInfo label="Phạm vi" value={`${workspace.scope.lessons.length} bài · ước lượng đã xác nhận`} />
          </section>
          {workspace.configuration.warnings.length > 0 && <div className="mb-4 rounded-lg border border-[#ead8b2] bg-[#fffaf0] px-4 py-3 text-xs text-[#805f20]">{workspace.configuration.warnings.map((warning) => <p key={warning}>Sai lệch CV 7991: {warning}.</p>)}</div>}
          {validation && !validation.valid && <div className="mb-5 rounded-lg border border-[#efc8ba] bg-[#fff7f3] px-4 py-3 text-xs leading-5 text-[#a3482e]"><b>Chưa thể tạo đề:</b>{validation.errors.slice(0, 8).map((error) => <p key={error}>• {error}</p>)}{validation.errors.length > 8 && <p>• Và {validation.errors.length - 8} lỗi khác.</p>}</div>}
          {notice && <div className="mb-5 flex items-center justify-between rounded-lg border border-[#c9decf] bg-[#f2fbf5] px-4 py-3 text-xs text-[#276844]"><span>{notice}</span><button type="button" onClick={() => setNotice(null)}>×</button></div>}
          <div className="rounded-xl bg-white p-5 shadow-sm sm:p-8"><ExamMatrixTables workspace={workspace} onChange={setWorkspace} /></div>
        </div></div>
      </section><AssistantPanel collapsed={aiCollapsed} />
    </div>
  </main>;
}

function LockedInfo({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-[#f5f2ee] px-3 py-2" title="Đã xác nhận ở bước Cấu hình đề"><span className="block text-[10px] font-semibold uppercase text-[#8a847d]">{label} · Đã khóa</span><span className="mt-1 block line-clamp-2 font-medium">{value}</span></div>; }
function difficultyLabel(value: string) { return value === "EASY" ? "Dễ" : value === "HARD" ? "Khó" : "Vừa"; }
