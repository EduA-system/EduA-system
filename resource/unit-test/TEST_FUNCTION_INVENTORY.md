# Backend API Unit Test Inventory

Chỉ dùng cho backend API. Không gồm FE.

`Precondition` = trạng thái trước khi chạy test, bao gồm luôn dữ liệu giả lập/mock return nếu có.

## Cột nên có trong Excel

`ID | Sheet/Tab | API | Loại | Input | Precondition | Expected`

## Danh sách chức năng core đại diện cho tài liệu test

Mục này chốt bộ sheet/tab đại diện khi tài liệu Unit Test cần đủ 30 chức năng. Vì bạn muốn bỏ nhóm AI, bộ dưới đây chỉ chọn các chức năng non-AI: CRUD, role/permission, read/list, moderation, Class Hub, Community Hub, và Weekly Schedule.

Khuyến nghị dùng bộ **30 chức năng core non-AI** dưới đây làm đại diện chính.

| Priority | Sheet/Tab | Nhóm nghiệp vụ | LOCS priority | Lý do chọn làm core representative |
| -------- | --------- | -------------- | ------------- | ---------------------------------- |
| 1 | `loginWithGoogle` | Auth | High | Luồng đăng nhập đầu vào, có verify token, allowlist và cấp role cho user. |
| 2 | `refresh` | Auth/session | High | Luồng xoay refresh token, có revoke/expired/null và cập nhật cookie. |
| 3 | `updateCurrentUserProfile` | Profile CRUD | Medium-High | Update hồ sơ cá nhân, có validate avatarUrl và giữ dữ liệu hiện tại. |
| 4 | `listModerators` | Admin read/list | Medium | Core admin listing, có phân trang và phụ thuộc quyền admin. |
| 5 | `addModerator` | Admin CRUD | High | Thêm moderator theo subject, có duplicate email và subject conflict. |
| 6 | `replaceModerator` | Admin workflow | High | Nghiệp vụ thay thế moderator cũ, nhiều rule về email, subject, disablePrevious. |
| 7 | `addTeacher` | Moderator CRUD | High | Thêm teacher theo subject, có rule về email và subject hợp lệ. |
| 8 | `deleteTeacher` | Moderator CRUD | High | Disable teacher theo subject, có role/status/subject check. |
| 9 | `createBlogPost` | Blog CRUD | Medium-High | Tạo bài viết có sanitize HTML, validate title/content/subject và publish trực tiếp. |
| 10 | `updateBlogPost` | Blog CRUD | Medium-High | Update bài owner-only, có optional fields và preserve dữ liệu cũ. |
| 11 | `deleteBlogPost` | Blog CRUD | Medium | Soft delete bài viết, kiểm tra ownership và trạng thái `PUBLISHED`. |
| 12 | `removeBlogPostByModerator` | Blog moderation | Medium-High | Gỡ bài theo môn của moderator, bắt buộc reason và lưu audit. |
| 13 | `listClasses` | Class Management read/list | Medium | Teacher xem danh sách lớp mình sở hữu, có filter/search/status và phân trang. |
| 14 | `createClass` | Class Management CRUD | High | Teacher tạo lớp mới, validate name/subject/grade và gán owner mặc định. |
| 15 | `getClassDetail` | Class Hub read/detail | High | Teacher owner hoặc Student đã enrolled xem Class Hub, kiểm tra quyền truy cập. |
| 16 | `updateClass` | Class Management CRUD | Medium-High | Teacher owner sửa thông tin lớp khi lớp còn `ACTIVE`, chặn user không phải owner. |
| 17 | `updateClassStatus` | Class Management workflow | Medium-High | Teacher owner chuyển `ACTIVE/INACTIVE`, kiểm tra soft-delete/read-only rule. |
| 18 | `addClassMember` | Class membership | High | Teacher owner thêm Student bằng email, kiểm tra role STUDENT, duplicate và lớp active. |
| 19 | `listHubContents` | Community Hub read/list | Medium | Guest/all users xem feed content `APPROVED`, có filter type/subject/q và phân trang. |
| 20 | `getHubContentDetail` | Community Hub read/detail | Medium | Xem chi tiết content approved kèm comment, hỗ trợ guest preview. |
| 21 | `customizeHubContent` | Community Hub reuse | Medium-High | Teacher/Moderator copy content approved về thư viện cá nhân, kiểm tra quyền authenticated. |
| 22 | `createHubComment` | Community Hub comment | Medium | User đăng nhập bình luận trên content approved, có sanitize và parent comment. |
| 23 | `reportHubContent` | Community Hub report | Medium | User đăng nhập báo cáo content vi phạm, bắt buộc reason và lưu report. |
| 24 | `hideHubComment` | Community Hub moderation | Medium-High | Owner nội dung hoặc Moderator ẩn comment, kiểm tra quyền và cascade reply nếu có. |
| 25 | `listWeeklyTasks` | Weekly Schedule read/list | High | Teacher xem task của mình, Moderator xem task cùng subject/grade trong khoảng ngày. |
| 26 | `bulkCreateWeeklyTasks` | Weekly Schedule assignment | High | Moderator giao bài theo tuần cho toàn bộ Teacher active cùng subject/grade, giới hạn 2 bài/tuần. |
| 27 | `updateWeeklyTask` | Weekly Schedule assignment | Medium-High | Moderator sửa task còn hạn, validate chapter/lesson và chặn khác subject. |
| 28 | `submitWeeklyTask` | Weekly Schedule submission | High | Teacher được giao nộp giáo án từ library hoặc upload, bắt buộc đúng 1 nguồn. |
| 29 | `listWeeklyTaskModerationQueue` | Weekly Schedule moderation | High | Moderator xem hàng đợi `SUBMITTED` cùng subject, có filter grade/chapter/lesson. |
| 30 | `approveWeeklyTask` / `rejectWeeklyTask` | Weekly Schedule review | High | Moderator cùng subject duyệt hoặc từ chối bài nộp, validate trạng thái và reason khi reject. |

