# Blog — API Design

> Endpoint đặc thù chức năng **Blog** cộng đồng giáo viên (chia sẻ kinh nghiệm/kiến thức).
> Hạ tầng dùng chung (auth/RBAC/rate-limit, upload ảnh) tách ở [`api-chung.md`](./api-chung.md).
> Luồng & thiết kế triển khai BE: [`../blog/blog-flow.md`](../blog/blog-flow.md).

## Quyết định riêng

- **Đăng trực tiếp, không duyệt** (BR-20): tạo bài = publish ngay, không có review queue (khác Community Hub).
- **Mỗi bài gắn đúng 1 `subject`** (BR-20) — dùng lại enum `Subject {MATH, CHEMISTRY, PHYSICS}` — phục vụ search/filter và ranh giới kiểm duyệt của Moderator.
- **Không real-time / không STOMP**: blog không có AI generation → mọi endpoint là **REST đồng bộ**. FE tự refetch danh sách/bình luận; không đụng `/ws` hay `/topic/...`.
- **Nội dung bài = HTML rich text** soạn bằng **đúng editor như lesson-plan** (TipTap 3, gồm bảng/ảnh/công thức KaTeX). BE **sanitize** bằng Jsoup allowlist trước khi lưu; giữ `data-latex` cho KaTeX. Ảnh chèn qua `POST /api/uploads` (R2) — xem `api-chung.md`.
- **Soft-delete + audit**: bài có `status` phân biệt gỡ bởi Moderator (kèm lý do) vs xóa bởi tác giả; danh sách chỉ trả bài `PUBLISHED`.
- **Owner-only** (BR-16): chỉ tác giả sửa/xóa bài & bình luận của mình; **Moderator subject-match** (BR-21): chỉ gỡ bài cùng môn phụ trách, bắt buộc nêu lý do.
- **Cộng đồng tự điều tiết qua comment** (BR-22): không có like/vote ở giai đoạn này.

---

## Danh sách endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | GET | `/api/blog-posts` | View Blog (Teacher) / View Blog List (Moderator) | TEACHER, MODERATOR |
| 2 | GET | `/api/blog-posts/{id}` | View Blog Post Detail | TEACHER, MODERATOR |
| 3 | POST | `/api/blog-posts` | Create Blog Post (owner) | TEACHER, MODERATOR |
| 4 | PATCH | `/api/blog-posts/{id}` | Edit Own Blog Post (owner) | TEACHER, MODERATOR |
| 5 | DELETE | `/api/blog-posts/{id}` | Delete Own Blog Post (owner) | TEACHER, MODERATOR |
| 6 | POST | `/api/blog-posts/{id}/removal` | Remove Blog Post (Moderator) | MODERATOR |
| 7 | POST | `/api/blog-posts/{id}/comments` | Create Blog Comment | TEACHER, MODERATOR |
| 8 | PATCH | `/api/blog-comments/{commentId}` | Edit Own Blog Comment (owner) | TEACHER, MODERATOR |
| 9 | DELETE | `/api/blog-comments/{commentId}` | Delete Own Blog Comment (owner) | TEACHER, MODERATOR |

Tất cả **đồng bộ**. Mọi request cần `Authorization: Bearer <access>` (JWT filter ở `api-chung.md`).

---

## Chi tiết

