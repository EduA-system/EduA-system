# Lesson Editor Toolbar — Task List

> Danh sách việc cho thanh công cụ của **Lesson Editor** (`fe/components/LessonEditor/EditorTools.tsx`).
> Quy ước: `[ ]` = chưa làm · `[~]` = đang làm · `[x]` = xong.
> Mục tiêu: thanh công cụ đủ chức năng cơ bản như một editor tài liệu, ưu tiên nhu cầu soạn giáo án môn KHTN (vật lí/hóa).

---

## 0. Mục tiêu

- [ ] Bổ sung các chức năng định dạng cơ bản còn thiếu (bảng, link, thụt lề, xóa định dạng...).
- [ ] Bổ sung chức năng phục vụ công thức KHTN (chỉ số trên/dưới, ký hiệu đặc biệt).
- [ ] Sửa các bug định dạng hiện có.
- [ ] Giữ thanh công cụ responsive, không chồng chất ở màn hẹp.

---

## 1. Hiện trạng đã có

- [x] Undo / Redo.
- [x] Text style: Normal text / Title / Heading / Subheading (`formatBlock`).
- [x] Font family (`fontName`).
- [x] Font size (UI có, nhưng **đang bug**, xem mục 4).
- [x] Bold / Italic / Underline.
- [x] Màu chữ (`foreColor`) và highlight (`hiliteColor`).
- [x] Bullet list / Numbered list.
- [x] Căn lề: trái / giữa / phải / đều.
- [x] Responsive container-query: dropdown co + truncate, ẩn dần nhóm phụ khi hẹp.

---

## 2. Chức năng cơ bản còn thiếu

### 2.1 Ưu tiên cao

- [ ] **Chèn bảng** (tạo bảng): popup chọn số hàng/cột → chèn `<table>` vào editor.
  - [ ] Lưu ý: `insertTable` **không** thuộc `execCommand` → phải tự chèn HTML `<table>` vào contentEditable.
  - [ ] Style mặc định cho bảng (border, padding) trong `globals.css`.
- [ ] **Chèn link** (hyperlink): popup nhập URL → `createLink`; có nút bỏ link (`unlink`).
- [ ] **Tăng / giảm thụt lề** (indent / outdent).
- [ ] **Xóa định dạng** (clear formatting): `removeFormat`.

### 2.2 Phục vụ KHTN (vật lí/hóa)

- [ ] **Chỉ số trên / chỉ số dưới** (superscript / subscript) — cần cho H₂O, v², m/s².
- [ ] **Chèn ký hiệu đặc biệt**: √, ±, ×, ÷, °, α, β, Δ, π...
- [ ] (Sau) Chèn công thức toán (cân nhắc KaTeX/MathLive nếu cần công thức phức tạp).

### 2.3 Ưu tiên thấp / nice-to-have

- [ ] Gạch ngang (strikethrough).
- [ ] Chèn ảnh.
- [ ] Giãn dòng (line spacing).
- [ ] Phóng to / thu nhỏ (zoom) vùng soạn thảo.
- [ ] In (print).

---

## 3. UI thanh công cụ

- [ ] Sắp xếp nhóm nút mới vào thanh công cụ hợp lý (gom theo nhóm như hiện tại).
- [ ] Cập nhật ngưỡng container-query khi thêm nút để vẫn không chồng chất ở màn hẹp.
- [ ] Cân nhắc menu "More" (...) gom các nút ít dùng khi không gian hẹp.
- [ ] Đảm bảo các popup (bảng, link, ký hiệu) không bị cắt bởi vùng cuộn của thanh công cụ.

---

## 4. Bug cần sửa

- [ ] **Font size không tác dụng**: `applyFontSize` luôn truyền `exec("fontSize", "3")` thay vì cỡ chữ người dùng chọn (`EditorTools.tsx`, ~dòng 51). `execCommand("fontSize")` chỉ nhận 1–7; cần map px → 1–7 hoặc bọc `<span style="font-size">`.
- [ ] **Font size / font family chỉ là state hiển thị, không phản ánh định dạng tại vị trí con trỏ** (không đọc ngược từ selection).

---

## 5. Ghi chú kỹ thuật

- Toàn bộ nút hiện dựa trên `document.execCommand(...)` — API này **đã deprecated**. Vẫn chạy trên trình duyệt hiện tại nhưng:
  - Không có lệnh chèn bảng → phải tự thao tác DOM/Range.
  - Hành vi khác nhau giữa trình duyệt, khó kiểm soát output HTML.
- **Quyết định cần chốt:** tiếp tục vá trên contentEditable + execCommand, hay chuyển sang editor framework (**Tiptap/ProseMirror**) để có sẵn bảng, link, undo/redo ổn định, schema HTML sạch. Nếu danh sách chức năng còn dài (bảng, công thức, ảnh...) thì Tiptap đáng cân nhắc sớm.
- File liên quan: `fe/components/LessonEditor/EditorTools.tsx`, `LessonEditor.tsx`, `fe/app/globals.css`.
