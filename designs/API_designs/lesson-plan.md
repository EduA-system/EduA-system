# Lesson Plan — API Design

> Endpoint đặc thù chức năng Lesson Plan (UC-23 Create, UC-27 Edit, UC-32 Export).
> Hạ tầng dùng chung (upload, catalog, STOMP) tách ở [`api-chung.md`](./api-chung.md).

## Quyết định riêng

- **Bài giảng mẫu 5512**: lưu DB dạng **singleton** (1 dòng), nạp vào system prompt khi sinh/sửa. Sửa qua API (không CRUD collection). Mẫu cố định giữa các request → hợp prompt caching.

---

## Danh sách endpoint

| # | Method | Path | UC | Đồng bộ? |
|---|--------|------|----|----------|
| 1 | GET | `/api/lesson-plan-template` | mẫu 5512 | sync |
| 2 | PUT | `/api/lesson-plan-template` | mẫu 5512 | sync |
| 3 | POST | `/api/lesson-plans/generate` | UC-23 | **async + STOMP** |
| 4 | GET | `/api/lesson-plans` | library | sync |
| 5 | GET | `/api/lesson-plans/{id}` | UC-27/32 | sync |
| 6 | PATCH | `/api/lesson-plans/{id}` | UC-27 | sync |
| 7 | POST | `/api/lesson-plans/edit-section` | UC-27 | sync |
| 8 | DELETE | `/api/lesson-plans/{id}` | library | sync |
| 9 | POST | `/api/lesson-plans/{id}/export` | UC-32 | sync |

**+ STOMP**: subscribe `/topic/lesson-plan/{sessionId}` (xem `api-chung.md`).

---

## Chi tiết

### 1. `GET /api/lesson-plan-template` — Lấy mẫu 5512
```
→ 200  LessonPlan5512Dto   (mẫu chung hiện tại)
```

### 2. `PUT /api/lesson-plan-template` — Cập nhật mẫu 5512
```
body: LessonPlan5512Dto
→ 200  LessonPlan5512Dto
```
Singleton — không có `{id}`, không list/delete. Mở rộng thành collection khi cần nhiều mẫu.

### 3. `POST /api/lesson-plans/generate` — Sinh giáo án (async + STOMP)
```
body: {
  bookId, chapterId, lessonId,   // chọn từ catalog (BR-07)
  userPrompt?,                   // Additional Objectives / yêu cầu tùy chỉnh
  referenceFileId?,              // file đã upload ở /api/uploads (thay cho B/C/L)
  sessionId                      // client tự sinh, subscribe topic trước khi gọi
}
→ 202 ACCEPTED  { sessionId, lessonPlanId }
```
- `bookId/chapterId/lessonId` **hoặc** `referenceFileId` — thiếu cả hai → 400 (MSG02).
- Trả ngay, chạy nền, đẩy event qua STOMP. Status mặc định Private (BR-15), auto-save khi `DONE` (BR-19).
- Map: UC-23, MSG06/07/14, PRF-02.

### 4. `GET /api/lesson-plans` — Personal Library
```
→ 200  [ LessonPlanSummaryDto ]
```

### 5. `GET /api/lesson-plans/{id}` — Mở vào Editor
```
→ 200  LessonPlan5512Dto | 404
```

### 6. `PATCH /api/lesson-plans/{id}` — Sửa tay + auto-save
```
body: LessonPlan5512Dto (partial — title / section / activity)
→ 200  LessonPlan5512Dto
```
Áp BR-23 (luật status khi edit) trong service. FE gọi mỗi phút = auto-save (BR-19). Map: UC-27, MSG08.

### 7. `POST /api/lesson-plans/edit-section` — Sửa một phần bằng AI (sync + preview)
```
body: {
  instruction,
  sections: [
    { id, heading, content, kind }   // trích từ editor hiện tại; id do frontend gán ổn định theo thứ tự section
  ]
}
→ 200  { targetId, content }
```
AI tự chọn đúng một `targetId` trong danh sách và trả phần thân đã viết lại. Frontend render preview (diff dòng, gạch đỏ/gạch xanh) ngay trong editor để giáo viên Chấp nhận/Bỏ; khi Chấp nhận, TipTap thay đúng range section và auto-save xử lý như edit tay. Không dùng STOMP vì mỗi lượt sửa nhỏ, đồng bộ. Map: UC-27 AI edit, MSG06/07.

`content` là text phẳng: mỗi đoạn/bullet/công thức một dòng (xem `LessonPlanEditPromptBuilder`). Mục có bảng (thiết bị 2 cột, phiếu học tập, bảng tổ chức/sản phẩm của tiểu hoạt động HĐ2) mã hoá bảng theo quy ước dòng riêng thay vì bị làm phẳng mất cấu trúc — xem `fe/components/LessonEditor/tableText.ts`:
- Hàng tiêu đề: `‖ Cột 1 ‖ Cột 2 ‖`; hàng dữ liệu: `| Ô 1 | Ô 2 |`. Bảng 1 cột (phiếu học tập) không có hàng tiêu đề.
- Nhiều đoạn trong cùng một ô nối bằng token `<br>` (không xuống dòng thật, để cả hàng vẫn nằm trên 1 dòng cho diff theo dòng).
- Nhiều bảng liên tiếp không có văn bản xen giữa ngăn cách bằng một dòng riêng `---`.

`kind` (do FE phát hiện cấu trúc, gửi kèm mỗi section) là `"text"` | `"materials"` | `"subActivity"` — cho AI biết cần giữ đúng quy tắc cấu trúc 5512 nào (2 cột thiết bị, 1 cột phiếu học tập, hay 2 cột "Hoạt động của GV và HS"/"Sản phẩm dự kiến") khi viết lại phần có bảng.

### 8. `DELETE /api/lesson-plans/{id}` — Xóa
```
→ 204 No Content
```

### 9. `POST /api/lesson-plans/{id}/export` — Export PDF/Word (R2)
```
?format=pdf|docx
→ 200  { downloadUrl }   (gen file lên R2, trả signed URL)
```
Map: UC-32, MSG18/07.

---

## Cross-cutting riêng (xử lý ở service)

- **Status rules**: mặc định Private (BR-15), owner-only (BR-16), luật chuyển status khi edit (BR-23) — trong service layer.

## Phụ thuộc & thứ tự làm

1. **`LessonPlan5512Dto` đầy đủ** — mọi endpoint phụ thuộc (hiện mới là placeholder `{ title }`). Port từ project ref hoặc theo mẫu tự đưa.
2. Skeleton controller + DTO cho các endpoint (stub, Swagger hiện đủ).
3. Làm chạy thật luồng `generate` end-to-end (AiClient → STOMP → DB).

## Điểm khác so với project tham chiếu `edua-system`

- Định danh bài học dùng `bookId/chapterId/lessonId` (giống ref), KHÔNG dùng `subjectId/grade`.
- Catalog trả nguyên cây trong 1 call (`/api/textbooks` — xem `api-chung.md`), không tách 4 dropdown endpoint.
- Bỏ luồng `POST /generate` sync cũ (tàn dư prototype) — chỉ giữ 1 đường generate 5512.
- Library gộp vào `/api/lesson-plans` thay vì tách `/api/library` (hệ này chỉ tập trung lesson plan).
- Ref **chưa có** edit / ai-edit / export — phần này tự thiết kế.
