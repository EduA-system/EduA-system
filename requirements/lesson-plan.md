# Lesson Plan — Requirements & Progress Tracker

> Nguồn: `Report3_Software Requirement Specification.docx` (SEP490_SU26_G20).
> Tính năng Lesson Plan gồm 3 use case: **UC-23 Create**, **UC-27 Edit**, **UC-32 Export**.
> Quy ước đánh dấu: `[ ]` = chưa làm · `[~]` = đang làm · `[x]` = xong.
> Cập nhật tiến độ bằng cách đổi ký tự trong ngoặc vuông.

---

## 0. Tổng quan

| Hạng mục | Mô tả |
|----------|-------|
| Pipeline AI | Lesson Plan là mắt xích ĐẦU TIÊN → cấp dữ liệu cho Slide (UC-25) và Test (UC-26) |
| Use cases | UC-23 Create, UC-27 Edit, UC-32 Export |
| Màn hình | Lesson Plan Creation (3.1.1.1), Lesson Plan Editor (3.1.1.2) |
| Status mặc định | Private (BR-15) |
| Lưu trữ | Auto-save vào Personal Library (BR-19) |
| Cấu trúc giáo án | Thông tư MOET 5512/BGDDT (BR-08) |
| Nguồn tri thức | KNTT knowledge base (BR-07) |

---

## 1. Use Cases

### 1.1 UC-23 — Create Lesson Plan

- [ ] **Luồng chính**
  - [ ] Giáo viên đăng nhập (BR-04) → vào màn Lesson Plan Creation
  - [ ] Chọn Subject / Grade / Chapter / Lesson từ KNTT (BR-07)
  - [ ] (Tùy chọn) Nhập Additional Objectives / yêu cầu AI tùy chỉnh
  - [ ] Submit → gửi structured prompt tới AI/LLM, hiện "Generating..." (MSG06)
  - [ ] AI trả nội dung → render vào Lesson Plan Editor
  - [ ] Auto-save vào Personal Library (BR-19), status = Private (BR-15)
  - [ ] Thông báo thành công (MSG14)

- [ ] **Nhánh thay thế**
  - [ ] Upload file giáo án (.docx/.pdf/.pptx) thay vì chọn S/G/L → validate (MSG13) → dùng làm input
  - [ ] Required field (S/G/L) thiếu khi submit → chặn + lỗi inline đỏ (MSG02)
  - [ ] AI lỗi/timeout → MSG07 + cho retry

### 1.2 UC-27 — Edit Lesson Plan

- [ ] **Luồng chính**
  - [ ] Tiếp nối từ UC-23 HOẶC mở giáo án đã lưu từ Personal Library
  - [ ] Hiển thị nội dung trong Lesson Plan Editor
  - [ ] Sửa tay (section/activity/objective) → validate + auto-save (BR-19) → MSG08
  - [ ] Sửa bằng AI prompt tự do → gửi AI (MSG06) → áp dụng thay đổi → cập nhật

- [ ] **Nhánh thay thế**
  - [ ] AI lỗi/timeout → MSG07 + giữ phiên bản lưu cuối
  - [ ] Áp dụng luật trạng thái BR-23:
    - [ ] Edit Private/Rejected → giữ nguyên status
    - [ ] Edit Pending → rút khỏi review → chuyển Private
    - [ ] Edit Published → tạo draft private mới, Published nguyên đến khi duyệt

### 1.3 UC-32 — Export Lesson Plan

- [ ] **Luồng chính**
  - [ ] Mở giáo án trong Editor HOẶC chọn từ Personal Library
  - [ ] Chọn Export → chọn định dạng (PDF / Word)
  - [ ] Hệ thống gen file qua File Storage Service (R2) → download về máy
  - [ ] Thông báo thành công (MSG18)

- [ ] **Nhánh thay thế**
  - [ ] Gen/download fail → MSG07 + cho retry

---

## 2. Màn hình (UI)

### 2.1 Lesson Plan Creation (3.1.1.1)

- [ ] Quick Suggestions (gợi ý chủ đề phổ biến, click → auto-fill form)
- [ ] Subject — dropdown **required**
- [ ] Grade — dropdown **required**
- [ ] Chapter — dropdown **required** (phụ thuộc Subject + Grade)
- [ ] Lesson / Topic Title — text input **required**
- [ ] Additional Objectives — textarea tùy chọn
- [ ] Nút "Generate Lesson Plan with AI"
- [ ] Upload file tham chiếu (.docx/.pdf/.pptx)
- [ ] Validation inline đỏ + tooltip (USR-04)

### 2.2 Lesson Plan Editor (3.1.1.2)