Các sheet non-AI bổ sung nên làm nếu muốn mở rộng coverage:

| Sheet/Tab | Nhóm nghiệp vụ | LOCS priority | Lý do bổ sung |
| --------- | -------------- | ------------- | ------------ |
| `createBlogComment` | Blog comment CRUD | Medium | Bình luận trên bài publish, có sanitize và owner/current-user rule. |
| `updateBlogComment` | Blog comment CRUD | Medium | Sửa comment của chính mình, có owner-only check và sanitize. |
| `deleteBlogComment` | Blog comment CRUD | Medium | Xóa comment của chính mình, kiểm tra ownership. |
| `listBlogPosts` | Blog read/list | Medium | Danh sách bài viết có filter subject/author/q và mapping summary. |
| `getBlogPostDetail` | Blog read/detail | Medium | Chi tiết bài + comments, kiểm tra bài published. |
| `listLibraryContents` | Library read/list | Medium | Danh sách học liệu theo owner và filter. |
| `getLibraryContent` | Library read/detail | Medium | Xem chi tiết học liệu owner-only. |
| `createLibraryContent` | Library CRUD | Medium-High | Tạo học liệu cá nhân, validate type/title/subject/grade/payload. |
| `updateLibraryContent` | Library CRUD | Medium-High | Update học liệu owner-only với nhiều field optional/provided flags. |
| `deleteLibraryContent` | Library CRUD | Medium | Soft delete học liệu owner-only bằng `deletedAt`. |
| `getCatalog` | Textbook read | Medium | Lấy catalog SGK đầy đủ cho các màn tra cứu. |
| `getBookNames` | Textbook read/list | Medium | Lấy danh sách tên sách theo subject hoặc toàn bộ. |
| `getChapters` | Textbook read/list | Medium | Lấy chapter summaries theo bookCode. |
| `getLessons` | Textbook read/list | Medium | Lấy lesson summaries theo bookCode + chapterCode. |

## Bộ dữ liệu input thật cần xác nhận

Mục này dùng để ghi các giá trị input thật sẽ đưa vào Unit Test matrix trong Excel. Khi một tab cần dữ liệu cụ thể nhưng chưa có giá trị được chốt, dùng placeholder dạng `<ASK_USER_...>` và hỏi lại người dùng trước khi điền giá trị cuối cùng.

### Người dùng, email và full name

| Nhóm dữ liệu                        | Email                                | Full name        | Role/Subject                                   | Dùng cho tab/API                      | Ghi chú                                      |
| ----------------------------------- | ------------------------------------ | ---------------- | ---------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| Admin đang đăng nhập                | `vutuanhiep@edua.vn`                 | Vũ Tuấn Hiệp     | ADMINISTRATOR                                  | Admin APIs                            | Tài khoản thực hiện thao tác quản trị        |
| Moderator hiện tại                  | `vudinhdang@edua.vn`                 | Vũ Đình Đăng     | MODERATOR / `<ASK_USER_MODERATOR_SUBJECT>`     | Moderator APIs, blog moderation       | Moderator đã có trong hệ thống               |
| Moderator mới                       | `bachnguyentuan@edua.vn`             | Bách Nguyễn Tuấn | MODERATOR / `<ASK_USER_NEW_MODERATOR_SUBJECT>` | `addModerator`, `replaceModerator`    | Email chưa tồn tại hoặc đã disabled tùy case |
| Moderator thay thế                  | `nguyenhongnha@edua.vn`              | Nguyễn Hồng Nhạ  | MODERATOR / `<ASK_USER_REPLACEMENT_SUBJECT>`   | `replaceModerator`                    | Phải khác email moderator hiện tại           |
| Teacher hiện tại                    | `vunhatminh@edua.vn`                 | Vũ Nhật Minh     | TEACHER / `<ASK_USER_TEACHER_SUBJECT>`         | Teacher, Blog, Library APIs           | Teacher đã có trong hệ thống                 |
| Teacher mới                         | `vutuanhiep.teacher@edua.vn`         | Vũ Tuấn Hiệp     | TEACHER / `<ASK_USER_NEW_TEACHER_SUBJECT>`     | `addTeacher`, `reactivateTeacher`     | Email chưa tồn tại hoặc đã disabled tùy case |
| IT manager hiện tại                 | `vudinhdang.it@edua.vn`              | Vũ Đình Đăng     | IT_MANAGEMENT                                  | IT manager APIs                       | IT manager đã có trong hệ thống              |
| IT manager mới                      | `bachnguyentuan.it@edua.vn`          | Bách Nguyễn Tuấn | IT_MANAGEMENT                                  | `addItManager`, `reactivateItManager` | Email chưa tồn tại hoặc đã disabled tùy case |
| Google account hợp lệ               | `vunhatminh.google@edua.vn`          | Vũ Nhật Minh     | Theo user tương ứng                            | `loginWithGoogle`                     | Email verified và có trong allowlist         |
| Google account không được cấp quyền | `nguyenhongnha.unauthorized@edua.vn` | Nguyễn Hồng Nhạ  | N/A                                            | `loginWithGoogle`                     | Email verified nhưng không có user tương ứng |

