import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Mathematics from "@tiptap/extension-mathematics";
import type { Extensions } from "@tiptap/react";
import { ParagraphClass } from "./paragraphClassExtension";
import { PendingActivity } from "./pendingActivityNode";
import { PendingSection } from "./pendingSectionNode";
import { PendingQuestion } from "./pendingQuestionNode";
import { DiffStateExtension } from "./diffStateExtension";
import { TableDeleteShortcut } from "./tableDeleteShortcut";

/** Thông tin công thức được bấm vào — đủ để mở popup sửa tại đúng vị trí node. */
export type MathClickInfo = { pos: number; latex: string; display: boolean };

/**
 * Cấu hình extension dùng chung cho cả editor (LessonEditor) và thanh công cụ
 * (EditorTools). StarterKit v3 đã gồm sẵn bold/italic/strike/underline/link,
 * heading, bullet/ordered list và undo-redo — nên không đăng ký lại các phần đó.
 *
 * Là factory (không phải hằng số) vì `Mathematics` cần callback `onMathClick`
 * để mở popup sửa công thức — callback này gắn với state của component chứa
 * editor (xem `LessonEditDashboard`), nên phải truyền vào lúc tạo extensions.
 */
export function createEditorExtensions(options: {
  onMathClick?: (info: MathClickInfo) => void;
} = {}): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: {
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      },
    }),
    // TextStyle + Color + FontFamily + FontSize (+ BackgroundColor, LineHeight).
    TextStyleKit,
    // Cho phép set màu highlight tuỳ ý (hiliteColor cũ).
    Highlight.configure({ multicolor: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    // Một ký tự không thể vừa là chỉ số trên vừa là chỉ số dưới. Khai báo loại trừ
    // ở schema để quy tắc này áp dụng cả khi dùng toolbar lẫn phím tắt.
    Subscript.extend({ excludes: "superscript" }),
    Superscript.extend({ excludes: "subscript" }),
    // Table + TableRow + TableHeader + TableCell.
    TableKit.configure({ table: { resizable: true } }),
    // Bôi đen cả bảng + Backspace/Delete → xoá cả bảng (như Google Docs).
    TableDeleteShortcut,
    // loading="lazy": ảnh trong bài viết/bài nộp thường tải trực tiếp từ R2 không qua CDN
    // resize — trì hoãn tải ảnh chưa cuộn tới giúp giảm số request đồng thời khi mở trang.
    Image.configure({
      HTMLAttributes: { loading: "lazy" },
    }),
    Mathematics.configure({
      katexOptions: {
        throwOnError: false,
        strict: false,
      },
      inlineOptions: {
        onClick: (node, pos) =>
          options.onMathClick?.({ pos, latex: (node.attrs.latex as string) ?? "", display: false }),
      },
      blockOptions: {
        onClick: (node, pos) =>
          options.onMathClick?.({ pos, latex: (node.attrs.latex as string) ?? "", display: true }),
      },
    }),
    ParagraphClass,
    // Block "đang soạn" (atom, khoá) cho luồng stream giáo án — fill xong thì thay bằng HTML thật.
    PendingActivity,
    // Block "đang soạn" tĩnh cho cả một phần (I/II/III) trong lúc chờ FRAME_READY.
    PendingSection,
    // Block "đang soạn" (atom, khoá) cho luồng stream đề kiểm tra — 1 node/câu hỏi,
    // fill xong thì thay bằng HTML thật (xem usePracticeExamStream).
    PendingQuestion,
    // Đánh dấu + khoá vùng diff AI đang chờ Chấp nhận/Bỏ (xem AssistantPanel).
    DiffStateExtension,
  ];
}
