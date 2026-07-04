# API chung — hạ tầng dùng lại

> Các endpoint **không đặc thù lesson-plan**: bất kỳ feature nào (quiz, bài tập, …) đều dùng lại.
> Đặt ngoài tiền tố `/lesson-plans` đã thể hiện ý đồ tách chung.

## Danh sách endpoint

| # | Method | Path | Loại | Đồng bộ? |
|---|--------|------|------|----------|
| 1 | GET | `/api/textbooks` | catalog SGK (seed) | sync |
| 2 | POST | `/api/uploads` | upload file → R2 | sync |
| 3 | * | `/api/auth/*` | xác thực Google + JWT — xem [`auth.md`](./auth.md) | sync |
| — | WS | `/ws` + `/topic/...` | STOMP transport (cần JWT ở CONNECT) | streaming |

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

- **Auth / JWT filter** (SEC-01/03): mọi request (trừ `/api/auth/google|refresh`, `/api/health`, swagger) phải kèm `Authorization: Bearer <access>`. Filter verify chữ ký + `exp`; thiếu/hết hạn → **401**. Chi tiết luồng: [`auth.md`](./auth.md).
- **RBAC** (SEC-04): `@EnableMethodSecurity` + `@PreAuthorize` theo role {TEACHER, MODERATOR, ADMINISTRATOR} (+ subject cho màn đặc thù), theo ma trận Screen Authorization 1.4.2. Owner-only edit/delete (BR-16) check trong service.
- **WebSocket auth**: STOMP `CONNECT` tới `/ws` phải mang `Authorization: Bearer <access>`; `StompAuthChannelInterceptor` verify và gán Principal = userId, sai → reject (chặn rò rỉ nội dung qua `/topic/...`).
- **Rate limit** (SEC-07): key theo userId — **60 req/phút/user** endpoint thường, **10 req/phút/user** cho endpoint AI (`/generate*`, `/ai-edit`, slide generate). In-memory (Bucket4j), vượt → **429**.
- **CORS**: `allowCredentials(true)` + origin cố định (dev `http://localhost:3000`, prod HTTPS) để dùng cookie refresh (SEC-02).
- **Transaction** (REL-05): save/submit bọc DB transaction, fail → rollback.
