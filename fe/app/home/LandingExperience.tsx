"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Check, FlaskConical, ImageIcon, MousePointer2, Plus, Redo2, Shapes, Sparkles, Type, Undo2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MOLECULE_CATALOG } from "@/components/molecules/catalog";
import { ImgDecor } from "./_shared";
import styles from "./landing.module.css";

const ScienceLab = dynamic(() => import("./ScienceLab"), {
  ssr: false,
  loading: () => <div className={styles.scienceLoading}>Đang mở phòng lab EDUA…</div>,
});

const lessonBeats = [
  ["Chọn đúng ngữ cảnh", "Bắt đầu từ môn học, lớp, chương và bài thay vì một prompt trống."],
  ["Bổ sung ý đồ sư phạm", "Chọn gợi ý hoặc ghi yêu cầu riêng cho mục tiêu và năng lực cần nhấn mạnh."],
  ["Theo dõi tiến trình", "Hệ thống phản hồi trạng thái rõ ràng khi xây dựng từng hoạt động."],
  ["Giáo viên quyết định", "Bản 5512 có thể chỉnh sửa, lưu thư viện hoặc xuất PDF."],
] as const;

const slideBeats = [
  ["Kế thừa giáo án", "Nội dung và cấu trúc bài học trở thành nguồn cho deck."],
  ["Duyệt outline", "Sắp lại mạch kể chuyện và các fragment kiến thức trước khi sinh."],
  ["Sinh theo từng phần", "Tiêu đề, công thức, sơ đồ và media ráp vào từng slide."],
  ["Chỉnh sửa & trình chiếu", "Toolbar, layers, timeline và presentation nằm trong một studio."],
] as const;

const teacherFeedback = [
  { initials: "MA", name: "Cô Minh Anh", subject: "Giáo viên Hóa học", quote: "Tôi thích cách một ý tưởng có thể đi liền từ giáo án sang slide và hoạt động lớp." },
  { initials: "QB", name: "Thầy Quốc Bảo", subject: "Giáo viên Vật lý", quote: "Mô phỏng giúp phần giải thích lực và chuyển động trực quan hơn rất nhiều." },
  { initials: "TH", name: "Cô Thu Hà", subject: "Giáo viên Vật lý", quote: "Các bước rõ ràng nên tôi vẫn kiểm soát được nội dung ở từng thời điểm." },
  { initials: "KN", name: "Thầy Khánh Nam", subject: "Giáo viên Toán học", quote: "Một không gian gọn để chuẩn bị, chỉnh sửa và tiếp tục dùng lại học liệu." },
  { initials: "LP", name: "Cô Lan Phương", subject: "Giáo viên Sinh học", quote: "Học liệu có hình và tương tác khiến tiết học dễ bắt đầu hơn." },
] as const;

type MotifVariant = "lesson" | "outline" | "slide" | "science" | "library" | "feedback";

const MOTIFS: Record<MotifVariant, string[]> = {
  lesson: ["notebook", "checklist", "pencil", "nodes", "molecule", "formula"],
  outline: ["nodes", "checklist", "layers", "pencil", "formula", "slide"],
  slide: ["slide", "crop", "chart", "layers", "molecule", "spark"],
  science: ["atom", "beaker", "wave", "force", "cells", "formula"],
  library: ["paper", "stamp", "nodes", "check", "formula", "spark"],
  feedback: ["roster", "paper", "spark", "nodes", "formula", "pencil"],
};

function MotifSymbol({ kind }: { kind: string }) {
  const common = { className: styles.motifSvg, viewBox: "0 0 120 90", "data-motif-svg": true, "data-kind": kind, "aria-hidden": true } as const;
  if (kind === "notebook") return <svg {...common}><path d="M31 12h58v66H31zM39 27h39M39 37h31M39 47h36M39 57h27M25 22h12M25 35h12M25 48h12M25 61h12"/><path d="m72 66 8 4 10-16"/></svg>;
  if (kind === "checklist") return <svg {...common}><rect x="24" y="14" width="72" height="62" rx="8"/><path d="m35 31 5 5 9-12M55 31h28M35 49l5 5 9-12M55 49h24M35 66h48"/></svg>;
  if (kind === "pencil") return <svg {...common}><path d="m25 65 8-24 43-29 14 16-44 37zM33 41l13 24M76 12l14 16M25 65l21 0-15 10z"/></svg>;
  if (kind === "nodes") return <svg {...common}><circle cx="24" cy="50" r="9"/><circle cx="60" cy="23" r="9"/><circle cx="95" cy="54" r="9"/><path d="M32 43 52 29M68 29l19 18M33 54l53 1"/><path d="m82 50 7 5-7 5"/></svg>;
  if (kind === "molecule") return <svg {...common}><path d="M34 48 59 27l28 25M34 48l28 24 25-20"/><circle cx="34" cy="48" r="12"/><circle cx="59" cy="27" r="9"/><circle cx="87" cy="52" r="14"/><circle cx="62" cy="72" r="8"/></svg>;
  if (kind === "formula") return <svg {...common}><text x="12" y="38">F = ma</text><path d="M13 53h92"/><text x="20" y="72">ΔE = Q + A</text></svg>;
  if (kind === "slide") return <svg {...common}><rect x="17" y="16" width="86" height="58" rx="6"/><path d="M28 29h40M28 39h27M72 50l18 11H72z"/></svg>;
  if (kind === "crop") return <svg {...common}><path d="M28 13v55a9 9 0 0 0 9 9h55M13 28h55a9 9 0 0 1 9 9v40M27 27l50 50"/></svg>;
  if (kind === "chart") return <svg {...common}><path d="M20 68V18M20 68h82M28 60c19-5 22-27 39-23s18-14 31-18"/><circle cx="67" cy="37" r="4"/></svg>;
  if (kind === "layers") return <svg {...common}><path d="m60 15 42 20-42 20-42-20zM18 48l42 20 42-20M28 64l32 15 32-15"/></svg>;
  if (kind === "spark") return <svg {...common}><path d="m57 10 7 20 20 7-20 7-7 20-7-20-20-7 20-7zM91 57l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"/></svg>;
  if (kind === "atom") return <svg {...common}><circle cx="60" cy="45" r="7"/><ellipse cx="60" cy="45" rx="45" ry="17"/><ellipse cx="60" cy="45" rx="45" ry="17" transform="rotate(60 60 45)"/><ellipse cx="60" cy="45" rx="45" ry="17" transform="rotate(120 60 45)"/><circle cx="102" cy="42" r="4"/></svg>;
  if (kind === "beaker") return <svg {...common}><path d="M43 12h34M49 12v24L28 72c-3 5 1 8 7 8h50c6 0 10-3 7-8L71 36V12M37 62h46M42 52c14 7 22-7 36 0"/></svg>;
  if (kind === "wave") return <svg {...common}><path d="M10 48c14-30 28-30 42 0s28 30 42 0 16-22 20-21M10 70h104"/></svg>;
  if (kind === "force") return <svg {...common}><rect x="45" y="31" width="30" height="28" rx="5"/><path d="M42 20H12m0 0 10-7M12 20l10 7M78 70h30m0 0-10-7m10 7-10 7"/><text x="83" y="27">F</text></svg>;
  if (kind === "cells") return <svg {...common}>{Array.from({ length: 24 }, (_, index) => <rect key={index} x={15 + (index % 6) * 15} y={13 + Math.floor(index / 6) * 15} width="11" height="11" rx="2"/>)}</svg>;
  if (kind === "plane") return <svg {...common}><path d="M12 68C30 30 61 21 102 22" strokeDasharray="5 7"/><path d="m82 13 25 9-23 13 5-11z"/></svg>;
  if (kind === "ruler") return <svg {...common}><path d="M15 30h91v31H15zM27 30v14M40 30v9M53 30v14M66 30v9M79 30v14M92 30v9"/></svg>;
  if (kind === "check") return <svg {...common}><circle cx="60" cy="45" r="32"/><path d="m42 46 12 12 25-29"/></svg>;
  if (kind === "calendar") return <svg {...common}><rect x="22" y="18" width="76" height="60" rx="8"/><path d="M22 35h76M40 11v15M80 11v15M36 49h9M55 49h9M74 49h9M36 63h9M55 63h9"/></svg>;
  if (kind === "paper") return <svg {...common}><path d="M28 12h48l16 16v52H28zM76 12v18h16M40 42h40M40 53h32M40 64h36"/></svg>;
  if (kind === "clock") return <svg {...common}><circle cx="60" cy="45" r="34"/><path d="M60 24v23l16 9"/></svg>;
  if (kind === "roster") return <svg {...common}><circle cx="36" cy="31" r="9"/><circle cx="74" cy="31" r="9"/><path d="M18 65c2-17 34-17 36 0M55 65c2-17 34-17 36 0M96 26v34m-8-8 8 8 12-18"/></svg>;
  if (kind === "bell") return <svg {...common}><path d="M35 62h50l-8-12V37c0-24-34-24-34 0v13zM52 69c3 11 13 11 16 0"/></svg>;
  if (kind === "stamp") return <svg {...common}><path d="M43 17h34l-5 27 15 12v10H33V56l15-12zM27 73h66"/><circle cx="60" cy="58" r="13"/></svg>;
  return null;
}

