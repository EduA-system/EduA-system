# Weekly Task — API Design (UC-80 → UC-89)

> Mod giao yêu cầu giáo án cho Teacher cùng subject theo tuần, kèm hạn nộp (**UC-80 View Weekly
> Schedule**, **UC-81 Create Weekly Task**, **UC-82 Edit Weekly Task**); Teacher nộp/rút giáo án cho
> nhiệm vụ được giao (**UC-83 View Assigned Task**, **UC-84 Submit**, **UC-85 Unsubmit**); Mod duyệt/từ
> chối trong hàng đợi theo subject (**UC-86 View Approval List**, **UC-87 View Lesson Plan Detail**,
> **UC-88 Approve**, **UC-89 Reject**). `reviewStatus` của Weekly Task tách biệt hoàn toàn với Publish
> Status (Hub) của `LibraryContent` — xem `layered-architecture.md` và comment gốc ở
> `WeeklyTaskService.java`.
>
> **Trạng thái: đã code (2026-08-06)**, gồm cả phần mở rộng khối/hạn nộp khoá cứng/Chương-Bài từ danh mục
> SGK — xem [`../weekly-task/grade-scoped-deadline-and-review.md`](../weekly-task/grade-scoped-deadline-and-review.md)
> cho business rule đầy đủ (BR-51, BR-52, BR-53). Hạ tầng dùng chung auth/RBAC/rate-limit theo
> [`api-chung.md`](./api-chung.md).

## Quyết định riêng

- **`reviewStatus` độc lập với `LibraryContentStatus`**: một `LibraryContent` loại `LESSON_PLAN` có thể
  đồng thời `PRIVATE` trên Hub (chưa publish cộng đồng) và được dùng làm nguồn nộp cho 1 Weekly Task đã
  `APPROVED` — hai trạng thái không đồng bộ với nhau, tránh nhầm "duyệt Weekly Task" với "publish lên
  Hub".
- **2 nguồn nộp loại trừ nhau, đúng 1**: `POST .../submission` bắt buộc chọn đúng 1 trong 2 —
  `libraryContentId` (giáo án `LESSON_PLAN` do chính Teacher sở hữu, lấy từ thư viện cá nhân) hoặc
  `documentUrl` (file đã upload qua `POST /api/uploads`, R2 public URL) — constraint DB
  `chk_weekly_task_submission_source` (`V28`) đảm bảo không lưu cả 2.
- **Nộp lại sau khi bị từ chối, không tạo task mới**: `unsubmit`/`submit` thao tác trên cùng 1
  `WeeklyTask.id`; rút một submission theo sau 1 lần reject sẽ trả về đúng trạng thái `REJECTED` (không
  phải `NOT_SUBMITTED`) để giữ lại `rejectionReason` cho Teacher xem lại lý do.
- **Khoá theo `deadline`, không khoá theo tuần lịch riêng**: mọi thao tác ghi (`submit`, `unsubmit`,
  `update`) đều chặn khi `Instant.now()` đã qua `deadline` (BR-47) — không có cơ chế khoá riêng theo
  `weekStartDate`.
- **`grade` bắt buộc, không suy ra từ `subject`** (BR-51): một môn có 3 khối riêng biệt, Weekly Task phải
  khai báo rõ khối để lọc đúng giáo viên (`teacher_grades`) và đúng hàng đợi duyệt. Không sửa được sau khi
  tạo (đổi khối = tạo bài mới).
- **`deadline` không phải input** (BR-52): server tự tính từ `weekStartDate` (Chủ Nhật 23:59:59 giờ VN
  của chính tuần đó) — không có field `deadline` trong bất kỳ request body ghi nào.
- **Chương/Bài chọn từ danh mục SGK, không phải mô tả tự do** (BR-53): `chapterCode`/`lessonCode` phải
  khớp dữ liệu thật trong `TextbookCatalogRepository` (bảng `textbooks`/`chapters`/`lessons`, cùng nguồn
  với `TextbookController`) — server tự resolve `chapterName`/`lessonName` tại thời điểm ghi, không tin
  text client gửi lên. `scopeDescription` đổi nghĩa thành "Tiêu đề" Mod tự nhập (không còn là mô tả
  chương/bài).
