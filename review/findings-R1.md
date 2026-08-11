# R1 — Publish / duyệt nội dung

Quét ngày 2026-08-10 trên `main`.

Phạm vi: `be/.../service/library/` (6 file, 521 loc), `LibraryContentController`, `HubContentController`,
`fe/app/library/`, `fe/app/hub-moderation/`, `fe/app/lesson-plan-approval/`.

Chạy hai lượt độc lập rồi gộp: **đọc tay** (R1-01…R1-09) và **`/code-review high`** (R1-10…R1-19).
Hai lượt bổ sung nhau gần như không chồng lấn — xem [mục "Đối chiếu hai lượt quét"](#đối-chiếu-hai-lượt-quét)
ở cuối để chọn cách chạy cho R2–R10.

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R1-01 | `LibraryContentService.java:41` | Content không có môn kẹt vĩnh viễn ở SUBMITTED | **Cao** | ✅ Xong |
| R1-02 | `service/library/` (cả package) | Máy trạng thái chạy ngoài transaction, không optimistic lock | **Cao** | ✅ Xong |
| R1-03 | `LibraryContentController.java:16` | PATCH không bao giờ xoá được field về null | **Cao** | Sửa |
| R1-10 | `LibraryContentService.java:70` | Lý do từ chối dài → bài bị từ chối nhưng teacher không được báo | **Cao** | ✅ Xong |
| R1-11 | `fe/app/library/page.tsx:50` | Đề kiểm tra đã lưu không mở được từ thư viện | **Cao** | ✅ Xong |
| R1-12 | `fe/app/hub-moderation/page.tsx:216` | Lỗi tải chi tiết để lại bài cũ → duyệt nhầm bài | **Cao** | ✅ Xong |
| R1-13 | `fe/app/lesson-plan-approval/page.tsx:99` | Không chặn race → hiển thị và mở nhầm bài | **Cao** | ✅ Xong |
| R1-04 | `LibraryContentService.java:43,53,95` | Xung đột trạng thái trả 400 thay vì 409 | TB | ✅ Xong |
| R1-05 | `HubCommentService.java:113` | Ẩn bình luận là trạng thái cuối, không có unhide | TB | Sửa |
| R1-06 | `HubContentReportService.java:33` | Báo cáo vi phạm là ngõ cụt, không chặn spam | TB | Cần quyết định |
| R1-07 | `LibraryContentService.java:39` | Xoá content APPROVED không dọn hệ quả | TB | Sửa |
| R1-14 | `fe/app/library/page.tsx:216` | FE tự ghi `updatedAt` khi mở trang → xáo trộn thứ tự | TB | Sửa |
| R1-15 | `LibraryContentService.java:57` | Ghi log audit fail → bài public không có vết duyệt | TB | Sửa |
| R1-16 | `fe/app/hub-moderation/page.tsx:174` | Spinner chặn tới khi tối đa 100 request lẻ xong | TB | Sửa |
| R1-08 | `HubCommentService.java:23` | Javadoc mô tả sai quyền xoá so với code | Thấp | Sửa |
| R1-09 | `HubContentService.java:73,83` | N+1 query trên feed Hub (endpoint permitAll) | Thấp | Sửa |
| R1-17 | `fe/app/lesson-plan-approval/page.tsx:123` | Thông báo "đã xử lý" đè lên lỗi mạng thật | Thấp | Sửa |
| R1-18 | `fe/app/library/page.tsx:317` | Tab rỗng không có nút tạo mới | Thấp | Sửa |
| R1-19 | `fe/app/lesson-plan-approval/page.tsx:138` | Banner xanh và banner đỏ hiện cùng lúc | Thấp | Sửa |

---

## R1-01 — Content không có môn kẹt vĩnh viễn ở SUBMITTED **[Cao]**

`subject` là nullable và không bắt buộc ở bất kỳ đâu trên đường gửi duyệt:

- `LibraryContentService.create():33` — `parseSubject()` trả `null` khi chuỗi rỗng, không chặn.
- `submit():41-50` — không kiểm tra `c.subject()`.
- `NotificationService.notifyRoleSubject():129-131` — `if (subject == null) return;` — **im lặng bỏ qua**, không moderator nào được báo.
- `JpaLibraryContentRepository.searchByStatusAndSubject():51` — `if (subject != null) equal(subject) else isNull(subject)`.
- `listModerationQueue():85-86` — ném `ForbiddenOperationException` nếu moderator không có subject, nên `moderatorSubject` luôn khác null → predicate luôn là `subject = X`.

**Kịch bản lỗi:** teacher tạo giáo án và bỏ trống môn → bấm "Gửi duyệt" → API trả 200, trạng thái đổi
thành SUBMITTED. Nhưng item không xuất hiện trong hàng chờ của **bất kỳ** moderator nào (không có
queue cho `subject IS NULL`), và không ai nhận được thông báo. Teacher thấy "đang chờ duyệt" mãi mãi.
Lối thoát duy nhất là tự đoán ra và bấm rút nộp.

**Sửa:** bắt buộc `subject != null` trong `submit()`, ném lỗi có thông điệp rõ. Cân nhắc bắt buộc luôn
ở `create()` — nhưng cần kiểm tra dữ liệu cũ trong DB trước, có thể đã tồn tại bản ghi null.

## R1-02 — Máy trạng thái chạy ngoài transaction, không có optimistic lock **[Cao]**

`grep -rn "Transactional" service/library/` → **không có gì**. 16 service khác trong `service/` đều có.
`@Version` chỉ tồn tại đúng một chỗ trong toàn bộ backend: `WeeklyTaskEntity.java:43`.

Mọi chuyển trạng thái đều là read-then-write không nguyên tử: `approve()` 58→60, `reject()` 72→74,
`submit()` 42→44, `unsubmit()` 52→54. `@Transactional(readOnly = true)` ở tầng repository
(`JpaLibraryContentRepository:28,31,42,49`) chỉ bao **một** lệnh đọc, không bao cả cặp đọc-ghi.

**Kịch bản A** — hai moderator cùng môn cùng bấm Duyệt: cả hai qua được
`requireSubmittedInModeratorSubject()` vì đều đọc thấy SUBMITTED, cả hai `save()`. Kết quả: 2 bản ghi
activity log APPROVE và 2 thông báo gửi cho teacher cho cùng một bài.

**Kịch bản B** — teacher bấm Rút nộp đúng lúc moderator bấm Duyệt: tuỳ thứ tự ghi mà content thành
APPROVED dù teacher đã rút (bài lên Hub ngoài ý muốn), hoặc thành PRIVATE dù đã ghi log "đã duyệt".

**Kịch bản C** — `hideByContentOwner():125-132` save comment cha rồi lặp save từng reply. Lỗi giữa
vòng lặp để lại trạng thái ẩn một nửa, không rollback.

**Sửa:** thêm `@Transactional` cho các method mutating trong `LibraryContentService` và
`HubCommentService`; thêm `@Version` vào `LibraryContentEntity` theo đúng pattern đã có ở
`WeeklyTaskEntity`.

## R1-03 — PATCH không bao giờ xoá được field về null **[Cao]**

`LibraryContentService.update():35` nhận từng field theo cặp `(value, valueProvided)` — thiết kế rõ
ràng để phân biệt "client không gửi field" với "client gửi field = null".

`LibraryContentController.java:16` truyền cờ provided bằng `r.subject()!=null`,
`r.grade()!=null`, `r.textbookCode()!=null`, `r.chapterCode()!=null`, `r.payload()!=null`,
`r.thumbnailUrl()!=null` — tức là gộp đúng hai trường hợp mà service cố tình tách. Toàn bộ cơ chế
`xxxProvided` trở thành vô nghĩa.

**Kịch bản lỗi:** người dùng đã gán môn Vật lý cho một giáo án, giờ muốn bỏ trống lại. Gửi
`PATCH {"subject": null}` → controller tính `provided = false` → service giữ nguyên giá trị cũ. API
trả 200 kèm giá trị cũ. Không có cách nào gỡ môn/khối/mã sách/ảnh bìa qua API.

**Sửa:** dùng `JsonNullable<T>` trong request DTO, hoặc nhận `Map<String, Object>` thô để biết key nào
thực sự có mặt trong body.

## R1-04 — Xung đột trạng thái trả 400 thay vì 409 **[TB]**

`submit():43`, `unsubmit():53`, `requireSubmittedInModeratorSubject():95` đều ném
`IllegalArgumentException`, mà `GlobalExceptionHandler:51-54` map thẳng sang **400 Bad Request**.

Đây không phải lỗi nhập liệu mà là xung đột trạng thái — client gửi đúng, chỉ là trạng thái đã đổi.
FE không có cách phân biệt "bạn nhập sai, sửa lại đi" với "người khác vừa đổi trạng thái, hãy tải lại
trang", nên không thể hiện thông báo đúng.

Pattern 409 đã có sẵn trong cùng file handler (`DuplicateEmailException:122`,
`ClassEnrollmentConflictException:127`) — chỉ cần một domain exception mới dùng lại đường đó.

## R1-05 — Ẩn bình luận là trạng thái cuối, không có đường quay lại **[TB]**

`hideByContentOwner():113-133` set `hiddenAt`/`hiddenBy`. Không có method unhide, không có endpoint
tương ứng trong `HubContentController` (chỉ có `POST /comments/{id}/hide`).

Nặng hơn: `requireComment():144-150` ném `ResourceNotFoundException` khi `hiddenAt != null`. Nên sau
khi bị ẩn, **chính tác giả** cũng không sửa hay xoá được bình luận của mình — nó biến mất khỏi mọi
đường thao tác nhưng vẫn nằm trong DB.

Ẩn nhầm một bình luận = vĩnh viễn. Cộng thêm BR-29/BR-30 (`after8_9.md` mục B1): không gửi thông báo
cho tác giả bình luận.

## R1-06 — Báo cáo vi phạm là ngõ cụt **[TB, cần quyết định]**

`HubContentReportService.create():33-43` chỉ `save()` rồi thôi. Không notify moderator, không có
endpoint liệt kê report, không có UI đọc. Javadoc dòng 15-16 tự thừa nhận WBS không định nghĩa luồng xử lý.

Ngoài ra không có ràng buộc trùng: cùng một user gửi report cùng một content không giới hạn số lần.

**Cần quyết định:** đây là tính năng chưa làm xong (thuộc nhóm A của `after8_9.md`) hay chấp nhận là
write-only cho kỳ này. Nếu chấp nhận thì tối thiểu nên chặn report trùng.

## R1-07 — Xoá content APPROVED không dọn hệ quả **[TB]**

`delete():39` soft-delete bất kể trạng thái, kể cả content đang APPROVED hiển thị công khai trên Hub.

- Comment không bị xoá cũng không bị ẩn, vẫn nằm trong bảng.
- Sau khi xoá, `hideByContentOwner():119-120` fail với "Content not found" → chủ sở hữu mất khả năng
  kiểm duyệt chính những comment vẫn còn trong DB.
- Không ghi activity log và không gửi thông báo, trái với `approve():61` và `reject():75` đều có log.
  Moderator đã duyệt bài không hề biết bài bị gỡ khỏi Hub.

Liên quan BR-32 (`after8_9.md` mục B2): SRS tách "gỡ khỏi Hub" khỏi "xoá trong thư viện cá nhân";
code hiện gộp làm một.

## R1-08 — Javadoc mô tả sai quyền xoá **[Thấp]**

`HubCommentService` javadoc dòng 23-25: *"xóa cho phép nếu là tác giả bình luận HOẶC chủ sở hữu
content (đúng 2 yêu cầu WBS trong 1 rule)"*.

`delete():104-111` chỉ cho phép tác giả; chủ sở hữu content phải dùng `hide`. Sửa javadoc cho khớp
code, hoặc sửa code cho khớp WBS — cần đối chiếu WBS trước.

## R1-09 — N+1 query trên feed Hub **[Thấp]**

`HubContentService.toSummary():73-74` gọi `ownerName()` (1 query `findById`) và
`commentRepository.countByLibraryContentId()` (1 query) cho **mỗi** item → một trang 20 item tốn 41 query.
`toDetail():83-84` tương tự, 1 query cho mỗi comment.

---

## R1-10 — Lý do từ chối dài làm teacher không bao giờ nhận được thông báo **[Cao]**

`reject():70-82` không giới hạn độ dài `rawReason`, nhưng thông báo ghép từ nó đi qua
`NotificationService.requireText(..., CONTENT_MAX_LENGTH = 2000)`. Textarea nhập lý do
(`fe/app/hub-moderation/page.tsx:395`) cũng không có `maxLength`.

**Kịch bản lỗi:** moderator viết lý do từ chối dài hơn ~1950 ký tự (nhận xét chi tiết cả bài — hoàn
toàn hợp lý). `repository.save():74` commit trạng thái REJECTED trong transaction riêng của nó, rồi
`notifyRecipient():77` ném `IllegalArgumentException` → HTTP 400. Moderator thấy "Không thể từ chối
nội dung" (`hub-moderation:272`) và tin là thao tác thất bại, nhưng tải lại thì bài đã biến mất khỏi
hàng chờ. Teacher thì không bao giờ nhận được thông báo bị từ chối, cũng không biết lý do.

Đây là ca cụ thể, dễ tái hiện của R1-02. `WeeklyTaskService.reject():331` làm đúng: có `@Transactional`
và không đẩy nội dung người dùng qua `requireText`.

## R1-11 — Đề kiểm tra đã lưu không mở được từ thư viện **[Cao]**

`fe/app/library/page.tsx:50` — `paths.TEST = "/library"`, tự trỏ về chính nó. Nút "Mở", link tiêu đề
và link ảnh bìa (337 / 340 / 356) đều dẫn tới `/library?libraryId=…`, mà không chỗ nào trên trang đọc
tham số `libraryId`. `createPaths` (54-58) cũng không có mục `TEST`.

Editor thật sự đọc `libraryId` cho nội dung TEST là `PracticeExamEditDashboard`, gắn ở `/exam-edit-new`
(`PracticeExamEditDashboard.tsx:68`).

**Kịch bản lỗi:** teacher lưu một đề kiểm tra vào thư viện rồi mở lại — bấm vào đâu cũng chỉ nạp lại
trang thư viện. Đề đã lưu không có đường nào mở được. Đây là ngõ cụt chức năng, không chỉ là lỗi điều hướng.

## R1-12 — Lỗi tải chi tiết để lại bài cũ, moderator duyệt nhầm bài **[Cao]**

`fe/app/hub-moderation/page.tsx:209-230` — effect tải chi tiết chỉ `setDetail` khi thành công; nhánh
`.catch():220-222` chỉ hiện toast, **không** `setDetail(null)`.

**Kịch bản lỗi:** moderator mở bài A (tải xong), rồi chọn bài B nhưng request lỗi. Toast lỗi hiện 3.5
giây rồi tự tắt (`205-207`). `selectedId` và ô được tô sáng trong danh sách là B, trong khi khung bên
phải vẫn hiển thị tiêu đề, thời điểm gửi và nội dung của A. Moderator đọc rồi bấm "Duyệt lên Hub" —
nút thao tác theo `detail.id`, nên **A được duyệt** chứ không phải B.

**Sửa:** `setDetail(null)` trong `.catch`, hoặc chỉ render khi `detail.id === selectedId`.

Cần đính chính: kết luận trước đó của tôi rằng màn `hub-moderation` "phòng thủ tốt, không có finding"
là sai. Cờ `acting` chặn double-click đúng, nhưng đường xử lý lỗi thì không.

## R1-13 — Race giữa hai lần mở chi tiết, mở nhầm tài liệu **[Cao]**

`fe/app/lesson-plan-approval/page.tsx:99` — `handleExpand` không có cờ huỷ, khác với
`hub-moderation:211` vốn có `cancelled`.

**Kịch bản lỗi:** bấm nhiệm vụ A rồi bấm nhanh sang B. Hai request `getWeeklyTask` cùng bay; nếu A về
sau thì `setDetail(A)` thắng trong khi `expandedId === B`. Panel của B hiển thị hạn nộp và nguồn của A,
và nút "Mở tài nguyên" (354) mở tài liệu giáo án của A trong modal xem trước.

**Sửa:** áp cùng pattern `cancelled` đã có sẵn ở `hub-moderation`.

## R1-14 — Mở trang thư viện là ghi đè `updatedAt`, xáo trộn thứ tự sắp xếp **[TB]**

`fe/app/library/page.tsx:216-232` — effect backfill metadata tự gọi `updateLibraryContent` từ client
cho mọi item thiếu ảnh bìa hoặc thiếu khối lớp.

`LibraryContentService.update():37` set `updatedAt = Instant.now()`, mà sort mặc định của trang là
`updatedAt` giảm dần. Nên chỉ cần **mở trang thư viện** là hệ thống viết lại thời điểm sửa đổi của
hàng loạt item cũ, và lần `load()` kế tiếp (sau khi đổi tên, gửi duyệt, hoặc xoá) danh sách nhảy thứ tự.
Với 50 item còn tốn tới 100 round-trip mỗi lần vào trang.

**Sửa:** chuyển việc sinh ảnh bìa/khối lớp về backend, hoặc thêm đường ghi metadata không đụng `updatedAt`.

## R1-15 — Ghi log audit thất bại làm bài lên Hub không có vết duyệt **[TB]**

`approve():57-68` gọi tuần tự `repository.save()` → `activityLogService.record()` →
`notifyRecipient()`, ba transaction độc lập, method không có `@Transactional`.

Nếu bước ghi log hỏng, content đã APPROVED và đang công khai trên Hub nhưng **không có bản ghi
MODERATION nào** — đúng thứ mà màn audit của IT Staff dựa vào. `WeeklyTaskService.approve` có
annotate; class này thì không.

## R1-16 — Spinner hàng chờ bị chặn tới khi tối đa 100 request lẻ xong **[TB]**

`fe/app/hub-moderation/page.tsx:174` — `load()` lấy hàng chờ với `size: "100"`, rồi
`await Promise.all(...)` gọi `getModerationContent` cho từng item thiếu khối lớp. `setLoading(false)`
nằm trong `finally` **sau** await đó, nên toàn bộ danh sách vẫn quay spinner cho tới khi cả trăm
request lẻ kết thúc, dù dữ liệu danh sách đã về từ lâu.

## R1-17 — Thông báo "đã xử lý" đè lên lỗi mạng thật **[Thấp]**

`fe/app/lesson-plan-approval/page.tsx:123` — effect xử lý deep-link chạy ngay khi `loading` thành false.
Nếu `load()` ném lỗi thì `items` rỗng và `error` đang giữ lỗi mạng thật, effect này ghi đè bằng
"Không tìm thấy nhiệm vụ được thông báo trong hàng đợi hiện tại — có thể đã được xử lý."

Moderator bấm vào thông báo, nhận được câu "chắc ai đó xử lý rồi" trong khi thực ra hàng chờ **chưa hề
tải được**. Cũng báo nhầm khi nhiệm vụ có thật nhưng bị lọc theo khối/chương hoặc rơi ngoài `size: 50`.

## R1-18 — Tab rỗng không có nút tạo mới **[Thấp]**

`fe/app/library/page.tsx:317-318` — thẻ "Tạo … mới" chỉ được render trong nhánh danh sách khác rỗng.
Khi tab đang chọn không có item nào — đúng lúc người dùng cần nút tạo nhất — chỉ hiện ô gạch đứt
"Chưa có nội dung nào trong thư viện này.", không có lối tạo.

## R1-19 — Banner xanh và banner đỏ hiện cùng lúc **[Thấp]**

`fe/app/lesson-plan-approval/page.tsx:138` — `handleApprove`/`handleReject` set `msg` mà không xoá
`error`; `handleExpand:113` set `error` mà không xoá `msg`. Sau một lần tải chi tiết lỗi rồi duyệt
thành công, trang hiện đồng thời banner xanh "Đã duyệt." và banner đỏ cũ. Effect đổi bộ lọc ở dòng 93
đã xoá cả hai, nên chủ ý loại trừ lẫn nhau vốn có sẵn trong file.

---

## Đã biết từ trước — xác nhận lại

Ba mục `after8_9.md` đã nêu, kiểm tra lại vẫn đúng nguyên:

- **B2 / `update():35-38`** — giữ nguyên `c.status()`, nên sửa nội dung đang APPROVED là sửa thẳng bản
  đang public trên Hub, không qua duyệt lại. Trạng thái SUBMITTED cũng không bị khoá sửa.
- **B1 / `unsubmit():51-55`** — không gửi thông báo cho moderator phụ trách.
- **B1 / `hideByContentOwner():113`** — không gửi thông báo cho tác giả bình luận.

## Kiểm tra nhưng không có vấn đề

- **Soft-delete nhất quán**: cả 4 query method trong `JpaLibraryContentRepository` (28, 31, 42, 49)
  đều lọc `deletedAt IS NULL`. Không có đường rò content đã xoá.
- **Phân quyền endpoint**: `LibraryContentController` có `@PreAuthorize` ở cấp class + cấp method cho
  4 endpoint moderation. `HubContentController` để `GET /contents` và `GET /contents/{id}` không cần
  auth — đúng chủ ý "guest preview" ghi trong javadoc `HubContentService`; mọi endpoint mutating đều
  có `@PreAuthorize`.
- **Chống double-click phía FE**: `fe/app/hub-moderation/page.tsx` có cờ `acting` disable nút ở 379,
  383, 397, 398. Chỉ đúng ở phạm vi này — đường xử lý lỗi của cùng file thì hỏng, xem R1-12 và R1-16.
- **Ràng buộc reply 1 cấp**: `HubCommentService.create():58-60` chặn reply-của-reply và chặn reply
  sang content khác.

---

## Đối chiếu hai lượt quét

Chồng lấn rất ít — mỗi lượt bắt được một loại lỗi khác nhau:

| | Đọc tay | `/code-review high` |
| --- | --- | --- |
| Tổng finding | 9 | 14 |
| Cả hai cùng bắt | R1-01, R1-03, R1-08, R1-09 | (4 mục) |
| Chỉ lượt này bắt | R1-02 (systemic), R1-04, R1-05, R1-06, R1-07 | R1-10…R1-19 (10 mục) |

**Đọc tay mạnh ở lỗi hệ thống và lỗ hổng "không có gì cả"** — thiếu `@Transactional` cả package,
thiếu endpoint unhide, báo cáo vi phạm không có đường xử lý, sai HTTP status. Đây là loại phải so sánh
package này với package khác, hoặc nhận ra một thứ đáng lẽ phải tồn tại mà không tồn tại.

**Lượt tự động mạnh ở đường lỗi phía FE và ca kích hoạt cụ thể** — 8/14 finding của nó nằm ở `fe/`,
vùng mà đọc tay đã bỏ qua và còn kết luận sai. Nó cũng cụ thể hoá R1-02 thành hai ca tái hiện được
(R1-10, R1-15), và kiểm chứng ở tầng migration (xác nhận `V10` không có NOT NULL cho `subject`) —
việc mà đọc tay đã bỏ.

**Áp dụng cho R2–R10:** chạy cả hai, và **chạy lượt tự động trước**, vì nó rẻ hơn và phủ FE tốt hơn;
đọc tay sau, tập trung vào câu hỏi "cái gì đáng lẽ phải có mà không có" thay vì đọc lại từng dòng.
Không cần nâng lên `max` cho R1 — mức `high` đã bắt được cả 4 lỗ đã biết trước.
