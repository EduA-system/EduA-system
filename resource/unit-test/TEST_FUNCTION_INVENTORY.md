# Backend API Unit Test Inventory

Chỉ dùng cho backend API. Không gồm FE.

`Precondition` = trạng thái trước khi chạy test, bao gồm luôn dữ liệu giả lập/mock return nếu có.

## Cột nên có trong Excel

`ID | Sheet/Tab | API | Loại | Input | Precondition | Expected`

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

| ID         | Sheet/Tab              | API                                     | Loại | Input                                                 | Precondition                                                       | Expected                              |
| ---------- | ---------------------- | --------------------------------------- | ---- | ----------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- |
| API-TEA-01 | `createBlogPost`       | `POST /api/blog-posts`                  | N    | `title`, `content`, `subject`                         | Current user là TEACHER; sanitize trả nội dung hợp lệ              | Tạo bài `PUBLISHED`                   |
| API-TEA-02 | `createBlogPost`       | `POST /api/blog-posts`                  | A    | `title` rỗng hoặc content rỗng sau sanitize           | Current user là TEACHER                                            | Báo lỗi validate                      |
| API-TEA-03 | `updateBlogPost`       | `PATCH /api/blog-posts/{id}`            | N    | `title/content/subject`                               | Current user là TEACHER và là owner; bài `PUBLISHED` tồn tại       | Cập nhật bài viết                     |
| API-TEA-04 | `updateBlogPost`       | `PATCH /api/blog-posts/{id}`            | A    | `id` của bài người khác                               | Current user là TEACHER nhưng không phải owner                     | Báo lỗi forbidden                     |
| API-TEA-05 | `deleteBlogPost`       | `DELETE /api/blog-posts/{id}`           | N    | `id`                                                  | Current user là TEACHER và là owner; bài `PUBLISHED` tồn tại       | Soft delete thành `DELETED_BY_AUTHOR` |
| API-TEA-06 | `createBlogComment`    | `POST /api/blog-posts/{id}/comments`    | N    | `content`                                             | Current user là TEACHER; post `PUBLISHED` tồn tại; sanitize hợp lệ | Tạo comment                           |
| API-TEA-07 | `updateBlogComment`    | `PATCH /api/blog-comments/{commentId}`  | N    | `content`                                             | Current user là TEACHER và là owner comment                        | Cập nhật comment                      |
| API-TEA-08 | `deleteBlogComment`    | `DELETE /api/blog-comments/{commentId}` | N    | `commentId`                                           | Current user là TEACHER và là owner comment                        | Xóa comment                           |
| API-TEA-09 | `listLibraryContents`  | `GET /api/library/contents`             | N    | `type`, `subject`, `q`, `page`, `size`, `sort`        | Current user là TEACHER; repo search theo owner hiện tại           | Trả page content của teacher          |
| API-TEA-10 | `getLibraryContent`    | `GET /api/library/contents/{id}`        | N    | `id`                                                  | Content tồn tại và current user TEACHER là owner                   | Trả detail                            |
| API-TEA-11 | `createLibraryContent` | `POST /api/library/contents`            | N    | `type`, `title`, `subject`, `payload`, `thumbnailUrl` | Current user là TEACHER; type/title/subject valid                  | Tạo content mới                       |
| API-TEA-12 | `updateLibraryContent` | `PATCH /api/library/contents/{id}`      | N    | `title`, `subject`, `payload`, `thumbnailUrl`         | Content tồn tại và current user TEACHER là owner                   | Cập nhật content                      |
| API-TEA-13 | `deleteLibraryContent` | `DELETE /api/library/contents/{id}`     | N    | `id`                                                  | Content tồn tại và current user TEACHER là owner                   | Set deleted, trả `204`                |

## Blog chung và moderator removal

