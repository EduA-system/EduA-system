# Phần II. Software Design Document — 2. Detailed Design

## Danh mục chức năng Backend

Mỗi mục dưới đây là một **nhóm chức năng độc lập** để viết Detailed Design. Các endpoint được đặt chung một FN chỉ khi chúng là các bước/biến thể của chính luồng đó; không gộp các mảng nghiệp vụ khác nhau.

- Nguồn đối chiếu: `be/src/main/java/com/edua/beeduasystem/presentation/controller`.
- `Khách`: không cần đăng nhập; `Đăng nhập`: cần access token. Quyền sở hữu/cùng môn được kiểm tra tại service.

### 2.1. Xác thực và hồ sơ người dùng

| Mã FN      | Chức năng                                                                                           | Actor             | API                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| FN-AUTH-01 | Quản lý phiên Google OAuth2/JWT: đăng nhập, refresh-token rotation, đăng xuất và lấy user hiện tại. | Khách / Đăng nhập | `POST /api/auth/google` `POST /api/auth/refresh` `POST /api/auth/logout` `GET /api/auth/me` |
| FN-USER-01 | Cập nhật tên, avatar, liên hệ, giới thiệu và số điện thoại của hồ sơ cá nhân.                       | Đăng nhập         | `PATCH /api/users/me`                                                                       |

### 2.2. Quản trị Moderator và IT Staff

| Mã FN      | Chức năng                                                                           | Actor     | API                                                                                |
| ---------- | ----------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| FN-PRIN-01 | Tra cứu danh sách Moderator.                                                        | PRINCIPAL | `GET /api/principal/moderators`                                                    |
| FN-PRIN-02 | Cấp hoặc kích hoạt lại quyền Moderator theo email/môn học.                          | PRINCIPAL | `POST /api/principal/moderators` `PATCH /api/principal/moderators/{id}/reactivate` |
| FN-PRIN-03 | Thay Moderator bằng người kế nhiệm cùng môn; hạ quyền/vô hiệu hóa người cũ khi cần. | PRINCIPAL | `POST /api/principal/moderators/{id}/replacement`                                  |
| FN-PRIN-04 | Thu hồi Moderator sau khi đã thay thế.                                              | PRINCIPAL | `DELETE /api/principal/moderators/{id}`                                            |
| FN-PRIN-05 | Tra cứu danh sách IT Staff.                                                         | PRINCIPAL | `GET /api/principal/it-staff`                                                      |
| FN-PRIN-06 | Cấp hoặc kích hoạt lại tài khoản IT Staff.                                          | PRINCIPAL | `POST /api/principal/it-staff` `PATCH /api/principal/it-staff/{id}/reactivate`     |
| FN-PRIN-07 | Vô hiệu hóa IT Staff.                                                               | PRINCIPAL | `DELETE /api/principal/it-staff/{id}`                                              |
| FN-IT-01   | Xem và cập nhật system prompt AI.                                                   | IT_STAFF  | `GET /api/it-staff/system-prompts` `PUT /api/it-staff/system-prompts/{key}`        |
| FN-IT-02   | Xem/lọc audit log.                                                                  | IT_STAFF  | `GET /api/it-staff/activity-log`                                                   |

### 2.3. Quản lý Teacher

| Mã FN     | Chức năng                                             | Actor     | API                                                                            |
| --------- | ----------------------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| FN-MOD-01 | Tra cứu Teacher thuộc môn của Moderator.              | MODERATOR | `GET /api/moderator/teachers`                                                  |
| FN-MOD-02 | Cấp hoặc kích hoạt lại tài khoản Teacher cùng môn.    | MODERATOR | `POST /api/moderator/teachers` `PATCH /api/moderator/teachers/{id}/reactivate` |
| FN-MOD-03 | Thu hồi Teacher (soft-delete, trạng thái `DISABLED`). | MODERATOR | `DELETE /api/moderator/teachers/{id}`                                          |

### 2.4. Upload tệp

| Mã FN        | Chức năng                                                                  | Actor     | API                 |
| ------------ | -------------------------------------------------------------------------- | --------- | ------------------- |
| FN-UPLOAD-01 | Upload tệp tham chiếu lên Cloudflare R2; kiểm định dạng và giới hạn 10 MB. | Đăng nhập | `POST /api/uploads` |