### Giá trị input dùng chung

| Nhóm dữ liệu | Field                                      | Giá trị thật cần hỏi                                                                                                                                                                                             | Dùng cho tab/API                                        | Ghi chú                                            |
| ------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| Auth token   | `idToken` hợp lệ                           | `eyJhbGciOiJSUzI1NiIsImtpZCI6ImRlbW8ifQ.eyJlbWFpbCI6InZ1dHVhbmhpZXBAZWR1YS52biIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiVuG7iSBUdeG6oW4gSGnhu4dwIiwic3ViIjoiZGVtby1nb29nbGUtMTIzNDU2In0.signature`               | `loginWithGoogle`                                       | Có thể dùng token giả lập nếu test ở service-level |
| Auth token   | `idToken` không hợp lệ                     | `invalid.id.token`                                                                                                                                                                                               | `loginWithGoogle`                                       | Token sai, hết hạn hoặc verifier từ chối           |
| Auth token   | refresh token hợp lệ                       | `refresh_demo_7f3d2c8a9b1e4f6a`                                                                                                                                                                                  | `refresh`, `logout`                                     | Token tồn tại, chưa revoke, chưa hết hạn           |
| Auth token   | refresh token không tồn tại                | `refresh_unknown_0000000000000000`                                                                                                                                                                               | `refresh`, `logout`                                     | Token hash không có trong repo                     |
| Profile      | `avatarUrl` hợp lệ                         | `https://cdn.edua.vn/avatars/demo-user.png`                                                                                                                                                                      | `updateCurrentUserProfile`                              | URL http/https và có host                          |
| Profile      | `avatarUrl` không hợp lệ                   | `avatar-demo.png`                                                                                                                                                                                                | `updateCurrentUserProfile`                              | Sai scheme, thiếu host hoặc format lỗi             |
| Profile      | `contactInfo`                              | `Zalo: 0901 234 567                                                                                                                                                                                              | Email: [vutuanhiep@edua.vn](mailto:vutuanhiep@edua.vn)` | `updateCurrentUserProfile`                         |
| Subject      | subject hợp lệ                             | `MATH`                                                                                                                                                                                                           | Admin/Moderator/Blog/Library APIs                       | Ví dụ: `MATH`, `PHYSICS`, ... theo enum hiện có    |
| Subject      | subject sai/không khớp                     | `HISTORY`                                                                                                                                                                                                        | Moderator/Blog abnormal cases                           | Dùng cho case khác môn hoặc không có quyền         |
| Pagination   | `page`, `size`, `sort`                     | `page=0, size=20, sort=updatedAt,desc`                                                                                                                                                                           | List APIs                                               | Nếu không chốt riêng, dùng `page=0`, `size=20`     |
| Blog         | `title`                                    | `Luyen tap bai 1 - Ham so bac nhat`                                                                                                                                                                              | Blog APIs                                               | Tiêu đề bài viết thật                              |
| Blog         | `content` hợp lệ                           | `<p>Nội dung bài viết đã sanitize vẫn giữ được thẻ an toàn.</p>`                                                                                                                                                 | Blog APIs                                               | Nội dung sau sanitize vẫn hợp lệ                   |
| Blog         | `reason` gỡ bài                            | `Bài viết vi phạm quy định nội dung.`                                                                                                                                                                            | `removeBlogPostByModerator`                             | Lý do moderator gỡ bài                             |
| Library      | `type`, `title`, `payload`, `thumbnailUrl` | `type=SLIDE, title=Gioi thieu ham so, payload={"sections":[{"title":"Mo dau"}]}, thumbnailUrl=https://cdn.edua.vn/library/slide-demo.png`                                                                        | Library APIs                                            | Giá trị mẫu cho content thư viện                   |
| Upload       | file hợp lệ                                | `lesson-outline-demo.pdf`                                                                                                                                                                                        | `upload`                                                | File đúng loại và <= 10MB                          |
| Upload       | file không hợp lệ                          | `empty-file.txt`                                                                                                                                                                                                 | `upload`                                                | File rỗng, sai loại hoặc quá 10MB                  |
| AI           | request sinh giáo án/slide/design          | `{"bookId":"11111111-1111-1111-1111-111111111111","chapterId":"22222222-2222-2222-2222-222222222222","lessonId":"33333333-3333-3333-3333-333333333333","userPrompt":"Tạo nội dung ngắn gọn, dễ dạy, có ví dụ."}` | Lesson plan, Slides, Slide design APIs                  | Prompt, ids sách/chương/bài và context mẫu         |
| Molecule     | `input` hợp lệ                             | `H2O`                                                                                                                                                                                                            | `buildMolecule`                                         | Công thức hoặc tên chất hợp lệ                     |
| Molecule     | `input` rỗng/sai                           | `abc123`                                                                                                                                                                                                         | `buildMolecule`                                         | Case validate hoặc AI lỗi                          |

