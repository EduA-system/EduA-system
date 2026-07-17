# EDUA – Unit Test Checklist

Tài liệu này là danh sách test cần chuẩn bị để điền vào `Report5.1_Unit Test_Dang.xls`.
Phạm vi ưu tiên là **business logic backend** trong `be/`; mỗi dòng bên dưới có thể trở thành một test case trong các sheet `methodName...` của file Excel.

## Cách dùng với file Excel

- Tạo một dòng trong `MethodList` cho mỗi method/nhóm method bên dưới.
- Dùng mã `TC-xx` làm **Test case ID**; điền Input, Expected Result, Actual Result và trạng thái Pass/Fail sau khi chạy test.
- `N` = normal case; `A` = abnormal/invalid case; `B` = boundary case.
- Ưu tiên hoàn tất các mục **P0** trước. Danh sách P0 có 76 case; thực hiện toàn bộ danh sách có 97 case (một số mục bao gồm các biến thể input).

## Tiền điều kiện chung

- Dùng JUnit 5 + Mockito; mock các repository, AI gateway, token service và R2 storage. Không gọi Google, OpenAI/DeepSeek hay Cloudflare R2 thật trong unit test.
- Dữ liệu mẫu có các subject hợp lệ: `MATH`, `CHEMISTRY`, `PHYSICS`.
- Chuẩn bị user mẫu: Admin, Moderator MATH, Teacher MATH, Teacher PHYSICS, user bị `DISABLED` và user không có quyền.
- Với test thời gian/token, chỉ kiểm tra quan hệ (`expiresAt` sau thời điểm hiện tại, token bị revoke), không so sánh `Instant.now()` tuyệt đối.

## 1. Xác thực và hồ sơ (`AuthService`, `ProfileService`)

| ID | P | Method | Loại | Tình huống / input | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-AUTH-01 | P0 | `loginWithGoogle` | N | Google token hợp lệ, email verified, user ACTIVE đã được cấp quyền | Trả user, roles, access token và refresh token; lưu refresh token dạng hash |
| TC-AUTH-02 | P0 | `loginWithGoogle` | A | Email Google chưa verified | Ném `InvalidTokenException` |
| TC-AUTH-03 | P0 | `loginWithGoogle` | A | Email không tồn tại trong danh sách user được cấp quyền | Ném `EmailNotAllowedException` |
| TC-AUTH-04 | P0 | `loginWithGoogle` | A | User có trạng thái `DISABLED` | Từ chối đăng nhập, không cấp token |
| TC-AUTH-05 | P0 | `loginWithGoogle` | N | User thiếu `googleSub` hoặc `fullName` | Bổ sung dữ liệu từ Google khi lưu user |
| TC-AUTH-06 | P0 | `loginWithGoogle` | B | Email có khoảng trắng/chữ hoa | Email được trim và chuyển lower-case trước khi tìm user |
| TC-AUTH-07 | P0 | `refresh` | N | Refresh token đang dùng được | Revoke token cũ, cấp access/refresh token mới |
| TC-AUTH-08 | P0 | `refresh` | A | Refresh token null/rỗng | Ném `InvalidTokenException` |
| TC-AUTH-09 | P0 | `refresh` | A | Token hash không tồn tại | Ném `InvalidTokenException` |
| TC-AUTH-10 | P0 | `refresh` | A | Token đã bị revoke (token reuse) | Revoke toàn bộ token của user và ném `InvalidTokenException` |
| TC-AUTH-11 | P0 | `refresh` | A | Token hết hạn | Ném `InvalidTokenException` |
| TC-AUTH-12 | P0 | `refresh` | A | User của token không tồn tại hoặc đã `DISABLED` | Từ chối refresh token |
| TC-AUTH-13 | P1 | `logout` | N | Refresh token hợp lệ | Token tương ứng được revoke |
| TC-AUTH-14 | P1 | `logout` | B | Token rỗng hoặc token không tồn tại | Không lỗi, không gọi revoke với ID không có |
| TC-AUTH-15 | P0 | `currentUser` | N/A | Claims hợp lệ; user tồn tại / không tồn tại | Trả user + roles / ném `InvalidTokenException` |
| TC-PROFILE-01 | P1 | `updateCurrentUserProfile` | N | Cập nhật tên, avatar, contact info hợp lệ | Lưu đúng user hiện tại và trả profile mới |
| TC-PROFILE-02 | P1 | `updateCurrentUserProfile` | A | Không có current user hoặc user không tồn tại | Báo lỗi xác thực/không tìm thấy theo service |

