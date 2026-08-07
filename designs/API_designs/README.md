# API Designs

Thiết kế endpoint, tách theo ranh giới **chung (hạ tầng dùng lại)** vs **riêng từng feature**.

| File | Phạm vi | Ai làm |
|------|---------|--------|
| [`api-chung.md`](./api-chung.md) | Hạ tầng dùng chung: upload R2, catalog SGK, STOMP transport, auth/RBAC/rate-limit cross-cutting | Team hạ tầng/shared |
| [`auth.md`](./auth.md) | Xác thực Google OAuth2 + JWT + RBAC (SEC-01/03/04) | Team auth |
| [`lesson-plan.md`](./lesson-plan.md) | Toàn bộ nghiệp vụ giáo án 5512 (UC-23/27/32) | Team lesson-plan |
| [`blog.md`](./blog.md) | Blog cộng đồng giáo viên: bài viết + bình luận + kiểm duyệt (BR-20/21/22) | Team blog |
| [`class-management.md`](./class-management.md) | Teacher tạo/xem/sửa/deactivate lớp học theo Class Hub (UC-29 đến UC-33, BR-34/37/39) | Team class |
| [`add-student.md`](./add-student.md) | Teacher thêm học sinh vào lớp bằng Gmail, thủ công hoặc import file (UC-36, BR-34/37/38/46) | Team class |
| [`view-class-resources.md`](./view-class-resources.md) | Student xem danh sách resource của lớp đã enrolled (UC-41, BR-34/35/37/39) | Team class |
| [`manage-class-resources.md`](./manage-class-resources.md) | Teacher đăng/sửa/xóa resource-assignment trong lớp mình sở hữu (UC-38/39/40, BR-34/35/37/46) | Team class |
| [`submit-assignment.md`](./submit-assignment.md) | Student nộp/thu hồi bài nộp — text và/hoặc file (UC-47/48, BR-34/36/37/45) | Team class |
| [`review-submissions.md`](./review-submissions.md) | Teacher xem danh sách/chi tiết bài nộp và tải file (UC-44/45/46, BR-34/39) | Team class |

> Nguồn gốc: `sprints/lesson-plan-api-design.md`. Các file ở đây là bản tách chi tiết, dùng làm spec chính thức.

## Quyết định nền tảng (áp cho mọi file)

- **5512 là cấu trúc DUY NHẤT** cho mọi giáo án sinh ra (không phải tùy chọn) → chỉ một đường `/generate`, không hậu tố `-5512`.
- **Generation bất đồng bộ + streaming** qua STOMP (`/ws`), pipeline đã có sẵn:
  `FRAME_READY → (ACTIVITY_READY | ACTIVITY_FAILED)×4 → DONE | ERROR`.
- `sessionId` do **client tự sinh** và gửi lên; client subscribe `/topic/lesson-plan/{sessionId}` TRƯỚC khi gọi generate để không miss event.
- **Auth** (BR-01/04/06, SEC-01/03/04): Google OAuth2 + JWT + RBAC — spec ở [`auth.md`](./auth.md). Owner-check (BR-16) & rate-limit (SEC-07) wire dần vào từng feature.
