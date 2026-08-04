# Lesson Plan — API Design

> Thiết kế endpoint cho chức năng Lesson Plan (UC-23 Create, UC-27 Edit, UC-32 Export).
> Nguồn: `requirements/lesson-plan.md` + nền STOMP đã có trong code + đối chiếu project tham chiếu `edua-system`.

## Quyết định nền tảng

- **5512 là cấu trúc DUY NHẤT** cho mọi giáo án sinh ra (không phải tùy chọn) → không có hậu tố `-5512`, chỉ một đường `/generate`.
- **Generation bất đồng bộ + streaming** qua STOMP (`/ws`), pipeline đã có sẵn:
  `FRAME_READY → (ACTIVITY_READY | ACTIVITY_FAILED)×4 → DONE | ERROR`.
- `sessionId` do **client tự sinh** và gửi lên; client subscribe `/topic/lesson-plan/{sessionId}` TRƯỚC khi gọi generate để không miss event.
- **Bài giảng mẫu 5512**: lưu DB dạng **singleton** (1 dòng), nạp vào system prompt khi sinh/sửa. Sửa qua API (không CRUD collection). Mẫu cố định giữa các request → hợp prompt caching.
- **Chưa làm auth** (BR-04 / BR-16 / SEC-04/07 để sau).

---

## Danh sách endpoint

| # | Method | Path | UC | Đồng bộ? |
|---|--------|------|----|----------|
| 1 | GET | `/api/textbooks` | catalog | sync |
| 2 | GET | `/api/lesson-plan-template` | mẫu 5512 | sync |
| 3 | PUT | `/api/lesson-plan-template` | mẫu 5512 | sync |
| 4 | POST | `/api/uploads` | UC-23 nhánh | sync |
| 5 | POST | `/api/lesson-plans/generate` | UC-23 | **async + STOMP** |
| 6 | GET | `/api/lesson-plans` | library | sync |
| 7 | GET | `/api/lesson-plans/{id}` | UC-27/32 | sync |
| 8 | PATCH | `/api/lesson-plans/{id}` | UC-27 | sync |
| 9 | POST | `/api/lesson-plans/edit-section` | UC-27 | sync |
| 10 | DELETE | `/api/lesson-plans/{id}` | library | sync |
| 11 | POST | `/api/lesson-plans/{id}/export` | UC-32 | sync |

**+ STOMP**: subscribe `/topic/lesson-plan/{sessionId}`.

---

## Chi tiết

### 1. `GET /api/textbooks` — Catalog KNTT (DB seed)
Trả cả cây `book → chapter → lesson` trong 1 call, FE tự lọc dropdown (Subject/Grade/Chapter/Lesson).
```
→ 200  TextbookCatalog
```
Map: BR-07, màn Creation 3.1.1.1.

### 2. `GET /api/lesson-plan-template` — Lấy mẫu 5512
```
→ 200  LessonPlan5512Dto   (mẫu chung hiện tại)
```

### 3. `PUT /api/lesson-plan-template` — Cập nhật mẫu 5512
```
body: LessonPlan5512Dto
→ 200  LessonPlan5512Dto
```
Singleton — không có `{id}`, không list/delete. Mở rộng thành collection khi cần nhiều mẫu.

### 4. `POST /api/uploads` — Upload file tham chiếu (R2)
```
multipart: file
→ 200  { fileId, url, fileName, contentType, sizeBytes }
```
Validate type (.docx/.pdf/.pptx/.png/.jpg/.jpeg) + ≤10MB. Map: BR-09/10, SEC-05, MSG13.
Lấy `fileId` truyền sang `/generate`.