## 2. Quản lý Moderator và Teacher

| ID | P | Method | Loại | Tình huống / input | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-ADM-01 | P0 | `listModerators` | N | Có moderator và thông tin người cấp quyền | Trả đúng page, tên người cấp, ID và thời điểm cấp |
| TC-ADM-02 | P1 | `listModerators` | B | Page rỗng | Trả map rỗng, không truy vấn dư dữ liệu cấp quyền |
| TC-ADM-03 | P0 | `addModerator` | N | Email mới, subject chưa có moderator active | Tạo user `INVITED`, gán role MODERATOR, lưu audit grant |
| TC-ADM-04 | P0 | `addModerator` | A | Subject đã có moderator active | Ném `ForbiddenOperationException` |
| TC-ADM-05 | P0 | `addModerator` | A | Email đã tồn tại và user chưa bị disabled | Ném `DuplicateEmailException` |
| TC-ADM-06 | P0 | `addModerator` | N | Email tồn tại nhưng user `DISABLED` | Reactivate thành `INVITED`, gán MODERATOR |
| TC-ADM-07 | P1 | `addModerator` | B | Email/subject có khoảng trắng và chữ hoa | Chuẩn hóa email và subject trước khi lưu |
| TC-ADM-08 | P0 | `deleteModerator` | A | Gọi thu hồi moderator độc lập | Luôn ném `ForbiddenOperationException` |
| TC-ADM-09 | P0 | `replaceModerator` | N | Moderator active có subject, email thay thế mới | Hạ moderator cũ thành TEACHER; tạo/gán moderator mới trong cùng transaction |
| TC-ADM-10 | P0 | `replaceModerator` | A | ID không tồn tại, disabled, hoặc không có role MODERATOR | Ném `ResourceNotFoundException` |
| TC-ADM-11 | P0 | `replaceModerator` | A | Moderator hiện tại không có subject | Ném `ForbiddenOperationException` |
| TC-ADM-12 | P0 | `replaceModerator` | A | Email thay thế trùng email moderator hiện tại | Ném `ForbiddenOperationException` |
| TC-ADM-13 | P0 | `replaceModerator` | A | User thay thế có subject khác | Ném `ForbiddenOperationException` |
| TC-ADM-14 | P1 | `replaceModerator` | N | `disablePrevious=true` | Moderator cũ chuyển `DISABLED`; moderator mới được gán role |
| TC-ADM-15 | P0 | `reactivateModerator` | N | Moderator bị disabled, subject chưa có moderator active | Chuyển `INVITED` và gán lại MODERATOR |
| TC-ADM-16 | P0 | `reactivateModerator` | A | User chưa disabled/không có role MODERATOR/subject đã có moderator khác | Ném lỗi phù hợp, không thay đổi user |
| TC-MOD-01 | P0 | `listTeachers` | N | Moderator có subject và danh sách teacher cùng subject | Chỉ trả teacher của subject moderator, kèm audit grant |
| TC-MOD-02 | P0 | `listTeachers` | A | Moderator không có subject | Ném `ForbiddenOperationException` |
| TC-MOD-03 | P0 | `addTeacher` | N | Email mới, subject đúng với moderator | Tạo teacher `INVITED`, gán role TEACHER |
| TC-MOD-04 | P0 | `addTeacher` | A | Subject request khác subject của moderator | Ném `ForbiddenOperationException` |
| TC-MOD-05 | P0 | `addTeacher` | A | Email đã tồn tại và chưa disabled | Ném `DuplicateEmailException` |
| TC-MOD-06 | P1 | `addTeacher` | N | Email cũ nhưng user bị disabled | Reactivate thành `INVITED`, subject đúng moderator |
| TC-MOD-07 | P0 | `deleteTeacher` | N | Teacher active, có role TEACHER và cùng subject | Chuyển trạng thái teacher thành `DISABLED` |
| TC-MOD-08 | P0 | `deleteTeacher` | A | Teacher không tồn tại/disabled/không có role/sai subject | Ném `ResourceNotFoundException` hoặc `ForbiddenOperationException`; không lưu thay đổi |
| TC-MOD-09 | P0 | `reactivateTeacher` | N | Teacher disabled, có role TEACHER và cùng subject | Chuyển `INVITED`, gán lại TEACHER và audit grant |
| TC-MOD-10 | P0 | `reactivateTeacher` | A | Teacher active, không có role hoặc sai subject | Báo lỗi, không thay đổi trạng thái |