### 2.5. Sinh giáo án 5512

| Mã FN        | Chức năng                                                                                                                           | Actor              | API                                                                                                                                                                             |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FN-TEXT-01   | Chọn phạm vi SGK (sách → chương → bài) làm dữ liệu đầu vào để sinh giáo án; hỗ trợ truy vấn đầy đủ và dữ liệu rút gọn cho dropdown. | TEACHER, MODERATOR | `GET /api/textbooks` `GET /api/textbooks/names` `GET /api/textbooks/{bookCode}/chapters` `GET /api/textbooks/{bookCode}/chapters/{chapterCode}/lessons`                         |
| FN-LESSON-01 | Sinh từng phần giáo án bằng AI: Mục tiêu, Học liệu, khung Tiến trình và chi tiết hoạt động từ ngữ cảnh SGK.                         | TEACHER, MODERATOR | `POST /api/lesson-plans/generate` `POST /api/lesson-plans/generate-materials` `POST /api/lesson-plans/generate-activities` `POST /api/lesson-plans/generate-activities-details` |
| FN-LESSON-02 | Sinh giáo án bất đồng bộ và nhận tiến độ/kết quả theo phiên STOMP.                                                                  | TEACHER, MODERATOR | `POST /api/lesson-plans/generate-stream` STOMP `/topic/lesson-plan/{sessionId}`                                                                                                 |

### 2.6. Sinh slide

| Mã FN       | Chức năng                                                                                       | Actor              | API                                                                                                                                                                                                                                                             |
| ----------- | ----------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FN-SLIDE-01 | Sinh outline slide từ giáo án; bắt đầu phiên, thử lại part/slide lỗi và nhận tiến độ qua STOMP. | TEACHER, MODERATOR | `POST /api/slides/generate-outline` `POST /api/slides/outline-sessions/{sessionId}/start` `POST /api/slides/retry-outline-session-part` `POST /api/slides/retry-outline-session-slide` `POST /api/slides/retry-outline-part` STOMP `/topic/outline/{sessionId}` |
| FN-SLIDE-02 | Sinh thiết kế HTML cho slide và điền nội dung vào thiết kế.                                     | TEACHER, MODERATOR | `POST /api/slide-design/generate-html` `POST /api/slide-design/fill-content`                                                                                                                                                                                    |

### 2.7. Tạo đề luyện tập bằng AI

| Mã FN         | Chức năng                                                                                                            | Actor              | API                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------- |
| FN-EXAM-AI-01 | Kiểm tra cấu hình tạo đề: phạm vi bài học, thời lượng, độ khó, tổng điểm và số lượng/loại câu hỏi trước khi sinh đề. | TEACHER, MODERATOR | `POST /api/practice-exams/validate-configuration` |
| FN-EXAM-AI-02 | Sinh đề luyện tập bằng AI theo cấu hình đã được kiểm tra; tạo câu hỏi theo từng lô và trả về đề hoàn chỉnh.          | TEACHER, MODERATOR | `POST /api/practice-exams/generate`               |

### 2.8. Dựng cấu trúc phân tử

| Mã FN          | Chức năng                                                    | Actor     | API                         |
| -------------- | ------------------------------------------------------------ | --------- | --------------------------- |
| FN-MOLECULE-01 | Dựng cấu trúc phân tử từ đầu vào, trả nguyên tử và liên kết. | Đăng nhập | `POST /api/molecules/build` |

### 2.9. Quản lý lớp học

| Mã FN       | Chức năng                                                 | Actor                              | API                                                                      |
| ----------- | --------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| FN-CLASS-01 | Tra cứu lớp sở hữu hoặc lớp học sinh đã tham gia.         | TEACHER, MODERATOR, Thành viên lớp | `GET /api/classes` `GET /api/classes/enrolled`                           |
| FN-CLASS-02 | Tạo lớp học mới.                                          | TEACHER, MODERATOR                 | `POST /api/classes`                                                      |
| FN-CLASS-03 | Xem chi tiết Class Hub.                                   | Thành viên/chủ lớp                 | `GET /api/classes/{id}`                                                  |
| FN-CLASS-04 | Cập nhật thông tin và trạng thái Active/Inactive của lớp. | Chủ lớp                            | `PATCH /api/classes/{id}` `PATCH /api/classes/{id}/status`               |
| FN-CLASS-05 | Xem danh sách thành viên lớp.                             | Chủ lớp                            | `GET /api/classes/{id}/members`                                          |
| FN-CLASS-06 | Thêm học sinh bằng Gmail hoặc import CSV/XLSX.            | Chủ lớp                            | `POST /api/classes/{id}/members` `POST /api/classes/{id}/members/import` |