| ID          | Sheet/Tab                   | API                                     | Loại | Input                                         | Precondition                                                       | Expected                               |
| ----------- | --------------------------- | --------------------------------------- | ---- | --------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------- |
| API-BLOG-01 | `listBlogPosts`             | `GET /api/blog-posts`                   | N    | `subject`, `authorId=me`, `q`, `page`, `size` | Có current user; repo search trả dữ liệu phù hợp                   | Trả page summary                       |
| API-BLOG-02 | `getBlogPostDetail`         | `GET /api/blog-posts/{id}`              | N    | `id`                                          | Bài `PUBLISHED` tồn tại; repo comment trả comment list             | Trả detail + comments                  |
| API-BLOG-03 | `createBlogPost`            | `POST /api/blog-posts`                  | N    | `title`, `content`, `subject`                 | Current user là teacher; sanitize trả nội dung hợp lệ              | Tạo bài `PUBLISHED`                    |
| API-BLOG-04 | `createBlogPost`            | `POST /api/blog-posts`                  | A    | `title` rỗng hoặc content rỗng sau sanitize   | Current user hợp lệ                                                | Báo lỗi validate                       |
| API-BLOG-05 | `updateBlogPost`            | `PATCH /api/blog-posts/{id}`            | N    | `title/content/subject`                       | Bài tồn tại, `PUBLISHED`, current user là owner                    | Cập nhật bài viết                      |
| API-BLOG-06 | `updateBlogPost`            | `PATCH /api/blog-posts/{id}`            | A    | `id` của bài người khác                       | Bài tồn tại nhưng current user không phải owner                    | Báo lỗi forbidden                      |
| API-BLOG-07 | `deleteBlogPost`            | `DELETE /api/blog-posts/{id}`           | N    | `id`                                          | Bài tồn tại, `PUBLISHED`, current user là owner                    | Soft delete thành `DELETED_BY_AUTHOR`  |
| API-BLOG-08 | `removeBlogPostByModerator` | `POST /api/blog-posts/{id}/removal`     | N    | `reason`                                      | Moderator có subject đúng; bài thuộc subject đó                    | Set `REMOVED_BY_MODERATOR`, lưu reason |
| API-BLOG-09 | `removeBlogPostByModerator` | `POST /api/blog-posts/{id}/removal`     | A    | `reason` rỗng hoặc subject sai                | Reason rỗng hoặc moderator không đúng subject                      | Báo lỗi                                |
| API-BLOG-10 | `createBlogComment`         | `POST /api/blog-posts/{id}/comments`    | N    | `content`                                     | Post `PUBLISHED` tồn tại; current user là teacher; sanitize hợp lệ | Tạo comment                            |
| API-BLOG-11 | `updateBlogComment`         | `PATCH /api/blog-comments/{commentId}`  | N    | `content`                                     | Comment tồn tại, current user là owner                             | Cập nhật comment                       |
| API-BLOG-12 | `deleteBlogComment`         | `DELETE /api/blog-comments/{commentId}` | N    | `commentId`                                   | Comment tồn tại, current user là owner                             | Xóa comment                            |

## Library chung cho Teacher/Moderator

| ID         | Sheet/Tab              | API                                 | Loại | Input                                                 | Precondition                                   | Expected               |
| ---------- | ---------------------- | ----------------------------------- | ---- | ----------------------------------------------------- | ---------------------------------------------- | ---------------------- |
| API-LIB-01 | `listLibraryContents`  | `GET /api/library/contents`         | N    | `type`, `subject`, `q`, `page`, `size`, `sort`        | Current user hợp lệ; repo search trả danh sách | Trả page content       |
| API-LIB-02 | `getLibraryContent`    | `GET /api/library/contents/{id}`    | N    | `id`                                                  | Content tồn tại và current user là owner       | Trả detail             |
| API-LIB-03 | `createLibraryContent` | `POST /api/library/contents`        | N    | `type`, `title`, `subject`, `payload`, `thumbnailUrl` | Current user hợp lệ; type/title/subject valid  | Tạo content mới        |
| API-LIB-04 | `updateLibraryContent` | `PATCH /api/library/contents/{id}`  | N    | `title`, `subject`, `payload`, `thumbnailUrl`         | Content tồn tại và current user là owner       | Cập nhật content       |
| API-LIB-05 | `deleteLibraryContent` | `DELETE /api/library/contents/{id}` | N    | `id`                                                  | Content tồn tại và current user là owner       | Set deleted, trả `204` |

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
| API-LP-06 | `generateObjectives`        | `POST /api/lesson-plans/generate`                    | A    | `bookId`, `chapterId`, hoặc `lessonId` không tồn tại                  | Catalog không tìm thấy dữ liệu theo ids                       | Báo lỗi không tìm thấy dữ liệu chương trình                |
| API-LP-07 | `generateMaterials`         | `POST /api/lesson-plans/generate-materials`          | A    | cùng input                                                             | AI trả lỗi, timeout, hoặc JSON không hợp lệ                   | Báo lỗi sinh thiết bị/học liệu                              |
| API-LP-08 | `generateActivitiesFrame`   | `POST /api/lesson-plans/generate-activities`         | A    | cùng input                                                             | AI trả lỗi, timeout, hoặc JSON không hợp lệ                   | Báo lỗi sinh dàn ý hoạt động                                |
| API-LP-09 | `generateActivitiesDetails` | `POST /api/lesson-plans/generate-activities-details` | A    | `activities` rỗng hoặc JSON activity không hợp lệ                     | Request không thỏa điều kiện xử lý                             | Báo lỗi validate                                            |
| API-LP-10 | `generateLessonPlanStream`  | `POST /api/lesson-plans/generate-stream`             | A    | stream request                                                         | Executor từ chối tác vụ hoặc stream port phát lỗi              | Báo lỗi khởi tạo sinh giáo án, không đẩy event thành công   |