function AcademicMotifField({ variant }: { variant: MotifVariant }) {
  return <div className={`${styles.motifField} ${styles[`motif${variant[0].toUpperCase()}${variant.slice(1)}`]}`} aria-hidden="true">{MOTIFS[variant].map((kind, index) => <MotifSymbol key={`${kind}-${index}`} kind={kind} />)}</div>;
}

function Chevron() { return <svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 5 3 3 3-3"/></svg>; }

function LessonWindow({ active }: { active: number }) {
  const suggestions = ["Dao động điều hòa", "Bảo toàn năng lượng", "Điện trường", "Hàm số bậc hai", "Quang hợp", "Cảm ứng điện từ"];
  const fields = ["Vật lí", "Lớp 11", "Dao động", "Con lắc đơn"];
  return (
    <div className={`${styles.appWindow} ${styles.lessonWindow}`} data-synthesis-receiver aria-label="Minh họa giao diện tạo giáo án EDUA">
      <div className={styles.windowBar}><i /><i /><i /></div>
      <div className={styles.lessonRealCanvas}>
        <span className={styles.aiBadge}>✣ &nbsp; SOẠN GIÁO ÁN BẰNG AI</span>
        <h3>Tạo giáo án</h3>
        <p>Chuyển đổi nội dung chương trình học thành giáo án có cấu trúc với hỗ trợ của AI.</p>
        <div className={styles.suggestionLabel}>Gợi ý phổ biến</div>
        <div className={styles.suggestionRow}>{suggestions.map((item, index) => <span key={item} className={index === 0 ? styles.suggestionActive : ""} aria-current={index === 0 ? "true" : undefined}>{item}</span>)}</div>
        <div className={styles.lessonFormPanel}>
          <div className={styles.formTitle}>✣ &nbsp; CHỌN NỘI DUNG GIẢNG DẠY</div>
          <div className={styles.realFields}>{fields.map((field, index) => <div key={field} className={index <= active ? styles.realFieldActive : ""}><span>{field}</span><Chevron /></div>)}</div>
          <div className={styles.formDivider} />
          <label>Yêu cầu thêm cho mục tiêu (tuỳ chọn)</label>
          <div className={`${styles.promptField} ${active >= 1 ? styles.promptFieldActive : ""}`}>{active >= 1 ? "Nhấn mạnh năng lực thực nghiệm và liên hệ hiện tượng thực tiễn." : "Ví dụ: Nhấn mạnh năng lực thực nghiệm và liên hệ thực tiễn."}</div>
        </div>
        <div className={styles.lessonGenerate}>
          <button type="button">{active >= 2 ? "Đang tạo giáo án…" : "Tạo giáo án"}</button>
          <span>{active === 0 ? "Đã chọn chủ đề Dao động điều hòa" : active === 1 ? "Đã bổ sung yêu cầu sư phạm" : active === 2 ? "Đang dựng Hoạt động 3/4" : "Sẵn sàng để giáo viên duyệt"}</span>
        </div>
      </div>
    </div>
  );
}

const outlineStoryBeats = [
  ["AI dựng khung bài giảng", "Từ giáo án Con lắc đơn, hệ thống stream sáu phần và hai mươi sáu slide theo đúng tiến trình nhận thức."],
  ["Sửa trực tiếp tiêu đề", "Giáo viên đặt con trỏ vào phần hoặc slide để tinh chỉnh mạch kể chuyện ngay tại chỗ."],
  ["Kéo thả & mở chi tiết", "Đổi thứ tự phần, kiểm tra vai trò sư phạm và mở các block nội dung trước khi sinh deck."],
  ["Chốt cấu trúc, sinh slide", "Khi outline đã đúng, một lần xác nhận chuyển toàn bộ cấu trúc sang Slide Studio."],
] as const;

const outlineStoryParts = [
  { number: "01", title: "Khởi động: Năng lượng của con lắc", slides: [{ role: "Mở đầu", title: "Con lắc có dừng lại mãi không?" }, { role: "Câu hỏi", title: "Năng lượng đã chuyển đi đâu?" }, { role: "Minh họa", title: "Quan sát chuyển động của con lắc", ai: true }, { role: "Kết nối", title: "Từ hiện tượng đến vấn đề cần khám phá" }] },
  { number: "02", title: "Khám phá: Sự chuyển hóa giữa động năng và thế năng", slides: [{ role: "Khác", title: "Khám phá: Sự chuyển hóa giữa động năng và thế năng" }, { role: "Suy luận", title: "Phân tích sự chuyển hóa qua ví dụ thác nước", ai: true }, { role: "Suy luận", title: "Phân tích sự chuyển hóa qua ví dụ ném vật lên cao" }, { role: "Minh họa", title: "Quan sát và thảo luận về chuyển hóa năng lượng của tàu lượn siêu tốc", ai: true }] },
  { number: "03", title: "Giải thích: Định luật bảo toàn cơ năng", slides: [{ role: "Khác", title: "Giải thích: Định luật bảo toàn cơ năng" }, { role: "Giải thích", title: "Định luật bảo toàn cơ năng" }, { role: "Suy luận", title: "Phân tích định luật qua con lắc đơn" }, { role: "Suy luận", title: "Biểu thức định luật bảo toàn cơ năng" }, { role: "Tổng kết", title: "Củng cố: Điều kiện áp dụng định luật" }] },
  { number: "04", title: "Kiểm chứng qua mô phỏng con lắc", slides: [{ role: "Minh họa", title: "Quan sát động năng và thế năng", ai: true }, { role: "Thực hành", title: "Thay đổi chiều dài dây treo" }, { role: "Thực hành", title: "Đối chiếu dữ liệu theo từng vị trí" }, { role: "Kết luận", title: "Kiểm chứng bảo toàn cơ năng" }] },
  { number: "05", title: "Luyện tập và phân tích dữ liệu", slides: [{ role: "Luyện tập", title: "Đọc đồ thị chuyển hóa năng lượng" }, { role: "Câu hỏi", title: "Xác định vị trí vận tốc cực đại" }, { role: "Suy luận", title: "So sánh động năng và thế năng" }, { role: "Tổng kết", title: "Hệ thống hóa kết quả quan sát" }] },
  { number: "06", title: "Vận dụng: Năng lượng trong đời sống", slides: [{ role: "Vận dụng", title: "Tàu lượn siêu tốc" }, { role: "Vận dụng", title: "Chuyển hóa năng lượng trong thủy điện", ai: true }, { role: "Câu hỏi", title: "Khi nào cơ năng không được bảo toàn?" }, { role: "Mở rộng", title: "Vai trò của lực cản và ma sát" }, { role: "Tổng kết", title: "Điều kiện áp dụng định luật" }] },
] as const;

function OutlineBeatGraphic({ index }: { index: number }) {
  if (index === 0) return <svg className={styles.outlineBeatGraphic} viewBox="0 0 360 120" aria-hidden="true"><rect x="26" y="24" width="308" height="14" rx="7"/><rect x="26" y="52" width="238" height="14" rx="7"/><rect x="26" y="80" width="280" height="14" rx="7"/><path d="M26 31h202M26 59h145M26 87h242"/></svg>;
  if (index === 1) return <svg className={styles.outlineBeatGraphic} viewBox="0 0 360 120" aria-hidden="true"><rect x="27" y="31" width="306" height="58" rx="12"/><path d="M58 59h207M58 73h154M286 45v33"/><path d="m281 48 5-9 5 9"/></svg>;
  if (index === 2) return <svg className={styles.outlineBeatGraphic} viewBox="0 0 360 120" aria-hidden="true"><rect x="28" y="18" width="138" height="38" rx="9"/><rect x="194" y="64" width="138" height="38" rx="9"/><path d="M90 65c28 28 102 29 140-1m0 0-10-2m10 2-5 9"/><path d="M44 31h8M44 38h8M44 45h8"/></svg>;
  return <svg className={styles.outlineBeatGraphic} viewBox="0 0 360 120" aria-hidden="true"><rect x="36" y="31" width="288" height="58" rx="12"/><path d="M84 60h156m0 0-12-9m12 9-12 9"/><circle cx="282" cy="60" r="16"/><path d="m274 60 6 6 11-14"/></svg>;
}

function OutlineStoryWindow({ active }: { active: number }) {
  return (
    <div className={`${styles.appWindow} ${styles.outlineStoryWindow} ${styles[`outlineStoryState${active}`]}`} aria-label="Minh họa trình duyệt outline EDUA">
      <div className={styles.outlineStoryChrome}><i /><i /><i /><span>EDUA · Outline slide</span><b>{active === 0 ? "AI đang dựng outline" : "Sẵn sàng chỉnh sửa"}</b></div>
      <header className={styles.outlineStoryHeader}><div className={styles.outlineStoryIdentity}><b>AI</b><strong>Bảo toàn cơ năng</strong></div><div className={styles.outlineStoryActions}><span>{active === 0 ? "Đang soạn nội dung…" : "Sẵn sàng chỉnh sửa"}</span><b>6 phần · 26 slides</b><button type="button">Xuất JSON</button></div></header>
      <div className={styles.outlineStoryProgress}><i /><span>AI đang tạo outline từ giáo án Con lắc đơn…</span></div>
      <div className={styles.outlineStoryViewport}>
        <div className={styles.outlineStoryScroll}>
          <div className={styles.outlineStoryHint}>✎ &nbsp; Bấm vào tiêu đề để sửa, kéo thả phần để đổi thứ tự hoặc mở “Chi tiết”.</div>
          <div className={styles.outlineStoryParts}>
            {outlineStoryParts.map((part, partIndex) => (
              <section key={part.number} className={`${styles.outlineStoryPart} ${active === 1 && partIndex === 1 ? styles.outlineStoryEditing : ""} ${active === 2 && partIndex === 1 ? styles.outlineStoryDragging : ""}`} style={{ "--outline-index": partIndex } as React.CSSProperties}>
                <div className={styles.outlineStoryPartHead}><i>⠿</i><span>PHẦN {part.number}</span><strong>{part.title}<small>✎</small></strong>{active === 1 && partIndex === 1 ? <em className={styles.outlineCaret} /> : null}<button type="button" aria-label="Xóa phần">×</button></div>
                <div className={styles.outlineStorySlides}>
                  {part.slides.map((slide, slideIndex) => { const hasAi = "ai" in slide && slide.ai; return <article key={slide.title} className={active >= 2 && partIndex === 1 && slideIndex === 0 ? styles.outlineStorySlideOpen : ""}><div><span>{slide.role}</span><em className={`${styles.outlineAiNote} ${hasAi ? "" : styles.outlineAiNoteEmpty}`}>{hasAi ? "AI" : ""}</em><strong>{slide.title}<i>✎</i></strong><button type="button"><small>▸</small>{active >= 2 && partIndex === 1 && slideIndex === 0 ? "Thu gọn" : "Chi tiết"}</button><b>×</b></div>{active >= 2 && partIndex === 1 && slideIndex === 0 ? <div className={styles.outlineStoryBlocks}><span>TIÊU ĐỀ</span><span>GIẢI THÍCH</span><span>MINH HỌA</span><b>Quan sát sự chuyển hóa qua mô phỏng con lắc.</b></div> : null}</article>; })}
                </div>
                <button type="button" className={styles.outlineAddSlide}>＋ Thêm slide</button>
              </section>
            ))}
          </div>
          <button type="button" className={styles.outlineStoryAddPart}>＋ Thêm phần</button>
        </div>
        <div className={styles.outlineStoryScrollbar}><i /></div>
      </div>
      <footer className={styles.outlineStoryFooter}><strong>{active === 3 ? <><i /> Đang bắt đầu sinh slide…</> : "Tạo 26 slides →"}</strong></footer>
      <div className={styles.outlineMode}><span>Chế độ</span><b>Cơ bản</b><i>Nâng cao</i></div>
      <div className={styles.outlineCursor} aria-hidden="true"><MousePointer2 /><i /></div>
    </div>
  );
}

function StoryBeatGraphic({ story, index }: { story: "lesson" | "slide"; index: number }) {
  if (story === "lesson" && index === 0) return <svg className={styles.beatGraphic} viewBox="0 0 360 150" aria-hidden="true"><rect x="18" y="24" width="86" height="43" rx="9"/><rect x="137" y="24" width="86" height="43" rx="9"/><rect x="256" y="24" width="86" height="43" rx="9"/><path d="M104 45h33M223 45h33M175 67v39"/><rect x="122" y="106" width="106" height="30" rx="8"/><text x="61" y="51" textAnchor="middle">MÔN HỌC</text><text x="180" y="51" textAnchor="middle">LỚP</text><text x="299" y="51" textAnchor="middle">BÀI HỌC</text><text x="175" y="125" textAnchor="middle">NGỮ CẢNH</text></svg>;
  if (story === "lesson" && index === 1) return <svg className={styles.beatGraphic} viewBox="0 0 360 150" aria-hidden="true"><circle cx="78" cy="75" r="43"/><circle cx="78" cy="75" r="27"/><circle cx="78" cy="75" r="10"/><path d="M121 75h97m0 0-12-9m12 9-12 9"/><rect x="239" y="35" width="102" height="80" rx="10"/><path d="m258 58 7 7 13-17M286 58h36M258 82l7 7 13-17M286 82h29"/></svg>;
  if (story === "lesson" && index === 2) return <svg className={styles.beatGraphic} viewBox="0 0 360 150" aria-hidden="true"><path d="M25 34h310M25 75h310M25 116h310"/><path d="M25 34h82M25 75h194M25 116h269"/><circle cx="107" cy="34" r="7"/><circle cx="219" cy="75" r="7"/><circle cx="294" cy="116" r="7"/><text x="25" y="25">HOẠT ĐỘNG 01</text><text x="25" y="66">HOẠT ĐỘNG 02</text><text x="25" y="107">HOẠT ĐỘNG 03</text></svg>;
  if (story === "lesson") return <svg className={styles.beatGraphic} viewBox="0 0 360 150" aria-hidden="true"><path d="M79 17h133l42 42v74H79zM212 17v43h42M104 78h120M104 95h94"/><circle cx="276" cy="103" r="32"/><path d="m258 104 12 12 24-29"/></svg>;
  if (index === 0) return <svg className={styles.beatGraphic} viewBox="0 0 360 150" aria-hidden="true"><rect x="21" y="27" width="102" height="94" rx="10"/><rect x="237" y="19" width="103" height="58" rx="8"/><rect x="237" y="91" width="103" height="40" rx="8"/><path d="M123 74h81m0 0-13-10m13 10-13 10M237 48h-33M237 111h-33"/><path d="M42 50h60M42 66h48M42 82h55"/></svg>;
  if (index === 1) return <svg className={styles.beatGraphic} viewBox="0 0 360 150" aria-hidden="true"><path d="M34 76h292"/>{[45,135,225,315].map((x,item)=><g key={x}><rect x={x-31} y="45" width="62" height="62" rx="12"/><text x={x} y="81" textAnchor="middle">0{item+1}</text></g>)}</svg>;
  if (index === 2) return <svg className={styles.beatGraphic} viewBox="0 0 360 150" aria-hidden="true"><rect x="111" y="25" width="138" height="100" rx="9"/><path d="M15 35h66v35H15zM279 24h66v35h-66zM15 96h66v35H15zM279 87h66v44h-66zM81 53h30M249 45h30M81 113h30M249 109h30"/><circle cx="180" cy="76" r="20"/></svg>;
  return <svg className={styles.beatGraphic} viewBox="0 0 360 150" aria-hidden="true"><rect x="27" y="22" width="306" height="105" rx="12"/><path d="M27 43h306M56 43v84M293 43v84M77 64h191v43H77z"/><path d="m158 73 34 13-34 13z"/><circle cx="42" cy="33" r="4"/></svg>;
}

function SlideArtwork({ active }: { active: number }) {
  if (active === 0) return <div className={`${styles.slideArt} ${styles.slideArtIntro}`}><small>CHỦ ĐỀ 02 · HÓA HỌC</small><h3>Từ hiện tượng đến phản ứng hóa học</h3><svg className={styles.slideChemDiagram} viewBox="0 0 250 150" aria-hidden="true"><path d="M34 25h44M46 25v35L24 116c-3 7 2 11 9 11h57c7 0 12-4 9-11L76 60V25"/><path d="M34 95h55M39 82c15 8 27-8 44 0"/><circle cx="53" cy="70" r="5"/><circle cx="73" cy="62" r="3"/><path d="M129 61h31M160 61l23-20M160 61l23 20"/><circle cx="122" cy="61" r="14"/><circle cx="193" cy="34" r="12"/><circle cx="193" cy="88" r="12"/><path d="M116 116h94"/><text x="127" y="135">hiện tượng → bằng chứng</text></svg><div className={styles.chemEquation}>2H₂ + O₂ → 2H₂O</div><span className={styles.slideCircle} /></div>;
  if (active === 1) return <div className={`${styles.slideArt} ${styles.slideArtOutline}`}><small>OUTLINE · 04 PHẦN</small><h3>Quan sát → dự đoán → kiểm chứng</h3><svg className={styles.outlineDiagram} viewBox="0 0 420 150" aria-hidden="true"><path d="M52 76H366"/><path d="m356 69 12 7-12 7"/>{[52,156,260,364].map((x,index)=><g key={x}><circle cx={x} cy="76" r="25"/><text x={x} y="81" textAnchor="middle">0{index+1}</text></g>)}<text x="52" y="122" textAnchor="middle">Mở đầu</text><text x="156" y="122" textAnchor="middle">Giả thuyết</text><text x="260" y="122" textAnchor="middle">Thực nghiệm</text><text x="364" y="122" textAnchor="middle">Kết luận</text></svg><span className={styles.slideArrow}>↗</span></div>;
  if (active === 2) return <div className={`${styles.slideArt} ${styles.slideArtNewton}`}><small>MÔ PHỎNG THẬT · CƠ HỌC 10</small><h3>Định luật III Newton</h3><p>Hai lực xuất hiện đồng thời, cùng độ lớn và ngược chiều.</p><svg viewBox="0 0 520 180" aria-hidden="true"><path className={styles.newtonTrack} d="M30 139H490"/><g className={styles.newtonCartA}><rect x="118" y="92" width="75" height="36" rx="8"/><circle cx="134" cy="134" r="9"/><circle cx="177" cy="134" r="9"/><text x="156" y="116" textAnchor="middle">A</text></g><g className={styles.newtonCartB}><rect x="327" y="92" width="75" height="36" rx="8"/><circle cx="343" cy="134" r="9"/><circle cx="386" cy="134" r="9"/><text x="365" y="116" textAnchor="middle">B</text></g><path className={styles.newtonForceA} d="M241 63H146m0 0 13-9m-13 9 13 9"/><path className={styles.newtonForceB} d="M279 63h95m0 0-13-9m13 9-13 9"/><text x="170" y="48">F B→A</text><text x="319" y="48">F A→B</text></svg><div className={styles.newtonFormula}>F<sub>B→A</sub> = −F<sub>A→B</sub></div></div>;
  const ethanol = MOLECULE_CATALOG[6];
  return <div className={`${styles.slideArt} ${styles.slideArtMolecule}`}><small>CẤU TẠO CHẤT · MÔ HÌNH PHÂN TỬ</small><h3>{ethanol.name}</h3><p>{ethanol.formula} · mô hình khung nối</p><svg viewBox="0 0 420 210" aria-hidden="true"><path d="M155 108 249 108M139 90 91 53M139 126 91 163M155 79 155 35M265 88 314 50M265 128 314 166M274 108h61"/><circle cx="150" cy="108" r="38"/><circle cx="258" cy="108" r="38"/><circle cx="348" cy="108" r="31"/><circle cx="83" cy="47" r="21"/><circle cx="82" cy="169" r="21"/><circle cx="155" cy="29" r="21"/><circle cx="320" cy="44" r="21"/><circle cx="320" cy="172" r="21"/><text x="150" y="116" textAnchor="middle">C</text><text x="258" y="116" textAnchor="middle">C</text><text x="348" y="116" textAnchor="middle">O</text></svg><div className={styles.moleculeLegend}><span>Cacbon</span><span>Oxi</span><span>Hiđro</span></div><i className={styles.presenterPointer}>➤</i></div>;
}

function SlideWindow({ active }: { active: number }) {
  const [visibleSlide, setVisibleSlide] = useState(active);
  useEffect(() => {
    const syncFrame = window.setTimeout(() => setVisibleSlide(active), 0);
    return () => window.clearTimeout(syncFrame);
  }, [active]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setVisibleSlide((current) => (current + 1) % 4), 3400);
    return () => window.clearInterval(interval);
  }, []);
  return (
    <div className={`${styles.appWindow} ${styles.slideWindow}`} aria-label="Minh họa EDUA Slide Studio">
      <div className={styles.slideTopbar}><b>EDUA</b><span>Bài giảng · Phản ứng hóa học</span><div><Undo2 size={11}/><Redo2 size={11}/><span>Chia sẻ</span><strong>Trình chiếu</strong></div></div>
      <div className={styles.slideContextBar}><span><MousePointer2 size={10}/></span><span><Type size={10}/></span><span><Shapes size={10}/></span><i /><span>SVN Linux</span><span>32</span><span>B</span><span>☰</span><i /><span>Vị trí</span><span>Hoạt ảnh</span></div>
      <div className={styles.slideWorkspace}>
        <aside className={styles.slideToolRail}><button><Plus size={12}/></button><button><Shapes size={12}/></button><button><Type size={12}/></button><button><ImageIcon size={12}/></button><button><FlaskConical size={12}/></button></aside>
        <div className={styles.slideMainStage}><div className={styles.slideArtStack}>{[0, 1, 2, 3].map((slideIndex) => <div key={slideIndex} className={`${styles.slideArtFrame} ${slideIndex === visibleSlide ? styles.slideArtFrameActive : ""}`}><SlideArtwork active={slideIndex} /></div>)}</div><div className={styles.canvasStatus}><span>Slide {visibleSlide + 1} / 8</span><span>− &nbsp; Fit &nbsp; +</span></div></div>
        <aside className={styles.slideLayerPanel}><div><b>Thuộc tính</b><span>Layers</span></div><label>Vị trí & kích thước</label><div className={styles.propertyGrid}><span>X&nbsp; 84</span><span>Y&nbsp; 62</span><span>W&nbsp; 684</span><span>H&nbsp; 330</span></div><label>Thứ tự lớp</label>{["Tiêu đề", "Sơ đồ khoa học", "Chú thích", "Nền slide"].map((item, index) => <p key={item} className={index === Math.min(visibleSlide, 3) ? styles.layerActive : ""}>⌘ &nbsp; {item}</p>)}</aside>
      </div>
      <div className={styles.slideTray}>{Array.from({ length: 6 }, (_, index) => <div key={index} className={index === visibleSlide ? styles.slideTrayActive : ""}><span><i /><i /><i /><em /></span><small>{index + 1}</small></div>)}<button type="button">＋</button></div>
    </div>
  );
}

