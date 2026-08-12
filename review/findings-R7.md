# R7 — Blog & bình luận

Quét ngày 2026-08-12 trên `main`, đọc tay.

Phạm vi: `be/.../service/blog/`, `BlogController`, các repository/entity/migration blog liên quan,
`fe/components/blog/`, `fe/app/blog/moderation/`.

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R7-01 | `BlogCommentService.java:107` | Xóa comment cha có reply trả 500 do vi phạm khóa ngoại | **Cao** | Đã sửa |
| R7-02 | `service/blog/` (cả package) | Đổi trạng thái không có transaction bao trọn use case hoặc optimistic lock | **Cao** | Sửa |
| R7-03 | `BlogCommunityPage.tsx:228` | Response chi tiết cũ có thể ghi đè bài mới → thao tác nhầm bài | **Cao** | Đã sửa |
| R7-04 | `BlogPostService.java:81` | Xóa mềm bài để lại toàn bộ comment không thể truy cập trong DB | TB | Sửa |
| R7-05 | `BlogCommentService.java:115` | Ẩn comment không thông báo cho tác giả | TB | Sửa |
| R7-06 | `BlogPostService.java:121`, `JpaBlogPostRepository.java:78` | Phân trang không clamp/validate → tham số xấu thành 500 hoặc query quá lớn | TB | Sửa |
| R7-07 | `BlogCommunityPage.tsx:276` | Gửi comment không khóa nút khi request đang chạy → tạo comment trùng | TB | Đã sửa |
| R7-08 | `BlogCommunityPage.tsx:296` | Sửa comment làm mất toàn bộ HTML/định dạng đã lưu | Thấp | Sửa |
| R7-09 | `BlogContentSanitizer.java:15` | `thumbnailUrl` và ảnh trong nội dung cho phép URL ngoài hệ thống không được kiểm soát | Thấp | Cần quyết định |

---

## R7-01 — Xóa comment cha có reply trả 500 do vi phạm khóa ngoại **[Cao]**

`BlogCommentService.delete():107-112` hard-delete thẳng comment. Nhưng migration
`V32__add_blog_comment_replies.sql:2` tạo `parent_comment_id UUID REFERENCES blog_comments (id)`
với hành vi mặc định `ON DELETE NO ACTION`.

**Kịch bản lỗi:** A đăng comment; B trả lời; A bấm Xóa. `deleteById()` bị PostgreSQL từ chối vì
reply của B còn trỏ tới comment của A. Exception persistence không được đổi thành lỗi nghiệp vụ nên
FE nhận 500; A không thể xóa comment của chính mình.

**Sửa:** chọn luật rõ ràng: soft-delete comment cha và giữ placeholder để còn cây reply, hoặc đặt
`ON DELETE SET NULL` rồi đưa reply thành comment gốc. Không dùng cascade delete vì sẽ xóa nội dung của B.

## R7-02 — Đổi trạng thái không có transaction bao trọn use case hoặc optimistic lock **[Cao]**

`BlogPostService` và `BlogCommentService` không có `@Transactional` ở các method mutating; transaction
chỉ bao từng lệnh repository. Entity `BlogPostEntity`/`BlogCommentEntity` cũng không có `@Version`.

**Kịch bản lỗi A:** tác giả xóa bài đúng lúc moderator gỡ bài. Cả hai đọc `PUBLISHED`, cả hai save,
và lần save sau cùng quyết định trạng thái. Có thể DB là `DELETED_BY_AUTHOR` nhưng audit log và
notification lại nói moderator đã gỡ bài.

**Kịch bản lỗi B:** moderator gửi `reason` dài hơn 1.000 ký tự. Save bài đã chạy trước;
`activityLogService.record()` có cột `metadata` dài 1.000, và notification cũng giới hạn nội dung
2.000. Side effect lỗi sau save làm request thất bại dù bài đã bị gỡ; không có rollback tổng thể.

Tương tự, hai thao tác hide/update/delete comment cùng lúc có thể ghi đè lẫn nhau.

**Sửa:** đặt `@Transactional` ở service cho từng use case mutating; validate toàn bộ input trước khi
ghi; thêm `@Version` và map version qua domain/repository, rồi trả 409 cho xung đột cạnh tranh. WebSocket
notification cần publish sau commit.

## R7-03 — Response chi tiết cũ có thể ghi đè bài mới → thao tác nhầm bài **[Cao]**

`BlogCommunityPage.loadDetail():228-236` không hủy hay đánh số request. Khi `postId` đổi,
`useEffect():238-245` bắt đầu request mới nhưng vẫn giữ `detail` cũ. Response cũ về sau cùng sẽ gọi
`setDetail()` dù URL đã trỏ bài khác.

**Kịch bản lỗi:** người dùng mở bài A, lập tức mở bài B; request B về trước rồi A về sau. Trang
`/blog/B` hiển thị nội dung A. Bấm gửi comment/xóa/sửa dùng `detail.id` (A) tại `:279`, `:289`,
`:309`, nên thao tác lên A khi người dùng tin rằng đang ở B.