- **Tối đa 2 bài/tuần cho 1 (subject, grade)** (BR-53): `bulkCreate`/`create`/`update` đều chặn nếu tổng
  số `lessonCode` phân biệt trong tuần đó vượt 2, hoặc trùng `lessonCode` với bài đã có — khớp đúng "2 ô
  lịch tuần" ở FE.
- **`bulkCreate` nhận danh sách nhưng UI hiện tại luôn gửi 1 phần tử**: mỗi ô lịch tuần ở FE = 1 lần gọi
  `POST .../bulk` với `lessons` chỉ có 1 lesson — giữ dạng mảng ở API để linh hoạt, không phải vì UI cần
  tạo nhiều bài cùng lúc nữa (khác thiết kế ban đầu).

---

## Danh sách endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | GET | `/api/weekly-tasks` | UC-80 View Weekly Schedule | TEACHER (của mình) / MODERATOR (cả subject + khối) |
| 2 | GET | `/api/weekly-tasks/{id}` | UC-83 (Teacher) / UC-87 (Moderator) View Detail | TEACHER assignee / MODERATOR cùng subject |
| 3 | POST | `/api/weekly-tasks` | UC-81 Create Weekly Task | MODERATOR |
| 4 | POST | `/api/weekly-tasks/bulk` | UC-81 Create Weekly Task (bulk, 1 bài × mọi Teacher active cùng subject + khối) | MODERATOR |
| 5 | PATCH | `/api/weekly-tasks/{id}` | UC-82 Edit Weekly Task | MODERATOR owner-subject |
| 6 | POST | `/api/weekly-tasks/{id}/submission` | UC-84 Submit | TEACHER assignee |
| 7 | DELETE | `/api/weekly-tasks/{id}/submission` | UC-85 Unsubmit | TEACHER assignee |
| 8 | GET | `/api/weekly-tasks/moderation-queue` | UC-86 View Approval List (filter khối/Chương/Bài) | MODERATOR |
| 9 | POST | `/api/weekly-tasks/{id}/approval` | UC-88 Approve | MODERATOR cùng subject |
| 10 | POST | `/api/weekly-tasks/{id}/rejection` | UC-89 Reject | MODERATOR cùng subject |

Tất cả request cần `Authorization: Bearer <access>` theo JWT filter của `auth.md`;
`@PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")` ở class-level, siết thêm theo role/owner ở từng
method.

---

## Data contract

### `WeeklyTaskSummaryDto` (item trong schedule / moderation queue)

```json
{
  "id": "uuid",
  "teacherId": "uuid",
  "teacherName": "Nguyen Van A",
  "subject": "PHYSICS",
  "grade": 10,
  "weekStartDate": "2026-08-03",
  "scopeDescription": "Kiểm tra 15 phút",
  "textbookCode": "LI10",
  "chapterCode": "CH3",
  "chapterName": "Chương 3 - Động lực học",
  "lessonCode": "B10",
  "lessonName": "Định luật 2 Newton",
  "deadline": "2026-08-09T16:59:59Z",
  "reviewStatus": "SUBMITTED",
  "submittedAt": "2026-08-06T10:00:00Z",
  "createdAt": "2026-08-06T08:00:00Z"
}
```

`grade`: `10 | 11 | 12`, bắt buộc, không sửa được. `deadline`: luôn = Thứ Hai của `weekStartDate` cộng 6
ngày, 23:59:59 giờ VN — server tính, không phải giá trị Mod nhập. `scopeDescription` là Tiêu đề Mod tự
nhập; `chapterName`/`lessonName` server tự resolve từ danh mục SGK, không tin client. `createdAt` dùng để
FE sắp thứ tự "bài thứ nhất/hai" trong 1 tuần (ổn định theo thời điểm tạo).

### `WeeklyTaskDetailDto`

