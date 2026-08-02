# Notifications — API Design

> Endpoint đặc thù chức năng **Notifications** (WBS Iteration 3: *Create Notifications*, *View & Manage My Notifications*).
> Hạ tầng dùng chung (auth/RBAC/rate-limit) tách ở [`api-chung.md`](./api-chung.md).
> Doc này tự chứa cả schema DB (không tách file flow riêng), vì phạm vi tính năng nhỏ.

## Quyết định riêng

- **Phạm vi đúng 2 UC trong WBS**: (1) Moderator gửi thông báo broadcast tới toàn bộ Teacher cùng `subject` với mình; (2) mọi user xem/quản lý thông báo của chính mình (list, unread count, đánh dấu đã đọc). Không làm: nhắm thông báo tới một người cụ thể, không tự động sinh notification cho các sự kiện khác (blog bị gỡ, comment mới...) — dù `blog.md` có để ngỏ hook này, nó là follow-up ngoài scope hiện tại (xem "Điểm mở cần chốt sau").
- **Content = plain text**, không phải rich-text/HTML. Thông báo là bản tin ngắn (tiêu đề + nội dung thuần), không cần TipTap editor hay Jsoup sanitize như blog — giữ đơn giản đúng scope.
- **Fan-out tại thời điểm tạo**: khi Moderator tạo thông báo, hệ thống snapshot ngay danh sách Teacher cùng subject và ghi 1 dòng recipient cho mỗi người. Teacher được thêm vào subject *sau* khi thông báo đã gửi sẽ không thấy thông báo cũ — chấp nhận được vì đây là bản tin theo thời điểm, không phải nội dung tĩnh.
- **Không cho chọn subject khi tạo**: subject của thông báo = subject hiện tại của Moderator (đọc từ `AccessTokenClaims`), không phải input tự do — tránh Moderator gửi nhầm sang môn khác.
- **Real-time là lớp phụ, không phải nguồn sự thật**: mọi thao tác ghi dữ liệu (tạo, đánh dấu đã đọc) đi qua REST đồng bộ; STOMP chỉ dùng để đẩy tin mới / cập nhật badge tức thời cho client đang mở kết nối. Client luôn có thể fallback bằng cách gọi lại REST list/unread-count.

---

## Schema (Flyway `V17__create_notifications.sql`)

Theo đúng style migration hiện có (PK do app sinh UUID, không dùng `gen_random_uuid()`; timestamp do app set giá trị, không dùng `DEFAULT now()` — xem `V10__create_library_contents.sql`).

> **Ghi chú version**: ban đầu đặt là `V14`/`V15`, nhưng khi test thật trên DB Supabase dùng chung phát hiện: (1) `V14`/`V15` local đã bị nhánh khác chiếm (`V14__add_grade_to_library_contents.sql`, `V15__community_hub_lifecycle.sql` — migration này chưa có trong working tree hiện tại nhưng **đã được apply lên DB** bởi một nhánh/session khác); (2) có sẵn 2 file cùng version `V13` trên `main` (`V13__rename_principal_and_it_staff_roles.sql` chưa từng chạy, và `V13__split_ai_system_prompts_by_process.sql` đã chạy) khiến Flyway chặn cứng ngay bước resolve migration. Đã renumber file rename-role thành `V16` (chạy được, tự sửa luôn bug tiềm ẩn: DB vẫn còn role name cũ `ADMINISTRATOR`/`IT_MANAGEMENT` trong khi code đã đổi enum sang `PRINCIPAL`/`IT_STAFF`) và notifications thành `V17`, đứng sau version cao nhất đã xác nhận applied (15) tại thời điểm kiểm tra qua `flyway_schema_history`.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    sender_id UUID NOT NULL REFERENCES app_users(id),
    subject VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE notification_recipients (
    id UUID PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES app_users(id),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (notification_id, recipient_id)
);

