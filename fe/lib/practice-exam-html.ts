import type { PracticeExam, PracticeExamDisplayMetadata } from "@/services/practiceExamService";
import type { PracticeExamQuestionStub } from "@/lib/ws/practice-exam-client";
import { normalizePracticeExamLatex, normalizePracticeExamMathText } from "@/lib/practice-exam-math";

/**
 * Hàm build HTML cho đề kiểm tra — tách ra khỏi `PracticeExamEditDashboard.tsx` để dùng
 * chung được cho cả 2 đường: build 1 lần (đề đã có sẵn, đọc từ sessionStorage/thư viện)
 * VÀ build tăng dần theo từng câu (luồng streaming, xem `usePracticeExamStream`).
 */

export type Metadata = PracticeExamDisplayMetadata;

export const SECTION_DEFINITIONS = [
  ["MULTIPLE_CHOICE", "Câu hỏi trắc nghiệm nhiều phương án lựa chọn"],
  ["TRUE_FALSE", "Câu trắc nghiệm đúng sai"],
  ["SHORT_ANSWER", "Câu trắc nghiệm yêu cầu trả lời ngắn"],
  ["ESSAY", "Tự luận"],
] as const;

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function mathAttribute(value: string) {
  const normalized = normalizePracticeExamLatex(value)
    // AI đôi khi thiếu ngoặc sau \vec hoặc bỏ luôn dấu gạch chéo của lệnh vector.
    .replace(/\\vec\s*([A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?)/g, "\\\\vec{$1}")
    .replace(/\bvec\s*([A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?)/g, "\\\\vec{$1}")
    .replace(/\\vec\{([A-Za-z])_\{?([A-Za-z0-9]+)\}?\}/g, "\\\\vec{$1_$2}");
  return escapeHtml(normalized);
}

export function inlineRichText(value: string) {
  return escapeHtml(normalizePracticeExamMathText(value)).replace(
    /\\\((.+?)\\\)|(?<!\$)\$([^$\n]+?)\$(?!\$)/g,
    (
      _match,
      parenLatex: string | undefined,
      dollarLatex: string | undefined,
    ) => {
      const latex = parenLatex ?? dollarLatex ?? "";
      return `<span data-type="inline-math" data-latex="${mathAttribute(latex)}"></span>`;
    },
  );
}

export function richTextBlocks(value: string) {
  // Chỉ nhận $$...$$ làm display math. Không tách theo \[...\] vì \[ có thể xuất
  // hiện bên trong một công thức LaTeX và khiến các lệnh phía sau bị rơi thành text.
  return normalizePracticeExamMathText(value)
    .split(/(\$\$[\s\S]+?\$\$)/)
    .filter(Boolean)
    .map((part) => {
      const dollarBlock = part.match(/^\$\$([\s\S]+)\$\$$/);
      if (dollarBlock)
        return `<div data-type="block-math" data-latex="${mathAttribute(dollarBlock[1])}"></div>`;
      return `<p>${inlineRichText(part).replaceAll("\n", "<br>")}</p>`;
    })
    .join("");
}

export function formatScore(scoreCentiPoints: number) {
  return (scoreCentiPoints / 100).toFixed(2);
}

/** HTML "Đề bài" cho 1 câu (dùng cả khi build cả đề 1 lần và khi thay 1 pending node). */
export function questionContentHtml(question: PracticeExam["questions"][number]) {
  const options =
    question.options
      ?.map(
        (option) =>
          `<p class="mc-option"><b>${escapeHtml(option.key)}.</b> ${inlineRichText(option.content)}</p>`,
      )
      .join("") ?? "";
  return `<section><p><b>Câu ${question.order}. (${formatScore(question.scoreCentiPoints)} điểm)</b></p>${richTextBlocks(question.content)}${options}</section>`;
}

function textValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function trueFalseAnswer(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value)
    .filter(([key, answer]) => /^[a-d]$/i.test(key) && typeof answer === "boolean")
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, answer]) => `Phát biểu ${key.toUpperCase()}: ${answer ? "Đúng" : "Sai"}.`)
    .join(" ");
}

function answerText(question: PracticeExam["questions"][number]): string {
  const answer = question.answer as Record<string, unknown>;
  const content = textValue(answer.content) ?? textValue(answer.answer) ?? textValue(answer.value) ?? textValue(answer.sampleAnswer);
  if (question.type === "MULTIPLE_CHOICE") {
    const key = textValue(answer.correctOptionKey) ?? textValue(answer.answerKey) ?? textValue(answer.key);
    return key ? `Chọn đáp án ${key}.` : "Xem hướng dẫn chấm bên dưới.";
  }
  if (question.type === "TRUE_FALSE") return trueFalseAnswer(answer) || trueFalseAnswer(answer.values) || "Xem hướng dẫn chấm bên dưới.";
  return content ?? (question.type === "ESSAY" ? "Chấm theo hướng dẫn và rubric bên dưới." : "Xem hướng dẫn chấm bên dưới.");
}

/** HTML "Đáp án" cho 1 câu. */
export function answerHtml(question: PracticeExam["questions"][number]) {
  const rubric = question.rubric?.map((item) => `<li>${inlineRichText(item.criterion)}: ${formatScore(item.scoreCentiPoints)} điểm</li>`).join("") ?? "";
  return `<section><p><b>Câu ${question.order} (${formatScore(question.scoreCentiPoints)} điểm)</b></p><p><b>Đáp án:</b> ${inlineRichText(answerText(question))}</p><p><b>Hướng dẫn:</b></p>${richTextBlocks(question.explanation)}${rubric ? `<ul>${rubric}</ul>` : ""}</section>`;
}