function TeacherAvatar({ initials, index }: { initials: string; index: number }) {
  const palettes = [
    ["#dff4ec", "#f3b08e", "#173746"],
    ["#e8e4fb", "#e8a67f", "#2d4050"],
    ["#fff0d5", "#d99b76", "#3d4f55"],
    ["#dff3f5", "#efb18b", "#163946"],
    ["#f6e4e1", "#dca27f", "#30454e"],
  ][index % 5];
  return <svg className={styles.feedbackAvatar} viewBox="0 0 80 80" role="img" aria-label={`Ảnh minh họa ${initials}`}><circle cx="40" cy="40" r="40" fill={palettes[0]} /><path d="M18 80c2-18 12-28 22-28s20 10 22 28" fill={palettes[2]} /><circle cx="40" cy="34" r="19" fill={palettes[1]} /><path d="M21 35c1-19 10-27 20-27 13 0 20 9 20 28-7-3-12-8-15-14-5 7-13 11-25 13Z" fill={palettes[2]} /><text x="40" y="74" textAnchor="middle">{initials}</text></svg>;
}

function LongPageDecor() {
  const assets = [
    ["/home/Asset 10.svg", 42], ["/home/Asset 11.svg", 46], ["/home/Asset 6.svg", 52],
    ["/home/Asset 19.svg", 50], ["/home/Asset 3.svg", 38], ["/home/Asset 7.svg", 42],
    ["/home/Asset 10.svg", 38], ["/home/Asset 6.svg", 48], ["/home/Asset 11.svg", 44],
    ["/home/Asset 19.svg", 46], ["/home/Asset 3.svg", 36], ["/home/Asset 7.svg", 40],
  ] as const;
  return <div className={styles.pageDecorField} aria-hidden="true">{assets.map(([src, width], index) => <span key={`${src}-${index}`} className={styles.pageDecorItem}><ImgDecor src={src} width={width} /></span>)}</div>;
}

