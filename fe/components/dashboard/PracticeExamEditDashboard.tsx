"use client";

import { useState } from "react";
import Link from "next/link";
import { EditorContent, useEditor } from "@tiptap/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { EditorTools, MathEditPopup, Ruler, createEditorExtensions, type MathClickInfo } from "@/components/LessonEditor";

type Metadata = { subject: string; grade: string; duration: number; difficulty: string };

function draftMetadata(): Metadata {
  const fallback = { subject: "Vật lí", grade: "10", duration: 15, difficulty: "MEDIUM" };
  if (typeof window === "undefined") return fallback;
  const draft = sessionStorage.getItem("edua-practice-exam-draft");
  if (!draft) return fallback;
  try {
    const parsed = JSON.parse(draft) as Partial<Metadata>;
    return { subject: parsed.subject ?? fallback.subject, grade: parsed.grade ?? fallback.grade, duration: parsed.duration ?? fallback.duration, difficulty: parsed.difficulty ?? fallback.difficulty };
  } catch { return fallback; }
}

function examHtml(metadata: Metadata) {
  return `
    <h1>KIỂM TRA ${metadata.duration} PHÚT</h1>
    <p class="document-meta">Môn ${metadata.subject} · Lớp ${metadata.grade} · Thời gian làm bài: ${metadata.duration} phút · Tổng điểm: 10 điểm</p>
    <section>
      <h2>PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN</h2>
      <p><b>Câu 1. (0,5 điểm)</b> Một vật dao động điều hòa có biên độ A và chu kì T. Khi vật đi từ vị trí cân bằng đến biên dương, đại lượng nào giảm?</p>
      <p class="mc-option">A. Li độ</p><p class="mc-option">B. Vận tốc</p><p class="mc-option">C. Pha dao động</p><p class="mc-option">D. Thế năng</p>
      <p><b>Câu 2. (0,5 điểm)</b> Trong dao động điều hòa, gia tốc của vật có đặc điểm nào sau đây?</p>
      <p class="mc-option">A. Cùng pha với li độ</p><p class="mc-option">B. Ngược pha với li độ</p><p class="mc-option">C. Sớm pha π/2 so với li độ</p><p class="mc-option">D. Vuông pha với li độ</p>
    </section>
    <section>
      <h2>PHẦN II. TRẮC NGHIỆM ĐÚNG – SAI</h2>
      <p><b>Câu 3. (2,0 điểm)</b> Xét một vật dao động điều hòa. Hãy xác định đúng hay sai cho từng phát biểu sau.</p>
      <p>a) Khi x = 0, vận tốc của vật có độ lớn cực đại.</p>
      <p>b) Cơ năng tỉ lệ với biên độ dao động.</p>
      <p>c) Gia tốc luôn hướng về vị trí cân bằng.</p>
      <p>d) Chu kì không phụ thuộc vào biên độ với dao động điều hòa lý tưởng.</p>
    </section>
    <section>
      <h2>PHẦN III. TỰ LUẬN</h2>
      <p><b>Câu 4. (2,0 điểm)</b> Một vật dao động điều hòa theo phương trình x = 4cos(2πt + π/3) cm. Xác định biên độ, chu kì và vận tốc cực đại của vật.</p>
    </section>
    <section>
      <h2>ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM</h2>
      <p><b>Câu 1:</b> B. Vận tốc giảm dần từ giá trị cực đại về 0.</p>
      <p><b>Câu 2:</b> B. a = −ω²x nên gia tốc ngược pha với li độ.</p>
      <p><b>Câu 3:</b> a) Đúng; b) Sai; c) Đúng; d) Đúng.</p>
      <p><b>Câu 4:</b></p>
      <ul><li>Xác định đúng biên độ A = 4 cm và chu kì T = 1 s: 1,0 điểm.</li><li>Tính đúng vận tốc cực đại vmax = ωA = 8π cm/s: 1,0 điểm.</li></ul>
    </section>`;
}

const questionLinks = [
  ["Câu 1", "TN nhiều lựa chọn", "0,5đ"],
  ["Câu 2", "TN nhiều lựa chọn", "0,5đ"],
  ["Câu 3", "Đúng – sai", "2,0đ"],
  ["Câu 4", "Tự luận", "2,0đ"],
] as const;