## Auth + Profile

| ID          | Sheet/Tab                  | API                      | Loại | Input                                             | Precondition                                                                                                     | Expected                                            |
| ----------- | -------------------------- | ------------------------ | ---- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| API-AUTH-01 | `loginWithGoogle`          | `POST /api/auth/google`  | N    | `idToken` hợp lệ                                  | Google verifier trả email verified; user allowlist tồn tại; user ACTIVE; token service và refresh repo hoạt động | Trả access token, set refresh cookie, trả `UserDto` |
| API-AUTH-02 | `loginWithGoogle`          | `POST /api/auth/google`  | A    | `idToken` sai hoặc email chưa verified            | Google verifier trả token lỗi hoặc `emailVerified=false`                                                         | Báo lỗi xác thực, không cấp token                   |
| API-AUTH-03 | `loginWithGoogle`          | `POST /api/auth/google`  | A    | `idToken` hợp lệ nhưng email không được cấp quyền | Verifier trả email hợp lệ nhưng `AppUserRepository.findByEmail` rỗng                                             | Báo email chưa được cấp quyền                       |
| API-AUTH-04 | `refresh`                  | `POST /api/auth/refresh` | N    | refresh cookie hợp lệ                             | Refresh token tồn tại, chưa revoke, chưa hết hạn; user còn ACTIVE                                                | Rotate token, set cookie mới, trả auth response     |
| API-AUTH-05 | `refresh`                  | `POST /api/auth/refresh` | A    | refresh cookie rỗng/null                          | Không có refresh token                                                                                           | Báo lỗi token thiếu                                 |
| API-AUTH-06 | `refresh`                  | `POST /api/auth/refresh` | A    | refresh token đã revoke/hết hạn                   | Token repo trả token revoked hoặc expired                                                                        | Báo lỗi refresh token                               |
| API-AUTH-07 | `logout`                   | `POST /api/auth/logout`  | N    | refresh cookie hợp lệ                             | Token tồn tại trong repo                                                                                         | Revoke token và clear cookie, trả `204`             |
| API-AUTH-08 | `currentUser`              | `GET /api/auth/me`       | N    | Bearer access token hợp lệ                        | Current user tồn tại; user repo tìm thấy user; role repo trả roles                                               | Trả `UserDto` của user hiện tại                     |
| API-AUTH-09 | `updateCurrentUserProfile` | `PATCH /api/users/me`    | N    | `fullName`, `avatarUrl`, `contactInfo`            | Current user tồn tại; repo save được; avatar là URL http/https hợp lệ hoặc null                                  | Trả profile đã cập nhật                             |
| API-AUTH-10 | `updateCurrentUserProfile` | `PATCH /api/users/me`    | A    | `avatarUrl` sai format                            | Current user tồn tại                                                                                             | Báo lỗi URL avatar không hợp lệ                     |

## Admin

| ID         | Sheet/Tab             | API                                            | Loại | Input                                            | Precondition                                                                                 | Expected                                     |
| ---------- | --------------------- | ---------------------------------------------- | ---- | ------------------------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| API-ADM-01 | `listModerators`      | `GET /api/admin/moderators`                    | N    | `page=0`, `size=20`                              | Admin hợp lệ; moderator repo trả danh sách; role repo trả info người cấp quyền               | Trả page moderator                           |
| API-ADM-02 | `addModerator`        | `POST /api/admin/moderators`                   | N    | `email`, `subject`, `fullName`                   | Admin hợp lệ; subject chưa có moderator active; email chưa tồn tại                           | Tạo moderator mới, status `INVITED`          |
| API-ADM-03 | `addModerator`        | `POST /api/admin/moderators`                   | A    | `email`, `subject`, `fullName`                   | Subject đã có moderator active                                                               | Báo lỗi forbidden                            |
| API-ADM-04 | `addModerator`        | `POST /api/admin/moderators`                   | A    | `email` đã tồn tại                               | Email đã có user đang ACTIVE/INVITED                                                         | Báo lỗi duplicate email                      |
| API-ADM-05 | `replaceModerator`    | `POST /api/admin/moderators/{id}/replacement`  | N    | `replacementEmail`, `disablePrevious=true/false` | Moderator cũ tồn tại, ACTIVE, có role MODERATOR, có subject; replacement hợp lệ cùng subject | Hạ moderator cũ, cấp moderator mới           |
| API-ADM-06 | `replaceModerator`    | `POST /api/admin/moderators/{id}/replacement`  | A    | `replacementEmail` trùng email hiện tại          | Current moderator và replacement cùng email                                                  | Báo lỗi email thay thế phải khác             |
| API-ADM-07 | `reactivateModerator` | `PATCH /api/admin/moderators/{id}/reactivate`  | N    | `id`                                             | User đã `DISABLED`, còn role MODERATOR, subject chưa có moderator active khác                | Kích hoạt lại moderator, status `INVITED`    |
| API-ADM-08 | `deleteModerator`     | `DELETE /api/admin/moderators/{id}`            | A    | `id`                                             | Bất kỳ                                                                                       | Luôn báo lỗi vì không hỗ trợ thu hồi độc lập |
| API-ADM-09 | `listItManagers`      | `GET /api/admin/it-managers`                   | N    | `page`, `size`                                   | Admin hợp lệ; repo trả IT manager list                                                       | Trả page IT manager                          |
| API-ADM-10 | `addItManager`        | `POST /api/admin/it-managers`                  | N    | `email`, `fullName`                              | Admin hợp lệ; email chưa tồn tại hoặc đã disabled                                            | Tạo/khôi phục IT manager, status `INVITED`   |
| API-ADM-11 | `addItManager`        | `POST /api/admin/it-managers`                  | A    | `email` đã tồn tại và chưa disabled              | User đã ACTIVE/INVITED                                                                       | Báo lỗi duplicate email                      |
| API-ADM-12 | `disableItManager`    | `DELETE /api/admin/it-managers/{id}`           | N    | `id`                                             | IT manager tồn tại và có role IT_MANAGEMENT                                                  | Set status `DISABLED`, trả `204`             |
| API-ADM-13 | `reactivateItManager` | `PATCH /api/admin/it-managers/{id}/reactivate` | N    | `id`                                             | IT manager tồn tại, đang `DISABLED`                                                          | Kích hoạt lại, trả IT manager                |

