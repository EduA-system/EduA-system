# Lesson Editor Toolbar — Task List

> Danh sách việc cho thanh công cụ của **Lesson Editor** (`fe/components/LessonEditor/EditorTools.tsx`).
> Quy ước: `[ ]` = chưa làm · `[~]` = đang làm · `[x]` = xong.
> Mục tiêu: thanh công cụ đủ chức năng cơ bản như một editor tài liệu, ưu tiên nhu cầu soạn giáo án môn KHTN (vật lí/hóa).

---

## 0. Mục tiêu

- [x] Bổ sung các chức năng định dạng cơ bản còn thiếu (bảng, link, thụt lề, xóa định dạng...).
- [x] Bổ sung chức năng phục vụ công thức KHTN (chỉ số trên/dưới, ký hiệu đặc biệt).
- [x] Sửa các bug định dạng hiện có.
- [x] Giữ thanh công cụ responsive, không chồng chất ở màn hẹp.

---

## 1. Hiện trạng đã có

> **Đã migrate toàn bộ editor sang Tiptap v3** (xem mục 5). Mọi nút dưới đây chạy
> qua `editor.chain()...` thay cho `document.execCommand`, trạng thái đọc ngược
> từ selection qua `useEditorState`.

- [x] Undo / Redo (có disable khi không undo/redo được).
- [x] Text style: Normal text / Title / Heading / Subheading (`setParagraph`/`setHeading`).
- [x] Font family (`setFontFamily`).
- [x] Font size (`setFontSize` — đã sửa bug, xem mục 4).
- [x] Bold / Italic / Underline.
- [x] Màu chữ (`setColor`) và highlight (`toggleHighlight`).
- [x] Bullet list / Numbered list.
- [x] Căn lề: trái / giữa / phải / đều (`setTextAlign`).
- [x] Responsive container-query: dropdown co + truncate, ẩn dần nhóm phụ khi hẹp.

---

## 2. Chức năng cơ bản còn thiếu

### 2.1 Ưu tiên cao

- [x] **Chèn bảng** (tạo bảng): popup lưới chọn số hàng/cột → `insertTable` (Tiptap), có header row.
  - [x] Dùng `@tiptap/extension-table` (TableKit) — không cần thao tác DOM thủ công.
  - [x] Style mặc định cho bảng (border, padding, header, resize handle) trong `globals.css`.
- [x] **Chèn link** (hyperlink): popup nhập URL → `setLink`; có nút bỏ link (`unsetLink`); prefill URL hiện tại.
- [x] **Tăng / giảm thụt lề** (indent / outdent) — qua `sinkListItem`/`liftListItem` (áp dụng cho list).
- [x] **Xóa định dạng** (clear formatting): `unsetAllMarks().clearNodes()`.

### 2.2 Phục vụ KHTN (vật lí/hóa)

- [x] **Chỉ số trên / chỉ số dưới** (superscript / subscript) — cho H₂O, v², m/s².
- [x] **Chèn ký hiệu đặc biệt**: lưới 40 ký hiệu (√ ± × ÷ ° α β Δ π ∑ ∫ → ⇌ …).
- [ ] (Sau) Chèn công thức toán (cân nhắc KaTeX/MathLive nếu cần công thức phức tạp).

### 2.3 Ưu tiên thấp / nice-to-have

- [x] Gạch ngang (strikethrough).
- [x] Chèn ảnh (qua URL).
- [ ] Giãn dòng (line spacing). _(LineHeight có sẵn trong TextStyleKit — chưa gắn nút.)_
- [ ] Phóng to / thu nhỏ (zoom) vùng soạn thảo.
- [ ] In (print).

---

## 3. UI thanh công cụ

- [x] Sắp xếp nhóm nút mới vào thanh công cụ hợp lý (gom theo nhóm).
- [x] Giữ ngưỡng container-query: màu chữ/highlight ẩn <1180px, căn lề ẩn <1060px.
- [x] Menu **"More" (…)** luôn hiển thị, gom các nút phụ (gạch ngang, super/subscript, thụt lề, xóa định dạng, chèn bảng/link/ảnh/ký hiệu) → vẫn truy cập được ở mọi độ rộng.
- [x] Popup (bảng, link, ký hiệu, ảnh) nằm trong vùng section, không bị cắt; đóng khi click ra ngoài.

---

## 4. Bug cần sửa

- [x] **Font size không tác dụng** → đã sửa: dùng `setFontSize("${px}px")` (TextStyle FontSize), áp đúng cỡ người dùng chọn.
- [x] **Font size / font family / mọi nút không phản ánh định dạng tại con trỏ** → đã sửa: trạng thái toolbar đọc trực tiếp từ editor qua `useEditorState` (`isActive`/`getAttributes`).

---

## 5. Ghi chú kỹ thuật

- ✅ **Đã chốt: chuyển sang Tiptap v3** (ProseMirror). Bỏ hoàn toàn `document.execCommand`.
  - Editor tạo bằng `useEditor` ở `LessonEditDashboard` (`immediatelyRender: false` để
    tránh hydration mismatch trên Next 16), truyền instance xuống `EditorTools` và `LessonEditor`.
  - Extension dùng chung khai báo ở `editorConfig.ts` (StarterKit + TextStyleKit +
    Highlight + TextAlign + Sub/Superscript + TableKit + Image).
  - Seed nội dung lấy từ `lessonMock.contentHtml` (cấu trúc phẳng h1/p/h2/ul — hợp schema Tiptap).
  - `<section>` và class `.doc-meta` bị Tiptap loại bỏ → CSS chuyển sang
    `.lesson-document-editor h2` (margin) và `h1 + p` (meta) trong `globals.css`.
- **Còn lại / cân nhắc sau:** line spacing (LineHeight đã có sẵn), zoom, print, công thức KaTeX/MathLive.
- File liên quan: `fe/components/LessonEditor/EditorTools.tsx`, `LessonEditor.tsx`,
  `editorConfig.ts`, `fe/components/dashboard/LessonEditDashboard.tsx`, `fe/app/globals.css`.