### 2.10. Tài nguyên và bài nộp trong lớp

| Mã FN       | Chức năng                                       | Actor              | API                                                                                                                                                                               |
| ----------- | ----------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FN-CLASS-07 | Xem tài nguyên/bài tập đã công bố trong lớp.    | Thành viên lớp     | `GET /api/classes/{id}/resources`                                                                                                                                                 |
| FN-CLASS-08 | Đăng tài nguyên/bài tập vào lớp.                | Chủ lớp            | `POST /api/classes/{id}/resources`                                                                                                                                                |
| FN-CLASS-09 | Chỉnh sửa hoặc xóa tài nguyên/bài tập.          | Chủ lớp            | `PATCH /api/classes/{id}/resources/{resourceId}` `DELETE /api/classes/{id}/resources/{resourceId}`                                                                                |
| FN-CLASS-10 | Nộp, xem lại và thu hồi bài nộp của bản thân.   | Học sinh trong lớp | `POST /api/classes/{id}/resources/{resourceId}/submission` `GET /api/classes/{id}/resources/{resourceId}/submission` `DELETE /api/classes/{id}/resources/{resourceId}/submission` |
| FN-CLASS-11 | Xem danh sách và chi tiết bài nộp của học sinh. | Chủ lớp            | `GET /api/classes/{id}/resources/{resourceId}/submissions` `GET /api/classes/{id}/resources/{resourceId}/submissions/{studentId}`                                                 |

### 2.11. Thư viện nội dung

| Mã FN     | Chức năng                                   | Actor              | API                                                                                         |
| --------- | ------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| FN-LIB-01 | Tra cứu và xem chi tiết nội dung thư viện.  | TEACHER, MODERATOR | `GET /api/library/contents` `GET /api/library/contents/{id}`                                |
| FN-LIB-02 | Tạo nội dung thư viện.                      | TEACHER, MODERATOR | `POST /api/library/contents`                                                                |
| FN-LIB-03 | Cập nhật hoặc xóa nội dung của mình.        | Chủ sở hữu         | `PATCH /api/library/contents/{id}` `DELETE /api/library/contents/{id}`                      |
| FN-LIB-04 | Gửi/rút nội dung khỏi quy trình kiểm duyệt. | Chủ sở hữu         | `POST /api/library/contents/{id}/submission` `DELETE /api/library/contents/{id}/submission` |
| FN-LIB-05 | Xem hàng đợi kiểm duyệt.                    | MODERATOR          | `GET /api/library/contents/moderation-queue`                                                |
| FN-LIB-06 | Duyệt hoặc từ chối nội dung thư viện.       | MODERATOR          | `POST /api/library/contents/{id}/approval` `POST /api/library/contents/{id}/rejection`      |

### 2.12. Community Hub

| Mã FN     | Chức năng                                                | Actor              | API                                                                                                                 |
| --------- | -------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| FN-HUB-01 | Xem feed và chi tiết nội dung Hub đã duyệt.              | TEACHER, MODERATOR | `GET /api/hub/contents` `GET /api/hub/contents/{id}`                                                                |
| FN-HUB-02 | Tùy biến/sao chép nội dung Hub về thư viện Teacher.      | TEACHER            | `POST /api/hub/contents/{id}/customize`                                                                             |
| FN-HUB-03 | Quản lý bình luận Hub: tạo, sửa, xóa bình luận của mình. | TEACHER, MODERATOR | `POST /api/hub/contents/{id}/comments` `PATCH /api/hub/comments/{commentId}` `DELETE /api/hub/comments/{commentId}` |
| FN-HUB-04 | Báo cáo nội dung Hub vi phạm.                            | TEACHER, MODERATOR | `POST /api/hub/contents/{id}/reports`                                                                               |