`fe/app/blog/moderation/page.tsx:65-81` có cùng race, nên moderator có thể mở và gỡ nhầm bài.

**Sửa:** clear detail khi ID thay đổi, dùng `AbortController` hoặc request sequence guard và chỉ nhận
response nếu ID hiện tại còn khớp; disable action khi đang tải detail.

## R7-04 — Xóa mềm bài để lại toàn bộ comment không thể truy cập trong DB **[TB]**

`BlogPostService.delete():81-89` chỉ đổi status bài. Các comment vẫn tồn tại vì migration V3 tạo
foreign key `blog_comments.post_id`, không phải cascade/soft-hide. Đây trái với API design
`blog.md:94` (“Bình luận đi kèm ẩn theo”). Chúng không còn xuất hiện qua API, nhưng không có cleanup,
audit view hay đường quản trị để xem/xử lý.

**Sửa:** xác định retention policy và thực hiện nó nguyên tử: cascade soft-hide comment khi bài bị
xóa/gỡ, hoặc giữ chúng trong một view/audit workflow có chủ đích.

## R7-05 — Ẩn comment không thông báo cho tác giả **[TB]**

`hideByPostAuthor():115-129` đổi `hiddenAt` và `hiddenBy` rồi kết thúc. Khác với comment mới
(`create():62`) và gỡ bài bởi moderator (`BlogPostService:111-112`), tác giả comment không nhận
lý do hay notification.

**Kịch bản lỗi:** chủ bài ẩn nhầm comment của giáo viên khác. Comment biến mất khỏi mọi API vì
`requireComment():141-143` trả 404, tác giả không biết nguyên nhân và cũng không thể tự xóa/sửa.

**Sửa:** gửi notification sau commit, tối thiểu báo comment đã bị ẩn và dẫn tới bài liên quan.

## R7-06 — Phân trang không clamp/validate **[TB]**

`BlogPostService.list():121-135` chuyển thẳng `page`/`size` vào `PageRequest.of()` tại
`JpaBlogPostRepository:78`. `page < 0` hoặc `size <= 0` ném `IllegalArgumentException` thành 500;
`size` rất lớn cho phép một request kéo toàn bộ bài và các batch lookup liên quan. Response cũng echo
tham số thô.

**Sửa:** validate hoặc clamp ở service (ví dụ `page >= 0`, `1 <= size <= 100`) và trả 400 với input
không hợp lệ; response phải phản ánh giá trị thực sự dùng để query.

## R7-07 — Gửi comment không khóa nút khi request đang chạy **[TB]**

`addComment():276-285` không có state `isSubmitting`; nút gửi `:476-483` và Enter đều tiếp tục gọi
hàm trong khi request đầu chưa xong.

**Kịch bản lỗi:** người dùng double-click hoặc nhấn Enter rồi click biểu tượng gửi. Hai POST độc lập
đều qua backend và tạo hai comment giống hệt nhau, đồng thời phát notification trùng cho chủ bài.

**Sửa:** thêm pending state, disable nút/input và bỏ qua lời gọi tiếp theo cho đến khi request hiện tại
hoàn tất. Server cũng nên cân nhắc idempotency key nếu đây là luồng quan trọng.

## R7-08 — Sửa comment làm mất toàn bộ HTML/định dạng đã lưu **[Thấp]**

`startEditComment():296-299` đưa `c.content.replace(/<[^>]*>/g, "")` vào input. API/sanitizer cho
phép rich-text ngắn, nên bất cứ chỉnh sửa nào đều gửi lại plain text và hủy link, formula, ảnh hoặc
cấu trúc bảng mà comment đã có.

**Sửa:** nếu comment chủ trương plain text thì enforce/sanitize thành plain text ngay từ create; nếu
rich-text được hỗ trợ thì dùng editor phù hợp để edit và giữ HTML.

## R7-09 — URL ảnh ngoài hệ thống không được kiểm soát **[Thấp, cần quyết định]**

`cleanUrl():184-193` chỉ trim/giới hạn độ dài thumbnail; sanitizer cũng allow `http`, `https` và
`data` cho `img` (`BlogContentSanitizer:25-26`). FE render trực tiếp các URL này qua `<img>`.

Đây không phải XSS trực tiếp nhờ Jsoup/React, nhưng bài viết có thể chứa tracking pixel, ảnh cực lớn
hoặc link ngoài sẽ tồn tại lâu trong nội dung EDUA. Quyết định trước khi sửa: chỉ cho URL R2/public
asset của EDUA, hay chấp nhận external image và bổ sung proxy/CSP/referrer policy.

## Kiểm tra nhưng không có vấn đề

- Owner-only cho sửa/xóa bài và comment được kiểm ở service, không chỉ dựa vào controller.
- Moderator gỡ bài có kiểm subject-match ở service.
- `parentCommentId` được xác nhận cùng bài và chỉ cho phép một cấp reply.
- HTML bài và comment đều qua Jsoup sanitizer trước khi lưu.
- Tác giả bài đã được thông báo khi moderator gỡ bài; người nhận comment/reply cũng được deduplicate.