## 3. Blog và bình luận

| ID | P | Method | Loại | Tình huống / input | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-BLOG-01 | P0 | `BlogPostService.create` | N | Title, HTML content, subject hợp lệ | Lưu bài `PUBLISHED`, author là current user; trả detail |
| TC-BLOG-02 | P0 | `create` | A | Title null/rỗng | Ném `IllegalArgumentException` |
| TC-BLOG-03 | P0 | `create` | A | Nội dung chỉ rỗng hoặc bị sanitizer loại toàn bộ | Ném `IllegalArgumentException` |
| TC-BLOG-04 | P0 | `create` | A | Subject null hoặc ngoài MATH/CHEMISTRY/PHYSICS | Ném `IllegalArgumentException` |
| TC-BLOG-05 | P0 | `create` | N | HTML có script/thuộc tính nguy hiểm | Nội dung được sanitize trước khi lưu, không còn XSS |
| TC-BLOG-06 | P0 | `update` | N | Chủ bài viết thay đổi từng trường hoặc gửi null để giữ nguyên | Chỉ cập nhật trường được gửi; preserve field còn lại |
| TC-BLOG-07 | P0 | `update` | A | Người khác sửa bài hoặc bài không `PUBLISHED` | Ném `ForbiddenOperationException`/`ResourceNotFoundException` |
| TC-BLOG-08 | P0 | `delete` | N | Chủ bài xóa bài published | Soft-delete với `DELETED_BY_AUTHOR` |
| TC-BLOG-09 | P0 | `delete` | A | Người khác xóa hoặc bài không tồn tại | Từ chối, không đổi trạng thái |
| TC-BLOG-10 | P0 | `removeByModerator` | N | Moderator cùng subject, có reason | Status `REMOVED_BY_MODERATOR`, lưu reason đã trim và `removedBy` |
| TC-BLOG-11 | P0 | `removeByModerator` | A | Reason rỗng; moderator khác subject/không có subject | Ném lỗi và không xóa bài |
| TC-BLOG-12 | P1 | `getDetail` | N/A | Bài published có comment / ID không tồn tại | Trả detail + comment / ném not found |
| TC-BLOG-13 | P1 | `list` | N | Lọc subject, author, keyword; có nhiều bài | Gọi search đúng filter; tổng số, excerpt, ảnh đầu và số comment chính xác |
| TC-BLOG-14 | P1 | `list` | B | Không nhập filter hoặc page rỗng | Trả page rỗng/đúng page metadata |
| TC-CMT-01 | P0 | `BlogCommentService.create` | N | Bài published, comment hợp lệ | Lưu comment với current user, nội dung đã sanitize |
| TC-CMT-02 | P0 | `create` | A | Bài không published/không tồn tại hoặc content rỗng | Ném lỗi, không lưu comment |
| TC-CMT-03 | P0 | `update` | N | Chủ comment cập nhật nội dung hợp lệ | Giữ `createdAt`, đổi content và `updatedAt` |
| TC-CMT-04 | P0 | `update` | A | Comment không tồn tại, content rỗng hoặc không phải chủ sở hữu | Ném lỗi, không lưu |
| TC-CMT-05 | P0 | `delete` | N/A | Chủ comment xóa / người khác xóa | Gọi hard delete / ném `ForbiddenOperationException` |

## 4. Library, textbook, upload, health và molecule