### 5. `POST /api/lesson-plans/generate` — Sinh giáo án (async + STOMP)
```
body: {
  bookId, chapterId, lessonId,   // chọn từ catalog (BR-07)
  userPrompt?,                   // Additional Objectives / yêu cầu tùy chỉnh
  referenceFileId?,             // file đã upload ở /api/uploads (thay cho B/C/L)
  sessionId                      // client tự sinh, subscribe topic trước khi gọi
}
→ 202 ACCEPTED  { sessionId, lessonPlanId }
```
- `bookId/chapterId/lessonId` **hoặc** `referenceFileId` — thiếu cả hai → 400 (MSG02).
- Trả ngay, chạy nền, đẩy event qua STOMP. Status mặc định Private (BR-15), auto-save khi `DONE` (BR-19).
Map: UC-23, MSG06/07/14, PRF-02.

### 6. `GET /api/lesson-plans` — Personal Library
```
→ 200  [ LessonPlanSummaryDto ]
```

### 7. `GET /api/lesson-plans/{id}` — Mở vào Editor
```
→ 200  LessonPlan5512Dto | 404
```

### 8. `PATCH /api/lesson-plans/{id}` — Sửa tay + auto-save
```
body: LessonPlan5512Dto (partial — title / section / activity)
→ 200  LessonPlan5512Dto
```
Áp BR-23 (luật status khi edit) trong service. FE gọi mỗi phút = auto-save (BR-19). Map: UC-27, MSG08.

### 9. `POST /api/lesson-plans/edit-section` — Sửa một phần bằng AI (sync + preview)
```
body: {
  instruction,
  sections: [
    { id, heading, content }   // trích từ editor hiện tại
  ]
}
→ 200  { targetId, content }
```
AI tự chọn một `targetId` trong danh sách và trả phần thân đã viết lại. Frontend render preview để giáo viên Chấp nhận/Bỏ; Chấp nhận thì thay đúng range section trong TipTap và auto-save như edit tay. Không dùng STOMP cho luồng này vì request nhỏ và đồng bộ. Map: UC-27 AI edit, MSG06/07.

### 10. `DELETE /api/lesson-plans/{id}` — Xóa
```
→ 204 No Content
```

### 11. `POST /api/lesson-plans/{id}/export` — Export PDF/Word (R2)
```
?format=pdf|docx
→ 200  { downloadUrl }   (gen file lên R2, trả signed URL)
```
Map: UC-32, MSG18/07.

### STOMP — streaming (đã có sẵn, không code thêm transport)
```
connect ws://.../ws  →  subscribe /topic/lesson-plan/{sessionId}
events: FRAME_READY → (ACTIVITY_READY | ACTIVITY_FAILED)×4 → DONE | ERROR
```

---

## Cross-cutting (xử lý ở filter/service, không phải endpoint)

- **Rate limit** (SEC-07): `generate` + `ai-edit` ≤ 10 req/phút/user — *để sau, cùng auth*.
- **Status rules**: mặc định Private (BR-15), owner-only (BR-16), luật chuyển status khi edit (BR-23) — trong service layer.
- **Transaction** (REL-05): save/submit bọc DB transaction, fail → rollback.

---

## Phụ thuộc & thứ tự làm

1. **`LessonPlan5512Dto` đầy đủ** — mọi endpoint phụ thuộc (hiện mới là placeholder `{ title }`). Port từ project ref hoặc theo mẫu tự đưa.
2. Skeleton controller + DTO cho 11 endpoint (stub, Swagger hiện đủ).
3. Làm chạy thật luồng `generate` end-to-end (AiClient → STOMP → DB).

## Điểm khác so với project tham chiếu `edua-system`

- Định danh bài học dùng `bookId/chapterId/lessonId` (giống ref), KHÔNG dùng `subjectId/grade`.
- Catalog trả nguyên cây trong 1 call (`/api/textbooks`), không tách 4 dropdown endpoint.
- Bỏ luồng `POST /generate` sync cũ (tàn dư prototype) — chỉ giữ 1 đường generate 5512.
- Library gộp vào `/api/lesson-plans` thay vì tách `/api/library` (hệ này chỉ tập trung lesson plan).
- Ref **chưa có** edit / ai-edit / export — phần này tự thiết kế.
