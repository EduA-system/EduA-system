import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import type { Extensions } from "@tiptap/react";
import { PendingActivity } from "./pendingActivityNode";

// Cấu hình extension dùng chung cho cả editor (LessonEditor) và thanh công cụ
// (EditorTools). StarterKit v3 đã gồm sẵn bold/italic/strike/underline/link,
// heading, bullet/ordered list và undo-redo — nên không đăng ký lại các phần đó.
export const editorExtensions: Extensions = [
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
  Subscript,
  Superscript,
  // Table + TableRow + TableHeader + TableCell.
  TableKit.configure({ table: { resizable: true } }),
  Image,
  // Block "đang soạn" (atom, khoá) cho luồng stream giáo án — fill xong thì thay bằng HTML thật.
  PendingActivity,
];