CREATE INDEX idx_notification_recipients_recipient ON notification_recipients (recipient_id, read_at);
CREATE INDEX idx_notifications_sender ON notifications (sender_id);
```

- `notifications` = bản tin gốc (1 dòng / lần Moderator bấm gửi). `subject` dùng lại enum `Subject {MATH, CHEMISTRY, PHYSICS}` như blog/library.
- `notification_recipients` = trạng thái đọc theo từng người nhận. `read_at IS NULL` = chưa đọc.
- Index `(recipient_id, read_at)` phục vụ trực tiếp truy vấn "thông báo của tôi" và "đếm chưa đọc".

---

## Danh sách endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | POST | `/api/notifications` | Create Notifications (Moderator → Teacher cùng subject) | MODERATOR |
| 2 | GET | `/api/notifications` | View & Manage My Notifications (list) | authenticated |
| 3 | GET | `/api/notifications/unread-count` | Badge số chưa đọc | authenticated |
| 4 | PATCH | `/api/notifications/{id}/read` | Đánh dấu 1 thông báo đã đọc | authenticated (owner-recipient) |
| 5 | POST | `/api/notifications/read-all` | Đánh dấu tất cả đã đọc | authenticated |

Mọi request cần `Authorization: Bearer <access>` (JWT filter ở `api-chung.md`).

---

## Chi tiết

### 1. `POST /api/notifications` — Moderator gửi thông báo tới Teacher cùng subject
```
body: { title, content }                   // subject KHÔNG nằm trong body — lấy từ subject của Moderator hiện tại
→ 201  { id, title, content, subject, senderName, createdAt, recipientCount }
→ 400  thiếu/rỗng title hoặc content, hoặc vượt quá độ dài (title ≤ 200, content ≤ 2000)
→ 403  role ≠ MODERATOR, hoặc Moderator không có subject (giống check trong ModeratorTeacherService)
```
- Subject = `currentUserProvider.require().subject()`. Recipient = toàn bộ user có role `TEACHER` và cùng subject, lấy qua `AppUserRepository.findAllByRoleAndSubject(Role.TEACHER, subject, ...)` — tái dùng đúng method đang phục vụ `ModeratorTeacherService.listTeachers`, nhưng cần bản lấy **toàn bộ** (không phân trang) để fan-out ghi hết recipient trong 1 transaction.
- Ghi 1 dòng `notifications` + N dòng `notification_recipients` (N = số Teacher tìm được). Nếu N = 0 (chưa có Teacher nào cùng subject), vẫn tạo thành công với `recipientCount = 0`.
- Sau khi commit, publish real-time cho từng recipient đang online (xem mục STOMP bên dưới).
- Map: UC Create Notifications.

### 2. `GET /api/notifications` — Danh sách thông báo của tôi
```
query: ?unread=true                         // chỉ lấy chưa đọc — tùy chọn
       ?page=0&size=20                       // phân trang, mặc định 0/20
→ 200  { items: [ NotificationSummaryDto ], page, size, total, unreadCount }
```
- Chỉ trả thông báo mà user hiện tại là recipient (join `notification_recipients` theo `recipient_id = currentUserId`). Sắp theo `createdAt` giảm dần.
- `NotificationSummaryDto`: `{ id, title, content, subject, senderName, createdAt, read }` (`read = read_at IS NOT NULL`).
- `unreadCount` trả kèm trong mọi response (không cần gọi thêm `#3` nếu FE đã ở trang list) — vẫn giữ `#3` riêng cho nơi chỉ cần con số (ví dụ badge trên nav, không cần load cả list).
- Map: UC View & Manage My Notifications.

### 3. `GET /api/notifications/unread-count` — Số lượng chưa đọc
```
→ 200  { count }
```
- Dùng cho badge trên sidebar nav — gọi nhẹ, không load list. Map: UC View & Manage My Notifications.

### 4. `PATCH /api/notifications/{id}/read` — Đánh dấu 1 thông báo đã đọc
```
→ 204 No Content
→ 404  không tồn tại dòng notification_recipients cho (id, currentUserId) — nghĩa là thông báo không tồn tại hoặc không phải của mình
```
- `UPDATE notification_recipients SET read_at = now() WHERE notification_id = :id AND recipient_id = :currentUserId AND read_at IS NULL` — no-op an toàn nếu gọi lại lần 2 (đã có `read_at` thì không ghi đè, tránh mất mốc thời gian đọc lần đầu; response vẫn 204).
- Map: UC View & Manage My Notifications.

### 5. `POST /api/notifications/read-all` — Đánh dấu tất cả đã đọc
```
→ 204 No Content
```
- `UPDATE notification_recipients SET read_at = now() WHERE recipient_id = :currentUserId AND read_at IS NULL`.
- Map: UC View & Manage My Notifications.

---

## Cross-cutting riêng (xử lý ở service)

- **RBAC**: `@PreAuthorize("hasRole('MODERATOR')")` cho `#1`; `#2`–`#5` chỉ `authenticated()`.
- **Owner-recipient check** (`#4`): so `recipient_id` với `currentUserId` trong **service/repository query**, không nhét vào annotation (giống cách blog xử lý owner-only ở BR-16).
- **Rate-limit** (SEC-07): bucket chuẩn 60 req/phút/user cho `#1` (endpoint ghi duy nhất tốn tài nguyên — fan-out N recipient).
- **Auth/JWT filter, CORS**: theo `api-chung.md`.

