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
| 7 | POST | `/api/lesson-plans/{id}/ai-edit` | UC-27 | **async + STOMP** |
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

### 7. `POST /api/lesson-plans/{id}/ai-edit` — Sửa bằng AI (async + STOMP)
```
body: { instruction, scope?, sessionId }   // scope = toàn bài | 1 activity
→ 202 ACCEPTED  { sessionId, lessonPlanId }
```
Tái dùng topic `/topic/lesson-plan/{sessionId}`: phát `FRAME_READY` (bản cập nhật) / `ACTIVITY_READY` (activity đổi) → `DONE`. Lỗi → `ERROR`, giữ bản lưu cuối (REL-02). Map: UC-27 AI edit, MSG06/07.

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