## Slides

| ID           | Sheet/Tab                  | API                                                   | Loại | Input                            | Precondition                                                   | Expected                      |
| ------------ | -------------------------- | ----------------------------------------------------- | ---- | -------------------------------- | -------------------------------------------------------------- | ----------------------------- |
| API-SLIDE-01 | `generateOutline`          | `POST /api/slides/generate-outline`                   | N    | outline request                  | AI trả deck blueprint + outline hợp lệ; session store sẵn sàng | Trả sessionId, topic, outline |
| API-SLIDE-02 | `startOutlineSession`      | `POST /api/slides/outline-sessions/{sessionId}/start` | N    | `sessionId`                      | Session tồn tại và chưa start                                  | Bắt đầu phát event outline    |
| API-SLIDE-03 | `retryOutlineSessionPart`  | `POST /api/slides/retry-outline-session-part`         | N    | `sessionId`, `partId`            | Session và part tồn tại                                        | Retry part                    |
| API-SLIDE-04 | `retryOutlineSessionSlide` | `POST /api/slides/retry-outline-session-slide`        | N    | `sessionId`, `partId`, `slideId` | Session, part, slide tồn tại                                   | Retry slide                   |
| API-SLIDE-05 | `retryOutlinePart`         | `POST /api/slides/retry-outline-part`                 | N    | retry request                    | Request hợp lệ                                                 | Retry nội dung part           |
| API-SLIDE-06 | `generateOutline`          | `POST /api/slides/generate-outline`                   | A    | outline request                  | AI trả blueprint/outline không hợp lệ hoặc session store lỗi    | Báo lỗi sinh outline, không tạo session |
| API-SLIDE-07 | `startOutlineSession`      | `POST /api/slides/outline-sessions/{sessionId}/start` | A    | `sessionId` không tồn tại hoặc đã start | Session không tồn tại hoặc đã được bắt đầu                  | Báo lỗi session không hợp lệ    |
| API-SLIDE-08 | `retryOutlineSessionPart`  | `POST /api/slides/retry-outline-session-part`         | A    | `sessionId`, `partId`            | Session hoặc part không tồn tại                                | Báo lỗi không tìm thấy part    |
| API-SLIDE-09 | `retryOutlineSessionSlide` | `POST /api/slides/retry-outline-session-slide`        | A    | `sessionId`, `partId`, `slideId` | Session, part, hoặc slide không tồn tại                        | Báo lỗi không tìm thấy slide   |
| API-SLIDE-10 | `retryOutlinePart`         | `POST /api/slides/retry-outline-part`                 | A    | retry request                    | Request thiếu dữ liệu bắt buộc hoặc AI trả lỗi                 | Báo lỗi validate hoặc retry part |

## Slide design

| ID            | Sheet/Tab           | API                                    | Loại | Input                              | Precondition                                                      | Expected                         |
| ------------- | ------------------- | -------------------------------------- | ---- | ---------------------------------- | ----------------------------------------------------------------- | -------------------------------- |
| API-DESIGN-01 | `generateSlideHtml` | `POST /api/slide-design/generate-html` | N    | `step`, `priorHtml`, context slide | `bg_deco`, `structural`, hoặc `content_fill`; AI trả HTML phù hợp | Trả HTML design + warning nếu có |
| API-DESIGN-02 | `fillSlideContent`  | `POST /api/slide-design/fill-content`  | N    | slots, palette, zones              | Có ít nhất 1 slot; AI trả JSON hợp lệ                             | Trả nội dung đã fill             |
| API-DESIGN-03 | `generateSlideHtml` | `POST /api/slide-design/generate-html` | A    | `step` không hợp lệ hoặc context slide thiếu | Request không hợp lệ hoặc AI trả HTML không hợp lệ        | Báo lỗi validate hoặc sinh HTML  |
| API-DESIGN-04 | `fillSlideContent`  | `POST /api/slide-design/fill-content`  | A    | slots rỗng hoặc palette/zones không hợp lệ | Không có slot hợp lệ hoặc AI trả JSON lỗi                  | Báo lỗi validate hoặc fill content |

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