```json
{
  "id": "uuid",
  "moderatorId": "uuid",
  "moderatorName": "Mod A",
  "subject": "PHYSICS",
  "grade": 10,
  "teacherId": "uuid",
  "teacherName": "Nguyen Van A",
  "weekStartDate": "2026-08-03",
  "scopeDescription": "Kiểm tra 15 phút",
  "textbookCode": "LI10",
  "chapterCode": "CH3",
  "chapterName": "Chương 3 - Động lực học",
  "lessonCode": "B10",
  "lessonName": "Định luật 2 Newton",
  "deadline": "2026-08-09T16:59:59Z",
  "reviewStatus": "APPROVED",
  "sourceLibraryContentId": "uuid | null",
  "sourceLibraryContentTitle": "string | null",
  "sourceLibraryContentPayload": "object | null",
  "sourceDocumentUrl": "string | null",
  "sourceDocumentName": "string | null",
  "submittedAt": "2026-08-06T10:00:00Z",
  "reviewedBy": "uuid | null",
  "reviewedByName": "string | null",
  "reviewedAt": "2026-08-06T14:00:00Z",
  "rejectionReason": "string | null",
  "createdAt": "2026-08-01T08:00:00Z",
  "updatedAt": "2026-08-06T14:00:00Z"
}
```

### `WeeklyTaskScheduleDto` (response GET schedule)

```json
{ "weeks": [ { "weekStartDate": "2026-08-03", "tasks": [ WeeklyTaskSummaryDto ] } ] }
```

### `WeeklyTaskPageDto` (response moderation-queue)

```json
{ "items": [ WeeklyTaskSummaryDto ], "page": 0, "size": 20, "total": 5 }
```

### `WeeklyTaskBulkResultDto` (response bulk create)

```json
{ "created": [ WeeklyTaskSummaryDto ], "teacherCount": 4, "lessonCount": 1 }
```

---

## Chi tiết endpoint

### 1. `GET /api/weekly-tasks` — Xem lịch tuần (UC-80)

```http
→ 200  WeeklyTaskScheduleDto
```

- Query: `from`, `to` (`LocalDate`, optional — mặc định `now-4weeks` .. `now+8weeks`); `grade` (optional
  — Moderator dùng để lọc đúng 1 khối; nếu bỏ trống, Moderator thấy mọi khối cùng subject — FE luôn
  truyền vì UX bắt chọn khối trước khi vào màn).
- Teacher: `findByTeacher(claims.userId(), from, to)` — không lọc theo `grade` (Teacher thấy mọi khối
  mình được giao).
- Moderator: `findBySubject[AndGrade](requireSubject(), [grade,] from, to)`.
- Nhóm theo `weekStartDate`, sort tăng dần.

### 2. `GET /api/weekly-tasks/{id}` — Xem chi tiết (UC-83 / UC-87)

```http
→ 200  WeeklyTaskDetailDto
→ 403  khong phai Teacher duoc giao / khong phai Moderator cung subject
→ 404  khong ton tai
```

### 3. `POST /api/weekly-tasks` — Giao 1 task (UC-81)

```json
{
  "teacherId": "uuid",
  "weekStartDate": "2026-08-03",
  "grade": 10,
  "scopeDescription": "Kiểm tra 15 phút",
  "textbookCode": "LI10",
  "chapterCode": "CH3",
  "lessonCode": "B10"
}
```

```http
→ 201  WeeklyTaskDetailDto
→ 400  tuan da ket thuc / tieu de rong / chuong-bai khong ton tai trong sach / sach khong khop khoi-mon / da du 2 bai trong tuan / trung lessonCode
→ 403  giao vien khac subject, khac khoi, hoac khong active (khong phai TEACHER)
```

- Không có field `deadline`. `textbookCode`/`chapterCode`/`lessonCode` bắt buộc, server tra
  `TextbookCatalogRepository` để validate + resolve `chapterName`/`lessonName`.
- Guard giáo viên: cùng `subject` + có `grade` này trong `teacher_grades`.

### 4. `POST /api/weekly-tasks/bulk` — Giao 1 bài cho cả khối (UC-81, bulk)

```json
{
  "weekStartDate": "2026-08-03",
  "grade": 10,
  "textbookCode": "LI10",
  "lessons": [ { "scopeDescription": "Kiểm tra 15 phút", "chapterCode": "CH3", "lessonCode": "B10" } ]
}
```

```http
→ 201  WeeklyTaskBulkResultDto
→ 400  chuong-bai khong hop le / sach khong khop khoi-mon / da du 2 bai trong tuan (subject+grade+week) / trung lessonCode / khong co giao vien active nao day khoi nay / danh sach bai rong
```