- [ ] Lesson Plan Title
- [ ] Lesson Metadata Summary (subject, grade, duration)
- [ ] Information Panel (mục tiêu, thời lượng, đối tượng)
- [ ] Main Editor Area — block edit được
- [ ] Section Card (Learning Objectives, Preparation, Teaching Process, Homework…)
- [ ] AI Sidebar bên phải:
  - [ ] Quick-action (đơn giản hóa văn bản, thêm hoạt động nhóm, sinh câu hỏi)
  - [ ] Chat input yêu cầu chỉnh cụ thể
- [ ] Nút Export (PDF / Word)
- [ ] Auto-save mỗi 1 phút + lần đầu gen (BR-19)

---

## 3. Non-UI Functions (Backend)

- [ ] **AI Lesson Plan Generation** — gọi AI/LLM (OpenAI/DeepSeek) sinh draft từ S/G/L hoặc file upload
- [ ] **Asynchronous AI Generation Processing** — queue + poll trạng thái (không block UI)
- [ ] **Auto-save** — lưu Personal Library lần đầu + mỗi phút khi edit (BR-19)
- [ ] **File Storage** — Cloudflare R2 (upload, gen file export, trả signed URL)
- [ ] **Export Service** — render giáo án ra PDF/Word

---

## 4. Business Rules áp dụng

| ID | Rule | Áp dụng cho | Done |
|----|------|-------------|------|
| BR-04 | Phải đăng nhập mới dùng được | UC-23/27/32 | [ ] |
| BR-07 | Phải set S/G/L hợp lệ (KNTT) trước khi gen | UC-23 | [ ] |
| BR-08 | Giáo án AI theo cấu trúc Thông tư 5512/BGDDT | UC-23 | [ ] |
| BR-09 | File upload: .docx/.pdf/.pptx/.png/.jpg/.jpeg | UC-23 | [ ] |
| BR-10 | Mỗi file upload ≤ 10MB | UC-23 | [ ] |
| BR-11 | Nội dung AI luôn edit được (tay hoặc prompt) | UC-27 | [ ] |
| BR-15 | Nội dung mới mặc định status = Private | UC-23 | [ ] |
| BR-16 | Chỉ owner mới edit/delete được | UC-27 | [ ] |
| BR-19 | Auto-save Personal Library (đầu + mỗi phút) | UC-23/27 | [ ] |
| BR-23 | Luật status khi edit content | UC-27 | [ ] |

---

## 5. System Messages

| Mã | Nội dung | Ngữ cảnh | Done |
|----|----------|----------|------|
| MSG02 | "This field is required." | Thiếu field required (S/G/L) | [ ] |
| MSG06 | "Generating content, please wait." | Đang gen AI | [ ] |
| MSG07 | "Generation failed. Please try again." | AI lỗi/timeout/export fail | [ ] |
| MSG08 | "Saved successfully." | Create/edit/save OK | [ ] |
| MSG13 | "Unsupported file type or file exceeds the maximum size. Allowed: .docx, .pdf, .pptx, .png, .jpg, .jpeg (max 10 MB)." | File upload sai | [ ] |
| MSG14 | "Lesson plan created successfully." | Gen giáo án xong | [ ] |
| MSG18 | "File exported successfully." | Export xong | [ ] |

---

## 6. Non-Functional Requirements

### 6.1 Performance

- [ ] **PRF-02**: Draft đầu tiên về editor trong 30 giây (1 lesson) + progress indicator
- [ ] **PRF-07**: Upload file ≤ 10MB, xong trong 10s @ 10Mbps
- [ ] **PRF-06**: Hỗ trợ ≥ 200 concurrent user không giảm hiệu năng

### 6.2 Security

- [ ] **SEC-04**: RBAC trên mỗi request (kiểm role vs Screen Authorization 1.4.2)
- [ ] **SEC-05**: Validate file type + size trước khi lưu R2
- [ ] **SEC-06**: Sanitize input (XSS / SQLi)
- [ ] **SEC-07**: AI endpoint giới hạn **10 req/phút/user**

### 6.3 Reliability

- [ ] **REL-02**: AI outage/timeout → thông báo thân thiện + retry, content đã lưu vẫn truy cập được
- [ ] **REL-05**: Save/submit bọc trong DB transaction, fail → rollback

---

## 7. Tiến độ tổng

| Giai đoạn | Tiến độ |
|-----------|---------|
| Backend (mục 3, 4, 5, 6) | _ / 28 hạng mục |
| Frontend (mục 2) | _ / 14 hạng mục |
| Use case flow (mục 1) | _ / 14 hạng mục |

> Cách tính: đếm số `[x]` chia tổng số `[ ]`/`[~]`/`[x]` trong mỗi mục.