### 1. `GET /api/blog-posts` — Danh sách bài (Teacher đọc cộng đồng / Moderator kiểm duyệt)
```
query: ?subject=MATH|CHEMISTRY|PHYSICS   (lọc theo môn — tùy chọn)
       ?authorId=me                       (chỉ bài của tôi — Teacher xem bài mình)
       ?q=<từ khóa>                        (tìm theo title — tùy chọn)
       ?page=0&size=20                     (phân trang, mặc định 0/20)
→ 200  { items: [ BlogPostSummaryDto ], page, size, total }
```
- Chỉ trả bài `status = PUBLISHED`. Sắp theo `createdAt` giảm dần.
- **Teacher — View Blog**: đọc bài cộng đồng của mọi môn (không auto-scope).
- **Moderator — View Blog List**: màn kiểm duyệt gọi kèm `?subject=<môn của mình>`; ngoài phạm vi môn chỉ để đọc, thao tác gỡ mới bị chặn (xem #6).
- `BlogPostSummaryDto`: `{ id, title, subject, authorId, authorName, createdAt, commentCount }` (không kèm `content` để nhẹ list).
- Map: UC View Blog / View Blog List, BR-20.

### 2. `GET /api/blog-posts/{id}` — Chi tiết bài + bình luận
```
→ 200  BlogPostDetailDto
→ 404  không tồn tại hoặc đã bị gỡ/xóa (không PUBLISHED)
```
- `BlogPostDetailDto`: `{ id, title, content, subject, authorId, authorName, createdAt, updatedAt, comments: [ BlogCommentDto ] }`.
- `content` là HTML đã sanitize; FE render bằng cùng extension set editor (KaTeX/bảng/ảnh).
- `BlogCommentDto`: `{ id, content, authorId, authorName, createdAt, updatedAt }`.
- Dùng cho cả **View Blog Post Detail** (Teacher) và **Blog Post Detail Management** (Moderator — kèm nút gỡ #6).
- Map: UC View Blog Post Detail.

### 3. `POST /api/blog-posts` — Tạo bài (publish trực tiếp)
```
body: { title, content, subject }         // title 1..255 chars after trim; subject ∈ {MATH, CHEMISTRY, PHYSICS}
→ 201  BlogPostDetailDto
→ 400  thiếu title/content/subject, title quá 255 ký tự, subject không hợp lệ, hoặc content rỗng sau sanitize
→ 403  role ≠ TEACHER
```
- `content` HTML → **sanitize (Jsoup)** trước khi lưu; XSS bị loại.
- `title` được trim và giới hạn tối đa 255 ký tự để khớp cột `blog_posts.title`.
- `authorId` = user hiện tại; `status = PUBLISHED` ngay (BR-20). Không giới hạn subject theo môn của Teacher (giáo viên có thể viết bài môn bất kỳ — SRS không ràng buộc; Moderator chỉ kiểm duyệt theo môn).
- Map: UC Create Blog Post, BR-20; rate-limit chuẩn 60/phút (SEC-07).

### 4. `PATCH /api/blog-posts/{id}` — Sửa bài của mình
```
body: { title?, content?, subject? }       // partial; title <= 255 chars after trim when supplied
→ 200  BlogPostDetailDto
→ 400  title rỗng/quá 255 ký tự / content rỗng sau sanitize / subject không hợp lệ
→ 403  không phải tác giả (BR-16)
→ 404  không tồn tại / không PUBLISHED
```
- Owner-only: `post.authorId == currentUserId`, sai → 403.
- `content` sửa cũng đi qua sanitize. Cập nhật `updatedAt`.
- Map: UC Edit Own Blog Post, BR-16.

### 5. `DELETE /api/blog-posts/{id}` — Xóa bài của mình
```
→ 204 No Content
→ 403  không phải tác giả (BR-16)
→ 404  không tồn tại / không PUBLISHED
```
- Soft-delete: `status = DELETED_BY_AUTHOR`; ẩn khỏi list/detail. Bình luận đi kèm ẩn theo.
- Map: UC Delete Own Blog Post, BR-16.

### 6. `POST /api/blog-posts/{id}/removal` — Moderator gỡ bài vi phạm
```
body: { reason }                           // bắt buộc, không rỗng
→ 204 No Content
→ 400  thiếu reason
→ 403  role ≠ MODERATOR, hoặc post.subject ≠ subject của Moderator (BR-21)
→ 404  không tồn tại / không PUBLISHED
```
- Gate BR-21: chỉ gỡ khi `post.subject == moderator.subject` (đọc từ `AccessTokenClaims.subject()`), khác môn → **403**.
- Soft-delete: `status = REMOVED_BY_MODERATOR`, lưu `removed_reason`, `removed_by = moderatorId`.
- (Follow-up) thông báo cho tác giả kèm lý do khi có hệ notification.
- Map: UC Remove Blog Post, BR-21.

### 7. `POST /api/blog-posts/{id}/comments` — Bình luận
```
body: { content }                          // text thuần / rich-text ngắn
→ 201  BlogCommentDto
→ 400  content rỗng
→ 404  bài không tồn tại / không PUBLISHED
```
- `authorId` = user hiện tại. Bình luận là kênh tự điều tiết cộng đồng (BR-22).
- Map: UC Create Blog Comment, BR-22.

### 8. `PATCH /api/blog-comments/{commentId}` — Sửa bình luận của mình
```
body: { content }
→ 200  BlogCommentDto
→ 400  content rỗng
→ 403  không phải tác giả (BR-16)
→ 404  không tồn tại
```
- Map: UC Edit Own Blog Comment, BR-16.

### 9. `DELETE /api/blog-comments/{commentId}` — Xóa bình luận của mình
```
→ 204 No Content
→ 403  không phải tác giả (BR-16)
→ 404  không tồn tại
```
- Xóa cứng (comment không cần audit như bài). Map: UC Delete Own Blog Comment, BR-16.

---

## Cross-cutting riêng (xử lý ở service)

- **RBAC**: `@PreAuthorize("hasRole('TEACHER')")` cho #3/4/5/7/8/9; `@PreAuthorize("hasRole('MODERATOR')")` cho #6; #1/#2 chỉ `authenticated()`.
- **Owner-only** (BR-16) và **Moderator subject-match** (BR-21): check trong **service** (không nhét vào annotation vì cần so dữ liệu bản ghi).
- **Sanitize HTML** (Jsoup): áp cho `content` bài (#3/#4) trước khi lưu — chống XSS.
- **Rate-limit** (SEC-07): dùng bucket chuẩn 60 req/phút/user (blog không có endpoint AI).
- **Auth/JWT filter, CORS**: theo `api-chung.md`.

## Phụ thuộc & thứ tự làm

1. Flyway `V3__create_blog.sql` (`blog_posts`, `blog_comments`) — xem [`../blog/blog-flow.md`](../blog/blog-flow.md) §3.
2. Domain (`BlogPost`, `BlogComment`, `BlogPostStatus`) + repository interfaces + JPA entity/adapter (pattern `AppUser`).
3. `BlogPostService` / `BlogCommentService` (owner-check, subject-match, sanitize) + `BlogController` + DTO.
4. Seed 2 tài khoản tạm (1 TEACHER + 1 MODERATOR cùng môn) để test — vì chưa có API cấp tài khoản.
5. (Follow-up) notification khi gỡ bài/comment; FE các màn Blog theo ma trận 1.4.2.

## Điểm mở cần chốt sau
- Thông báo (notification) cho tác giả khi bị gỡ bài / có bình luận mới — chờ hệ notification.
- Report/flag bài bởi cộng đồng (SRS hiện chỉ để Moderator tự phát hiện).
- Có cho Teacher đọc + comment bài **khác môn** không (mặc định: có, khớp "đọc bài của giáo viên khác").