### 2.13. Blog cộng đồng

| Mã FN      | Chức năng                                                 | Actor              | API                                                                                                                 |
| ---------- | --------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| FN-BLOG-01 | Tra cứu blog đã xuất bản và xem chi tiết kèm bình luận.   | TEACHER, MODERATOR | `GET /api/blog-posts` `GET /api/blog-posts/{id}`                                                                    |
| FN-BLOG-02 | Tạo và xuất bản bài blog.                                 | TEACHER, MODERATOR | `POST /api/blog-posts`                                                                                              |
| FN-BLOG-03 | Sửa hoặc xóa mềm bài blog của mình.                       | Chủ sở hữu         | `PATCH /api/blog-posts/{id}` `DELETE /api/blog-posts/{id}`                                                          |
| FN-BLOG-04 | Moderator gỡ bài blog vi phạm và ghi lý do.               | MODERATOR          | `POST /api/blog-posts/{id}/removal`                                                                                 |
| FN-BLOG-05 | Quản lý bình luận blog: tạo, sửa, xóa bình luận của mình. | TEACHER, MODERATOR | `POST /api/blog-posts/{id}/comments` `PATCH /api/blog-comments/{commentId}` `DELETE /api/blog-comments/{commentId}` |

### 2.14. Giáo án theo tuần

| Mã FN       | Chức năng                                                     | Actor              | API                                                                                 |
| ----------- | ------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------- |
| FN-WTASK-01 | Xem lịch và chi tiết yêu cầu giáo án theo tuần.               | TEACHER, MODERATOR | `GET /api/weekly-tasks` `GET /api/weekly-tasks/{id}`                                |
| FN-WTASK-02 | Giao một hoặc hàng loạt yêu cầu giáo án cho Teacher cùng môn. | MODERATOR          | `POST /api/weekly-tasks` `POST /api/weekly-tasks/bulk`                              |
| FN-WTASK-03 | Cập nhật yêu cầu giáo án trước hạn nộp.                       | MODERATOR          | `PATCH /api/weekly-tasks/{id}`                                                      |
| FN-WTASK-04 | Nộp hoặc rút giáo án đã nộp.                                  | TEACHER            | `POST /api/weekly-tasks/{id}/submission` `DELETE /api/weekly-tasks/{id}/submission` |
| FN-WTASK-05 | Xem hàng đợi giáo án cần duyệt.                               | MODERATOR          | `GET /api/weekly-tasks/moderation-queue`                                            |
| FN-WTASK-06 | Duyệt hoặc từ chối giáo án.                                   | MODERATOR          | `POST /api/weekly-tasks/{id}/approval` `POST /api/weekly-tasks/{id}/rejection`      |

### 2.15. Thông báo

| Mã FN      | Chức năng                                              | Actor     | API / kênh                                                                                                                             |
| ---------- | ------------------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| FN-NOTI-01 | Moderator gửi thông báo cho Teacher cùng môn.          | MODERATOR | `POST /api/notifications`                                                                                                              |
| FN-NOTI-02 | Quản lý inbox: xem/lọc, đếm chưa đọc, đánh dấu đã đọc. | Đăng nhập | `GET /api/notifications` `GET /api/notifications/unread-count` `PATCH /api/notifications/{id}/read` `POST /api/notifications/read-all` |
| FN-NOTI-03 | Nhận thông báo realtime riêng theo người dùng.         | Đăng nhập | STOMP `/user/queue/notifications`                                                                                                      |

### 2.16. Vận hành hệ thống

| Mã FN     | Chức năng                                  | Actor | API               |
| --------- | ------------------------------------------ | ----- | ----------------- |
| FN-SYS-01 | Kiểm tra tình trạng hoạt động của backend. | Khách | `GET /api/health` |

### 3. Mẫu viết Detailed Design

Với mỗi FN: **mục đích → actor/quyền → API & DTO → tiền điều kiện → luồng chính → validation/luật nghiệp vụ → dữ liệu tác động → ngoại lệ/mã HTTP → realtime (nếu có)**.