- Target: mọi Teacher `ACTIVE` cùng `subject` và có `grade` trong `teacher_grades`.
- `textbookCode` dùng chung cho cả `lessons` trong 1 lần gọi (1 modal = 1 sách).
- Check theo `(subject, grade, weekStartDate)`: tổng số `lessonCode` phân biệt (đã có + mới thêm) không
  vượt 2; không trùng `lessonCode` với bài đã có.

### 5. `PATCH /api/weekly-tasks/{id}` — Sửa task còn hạn (UC-82, BR-47)

```json
{
  "teacherId": "uuid",
  "weekStartDate": "2026-08-03",
  "scopeDescription": "Kiểm tra 15 phút (đã sửa)",
  "textbookCode": "LI10",
  "chapterCode": "CH3",
  "lessonCode": "B11"
}
```

```http
→ 200  WeeklyTaskDetailDto
→ 400  da qua han sua (BR-47) / tuan moi da ket thuc / chuong-bai khong hop le / trung lessonCode voi bai khac trong tuan
→ 403  khong cung subject / giao vien moi khong active, khac subject, hoac khac khoi task hien tai
```

- Không có field `deadline` (đổi `weekStartDate` tự tính lại) hay `grade` (giữ nguyên từ lúc tạo). Chương
  /Bài **sửa được** — Mod có thể đổi bài đã giao cho 1 task, miễn không trùng `lessonCode` với task còn
  lại trong cùng tuần.

### 6. `POST /api/weekly-tasks/{id}/submission` — Nộp giáo án (UC-84)

```json
{ "libraryContentId": "uuid | omit", "documentUrl": "string | omit", "documentName": "string | omit" }
```

```http
→ 200  WeeklyTaskDetailDto
→ 400  qua han / khong dung 1 nguon / trang thai khong cho phep nop (chi NOT_SUBMITTED hoac REJECTED)
→ 403  khong phai Teacher duoc giao / giao an khong thuoc so huu / khong phai loai LESSON_PLAN
```

Không đổi.

### 7. `DELETE /api/weekly-tasks/{id}/submission` — Rút nộp (UC-85)

```http
→ 200  WeeklyTaskDetailDto
→ 400  qua han / trang thai khong phai SUBMITTED
```

Khôi phục về `REJECTED` nếu lần nộp này theo sau 1 lần bị từ chối, ngược lại về `NOT_SUBMITTED`. Không đổi.

### 8. `GET /api/weekly-tasks/moderation-queue` — Hàng đợi duyệt (UC-86)

```http
→ 200  WeeklyTaskPageDto
```

- Query: `page`, `size` + `grade` (optional — lọc đúng khối) + `chapterCode`/`lessonCode` (optional —
  chọn từ dropdown danh mục SGK ở FE, so khớp chính xác, **không phải tìm text tự do**).
- Luôn giới hạn `subject` = subject của Moderator hiện tại + `reviewStatus = SUBMITTED`.

### 9. `POST /api/weekly-tasks/{id}/approval` — Duyệt (UC-88)

```http
→ 200  WeeklyTaskDetailDto
→ 400  task khong o trang thai SUBMITTED
→ 403  khac subject Moderator
```

Ghi `activityLogService.record(..., APPROVE_WEEKLY_TASK, ...)`, notify Teacher. Không đổi.

### 10. `POST /api/weekly-tasks/{id}/rejection` — Từ chối (UC-89)

```json
{ "reason": "string, bat buoc" }
```

```http
→ 200  WeeklyTaskDetailDto
→ 400  thieu reason / task khong o trang thai SUBMITTED
→ 403  khac subject Moderator
```

Ghi `activityLogService.record(..., REJECT_WEEKLY_TASK, ...)`, notify Teacher kèm lý do. Không đổi.

---

## Cross-cutting

- **RBAC**: class-level `@PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")`, siết method-level theo role
  (`hasRole('MODERATOR')`/`hasRole('TEACHER')`) + owner/subject/grade check trong service.
- **Notification**: mọi thao tác ghi có tác động tới phía kia (giao mới, sửa, reassign, submit, approve,
  reject) đều bắn `NotificationStreamPort` qua `notify()`.