/** Toàn bộ đề (Phần I đề bài + Phần II đáp án) — dùng khi đã có sẵn `generated` đầy đủ. */
export function examHtml(metadata: Metadata, generated: PracticeExam | null) {
  if (generated) {
    const sections = SECTION_DEFINITIONS
      .map(([type, label], index) => {
        const questions = generated.questions.filter((question) => question.type === type);
        if (!questions.length) return "";
        const score = questions.reduce((total, question) => total + question.scoreCentiPoints, 0);
        return `<section><h3>PHẦN ${index + 1}. ${label} (${formatScore(score)} điểm)</h3>${questions.map(questionContentHtml).join("")}</section>`;
      })
      .join("");
    const answers = generated.questions.map(answerHtml).join("");
    return `<h1>${generated.title}</h1><p class="document-meta">${generated.instructions} · Tổng điểm: 10 điểm</p><section><h2>I. BÀI TẬP VỀ NHÀ</h2>${sections}</section><section><h2>II. ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM</h2>${answers}</section>`;
  }
  return `
    <h1>BÀI TẬP VỀ NHÀ</h1>
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

/** Block "⏳ Đang soạn…" cho 1 câu chưa về (luồng streaming). Khớp node `pendingQuestion`. */
export function pendingQuestionHtml(stub: PracticeExamQuestionStub) {
  return (
    `<div data-pending-question data-order="${stub.order}"` +
    ` data-question-type="${escapeHtml(stub.type)}"` +
    ` data-score="${stub.scoreCentiPoints}"></div>`
  );
}

/** Khung Phần I (đề bài) lúc chờ AI: mỗi câu là 1 block "đang soạn", nhóm theo loại như đề thật. */
export function examSkeletonSectionsHtml(stubs: PracticeExamQuestionStub[]) {
  return SECTION_DEFINITIONS
    .map(([type, label], index) => {
      const typeStubs = stubs.filter((stub) => stub.type === type);
      if (!typeStubs.length) return "";
      const score = typeStubs.reduce((total, stub) => total + stub.scoreCentiPoints, 0);
      return `<section><h3>PHẦN ${index + 1}. ${label} (${formatScore(score)} điểm)</h3>${typeStubs.map(pendingQuestionHtml).join("")}</section>`;
    })
    .join("");
}

/**
 * Khung toàn bộ đề lúc chờ: Phần I có pending node/câu (một node/câu, tự điền dần).
 * Phần II dùng lại node `pendingSection` có sẵn (cùng loại lesson-plan dùng cho I/II/III lúc
 * chờ FRAME_READY) làm placeholder — chỉ 1 node duy nhất trong toàn tài liệu nên tìm lại
 * bằng `node.type.name === "pendingSection"` là đủ, không cần thêm attribute định danh.
 */
export function examSkeletonHtml(title: string, instructions: string, stubs: PracticeExamQuestionStub[]) {
  return `<h1>${escapeHtml(title)}</h1><p class="document-meta">${escapeHtml(instructions)} · Tổng điểm: 10 điểm</p><section><h2>I. BÀI TẬP VỀ NHÀ</h2>${examSkeletonSectionsHtml(stubs)}</section><h2>II. ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM</h2><div data-pending-section data-label="Đáp án và hướng dẫn chấm"></div>`;
}

/** Phần II (đáp án) đầy đủ — build 1 lần khi nhận DONE, từ toàn bộ câu đã tích luỹ. */
export function answersSectionHtml(questions: PracticeExam["questions"]) {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  return `<h2>II. ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM</h2>${sorted.map(answerHtml).join("")}`;
}

/**
 * Khung hiển thị trong lúc chờ BE trả PLAN_READY (rất ngắn — không cần gọi AI, chỉ tính
 * toán thuần) — mirror `generatingLessonPlanSkeletonHtml`. Editor bị `setEditable(false)`
 * ở bước này (mở lại ngay khi PLAN_READY về).
 */
export function examLoadingSkeletonHtml(display?: Metadata) {
  const meta = display
    ? `Môn ${escapeHtml(display.subject)} · Lớp ${escapeHtml(display.grade)} · ${escapeHtml(String(display.duration))} phút`
    : "";
  return `
    <h1>Đang chuẩn bị bài tập về nhà…</h1>
    ${meta ? `<p class="document-meta">${meta}</p>` : ""}
    <div data-pending-section data-label="Bài tập về nhà"></div>
  `;
}

/**
 * Khung lỗi khi sinh đề thất bại trước khi có PLAN_READY — mở khoá editor và để GV soạn
 * thủ công thay vì kẹt vĩnh viễn ở trạng thái "đang soạn". Mirror `lessonPlanErrorHtml`.
 */
export function examErrorHtml(display?: Metadata, message?: string) {
  const meta = display
    ? `Môn ${escapeHtml(display.subject)} · Lớp ${escapeHtml(display.grade)} · ${escapeHtml(String(display.duration))} phút`
    : "";
  const note = message
    ? `⚠️ Không tạo được bài tập tự động (${escapeHtml(message)}) — mời soạn thủ công bên dưới.`
    : "⚠️ Không tạo được bài tập tự động — mời soạn thủ công bên dưới.";
  return `
    <h1>BÀI TẬP VỀ NHÀ</h1>
    ${meta ? `<p class="document-meta">${meta}</p>` : ""}
    <p class="lp-failed">${note}</p>
    <p></p>
  `;
}