### STOMP — real-time push (tái dùng hạ tầng `/ws` hiện có)

- Thêm port `NotificationStreamPort` (theo pattern `OutlineStreamPort`) với 1 method: `void publishNew(UUID recipientUserId, NotificationEvent event)`.
- Adapter `StompNotificationStreamAdapter` implement port đó, gọi `messagingTemplate.convertAndSendToUser(recipientUserId.toString(), "/queue/notifications", event)`. Sau khi `#1` commit xong, service loop qua từng recipient và gọi port này — chỉ những client đang có kết nối STOMP mở nhận được, không ảnh hưởng người đang offline (họ thấy khi gọi lại `#2`/`#3`).
- **Gap hạ tầng cần vá trước khi làm được việc này**: `AccessTokenClaims` (`domain/model/auth/AccessTokenClaims.java`) hiện là plain `record`, không implement `Principal`/`AuthenticatedPrincipal`. Trong `StompAuthChannelInterceptor`, `Authentication` được tạo với `principal = claims`, nên `Authentication.getName()` (Spring dùng làm key routing cho `convertAndSendToUser`) fallback về `claims.toString()` thay vì `userId`. Cần sửa: cho `AccessTokenClaims implements org.springframework.security.core.AuthenticatedPrincipal` với `getName()` trả `userId.toString()`. Đây là thay đổi cô lập (thêm interface + 1 method), không ảnh hưởng chỗ khác đang dùng `AccessTokenClaims` làm principal cho HTTP JWT filter.
- FE subscribe đích `/user/queue/notifications`, dùng client mới `fe/lib/ws/notifications-client.ts` theo đúng shape `connectOutlineStream` (`fe/lib/ws/outline-client.ts`): `connectHeaders` mang JWT, `onEvent` nhận `NotificationEvent` rồi tự cập nhật badge/list cục bộ.
- Không dùng STOMP để ghi dữ liệu — mọi create/mark-read vẫn là REST.

---

## Phụ thuộc & thứ tự làm

1. Flyway `V17__create_notifications.sql` (bảng `notifications`, `notification_recipients`, index).
2. Domain (`Notification` record) + repository interface (`repository/repositories/NotificationRepository.java`) + JPA entity/adapter (pattern `BlogComment`/`AppUser`); thêm method lấy toàn bộ Teacher theo subject không phân trang vào `AppUserRepository`.
3. Fix `AccessTokenClaims implements AuthenticatedPrincipal` (điều kiện tiên quyết cho STOMP per-user push).
4. `NotificationService` (fan-out create, list-for-recipient, unread-count, mark-read, mark-all-read) + `NotificationController` + DTO, theo pattern `BlogPostService`/`BlogController`.
5. `NotificationStreamPort` + `StompNotificationStreamAdapter`, gọi từ `NotificationService` sau khi commit `#1`.
6. FE: `fe/lib/notifications.ts` (types + gọi API qua `api()` có sẵn trong `fe/lib/blog.ts`), `fe/lib/ws/notifications-client.ts`, trang `fe/app/notifications/page.tsx` (list + filter unread + mark read/read-all + form "Soạn thông báo" chỉ hiện cho MODERATOR), thêm 1 mục nav vào `navGroups` (`fe/components/dashboard/data.ts`) dùng icon key `"notification"` sẵn có.
7. Cập nhật `ITER3_CODE_CHECKLIST.md`: chuyển 2 dòng "Create Notifications" và "View & Manage My Notifications" từ *Not found* → *Coded*, kèm evidence trỏ vào các file trên.

## Điểm mở cần chốt sau

- Notification tự động cho các sự kiện khác (blog bị Moderator gỡ, comment mới, teacher bị thu hồi...) — hook đã được nhắc tới trong `blog.md`, nhưng cần thiết kế riêng (ai là sender khi hệ thống tự sinh, nội dung template).
- UI dạng bell-icon + dropdown panel ở header (thay vì chỉ có trang `/notifications` riêng) — có thể làm sau nếu cần trải nghiệm nhanh hơn; hiện tại dùng trang list là đủ cho scope WBS.
- Xoá / thu hồi thông báo đã gửi (Moderator gửi nhầm) — WBS hiện không yêu cầu, chưa thiết kế.