## Moderator

| ID         | Sheet/Tab           | API                                             | Loại | Input                             | Precondition                                                                | Expected                          |
| ---------- | ------------------- | ----------------------------------------------- | ---- | --------------------------------- | --------------------------------------------------------------------------- | --------------------------------- |
| API-MOD-01 | `listTeachers`      | `GET /api/moderator/teachers`                   | N    | `page`, `size`                    | Moderator có subject; repo trả teacher cùng subject                         | Trả page teacher                  |
| API-MOD-02 | `listTeachers`      | `GET /api/moderator/teachers`                   | A    | `page`, `size`                    | Moderator không có subject                                                  | Báo lỗi forbidden                 |
| API-MOD-03 | `addTeacher`        | `POST /api/moderator/teachers`                  | N    | `email`, `subject`, `fullName`    | Subject trùng subject của moderator; email chưa tồn tại                     | Tạo teacher mới, status `INVITED` |
| API-MOD-04 | `addTeacher`        | `POST /api/moderator/teachers`                  | A    | `email`, `subject` khác moderator | Moderator chỉ quản lý subject của mình                                      | Báo lỗi forbidden                 |
| API-MOD-05 | `addTeacher`        | `POST /api/moderator/teachers`                  | A    | `email` đã tồn tại                | User đã ACTIVE/INVITED                                                      | Báo lỗi duplicate email           |
| API-MOD-06 | `deleteTeacher`     | `DELETE /api/moderator/teachers/{id}`           | N    | `id`                              | Teacher tồn tại, chưa disabled, có role TEACHER, cùng subject với moderator | Set status `DISABLED`, trả `204`  |
| API-MOD-07 | `deleteTeacher`     | `DELETE /api/moderator/teachers/{id}`           | A    | `id`                              | Teacher sai subject hoặc không tồn tại                                      | Báo lỗi phù hợp                   |
| API-MOD-08 | `reactivateTeacher` | `PATCH /api/moderator/teachers/{id}/reactivate` | N    | `id`                              | Teacher `DISABLED`, có role TEACHER, cùng subject                           | Kích hoạt lại teacher             |

## Teacher

Trong code hiện tại không có `TeacherController` riêng. Role `TEACHER` dùng các API ở `BlogController` và `LibraryContentController`.

Để làm Unit Test matrix dễ nhìn hơn, các sheet/tab trùng với phần Blog/Library chung được gộp vào bảng chung bên dưới. Khác biệt về role `TEACHER` được thể hiện trong `Precondition`, không tách thêm sheet riêng.

| Teacher ID     | Sheet/Tab              | Gộp vào phần                 |
| -------------- | ---------------------- | ---------------------------- |
| API-TEA-01/02  | `createBlogPost`       | Blog chung                   |
| API-TEA-03/04  | `updateBlogPost`       | Blog chung                   |
| API-TEA-05     | `deleteBlogPost`       | Blog chung                   |
| API-TEA-06     | `createBlogComment`    | Blog chung                   |
| API-TEA-07     | `updateBlogComment`    | Blog chung                   |
| API-TEA-08     | `deleteBlogComment`    | Blog chung                   |
| API-TEA-09     | `listLibraryContents`  | Library chung Teacher/Moderator |
| API-TEA-10     | `getLibraryContent`    | Library chung Teacher/Moderator |
| API-TEA-11     | `createLibraryContent` | Library chung Teacher/Moderator |
| API-TEA-12     | `updateLibraryContent` | Library chung Teacher/Moderator |
| API-TEA-13     | `deleteLibraryContent` | Library chung Teacher/Moderator |

## Blog chung và moderator removal

Các dòng có nhiều ID là cùng một service-level sheet/tab; role hoặc bối cảnh khác nhau được đưa vào `Precondition`.

