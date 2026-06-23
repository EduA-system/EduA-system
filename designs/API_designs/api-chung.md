# API chung — hạ tầng dùng lại

> Các endpoint **không đặc thù lesson-plan**: bất kỳ feature nào (quiz, bài tập, …) đều dùng lại.
> Đặt ngoài tiền tố `/lesson-plans` đã thể hiện ý đồ tách chung.

## Danh sách endpoint

| # | Method | Path | Loại | Đồng bộ? |
|---|--------|------|------|----------|
| 1 | GET | `/api/textbooks` | catalog SGK (seed) | sync |
| 2 | POST | `/api/uploads` | upload file → R2 | sync |
| — | WS | `/ws` + `/topic/...` | STOMP transport | streaming |

---

## 1. `GET /api/textbooks` — Catalog KNTT (DB seed)

Trả cả cây `book → chapter → lesson` trong 1 call, FE tự lọc dropdown (Subject/Grade/Chapter/Lesson).

```
→ 200  TextbookCatalog
```

- Dữ liệu tham chiếu **read-only**, seed sẵn trong DB. Feature khác cũng tra cùng cây này.
- Map: BR-07, màn Creation 3.1.1.1.

## 2. `POST /api/uploads` — Upload file tham chiếu (R2)

```
multipart: file
→ 200  { fileId, url, fileName, contentType, sizeBytes }
```

- Validate type (`.docx/.pdf/.pptx/.png/.jpg/.jpeg`) + ≤ 10MB.
- Wrapper R2 generic — trả `fileId` để feature gọi (lesson-plan truyền sang `/generate`).
- Map: BR-09/10, SEC-05, MSG13.

## STOMP — streaming transport (đã có sẵn, KHÔNG code thêm transport)

```
connect ws://.../ws  →  subscribe /topic/lesson-plan/{sessionId}
events: FRAME_READY → (ACTIVITY_READY | ACTIVITY_FAILED)×4 → DONE | ERROR
```

- Nền chung; mỗi feature chỉ là một producer đẩy event vào topic.
- Đã có trong code (commit STOMP foundation). Chỉ cần xác nhận, không build lại.

---

## Cross-cutting (xử lý ở filter/service, không phải endpoint)

- **Rate limit** (SEC-07): các endpoint AI (`generate`, `ai-edit`) ≤ 10 req/phút/user — *để sau, cùng auth*.
- **Transaction** (REL-05): save/submit bọc DB transaction, fail → rollback.