- **Không có transaction đọc/ghi lẫn lộn**: `schedule`/`get`/`listModerationQueue`
  `@Transactional(readOnly = true)`, còn lại `@Transactional` ghi.
- **Optimistic locking**: `version` (`@Version`) trên `weekly_tasks`.
- **Rate-limit, CORS, error envelope**: theo `api-chung.md`.
- **Phụ thuộc `TextbookCatalogRepository`**: `WeeklyTaskService` inject thêm repository này (đã có sẵn,
  dùng chung với `TextbookService`/`TextbookController`) để validate + resolve tên Chương/Bài — không gọi
  qua service khác, đúng nguyên tắc "service → repository interfaces".

## Phụ thuộc & thứ tự build

1. Migration `V37__add_grade_to_weekly_tasks.sql` (khối) rồi
   `V38__add_textbook_reference_to_weekly_tasks.sql` (Chương/Bài) — cả 2 đều xóa dòng cũ thiếu field bắt
   buộc trước khi `SET NOT NULL` (xem `grade-scoped-deadline-and-review.md` mục 3, 2c).
2. `WeeklyTask` (domain record) + `WeeklyTaskEntity` + `WeeklyTaskJpaRepository`/`JpaWeeklyTaskRepository`
   + `WeeklyTaskRepository` (interface): field `grade` + `textbookCode`/`chapterCode`/`chapterName`
   /`lessonCode`/`lessonName`; query lọc theo grade/chapterCode/lessonCode.
3. `WeeklyTaskService`: bỏ `deadline` khỏi tham số ghi, thêm helper tính deadline từ `weekStartDate`
   (BR-52); inject `TeacherGradeRepository` (BR-51) + `TextbookCatalogRepository` (BR-53, resolve +
   validate Chương/Bài, cap 2 bài/tuần, chặn trùng `lessonCode`).
4. DTO (`presentation/dto/weeklytask/`): `CreateWeeklyTaskRequest`, `BulkCreateWeeklyTaskRequest`
   (+ `LessonSlot`), `UpdateWeeklyTaskRequest` — bỏ `deadline`, thêm `grade`/`textbookCode`/`chapterCode`
   /`lessonCode`.
5. `WeeklyTaskController`: query param `grade` (schedule), `grade`+`chapterCode`+`lessonCode`
   (moderation-queue).
6. `WeeklyTaskViews`: thêm các field trên vào `Summary` (+ `createdAt`, `textbookCode`) và `Detail`.
7. FE: `fe/lib/weekly-task.ts` (types + hàm gọi API), `fe/lib/textbook-picker.ts` (hook dùng chung, gọi
   `fe/services/lessonPlanService.ts` — `fetchTextbookNames`/`fetchTextbookChapters`/`fetchChapterLessons`
   đã có sẵn), `weekly-schedule/page.tsx` (chọn khối + lưới 2-ô/tuần + modal Tiêu đề/Chương/Bài),
   `lesson-plan-approval/page.tsx` (filter khối + Chương + Bài). Chi tiết ở
   `grade-scoped-deadline-and-review.md` mục 5.
8. Smoke test qua Swagger: bulk-create 2 khối cùng tuần (không bị chặn trùng lịch), bulk-create bài thứ 3
   trong cùng tuần+khối (400), trùng `lessonCode` (400), giáo viên không dạy khối đó không nhận được
   task/notify, deadline trả về đúng Chủ Nhật giờ VN không nhận từ client, `chapterCode`/`lessonCode`
   không tồn tại trong `textbookCode` (400), submit/reject/nộp lại trong tuần vẫn hoạt động như cũ
   (regression UC-84/85/88/89), moderation-queue lọc đúng theo `grade`+`chapterCode`+`lessonCode`.

## Điểm mở

- `requireBookMatchesGrade` tra `listBookNames` mỗi lần ghi (không cache) — chấp nhận được vì danh mục
  SGK nhỏ và đây không phải đường nóng (hot path), nhưng có thể cache sau nếu cần.
- Trang tính chuyện nghỉ lễ/dời lịch (mục 3.4, 6 của `deadline-rule.md`) vẫn để ngỏ, không thuộc phạm vi
  đợt này.
