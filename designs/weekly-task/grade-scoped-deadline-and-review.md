# Weekly Task — Khối (Grade) Scoping, Khoá cứng hạn nộp theo tuần thực, Filter màn duyệt

> Trạng thái: **Đề xuất bổ sung** (chưa code) trên nền Weekly Task đã "Coded" (xem `WBS_CHECKLIST.md`
> dòng UC-80/81/83/84/85 và UC-86/87/88/89). Đây là 3 thay đổi cộng thêm vào epic đã có, không phải viết
> lại từ đầu. Nguồn: yêu cầu người dùng ngày 2026-08-06 — Mod giao lịch theo khối, hạn nộp mặc định/khoá
> cứng theo tuần, màn duyệt filter theo khối/chương/bài.
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

## 3. Ảnh hưởng schema

Migration mới `V37__add_grade_to_weekly_tasks.sql`: thêm cột `grade INTEGER NOT NULL` (CHECK `IN (10, 11,
12)`, cùng kiểu ràng buộc với `teacher_grades`) vào `weekly_tasks`, cộng index
`(subject, grade, week_start_date)`. **Cần kiểm tra `weekly_tasks` có dữ liệu sẵn trên DB Supabase chung
hay chưa trước khi chạy** — nếu có, cần chốt chiến lược backfill (giá trị `grade` mặc định cho các dòng
cũ) trước khi thêm `NOT NULL`, theo đúng nguyên tắc "không tự ý sửa schema/dữ liệu trên DB chung" của
`CLAUDE.md`. Cột `deadline` giữ nguyên kiểu, chỉ đổi cách ghi (server tính, không nhận từ request).

## 4. Đổi quy ước "tuần" ở FE — điều kiện tiên quyết cho BR-52

`fe/app/weekly-schedule/page.tsx` hiện chia lưới lịch theo 4 mốc cố định trong tháng — ngày 1/8/15/22
(`monthWeekStarts`, dòng 56-59) — khớp cách chia PPCT theo tuần nhưng **không phải tuần lịch thật**. BR-52
chỉ có nghĩa rõ ràng khi `weekStartDate` neo theo Thứ Hai ISO thực tế. Cần thay `monthWeekStarts` +
`buildMonthSchedule` bằng một generator tuần lịch chuẩn: liệt kê mọi Thứ Hai phủ tháng đang xem (Thứ Hai
≤ ngày 1 của tháng, lặp mỗi 7 ngày tới khi vượt ngày cuối tháng) — số tuần/tháng sẽ là 4–6 tuỳ tháng thay
vì cố định 4, và tuần đầu/cuối tháng có thể là tuần "thiếu ngày" (chấp nhận được, đã xác nhận với người
yêu cầu).

## 5. Ảnh hưởng UI

### `weekly-schedule` (Mod)
- Thêm bộ chọn khối (10/11/12, single-select) cạnh `MonthPicker` — Mod phải chọn khối trước khi xem lưới
  lịch / bulk-assign. Tái dùng convention badge "Khối {n}" đã có ở `fe/app/library/page.tsx`
  (`gradeLabel`), nhưng single-select khác `GradeCheckboxes` (multi-select) ở `user-management/page.tsx`.
- Bỏ `DatePicker` hạn nộp trong modal bulk-create và modal sửa 1 giáo viên; thay bằng dòng hiển thị hạn
  nộp tính sẵn (đọc, không sửa).
- Dropdown chọn giáo viên khi sửa task lọc theo giáo viên có khối đang chọn trong `teacher_grades`
  (`TeacherDto.grades` đã trả sẵn qua `GET /api/moderator/teachers`, chỉ cần FE dùng field này).
- Teacher view: thêm badge khối trên mỗi task card để phân biệt 2 task cùng tuần khác khối.

### `lesson-plan-approval` (Mod)
- Thêm filter khối (single-select, tái dùng component ở trên) + ô tìm theo tên bài/chương (search text
  trên `scopeDescription` — hệ thống chưa có taxonomy chương/bài dạng cấu trúc, xem mục 6).
- Giữ nguyên toàn bộ logic expand chi tiết / duyệt / từ chối đã hoạt động (`approveWeeklyTask`,
  `rejectWeeklyTask`), chỉ bọc thêm thanh filter phía trên.

## 6. Việc không làm trong đợt này

- Không xây taxonomy chương/bài có cấu trúc — filter "bài" vẫn là tìm-kiếm-văn-bản trên
  `scopeDescription`, không đảm bảo khớp chính xác.
- Không đổi `LibraryContentStatus` (Hub publish status) hay mối quan hệ tách biệt của nó với
  `WeeklyTaskReviewStatus` — nguyên tắc này giữ nguyên như comment gốc trong `WeeklyTaskService.java`.
- Không xử lý nghỉ lễ / dời lịch (mục 3.4 của `deadline-rule.md`) — để lại cho thiết kế sau nếu cần.

## 7. Điểm mở

1. Chiến lược backfill cột `grade` nếu `weekly_tasks` đã có dữ liệu trên DB chung — cần xác nhận riêng
   trước khi chạy migration.
2. `GET /api/weekly-tasks` (schedule) khi Mod chưa chọn khối: giữ API cho phép `grade` optional (xem tất
   cả khối) hay bắt buộc `grade` ngay từ backend? Đề xuất giữ optional ở API, FE luôn truyền vì UX bắt Mod
   chọn khối trước.