| ID | P | Method | Loại | Tình huống / input | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-LIB-01 | P1 | `LibraryContentService.list` | N | Filter type, subject, keyword, page, size, sort hợp lệ | Trả đúng page và thứ tự theo filter |
| TC-LIB-02 | P1 | `LibraryContentService.get` | N/A | ID tồn tại / không tồn tại | Trả detail / báo not found |
| TC-LIB-03 | P1 | `LibraryContentService.create` | N | Dữ liệu library hợp lệ | Tạo content với owner là current user |
| TC-LIB-04 | P0 | `LibraryContentService.update` | N/A | Owner cập nhật / user khác cập nhật / ID không tồn tại | Cập nhật đúng trường được gửi / từ chối owner khác / not found |
| TC-LIB-05 | P0 | `LibraryContentService.delete` | N/A | Owner xóa / user khác xóa | Soft delete hoặc status theo code / từ chối owner khác |
| TC-TEXT-01 | P1 | `TextbookService.getCatalog` | N | Repository trả catalog hợp lệ | Trả catalog nguyên vẹn |
| TC-TEXT-02 | P1 | `TextbookController` | N/A | Lấy catalog, names, chapters, lessons với mã hợp lệ/không hợp lệ | Đúng dữ liệu hoặc HTTP lỗi phù hợp |
| TC-UPLOAD-01 | P0 | `UploadService.upload` | N | File ảnh/PDF hợp lệ có data, filename, content type | Upload qua storage gateway và trả URL/key |
| TC-UPLOAD-02 | P0 | `upload` | A | Data rỗng, filename/content type không hợp lệ, storage lỗi | Từ chối input hoặc chuyển lỗi storage rõ ràng; không trả URL giả |
| TC-HEALTH-01 | P1 | `HealthService.getHealth` | N | Các dependency health | Trả trạng thái health và chi tiết dependency đúng |
| TC-MOL-01 | P0 | `MoleculeService.build` | N | Tên/công thức molecule hợp lệ; AI trả JSON hợp lệ | Trả `MoleculeStructure` đã parse |
| TC-MOL-02 | P0 | `build` | A | Input rỗng; AI trả JSON lỗi/thiếu field | Ném/chuyển lỗi có kiểm soát, không trả cấu trúc sai |

## 5. Tạo giáo án, slide và AI response parsing

| ID | P | Method | Loại | Tình huống / input | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-LP-01 | P0 | `generateObjectives` | N | Request giáo án hợp lệ, AI trả JSON hợp lệ | Prompt đúng pha; parse ra `LessonPlan5512` |
| TC-LP-02 | P0 | `generateMaterials` | N | Request hợp lệ | Tạo materials đúng schema, không làm mất dữ liệu request |
| TC-LP-03 | P0 | `generateActivitiesFrame` | N | Request hợp lệ | Tạo khung hoạt động đúng schema |
| TC-LP-04 | P0 | `generateActivitiesDetails` | N | Activity details request hợp lệ | Gọi đúng prompt và trả chi tiết hoạt động |
| TC-LP-05 | P0 | các method generate lesson plan | A | AI timeout/lỗi HTTP/JSON không parse được | Service báo lỗi rõ ràng, không trả lesson plan nửa vời |
| TC-LP-06 | P1 | `GenerateLessonPlanStreamUseCase.start` | N/A | Session hợp lệ / dữ liệu không hợp lệ | Phát các event đúng thứ tự / báo lỗi session phù hợp |
| TC-SLIDE-01 | P0 | `LessonContentChunker.chunk` | N | Nội dung nhiều heading/đoạn dài | Chia chunk đúng thứ tự, giữ heading path và contextual text |
| TC-SLIDE-02 | P0 | `LessonContentChunker.chunk` | B | Input rỗng, chỉ heading, nội dung đúng ngưỡng chunk | Không crash; chunk count/nội dung đúng boundary |
| TC-SLIDE-03 | P0 | `GenerateSlideOutlineUseCase.execute` | N | Request hợp lệ, AI trả outline hợp lệ | Trả outline/session với cấu trúc hợp lệ |
| TC-SLIDE-04 | P0 | `start` | N/A | Session tồn tại / session không tồn tại | Chạy generation hoặc báo lỗi không tìm thấy session |
| TC-SLIDE-05 | P0 | `retrySessionPart` | N/A | sessionId và partId hợp lệ / sai | Retry đúng part hoặc từ chối input/session sai |
| TC-SLIDE-06 | P0 | `retryPart` | N/A | Request retry hợp lệ; output AI hợp lệ/JSON lỗi | Update outline đúng / xử lý lỗi parse có kiểm soát |
| TC-SLIDE-07 | P1 | `SlidePromptBuilder.stripFences` | N/B | JSON bọc trong ```json, ``` hoặc không bọc | Chỉ bỏ fence, giữ nguyên JSON hợp lệ |
| TC-DESIGN-01 | P0 | `GenerateSlideHtmlDesignUseCase.execute` | N | AI trả HTML trong fence | Extract HTML đúng, trả response usable |
| TC-DESIGN-02 | P0 | `execute` | A | AI trả thiếu HTML/HTML không hợp lệ/lỗi gateway | Báo lỗi kiểm soát, không phát sinh HTML rỗng |
| TC-DESIGN-03 | P0 | `FillSlideContentUseCase.execute` | N/A | Request hợp lệ / thiếu content slot / AI lỗi | Điền đúng content / validate hoặc báo lỗi |
| TC-DESIGN-04 | P1 | `SlideHtmlExtractor.extract` | N/B | HTML raw, HTML fenced, text không có HTML | Trích HTML đúng hoặc báo kết quả/lỗi được định nghĩa |

