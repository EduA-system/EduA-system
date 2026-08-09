# Weekly Task — Khối (Grade) Scoping, Khoá cứng hạn nộp theo tuần thực, Filter màn duyệt

> Trạng thái: **Coded** (2026-08-06) trên nền Weekly Task đã "Coded" trước đó (xem `WBS_CHECKLIST.md`
> dòng UC-80/81/83/84/85 và UC-86/87/88/89). Migration `V37` (khối) + `V38` (Chương/Bài, BR-53 — thêm sau
> khi review UI thực tế, xem mục 2c) đã áp dụng. Nguồn: yêu cầu người dùng ngày 2026-08-06 — Mod giao lịch
> theo khối, hạn nộp mặc định/khoá cứng theo tuần, màn duyệt filter theo khối/chương/bài, mỗi ô lịch tuần
> = 1 bài chọn từ danh mục SGK (không phải mô tả tự do).
>
> **Thay thế `deadline-rule.md`**: file đó đề xuất BR-50 (hạn nộp = Chủ Nhật tuần **liền trước** tuần
> dạy). Sau khi trao đổi lại, quyết định cuối cùng là hạn nộp = Chủ Nhật của **chính tuần dạy đó** — xem
> mục 2b. `deadline-rule.md` được giữ lại làm lịch sử thảo luận, có ghi chú trỏ sang tài liệu này.

## 1. Bối cảnh

Weekly Task hiện tại (`WeeklyTaskService`, `weekly_tasks` table) đã có đủ luồng Mod giao — Teacher nộp —
Mod duyệt, nhưng còn 3 khoảng trống so với yêu cầu thực tế:

1. Không có khái niệm **khối (10/11/12)** trên Weekly Task — `bulkCreate` giao cho *toàn bộ* giáo viên
   active cùng môn, không phân biệt khối. Trong khi đó `teacher_grades` (`V36__create_teacher_grades.sql`,
   `TeacherGradeRepository`) đã ghi nhận giáo viên nào dạy khối nào (vừa được thêm, chưa nối vào Weekly
   Task) — xem `fe/app/user-management/page.tsx` (`GradeCheckboxes`) và
   `ModeratorTeacherService.addTeacher`.
2. Hạn nộp (`deadline`) do Mod tự nhập tự do qua `DatePicker`, không có quy tắc mặc định/khoá cứng nào.
3. Màn duyệt `/lesson-plan-approval` (đã có route, `WeeklyTaskController#moderationQueue`) chỉ lọc theo
   `subject` (ngầm định từ JWT) + trạng thái `SUBMITTED`, không lọc theo khối hay tìm theo nội dung
   bài/chương.

## 2. Business Rules mới

### 2a. BR-51 (đề xuất) — Weekly Task luôn gắn với đúng 1 khối

> Mỗi Weekly Task thuộc về đúng 1 khối trong `{10, 11, 12}`. Mod chỉ được giao task cho giáo viên có khối
> đó trong danh sách khối họ dạy (`teacher_grades`). Một giáo viên dạy nhiều khối cùng môn sẽ nhận nhiều
> Weekly Task độc lập (mỗi khối 1 task/tuần), nộp riêng từng task — đúng ý "dạy 2 khối thì nộp 2 lần".

Hệ quả: 2 khối khác nhau có thể có lịch giáo án khác nhau trong cùng 1 tuần (`weekStartDate` trùng nhau
nhưng `grade` khác nhau) — check "tuần này đã có lịch, không tạo lại" trong `bulkCreate` hiện tại
(`repository.findBySubject(subject, weekStartDate, weekStartDate).isEmpty()`,
`WeeklyTaskService.java:129`) phải đổi thành check theo `(subject, grade, weekStartDate)`.

### 2b. BR-52 (đề xuất, thay thế BR-50 ở `deadline-rule.md`) — Hạn nộp khoá cứng theo tuần lịch thực

> Hạn nộp của Weekly Task cho tuần dạy A luôn là **23:59:59 (giờ VN) Chủ Nhật của chính tuần A**, tính
> theo tuần lịch thực Thứ Hai → Chủ Nhật (không phải quy ước 1/8/15/22 hiện tại của FE — xem mục 4). Giá
> trị này do hệ thống tự tính từ `weekStartDate`, **không nhận từ client** — Mod không còn chọn hạn nộp
> bằng tay. `weekStartDate` phải là Thứ Hai của tuần đó; nếu client gửi ngày khác Thứ Hai, backend tự
> chuẩn hoá về Thứ Hai của tuần chứa ngày đó trước khi tính deadline.

```
deadline(A) = Thứ Hai(weekStartDate(A)).plusDays(6), 23:59:59, Asia/Ho_Chi_Minh
```

