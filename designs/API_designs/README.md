# API Designs

Thiết kế endpoint, tách theo ranh giới **chung (hạ tầng dùng lại)** vs **riêng từng feature**.

| File | Phạm vi | Ai làm |
|------|---------|--------|
| [`api-chung.md`](./api-chung.md) | Hạ tầng dùng chung: upload R2, catalog SGK, STOMP transport, auth/RBAC/rate-limit cross-cutting | Team hạ tầng/shared |
| [`auth.md`](./auth.md) | Xác thực Google OAuth2 + JWT + RBAC (SEC-01/03/04) | Team auth |
| [`lesson-plan.md`](./lesson-plan.md) | Toàn bộ nghiệp vụ giáo án 5512 (UC-23/27/32) | Team lesson-plan |
| [`blog.md`](./blog.md) | Blog cộng đồng giáo viên: bài viết + bình luận + kiểm duyệt (BR-20/21/22) | Team blog |
| [`class-management.md`](./class-management.md) | Teacher tạo/xem/sửa/deactivate lớp học theo Class Hub (UC-29 đến UC-33, BR-34/37/39) | Team class |

> Nguồn gốc: `sprints/lesson-plan-api-design.md`. Các file ở đây là bản tách chi tiết, dùng làm spec chính thức.

## Quyết định nền tảng (áp cho mọi file)

- **5512 là cấu trúc DUY NHẤT** cho mọi giáo án sinh ra (không phải tùy chọn) → chỉ một đường `/generate`, không hậu tố `-5512`.
- **Generation bất đồng bộ + streaming** qua STOMP (`/ws`), pipeline đã có sẵn:
  `FRAME_READY → (ACTIVITY_READY | ACTIVITY_FAILED)×4 → DONE | ERROR`.
- `sessionId` do **client tự sinh** và gửi lên; client subscribe `/topic/lesson-plan/{sessionId}` TRƯỚC khi gọi generate để không miss event.
- **Auth** (BR-01/04/06, SEC-01/03/04): Google OAuth2 + JWT + RBAC — spec ở [`auth.md`](./auth.md). Owner-check (BR-16) & rate-limit (SEC-07) wire dần vào từng feature.