export function LandingExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lessonIndexRef = useRef(0);
  const outlineIndexRef = useRef(0);
  const slideIndexRef = useRef(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [activeOutline, setActiveOutline] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.registerPlugin(ScrollTrigger);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ambientObserver = new IntersectionObserver((entries) => entries.forEach((entry) => entry.target.classList.toggle(styles.ambientActive, entry.isIntersecting)), { rootMargin: "80px" });
    root.querySelectorAll<HTMLElement>("[data-ambient-section]").forEach((section) => ambientObserver.observe(section));
    const refreshLayout = () => ScrollTrigger.refresh();
    const hashTimers: number[] = [];
    const storyScrollHandlers: Array<() => void> = [];
    window.addEventListener("edua:layout-change", refreshLayout);
    const context = gsap.context(() => {
      if (!reduceMotion) {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => gsap.from(element, { y: 30, autoAlpha: 0, duration: .72, ease: "power3.out", scrollTrigger: { trigger: element, start: "top 88%", once: true } }));

        const scienceSection = root.querySelector<HTMLElement>("#science");
        const scienceTabs = gsap.utils.toArray<HTMLElement>("[data-science-tab]", scienceSection ?? undefined);
        if (scienceSection && scienceTabs.length) {
          gsap.fromTo(scienceTabs,
            { y: 72, autoAlpha: 0, clipPath: "inset(14% 0 0 0 round 22px)" },
            {
              y: 0,
              autoAlpha: 1,
              clipPath: "inset(0% 0 0 0 round 22px)",
              duration: .95,
              stagger: .14,
              ease: "power3.out",
              onComplete: () => gsap.set(scienceTabs, { clearProps: "transform,clipPath" }),
              scrollTrigger: { trigger: scienceSection, start: "top 70%", toggleActions: "play none none reverse" },
            },
          );
          const scienceLightOne = scienceSection.querySelector<HTMLElement>(`.${styles.scienceLightOne}`);
          const scienceLightTwo = scienceSection.querySelector<HTMLElement>(`.${styles.scienceLightTwo}`);
          if (scienceLightOne) gsap.to(scienceLightOne, { xPercent: 34, yPercent: -15, ease: "none", scrollTrigger: { trigger: scienceSection, start: "top bottom", end: "bottom top", scrub: 1.2 } });
          if (scienceLightTwo) gsap.to(scienceLightTwo, { xPercent: -28, yPercent: 18, ease: "none", scrollTrigger: { trigger: scienceSection, start: "top bottom", end: "bottom top", scrub: 1.4 } });
        }

        const librarySection = root.querySelector<HTMLElement>("#library-community");
        const libraryCards = gsap.utils.toArray<HTMLElement>("[data-library-card]", librarySection ?? undefined);
        const libraryPath = librarySection?.querySelector<SVGPathElement>("[data-library-path]");
        if (librarySection && libraryCards.length) {
          const libraryTimeline = gsap.timeline({ scrollTrigger: { trigger: librarySection, start: "top 74%", toggleActions: "play none none reverse" } });
          libraryTimeline.fromTo(libraryCards,
            { x: (index) => index === 1 ? 72 : -72, y: 32, autoAlpha: 0, rotate: (index) => index === 1 ? 7 : -7 },
            { x: 0, y: 0, autoAlpha: 1, rotate: (index) => [-3, 2, -1][index] ?? 0, duration: .9, stagger: .16, ease: "power3.out", onComplete: () => gsap.set(libraryCards, { clearProps: "transform" }) },
          );
          if (libraryPath) libraryTimeline.fromTo(libraryPath, { strokeDashoffset: 150 }, { strokeDashoffset: 0, duration: 1.2, ease: "power2.out" }, .08);
        }

        const feedbackSection = root.querySelector<HTMLElement>("#teacher-feedback");
        const feedbackCards = gsap.utils.toArray<HTMLElement>("[data-feedback-card-primary]", feedbackSection ?? undefined);
        if (feedbackSection && feedbackCards.length) {
          gsap.fromTo(feedbackCards,
            { y: 58, autoAlpha: 0, scale: .96 },
            { y: 0, autoAlpha: 1, scale: 1, duration: .82, stagger: .1, ease: "power3.out", onComplete: () => gsap.set(feedbackCards, { clearProps: "transform" }), scrollTrigger: { trigger: feedbackSection, start: "top 76%", toggleActions: "play none none reverse" } },
          );
        }

        const faqItems = gsap.utils.toArray<HTMLElement>("[data-faq-item]");
        if (faqItems.length) {
          gsap.fromTo(faqItems,
            { x: 40, autoAlpha: 0 },
            { x: 0, autoAlpha: 1, duration: .68, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: faqItems[0], start: "top 84%", toggleActions: "play none none reverse" } },
          );
        }
      }

      [["[data-lesson-story]", lessonIndexRef, setActiveLesson], ["[data-outline-story]", outlineIndexRef, setActiveOutline], ["[data-slide-story]", slideIndexRef, setActiveSlide]].forEach(([selector, indexRef, setter]) => {
        const target = root.querySelector(selector as string);
        if (!target) return;
        const beats = Array.from(target.querySelectorAll<HTMLElement>("[data-story-beat]"));
        const activateClosestBeat = () => {
          const viewportAnchor = window.innerHeight * .56;
          let nextIndex = 0;
          let nextDistance = Number.POSITIVE_INFINITY;
          beats.forEach((beat, beatIndex) => {
            const distance = Math.abs(beat.getBoundingClientRect().top - viewportAnchor);
            if (distance < nextDistance) { nextDistance = distance; nextIndex = beatIndex; }
          });
          const ref = indexRef as React.MutableRefObject<number>;
          if (nextIndex !== ref.current) { ref.current = nextIndex; (setter as React.Dispatch<React.SetStateAction<number>>)(nextIndex); }
        };
        ScrollTrigger.create({ trigger: target, start: "top 88%", end: "bottom 12%", onEnter: activateClosestBeat, onEnterBack: activateClosestBeat, onUpdate: activateClosestBeat, onRefresh: activateClosestBeat });
        window.addEventListener("scroll", activateClosestBeat, { passive: true });
        storyScrollHandlers.push(activateClosestBeat);
        beats.forEach((beat) => {
          ScrollTrigger.create({ trigger: beat, start: "top 58%", end: "bottom 58%", onEnter: activateClosestBeat, onEnterBack: activateClosestBeat });
        });
      });

    }, root);

    void document.fonts.ready.then(() => {
      ScrollTrigger.refresh();
      if (window.location.hash) {
        const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        const jumpToTarget = () => {
          if (!target) return;
          window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 84, behavior: "auto" });
        };
        requestAnimationFrame(() => requestAnimationFrame(jumpToTarget));
        hashTimers.push(window.setTimeout(jumpToTarget, 240), window.setTimeout(jumpToTarget, 760));
      }
    });
    return () => {
      window.removeEventListener("edua:layout-change", refreshLayout);
      storyScrollHandlers.forEach((handler) => window.removeEventListener("scroll", handler));
      hashTimers.forEach((timer) => window.clearTimeout(timer));
      ambientObserver.disconnect();
      context.revert();
    };
  }, []);

  return (
    <div ref={rootRef} className={styles.experienceRoot}>
      <LongPageDecor />

      <section id="product-proof" className={styles.storySection} data-lesson-story data-ambient-section aria-labelledby="lesson-title">
        <span className={`${styles.oversizedWord} ${styles.wordEdit}`} aria-hidden="true">LESSON</span>
        <div className={`${styles.storyInner} ${styles.storyGrid}`}><div className={styles.stickyVisual} data-synthesis-visual><LessonWindow active={activeLesson} /></div><div className={styles.storyCopy}><div className={styles.storyIntro} data-reveal><span className={styles.sectionKicker}>01 · Giáo án</span><h2 id="lesson-title"><span>Từ bài trong sách</span><span>đến kế hoạch có thể dạy.</span></h2><p>Đúng giao diện EDUA, đúng ngữ cảnh sư phạm và luôn để giáo viên kiểm soát đầu ra.</p></div>{lessonBeats.map(([title, body], index) => <article data-story-beat key={title} className={`${styles.beat} ${index === activeLesson ? styles.beatActive : ""}`}><span className={styles.beatNumber}>0{index + 1}</span><h3>{title}</h3><p>{body}</p><StoryBeatGraphic story="lesson" index={index} /></article>)}</div></div>
      </section>

      <section id="outline-story" className={`${styles.storySection} ${styles.outlineStorySection}`} data-outline-story data-ambient-section aria-labelledby="outline-story-title">
        <AcademicMotifField variant="outline" />
        <span className={`${styles.oversizedWord} ${styles.wordOutline}`} aria-hidden="true">OUTLINE</span>
        <div className={`${styles.storyInner} ${styles.storyGrid} ${styles.storyGridReverse} ${styles.outlineStoryGrid}`}>
          <div className={styles.storyCopy}>
            <div className={styles.storyIntro} data-reveal><span className={styles.sectionKicker}>02 · Outline slide</span><h2 id="outline-story-title"><span>Mạch bài rõ trước.</span><span>Từng slide đúng sau.</span></h2><p>EDUA biến giáo án thành một cấu trúc có thể đọc, sửa, kéo thả và xác nhận trước khi sinh toàn bộ deck.</p></div>
            {outlineStoryBeats.map(([title, body], index) => <article data-story-beat key={title} className={`${styles.beat} ${styles.outlineBeat} ${index === activeOutline ? styles.beatActive : ""}`}><span className={styles.beatNumber}>0{index + 1}</span><h3>{title}</h3><p>{body}</p><OutlineBeatGraphic index={index} /></article>)}
          </div>
          <div className={`${styles.stickyVisual} ${styles.outlineStoryVisual}`}><OutlineStoryWindow active={activeOutline} /></div>
        </div>
      </section>

      <section className={styles.storySection} data-slide-story data-ambient-section aria-labelledby="slide-title">
        <AcademicMotifField variant="slide" />
        <span className={`${styles.oversizedWord} ${styles.wordPresent}`} aria-hidden="true">SLIDE</span>
        <div className={`${styles.storyInner} ${styles.storyGrid} ${styles.storyGridReverse}`}><div className={styles.storyCopy}><div className={styles.storyIntro} data-reveal><span className={styles.sectionKicker}>03 · Slide bài giảng</span><h2 id="slide-title"><span>Biến kiến thức thành</span><span>một mạch trình bày sống động.</span></h2><p>Không chỉ sinh slide: EDUA cung cấp toàn bộ studio để sắp xếp, chỉnh sửa và trình chiếu.</p></div>{slideBeats.map(([title, body], index) => <article data-story-beat key={title} className={`${styles.beat} ${index === activeSlide ? styles.beatActive : ""}`}><span className={styles.beatNumber}>0{index + 1}</span><h3>{title}</h3><p>{body}</p><StoryBeatGraphic story="slide" index={index} /></article>)}</div><div className={styles.stickyVisual}><SlideWindow active={activeSlide} /></div></div>
      </section>

      <section id="science" className={styles.scienceWrap} data-ambient-section aria-labelledby="science-title"><AcademicMotifField variant="science" /><div className={styles.scienceLightOne} /><div className={styles.scienceLightTwo} /><div className={styles.section}><div className={styles.sectionHead} data-reveal><div><span className={styles.eyebrow}>04 · Phòng lab số</span><h2 id="science-title" className={styles.sectionTitle}><span>Khoa học không chỉ để đọc.</span><span>Hãy để học sinh chạm vào.</span></h2></div><p className={styles.sectionLead}>Mở từng không gian để chạy thí nghiệm, quan sát phân tử và khám phá dữ liệu nguyên tố thật.</p></div><ScienceLab /></div></section>

      <div className={styles.communityContinuum}>
        <section id="library-community" className={styles.libraryBand} data-ambient-section aria-labelledby="library-title"><AcademicMotifField variant="library" /><div className={`${styles.section} ${styles.sectionCompact}`}><div className={styles.libraryShell}><div className={styles.libraryStates}><svg className={styles.libraryJourney} viewBox="0 0 520 410" aria-hidden="true"><path data-library-path d="M94 65C332 39 404 136 314 202S86 257 148 349"/><path d="m139 337 9 13 13-9"/></svg><article className={styles.libraryCard} data-library-card><span className={styles.statePill}>PRIVATE</span><h3>Thư viện cá nhân</h3><p>Lưu bản nháp và học liệu riêng.</p></article><article className={styles.libraryCard} data-library-card><span className={styles.statePill}>SUBMITTED</span><h3>Gửi kiểm duyệt</h3><p>Đưa nội dung vào quy trình phê duyệt.</p></article><article className={styles.libraryCard} data-library-card><span className={styles.statePill}>APPROVED</span><h3>Hub cộng đồng</h3><p>Chia sẻ học liệu đã được duyệt.</p></article></div><div className={styles.libraryCopy} data-reveal><span className={styles.eyebrow}>05 · Tích lũy tri thức</span><h2 id="library-title"><span>Mỗi bài dạy tốt có thể</span><span>sống lâu hơn một tiết học.</span></h2><p>Không gian riêng để thử nghiệm, quy trình rõ ràng để kiểm duyệt và một kho chung để cộng đồng tin cậy.</p><ul><li><Check size={17} /> Giáo án, slide và mô phỏng trong một thư viện</li><li><Check size={17} /> Riêng tư trước khi chủ động chia sẻ</li><li><Check size={17} /> Nội dung cộng đồng đã qua phê duyệt</li></ul></div></div></div></section>

        <section id="teacher-feedback" className={styles.feedbackSection} data-ambient-section aria-labelledby="feedback-title"><AcademicMotifField variant="feedback" /><div className={styles.feedbackHead} data-reveal><div><span className={styles.eyebrow}>06 · Góc nhìn giáo viên</span><h2 id="feedback-title"><span>Người đứng lớp</span><span>nói gì về EDUA.</span></h2></div><p>Những lát cắt ngắn về cách giáo viên hình dung một không gian chuẩn bị bài liền mạch.</p></div><div className={styles.feedbackMarquee}><div className={styles.feedbackRail}>{[0, 1].map((copy) => <div key={copy} className={styles.feedbackGroup} aria-hidden={copy === 1}>{teacherFeedback.map((item, index) => <article key={`${copy}-${item.name}`} className={styles.feedbackCard} data-feedback-card-primary={copy === 0 ? "" : undefined}><span className={styles.feedbackQuote}>“</span><p>{item.quote}</p><div><TeacherAvatar initials={item.initials} index={index} /><span><strong>{item.name}</strong><small>{item.subject}</small></span></div></article>)}</div>)}</div></div></section>
      </div>

      <section id="faq" className={styles.section} aria-labelledby="faq-title"><div className={styles.faqGrid}><div data-reveal><span className={styles.eyebrow}>Câu hỏi thường gặp</span><h2 id="faq-title">Trước khi bắt đầu.</h2></div><div className={styles.faqList}><details className={styles.faqItem} data-faq-item><summary>EDUA có tự động thay giáo viên quyết định nội dung không?</summary><p>Không. Hệ thống tạo bản nháp có cấu trúc; giáo viên duyệt, chỉnh sửa và quyết định đầu ra cuối cùng.</p></details><details className={styles.faqItem} data-faq-item><summary>Giáo án được tổ chức theo cấu trúc nào?</summary><p>Theo Công văn 5512 với các hoạt động Mở đầu, Hình thành kiến thức, Luyện tập và Vận dụng.</p></details><details className={styles.faqItem} data-faq-item><summary>Tôi có thể dùng lại nội dung đã tạo không?</summary><p>Có. Giáo án, slide và học liệu có thể lưu vào thư viện để tiếp tục chỉnh sửa hoặc giao cho lớp.</p></details><details className={styles.faqItem} data-faq-item><summary>Nội dung có tự động công khai không?</summary><p>Không. Nội dung bắt đầu ở trạng thái riêng tư và chỉ đến Hub sau khi gửi kiểm duyệt, phê duyệt.</p></details></div></div></section>

      <section id="get-started" className={styles.finalCta} data-reveal><h2>Bắt đầu từ bài học bạn sắp dạy.</h2><p>Để EDUA nối phần còn lại: giáo án, slide, khoa học tương tác, đánh giá và lớp học.</p><div className={styles.finalActions}><Link className={styles.lightButton} href="/lesson-create">Tạo giáo án đầu tiên <Sparkles size={16} /></Link><a className={styles.finalOutlineButton} href="#product-proof">Xem lại quy trình <ArrowUpRight size={15} /></a></div></section>
      <footer className={styles.footer}><div><strong>EDUA</strong> · Trợ lý AI cho giáo viên Vật lý</div><div className={styles.footerLinks}><Link href="/help">Trợ giúp</Link><Link href="/community-hub">Cộng đồng</Link><Link href="/periodic-table">Bảng tuần hoàn</Link><Link href="/login">Đăng nhập</Link></div></footer>
    </div>
  );
}