| ID                         | Sheet/Tab                   | API                                     | Loại | Input                                         | Precondition                                                       | Expected                               |
| -------------------------- | --------------------------- | --------------------------------------- | ---- | --------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| API-BLOG-01                | `listBlogPosts`             | `GET /api/blog-posts`                   | N    | `subject`, `authorId=me`, `q`, `page`, `size` | Có current user; repo search trả dữ liệu phù hợp                   | Trả page summary                       |
| API-BLOG-02                | `getBlogPostDetail`         | `GET /api/blog-posts/{id}`              | N    | `id`                                          | Bài `PUBLISHED` tồn tại; repo comment trả comment list             | Trả detail + comments                  |
| API-TEA-01 / API-BLOG-03   | `createBlogPost`            | `POST /api/blog-posts`                  | N    | `title`, `content`, `subject`                 | Current user hợp lệ, gồm TEACHER; sanitize trả nội dung hợp lệ     | Tạo bài `PUBLISHED`                    |
| API-TEA-02 / API-BLOG-04   | `createBlogPost`            | `POST /api/blog-posts`                  | A    | `title` rỗng hoặc content rỗng sau sanitize   | Current user hợp lệ, gồm TEACHER                                  | Báo lỗi validate                       |
| API-TEA-03 / API-BLOG-05   | `updateBlogPost`            | `PATCH /api/blog-posts/{id}`            | N    | `title/content/subject`                       | Bài tồn tại, `PUBLISHED`; current user hợp lệ, gồm TEACHER owner   | Cập nhật bài viết                      |
| API-TEA-04 / API-BLOG-06   | `updateBlogPost`            | `PATCH /api/blog-posts/{id}`            | A    | `id` của bài người khác                       | Bài tồn tại nhưng current user không phải owner                    | Báo lỗi forbidden                      |
| API-TEA-05 / API-BLOG-07   | `deleteBlogPost`            | `DELETE /api/blog-posts/{id}`           | N    | `id`                                          | Bài tồn tại, `PUBLISHED`; current user hợp lệ, gồm TEACHER owner   | Soft delete thành `DELETED_BY_AUTHOR`  |
| API-BLOG-08                | `removeBlogPostByModerator` | `POST /api/blog-posts/{id}/removal`     | N    | `reason`                                      | Moderator có subject đúng; bài thuộc subject đó                    | Set `REMOVED_BY_MODERATOR`, lưu reason |
| API-BLOG-09                | `removeBlogPostByModerator` | `POST /api/blog-posts/{id}/removal`     | A    | `reason` rỗng hoặc subject sai                | Reason rỗng hoặc moderator không đúng subject                      | Báo lỗi                                |
| API-TEA-06 / API-BLOG-10   | `createBlogComment`         | `POST /api/blog-posts/{id}/comments`    | N    | `content`                                     | Post `PUBLISHED` tồn tại; current user hợp lệ, gồm TEACHER; sanitize hợp lệ | Tạo comment                     |
| API-TEA-07 / API-BLOG-11   | `updateBlogComment`         | `PATCH /api/blog-comments/{commentId}`  | N    | `content`                                     | Comment tồn tại; current user hợp lệ, gồm TEACHER owner            | Cập nhật comment                       |
| API-TEA-08 / API-BLOG-12   | `deleteBlogComment`         | `DELETE /api/blog-comments/{commentId}` | N    | `commentId`                                   | Comment tồn tại; current user hợp lệ, gồm TEACHER owner            | Xóa comment                            |

## Library chung cho Teacher/Moderator

| ID                       | Sheet/Tab              | API                                 | Loại | Input                                                 | Precondition                                                   | Expected               |
| ------------------------ | ---------------------- | ----------------------------------- | ---- | ----------------------------------------------------- | -------------------------------------------------------------- | ---------------------- |
| API-TEA-09 / API-LIB-01  | `listLibraryContents`  | `GET /api/library/contents`         | N    | `type`, `subject`, `q`, `page`, `size`, `sort`        | Current user hợp lệ, gồm TEACHER; repo search trả danh sách    | Trả page content       |
| API-TEA-10 / API-LIB-02  | `getLibraryContent`    | `GET /api/library/contents/{id}`    | N    | `id`                                                  | Content tồn tại; current user hợp lệ, gồm TEACHER owner        | Trả detail             |
| API-TEA-11 / API-LIB-03  | `createLibraryContent` | `POST /api/library/contents`        | N    | `type`, `title`, `subject`, `payload`, `thumbnailUrl` | Current user hợp lệ, gồm TEACHER; type/title/subject valid     | Tạo content mới        |
| API-TEA-12 / API-LIB-04  | `updateLibraryContent` | `PATCH /api/library/contents/{id}`  | N    | `title`, `subject`, `payload`, `thumbnailUrl`         | Content tồn tại; current user hợp lệ, gồm TEACHER owner        | Cập nhật content       |
| API-TEA-13 / API-LIB-05  | `deleteLibraryContent` | `DELETE /api/library/contents/{id}` | N    | `id`                                                  | Content tồn tại; current user hợp lệ, gồm TEACHER owner        | Set deleted, trả `204` |

## Textbook