## 6. Bảo mật, DTO và exception mapping

| ID | P | Method | Loại | Tình huống / input | Kết quả mong đợi |
|---|---|---|---|---|---|
| TC-SEC-01 | P0 | `JwtTokenAdapter` | N | Access token hợp lệ | Parse đúng user ID, role, subject và expiry |
| TC-SEC-02 | P0 | `JwtTokenAdapter` | A | Token bị sửa, hết hạn hoặc sai format | Từ chối token, không tạo claims |
| TC-SEC-03 | P0 | `StompAuthChannelInterceptor` | N/A | CONNECT có bearer token hợp lệ / thiếu token / token sai | Set principal đúng / từ chối kết nối không hợp lệ |
| TC-SEC-04 | P0 | `CurrentUserProvider` | N/A | Security context có claims / không có claims | Trả claims, user ID / ném lỗi xác thực |
| TC-DTO-01 | P1 | `UserDto` và request DTO | N/B | Mapping field đầy đủ; null optional; enum/UUID không hợp lệ | Mapping đúng; validation/JSON binding phản hồi lỗi đúng |
| TC-ERR-01 | P0 | `GlobalExceptionHandler` | N/A | `ResourceNotFound`, `Forbidden`, `InvalidToken`, validation/AI exception | Map đúng HTTP status và body lỗi, không leak stack trace |

## Đối chiếu với test hiện có

Các test đã có nên được giữ và ghi nhận vào report nếu chạy Pass:

- Auth/Profile/Admin moderator: `AuthServiceTest`, `ProfileServiceTest`, `AdminModeratorServiceTest`.
- Molecule: `MoleculeServiceTest`.
- Slide: `LessonContentChunkerTests`, `SlideContentPlanParsingTests`, `GenerateSlideOutlineUseCaseTest`.
- Slide design: `FillSlideContentUseCaseTests`, `SlideDesignPromptBuilderTests`.
- Security: `JwtTokenAdapterTest`, `StompAuthChannelInterceptorTests`.
- Infrastructure/DTO/advice: `JpaTextbookCatalogRepositoryTests`, `UserDtoTest`, `GlobalExceptionHandlerSlideTests`.

## Đề xuất thống kê để điền sheet `Statistics`

| Nhóm | Case mục tiêu | Gợi ý phân loại |
|---|---:|---|
| Auth & Profile | 17 | N: 7, A: 8, B: 2 |
| Moderator & Teacher | 26 | N: 11, A: 12, B: 3 |
| Blog & Comment | 19 | N: 8, A: 9, B: 2 |
| Library/Textbook/Upload/Health/Molecule | 12 | N: 5, A: 5, B: 2 |
| Lesson plan, Slide & AI | 17 | N: 8, A: 6, B: 3 |
| Security, DTO & exception | 6 | N: 2, A: 3, B: 1 |
| **Tổng** | **97** | Phân loại N/A tại từng dòng thành N, A hoặc B theo biến thể thực tế khi viết case |

> Khi chưa kịp implement hết, vẫn nên để các case chưa chạy là `Untested`, không đánh Pass theo dự đoán. Chỉ ghi Pass sau khi chạy test hoặc kiểm tra kết quả thực tế.