export function PracticeExamEditDashboard() {
  const [metadata] = useState(draftMetadata);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [margins, setMargins] = useState({ left: 80, right: 80 });
  const [mathClick, setMathClick] = useState<MathClickInfo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [extensions] = useState(() => createEditorExtensions({ onMathClick: setMathClick }));
  const editor = useEditor({
    extensions,
    content: examHtml(metadata),
    immediatelyRender: false,
    editorProps: { attributes: { class: "lesson-document-editor min-h-[calc(100vh-230px)] text-[#2b2926] outline-none" } },
  });

  function saveDraft() { setNotice("Bản nháp đã được lưu trong phiên làm việc. API lưu đề riêng tư sẽ được kết nối sau."); }
  function regenerate() { setNotice("Tạo lại từng câu đang chờ API AI. Khi tích hợp, hệ thống sẽ giữ cấu trúc, điểm và phạm vi SGK đã khóa."); }

  return <main className="relative h-screen overflow-hidden bg-[#f7f5f2] text-[#2b2926]"><div className="flex h-full"><Sidebar collapsed={sidebarCollapsed} activeHref="/exam-create-new" /><section className="flex min-w-0 flex-1 flex-col overflow-hidden"><header className="z-30 shrink-0 border-b border-[#e8e2d9] bg-[#fbfaf8] shadow-[0_1px_2px_rgba(43,41,38,0.06)]"><div className="@container flex h-12 items-center gap-2 px-3"><button type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label="Ẩn hoặc hiện thanh điều hướng" className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#e8e2d9] bg-white text-[#6b6b6b] shadow-sm hover:bg-[#f3efe9]"><SidebarToggleIcon /></button><Link href="/exam-create-new" className="hidden shrink-0 rounded-lg border border-[#e8e2d9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5f5750] hover:bg-[#f3efe9] @min-[850px]:inline-flex">← Cấu hình</Link><button type="button" onClick={saveDraft} className="hidden shrink-0 rounded-lg border border-[#e8e2d9] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5f5750] hover:bg-[#f3efe9] @min-[750px]:inline-flex">Lưu</button><div className="flex min-w-0 flex-1 justify-center overflow-x-auto"><EditorTools editor={editor} /></div><button type="button" onClick={() => setNotice("Tính năng xuất PDF/Word sẽ được tích hợp sau khi API lưu đề hoàn thiện.")} className="shrink-0 rounded-lg bg-[#d97757] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#c96545]">Xuất đề</button></div><Ruler bare margins={margins} onMarginsChange={setMargins} /></header><div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto grid max-w-[1440px] gap-5 p-5 lg:grid-cols-[230px_minmax(0,1fr)_270px] lg:p-8"><aside className="h-fit rounded-2xl border border-[#e4dcd3] bg-white p-4 lg:sticky lg:top-5"><p className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8178]">Cấu trúc đề</p><div className="mt-3 rounded-xl bg-[#f8f4ef] p-3 text-xs leading-5 text-[#685f57]"><p><b>4 câu</b> · 5,0 điểm mẫu</p><p>{metadata.duration} phút · {metadata.difficulty === "HARD" ? "Khó" : metadata.difficulty === "EASY" ? "Dễ" : "Vừa"}</p></div><nav className="mt-4 space-y-1">{questionLinks.map(([name, type, score], index) => <button key={name} type="button" onClick={() => setActiveQuestion(index)} className={`w-full rounded-lg px-3 py-2.5 text-left text-xs transition ${activeQuestion === index ? "bg-[#fff0e9] font-semibold text-[#a24f35]" : "text-[#625b54] hover:bg-[#f6f2ed]"}`}><span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-white text-[10px] shadow-sm">{index + 1}</span>{name}<span className="float-right text-[#9c9288]">{score}</span><span className="ml-7 block pt-0.5 text-[10px] font-normal text-[#9c9288]">{type}</span></button>)}</nav><button type="button" onClick={regenerate} className="mt-5 w-full rounded-lg border border-[#ead4c9] px-3 py-2 text-xs font-semibold text-[#a8573b] hover:bg-[#fff6f1]">✦ Tạo lại câu đang chọn</button></aside><main className="min-w-0"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#d97757]">Soạn thảo trực tiếp</p><h1 className="font-libertine mt-2 text-3xl sm:text-4xl">Đề kiểm tra luyện tập</h1><p className="mt-2 text-xs text-[#81776e]">Dùng thanh công cụ để định dạng, chèn bảng, công thức, ảnh và ký hiệu.</p></div><span className="rounded-full bg-[#e8f5eb] px-3 py-1.5 text-xs font-semibold text-[#34704b]">Đang chỉnh sửa</span></div><div className="mx-auto max-w-[816px] pb-10"><div className="bg-white py-14 shadow-[0_1px_2px_rgba(43,41,38,0.06),0_4px_14px_rgba(43,41,38,0.05)]" style={{ paddingLeft: margins.left, paddingRight: margins.right }}><EditorContent editor={editor} /></div></div></main><aside className="h-fit rounded-2xl border border-[#e4dcd3] bg-white p-5 lg:sticky lg:top-5"><p className="text-[11px] font-semibold uppercase tracking-wider text-[#8b8178]">Trợ lý đề kiểm tra</p><h2 className="mt-2 text-lg font-semibold">Tinh chỉnh nhanh</h2><p className="mt-2 text-xs leading-5 text-[#81776e]">Các thao tác AI sẽ được kích hoạt khi backend tạo đề hoàn thiện.</p><div className="mt-5 space-y-2">{["Tăng độ khó câu đang chọn", "Đổi ngữ cảnh câu hỏi", "Thêm lời giải chi tiết", "Kiểm tra bám sát SGK"].map((label) => <button key={label} type="button" onClick={() => setNotice(`“${label}” đang chờ kết nối API AI.`)} className="w-full rounded-lg border border-[#e4dcd3] px-3 py-2.5 text-left text-xs font-medium text-[#5d554e] hover:border-[#d9b9aa] hover:bg-[#fff8f4]">{label}<span className="float-right text-[#c47052]">→</span></button>)}</div><div className="mt-6 rounded-xl bg-[#f8f4ef] p-3"><p className="text-[11px] font-semibold text-[#655c54]">Nguồn kiến thức</p><p className="mt-1 text-[11px] leading-5 text-[#897f76]">Chương/bài SGK nguồn sẽ hiển thị tại đây sau khi API knowledge scope hoàn thiện.</p></div>{notice ? <p role="status" className="mt-4 rounded-lg bg-[#fff4ed] p-3 text-[11px] leading-5 text-[#8b5945]">{notice}</p> : null}</aside></div></div></section></div>{editor && mathClick ? <MathEditPopup editor={editor} info={mathClick} onClose={() => setMathClick(null)} /> : null}</main>;
}

function SidebarToggleIcon() { return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><rect x="2.5" y="3" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" /><path d="M6 3v10" stroke="currentColor" strokeWidth="1.3" /></svg>; }