| ID          | Sheet/Tab      | API                                                            | Loại | Input                     | Precondition                 | Expected              |
| ----------- | -------------- | -------------------------------------------------------------- | ---- | ------------------------- | ---------------------------- | --------------------- |
| API-TEXT-01 | `getCatalog`   | `GET /api/textbooks`                                           | N    | none                      | Repo load catalog thành công | Trả toàn bộ catalog   |
| API-TEXT-02 | `getBookNames` | `GET /api/textbooks/names`                                     | N    | `subject` hoặc rỗng       | Repo trả danh sách tên sách  | Trả book names        |
| API-TEXT-03 | `getChapters`  | `GET /api/textbooks/{bookCode}/chapters`                       | N    | `bookCode`                | Book tồn tại trong catalog   | Trả chapter summaries |
| API-TEXT-04 | `getLessons`   | `GET /api/textbooks/{bookCode}/chapters/{chapterCode}/lessons` | N    | `bookCode`, `chapterCode` | Chapter tồn tại              | Trả lesson summaries  |

## Lesson plan

| ID        | Sheet/Tab                   | API                                                  | Loại | Input                                                                  | Precondition                                                 | Expected                                                  |
| --------- | --------------------------- | ---------------------------------------------------- | ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------- |
| API-LP-01 | `generateObjectives`        | `POST /api/lesson-plans/generate`                    | N    | `bookId`, `chapterId`, `lessonId`, `userPrompt`                        | Catalog có `knowledge_json`; AI trả JSON hợp lệ              | Trả phần mục tiêu                                         |
| API-LP-02 | `generateMaterials`         | `POST /api/lesson-plans/generate-materials`          | N    | cùng input                                                             | Catalog có nội dung; AI trả JSON hợp lệ                      | Trả phần thiết bị/học liệu                                |
| API-LP-03 | `generateActivitiesFrame`   | `POST /api/lesson-plans/generate-activities`         | N    | cùng input                                                             | Catalog có nội dung; AI trả JSON hợp lệ                      | Trả dàn ý hoạt động                                       |
| API-LP-04 | `generateActivitiesDetails` | `POST /api/lesson-plans/generate-activities-details` | N    | `activities`, `objectives`, `equipmentAndMaterials`, ids, `userPrompt` | Có activities; AI trả từng activity hợp lệ hoặc một phần lỗi | Trả hoạt động chi tiết, giữ skeleton nếu chỉ lỗi một phần |
| API-LP-05 | `generateLessonPlanStream`  | `POST /api/lesson-plans/generate-stream`             | N    | stream request                                                         | Có executor; stream port nhận event                          | Trả `202`, chạy nền và đẩy event                          |
| API-LP-06 | `generateObjectives`        | `POST /api/lesson-plans/generate`                    | A    | `bookId`, `chapterId`, hoặc `lessonId` không tồn tại                   | Catalog không tìm thấy dữ liệu theo ids                      | Báo lỗi không tìm thấy dữ liệu chương trình               |
| API-LP-07 | `generateMaterials`         | `POST /api/lesson-plans/generate-materials`          | A    | cùng input                                                             | AI trả lỗi, timeout, hoặc JSON không hợp lệ                  | Báo lỗi sinh thiết bị/học liệu                            |
| API-LP-08 | `generateActivitiesFrame`   | `POST /api/lesson-plans/generate-activities`         | A    | cùng input                                                             | AI trả lỗi, timeout, hoặc JSON không hợp lệ                  | Báo lỗi sinh dàn ý hoạt động                              |
| API-LP-09 | `generateActivitiesDetails` | `POST /api/lesson-plans/generate-activities-details` | A    | `activities` rỗng hoặc JSON activity không hợp lệ                      | Request không thỏa điều kiện xử lý                           | Báo lỗi validate                                          |
| API-LP-10 | `generateLessonPlanStream`  | `POST /api/lesson-plans/generate-stream`             | A    | stream request                                                         | Executor từ chối tác vụ hoặc stream port phát lỗi            | Báo lỗi khởi tạo sinh giáo án, không đẩy event thành công |

## Slides