So với BR-50 cũ (hạn = Chủ Nhật tuần liền **trước** A): quyết định này chọn nộp **trong** tuần dạy thay
vì bắt buộc nộp xong **trước khi** tuần dạy bắt đầu — giữ đúng nguyên văn yêu cầu người dùng ("hạn nộp
cuối sẽ cho mặc định là các chủ nhật của tuần", xác nhận lại ngày 2026-08-06: "chia theo tuần thực tế Thứ
2 → Chủ nhật, tính từ hôm nay"). Không cần rule riêng cho "tuần đầu tiên" như mục 3.3 của
`deadline-rule.md` vì công thức chỉ phụ thuộc `weekStartDate` của chính task, không tham chiếu tuần liền
trước.

Việc này khoá cứng — không có phương án (b) "mặc định + cho sửa" như `deadline-rule.md` từng cân nhắc:
Mod không có input hạn nộp trong form tạo/sửa nữa, chỉ hiển thị đọc.

### 2c. BR-53 (đã code, thêm sau khi review UI 2026-08-06) — Mỗi ô lịch tuần = 1 Bài chọn từ danh mục SGK

> Ban đầu Mod nhập Chương/Bài dưới dạng mô tả tự do trong 1 textarea, và 1 modal có thể tạo nhiều bài cùng
> lúc ("+ Thêm bài"). Sau khi xem UI thực tế, đổi lại: mỗi ô trong lưới lịch tuần (đúng 2 ô/tuần, xem mục
> 4/5) tương ứng đúng 1 Bài — Mod nhập 1 "Tiêu đề" tự do (`scopeDescription`, không còn là mô tả
> chương/bài) + chọn Chương và Bài qua 2 dropdown liên động, lấy từ danh mục SGK đã có sẵn trong hệ thống
> (`TextbookCatalogRepository`, `GET /api/textbooks/...` — dùng lại nguyên xi client `fetchTextbookNames`
> /`fetchTextbookChapters`/`fetchChapterLessons` ở `fe/services/lessonPlanService.ts`, đã có UI mẫu ở
> `UserDashboard.tsx`/`PracticeExamCreateDashboard.tsx`). Sách giáo khoa (`textbookCode`) tự resolve từ
> (subject, khối đã chọn) — thường ra đúng 1 cuốn; nếu nhiều tập thì lộ thêm dropdown chọn sách.
>
> Tối đa **2 bài/tuần** cho 1 (subject, grade) — khớp đúng "2 ô lịch tuần". Không được trùng `lessonCode`
> trong cùng tuần. `chapterName`/`lessonName` do **server tự resolve** tại thời điểm tạo/sửa (tra
> `TextbookCatalogRepository.listChapters`/`listLessons`, không tin dữ liệu client gửi lên) — denormalize
> giống pattern `sourceLibraryContentTitle` đã dùng cho nguồn nộp.

Migration `V38__add_textbook_reference_to_weekly_tasks.sql`: thêm `textbook_code`, `chapter_code`,
`chapter_name`, `lesson_code`, `lesson_name` (đều `NOT NULL`) vào `weekly_tasks`. `scope_description` giữ
nguyên tên cột/field — chỉ đổi nghĩa từ "mô tả chương/bài tự do" sang "Tiêu đề Mod tự nhập". Cũng xóa dòng
cũ thiếu `textbook_code` trước khi `SET NOT NULL`, cùng chính sách với `V37` (mục 3).

## 3. Ảnh hưởng schema

Migration mới `V37__add_grade_to_weekly_tasks.sql`: thêm cột `grade INTEGER NOT NULL` (CHECK `IN (10, 11,
12)`, cùng kiểu ràng buộc với `teacher_grades`) vào `weekly_tasks`, cộng index
`(subject, grade, week_start_date)`. Cột `deadline` giữ nguyên kiểu, chỉ đổi cách ghi (server tính, không
nhận từ request).

**Đã xác nhận (2026-08-06):** `weekly_tasks` trên môi trường chạy migration này đã có dữ liệu test —
migration `DELETE FROM weekly_tasks WHERE grade IS NULL;` trước khi `SET NOT NULL`, không backfill. Lần
chạy đầu (trước khi thêm bước DELETE) đã fail với `23502 column "grade" ... contains null values`; vì
Postgres DDL transactional nên toàn bộ script đã tự rollback, không để lại schema nửa vời.

## 4. Đổi quy ước "tuần" ở FE — điều kiện tiên quyết cho BR-52

`fe/app/weekly-schedule/page.tsx` hiện chia lưới lịch theo 4 mốc cố định trong tháng — ngày 1/8/15/22
(`monthWeekStarts`, dòng 56-59) — khớp cách chia PPCT theo tuần nhưng **không phải tuần lịch thật**. BR-52
chỉ có nghĩa rõ ràng khi `weekStartDate` neo theo Thứ Hai ISO thực tế. Cần thay `monthWeekStarts` +
`buildMonthSchedule` bằng một generator tuần lịch chuẩn: liệt kê mọi Thứ Hai phủ tháng đang xem (Thứ Hai
≤ ngày 1 của tháng, lặp mỗi 7 ngày tới khi vượt ngày cuối tháng) — số tuần/tháng sẽ là 4–6 tuỳ tháng thay
vì cố định 4, và tuần đầu/cuối tháng có thể là tuần "thiếu ngày" (chấp nhận được, đã xác nhận với người
yêu cầu).

## 5. Ảnh hưởng UI

### `weekly-schedule` (Mod) — đã code
- Thêm bộ chọn khối (10/11/12, single-select, `GradeSelect`) cạnh `MonthPicker` — Mod phải chọn khối trước
  khi xem lưới lịch / giao bài.
- Lưới lịch: **đúng 2 ô cố định/tuần** (không phải danh sách N bài trong 1 modal nữa) — ô trống hiện nút
  "Ấn để thêm bài thứ nhất/hai", ô đã có bài hiện `LessonGroupCard` (tiêu đề + Chương/Bài + trạng thái nộp
  theo từng giáo viên). Nhóm theo `lessonCode` (không phải text), sắp theo `createdAt`.
- Click 1 ô trống mở modal "Giao bài" — 1 Tiêu đề (textarea) + dropdown Chương + dropdown Bài (component
  dùng chung `useTextbookPicker`, `fe/lib/textbook-picker.ts`), scope theo khối đã chọn ở trên; gọi
  `POST /api/weekly-tasks/bulk` với đúng 1 lesson.
- Bỏ hẳn input hạn nộp (mọi nơi) — chỉ hiển thị dòng hạn nộp tính sẵn (đọc, không sửa).
- Modal "Sửa nhiệm vụ" (1 task/giáo viên): thêm dropdown Chương/Bài cùng cơ chế, pre-fill từ task đang
  sửa; dropdown giáo viên lọc theo khối trong `teacher_grades` (`TeacherDto.grades` từ
  `GET /api/moderator/teachers`).
- Teacher view: thêm badge khối + dòng Chương/Bài trên mỗi task card.

### `lesson-plan-approval` (Mod) — đã code
- Thêm filter khối (`GradeSelect`, có "Tất cả khối") + 2 dropdown Chương/Bài (cùng `useTextbookPicker`,
  disabled tới khi có khối cụ thể) — **không phải ô tìm kiếm tự do** như bản đầu.
- Giữ nguyên toàn bộ logic expand chi tiết / duyệt / từ chối đã hoạt động (`approveWeeklyTask`,
  `rejectWeeklyTask`), chỉ bọc thêm thanh filter phía trên; card item thêm dòng Chương/Bài.

## 6. Việc không làm trong đợt này

- Không đổi `LibraryContentStatus` (Hub publish status) hay mối quan hệ tách biệt của nó với
  `WeeklyTaskReviewStatus` — nguyên tắc này giữ nguyên như comment gốc trong `WeeklyTaskService.java`.
- Không xử lý nghỉ lễ / dời lịch (mục 3.4 của `deadline-rule.md`) — để lại cho thiết kế sau nếu cần.
- Không validate `textbookCode` khớp chính xác `subject`/`grade` bằng ràng buộc DB — chỉ check ở service
  (`requireBookMatchesGrade`, tra `listBookNames` mỗi lần ghi).

## 7. Điểm mở

1. ~~Chiến lược backfill cột `grade`~~ — đã chốt: xóa dòng cũ (mục 3).
2. `GET /api/weekly-tasks` (schedule) khi Mod chưa chọn khối: giữ API cho phép `grade` optional (xem tất
   cả khối) hay bắt buộc `grade` ngay từ backend? Đề xuất giữ optional ở API, FE luôn truyền vì UX bắt Mod
   chọn khối trước.

## 8. UI refinement (2026-08-06, updated 2026-08-09) — lịch Mod mở tuần tương lai, khóa tuần đã qua

> Nguồn: phản hồi người dùng ngày 2026-08-09 sau khi rà lại nghiệp vụ: Moderator cần giao bài được cho
> tuần tương lai để chuẩn bị lịch trước; các ô tuần đã kết thúc vẫn phải khóa vì backend cũng chặn theo
> deadline. Teacher vẫn chỉ nộp/rút trong tuần đang diễn ra trên UI. Cùng ngày, người dùng chốt lại cách
> hiểu nghiệp vụ: tuần hiển thị trên `/weekly-schedule` là **lịch nộp giáo án**; lịch dạy thực tế của bài
> đó là **tuần liền sau**.

Thay đổi (FE-only, `fe/app/weekly-schedule/page.tsx`):

- **Hiện đủ tuần trong tháng cho Moderator**: lưới lịch Mod không lọc bỏ tuần đã kết thúc nữa; các tuần quá
  khứ hiện ô readonly "Đã qua hạn" khi còn slot trống.
- **Mở giao bài cho tuần hiện tại và tương lai** (`canAssignWeek`): ô trống hiện nút "Ấn để thêm bài thứ
  nhất/hai" khi tuần chưa kết thúc, bao gồm tuần tương lai.
- **Hiển thị lịch dạy thực tế trong ngoặc**: các nhãn tuần, modal giao/sửa, và card task hiển thị tuần đang
  xem là "Lịch nộp", kèm `(lịch dạy thực tế: <tuần nộp + 7 ngày>)` để tránh nhầm với tuần dạy.
- **Modal sửa task không cho đổi giáo viên/tuần**: form sửa dùng lại layout giống modal giao bài, nhưng bỏ
  chọn giáo viên và chọn thời gian vì hai giá trị này đã được lấy từ task đang sửa; API update vẫn gửi giá
  trị cũ để giữ nguyên assignment.
- **Teacher vẫn khóa theo tuần hiện tại trên UI**: "Nộp giáo án"/"Hủy nộp" chỉ hiện ở tuần đang diễn ra;
  tuần tương lai/quá khứ hiện nhãn thay thế ("Chưa tới tuần"/"Đã qua tuần").
- **Không đổi backend**: `requireWeekNotEnded` (Mod tạo/sửa) và `requireBeforeDeadline` (Teacher nộp/rút)
  ở `WeeklyTaskService` giữ nguyên. Nếu cần chặn cứng ở API (vd. Mod gọi thẳng `POST /api/weekly-tasks/bulk` cho tuần tương
  lai), cần bổ sung riêng — chưa làm trong đợt này.

### Library status badge (2026-08-06) — hiện trạng thái Weekly Task trên `/library`

> Nguồn: người dùng phát hiện — 1 giáo án đang `SUBMITTED` trên Weekly Task (đã nộp cho Mod ở
> `/weekly-schedule`) vẫn hiện "Riêng tư" trên card `/library`, vì đó là 2 field trạng thái độc lập:
> `LibraryContent.status` (Hub-publish, nút giấy máy bay trên chính `/library`) và
> `WeeklyTaskReviewStatus` (nộp giáo án tuần) — tách biệt hoàn toàn theo đúng nguyên tắc comment gốc
> trong `WeeklyTaskService.java`. Người dùng coi 4 trạng thái Weekly Task (Nháp/Chờ duyệt/Đã duyệt/Từ
> chối) chính là "trạng thái của giáo án" mà họ quan tâm hàng ngày, không phải Hub-publish status.

- Thêm `sourceLibraryContentId` vào `WeeklyTaskViews.Summary` (trước đây chỉ có ở `Detail`) — field bổ
  sung thuần túy, không đổi hành vi backend nào khác, không đổi nguyên tắc tách biệt 2 status trong tầng
  service/domain (chỉ FE dùng field này để đối chiếu hiển thị).
- FE `fe/app/library/page.tsx`: Teacher load thêm `GET /api/weekly-tasks` (khoảng ngày rộng, 1 năm
  trước → 1 năm sau, để không bỏ sót task ngoài cửa sổ mặc định -4/+8 tuần của API) một lần lúc mount,
  dựng `Map<sourceLibraryContentId, reviewStatus>`. Card `LESSON_PLAN` nào có trong map thì hiện badge
  theo `reviewStatus` đó (kèm icon, tooltip nói rõ "đã nộp cho Moderator trong Lịch tuần") thay vì
  `LibraryContent.status`; card nào không có (chưa từng nộp task tuần) vẫn hiện `LibraryContent.status`
  như cũ (mặc định "Nháp"). Nút "Gửi duyệt lên Hub cộng đồng" (giấy máy bay) không đổi — vẫn thao tác
  trên `LibraryContent.status` gốc, độc lập với badge hiển thị.
- Nhãn thống nhất cho cả 2 nguồn status: Nháp/Chờ duyệt/Đã duyệt/Từ chối, kèm icon (Lock/Clock/
  CheckCircle2/XCircle) — không còn nhãn cũ "Riêng tư"/"Đang chờ duyệt"/"Đã lên Hub"/"Cần chỉnh sửa".