| ID           | Sheet/Tab                  | API                                                   | Loại | Input                                   | Precondition                                                   | Expected                                |
| ------------ | -------------------------- | ----------------------------------------------------- | ---- | --------------------------------------- | -------------------------------------------------------------- | --------------------------------------- |
| API-SLIDE-01 | `generateOutline`          | `POST /api/slides/generate-outline`                   | N    | outline request                         | AI trả deck blueprint + outline hợp lệ; session store sẵn sàng | Trả sessionId, topic, outline           |
| API-SLIDE-02 | `startOutlineSession`      | `POST /api/slides/outline-sessions/{sessionId}/start` | N    | `sessionId`                             | Session tồn tại và chưa start                                  | Bắt đầu phát event outline              |
| API-SLIDE-03 | `retryOutlineSessionPart`  | `POST /api/slides/retry-outline-session-part`         | N    | `sessionId`, `partId`                   | Session và part tồn tại                                        | Retry part                              |
| API-SLIDE-04 | `retryOutlineSessionSlide` | `POST /api/slides/retry-outline-session-slide`        | N    | `sessionId`, `partId`, `slideId`        | Session, part, slide tồn tại                                   | Retry slide                             |
| API-SLIDE-05 | `retryOutlinePart`         | `POST /api/slides/retry-outline-part`                 | N    | retry request                           | Request hợp lệ                                                 | Retry nội dung part                     |
| API-SLIDE-06 | `generateOutline`          | `POST /api/slides/generate-outline`                   | A    | outline request                         | AI trả blueprint/outline không hợp lệ hoặc session store lỗi   | Báo lỗi sinh outline, không tạo session |
| API-SLIDE-07 | `startOutlineSession`      | `POST /api/slides/outline-sessions/{sessionId}/start` | A    | `sessionId` không tồn tại hoặc đã start | Session không tồn tại hoặc đã được bắt đầu                     | Báo lỗi session không hợp lệ            |
| API-SLIDE-08 | `retryOutlineSessionPart`  | `POST /api/slides/retry-outline-session-part`         | A    | `sessionId`, `partId`                   | Session hoặc part không tồn tại                                | Báo lỗi không tìm thấy part             |
| API-SLIDE-09 | `retryOutlineSessionSlide` | `POST /api/slides/retry-outline-session-slide`        | A    | `sessionId`, `partId`, `slideId`        | Session, part, hoặc slide không tồn tại                        | Báo lỗi không tìm thấy slide            |
| API-SLIDE-10 | `retryOutlinePart`         | `POST /api/slides/retry-outline-part`                 | A    | retry request                           | Request thiếu dữ liệu bắt buộc hoặc AI trả lỗi                 | Báo lỗi validate hoặc retry part        |

## Slide design

| ID            | Sheet/Tab           | API                                    | Loại | Input                                        | Precondition                                                      | Expected                           |
| ------------- | ------------------- | -------------------------------------- | ---- | -------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| API-DESIGN-01 | `generateSlideHtml` | `POST /api/slide-design/generate-html` | N    | `step`, `priorHtml`, context slide           | `bg_deco`, `structural`, hoặc `content_fill`; AI trả HTML phù hợp | Trả HTML design + warning nếu có   |
| API-DESIGN-02 | `fillSlideContent`  | `POST /api/slide-design/fill-content`  | N    | slots, palette, zones                        | Có ít nhất 1 slot; AI trả JSON hợp lệ                             | Trả nội dung đã fill               |
| API-DESIGN-03 | `generateSlideHtml` | `POST /api/slide-design/generate-html` | A    | `step` không hợp lệ hoặc context slide thiếu | Request không hợp lệ hoặc AI trả HTML không hợp lệ                | Báo lỗi validate hoặc sinh HTML    |
| API-DESIGN-04 | `fillSlideContent`  | `POST /api/slide-design/fill-content`  | A    | slots rỗng hoặc palette/zones không hợp lệ   | Không có slot hợp lệ hoặc AI trả JSON lỗi                         | Báo lỗi validate hoặc fill content |

## Molecule

| ID         | Sheet/Tab       | API                         | Loại | Input                    | Precondition                                                    | Expected                 |
| ---------- | --------------- | --------------------------- | ---- | ------------------------ | --------------------------------------------------------------- | ------------------------ |
| API-MOL-01 | `buildMolecule` | `POST /api/molecules/build` | N    | `input`                  | Input là công thức hoặc tên hợp lệ; AI hoặc fast-path hoạt động | Trả cấu trúc phân tử     |
| API-MOL-02 | `buildMolecule` | `POST /api/molecules/build` | A    | `input` rỗng             | Không có input                                                  | Báo lỗi bắt buộc nhập    |
| API-MOL-03 | `buildMolecule` | `POST /api/molecules/build` | A    | JSON AI lỗi hoặc timeout | AI trả lỗi/JSON sai/timeout                                     | Báo lỗi xây dựng phân tử |

## Upload

| ID        | Sheet/Tab | API                 | Loại | Input                              | Precondition                                                                   | Expected            |
| --------- | --------- | ------------------- | ---- | ---------------------------------- | ------------------------------------------------------------------------------ | ------------------- |
| API-UP-01 | `upload`  | `POST /api/uploads` | N    | multipart file hợp lệ              | File có đuôi `.docx/.pdf/.pptx/.png/.jpg/.jpeg`, size <= 10MB; storage trả URL | Trả metadata upload |
| API-UP-02 | `upload`  | `POST /api/uploads` | A    | file rỗng, sai loại, hoặc quá 10MB | File không hợp lệ                                                              | Báo lỗi validate    |

## Health

| ID        | Sheet/Tab | API               | Loại | Input | Precondition     | Expected            |
| --------- | --------- | ----------------- | ---- | ----- | ---------------- | ------------------- |
| API-HL-01 | `health`  | `GET /api/health` | N    | none  | Service sẵn sàng | Trả trạng thái `UP` |

## Cách ghi vào Excel

- Ghi nguyên văn `Input`, `Precondition`, `Expected` theo từng dòng.
- Không tách mock thành cột riêng; mock nằm trong `Precondition`.
- Với case lỗi, ghi rõ lỗi nào phải xảy ra.
- Với case quyền, ghi rõ `admin / moderator / teacher / owner`.
- Với API AI, luôn có ít nhất 1 case `N` và 1 case `A`.
