# Weekly Task — API Design (UC-80 → UC-89)

> Mod giao yêu cầu giáo án cho Teacher cùng subject theo tuần, kèm hạn nộp (**UC-80 View Weekly
> Schedule**, **UC-81 Create Weekly Task**, **UC-82 Edit Weekly Task**); Teacher nộp/rút giáo án cho
> nhiệm vụ được giao (**UC-83 View Assigned Task**, **UC-84 Submit**, **UC-85 Unsubmit**); Mod duyệt/từ
> chối trong hàng đợi theo subject (**UC-86 View Approval List**, **UC-87 View Lesson Plan Detail**,
> **UC-88 Approve**, **UC-89 Reject**). `reviewStatus` của Weekly Task tách biệt hoàn toàn với Publish
> Status (Hub) của `LibraryContent` — xem `layered-architecture.md` và comment gốc ở
> `WeeklyTaskService.java`.
>
> **Trạng thái: endpoint đã code và chạy** (`WeeklyTaskController`, `WeeklyTaskService`,
> `weekly_tasks` table — `V21`, `V28`). File này lấp khoảng trống document API_designs cho epic đã có,
> đồng thời mô tả phần mở rộng **khối (grade) + hạn nộp khoá cứng + filter màn duyệt** đang ở dạng đề
> xuất — xem [`../weekly-task/grade-scoped-deadline-and-review.md`](../weekly-task/grade-scoped-deadline-and-review.md)
> cho business rule đầy đủ (BR-51, BR-52). Phần đánh dấu **(mới)** dưới đây là phần đề xuất, chưa code.
> Hạ tầng dùng chung auth/RBAC/rate-limit theo [`api-chung.md`](./api-chung.md).

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
- **Bulk create validate trùng lịch theo subject (mới: + grade)**: `POST .../bulk` từ chối nếu tuần đó
  (cùng subject, **(mới) cùng khối**) đã có Weekly Task — buộc Mod sửa từng task thay vì tạo chồng lịch.
- **(mới) `grade` bắt buộc, không suy ra từ `subject`**: một môn có 3 khối riêng biệt, Weekly Task phải
  khai báo rõ khối để lọc đúng giáo viên (`teacher_grades`) và đúng hàng đợi duyệt.
- **(mới) `deadline` không còn là input**: server tự tính từ `weekStartDate` theo BR-52 (Chủ Nhật 23:59:59
  giờ VN của chính tuần đó) — bỏ field `deadline` khỏi mọi request body ghi.

---

## Danh sách endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | GET | `/api/weekly-tasks` | UC-80 View Weekly Schedule | TEACHER (của mình) / MODERATOR (cả subject, **(mới)** + khối) |
| 2 | GET | `/api/weekly-tasks/{id}` | UC-83 (Teacher) / UC-87 (Moderator) View Detail | TEACHER assignee / MODERATOR cùng subject |
| 3 | POST | `/api/weekly-tasks` | UC-81 Create Weekly Task | MODERATOR |
| 4 | POST | `/api/weekly-tasks/bulk` | UC-81 Create Weekly Task (bulk, N bài × mọi Teacher active cùng subject **(mới)** + khối) | MODERATOR |
| 5 | PATCH | `/api/weekly-tasks/{id}` | UC-82 Edit Weekly Task | MODERATOR owner-subject |
| 6 | POST | `/api/weekly-tasks/{id}/submission` | UC-84 Submit | TEACHER assignee |
| 7 | DELETE | `/api/weekly-tasks/{id}/submission` | UC-85 Unsubmit | TEACHER assignee |
| 8 | GET | `/api/weekly-tasks/moderation-queue` | UC-86 View Approval List (**(mới)** + filter khối/tìm bài) | MODERATOR |
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
  "scopeDescription": "Chương 3 - Định luật Newton, Vật lý 10",
  "deadline": "2026-08-09T16:59:59Z",
  "reviewStatus": "SUBMITTED",
  "submittedAt": "2026-08-06T10:00:00Z"
}
```

`grade` (**mới**): `10 | 11 | 12`, bắt buộc. `deadline` (**đổi hành vi**): luôn = Thứ Hai của
`weekStartDate` cộng 6 ngày, 23:59:59 giờ VN — server tính, không phải giá trị Mod nhập.

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
  "scopeDescription": "Chương 3 - Định luật Newton, Vật lý 10",
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
{ "created": [ WeeklyTaskSummaryDto ], "teacherCount": 4, "lessonCount": 2 }
```

---

## Chi tiết endpoint

### 1. `GET /api/weekly-tasks` — Xem lịch tuần (UC-80)

```http
→ 200  WeeklyTaskScheduleDto
```

- Query: `from`, `to` (`LocalDate`, optional — mặc định `now-4weeks` .. `now+8weeks`); **(mới)**
  `grade` (optional — Moderator dùng để lọc đúng 1 khối; nếu bỏ trống, Moderator thấy mọi khối cùng
  subject — FE luôn truyền vì UX bắt chọn khối trước khi vào màn).
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
{ "teacherId": "uuid", "weekStartDate": "2026-08-03", "grade": 10, "scopeDescription": "..." }
```

```http
→ 201  WeeklyTaskDetailDto
→ 400  tuan da ket thuc (deadline tinh ra <= now) / scope rong
→ 403  giao vien khac subject, khac khoi, hoac khong active (khong phai TEACHER)
```

- **(mới)** bỏ field `deadline` khỏi request; thêm `grade` (bắt buộc).
- Guard giáo viên: cùng `subject` (như hiện tại) **+ (mới)** có `grade` này trong `teacher_grades`.

### 4. `POST /api/weekly-tasks/bulk` — Giao N bài cho cả khối (UC-81, bulk)

```json
{
  "weekStartDate": "2026-08-03",
  "grade": 10,
  "lessons": [ { "scopeDescription": "Bài 1 - ..." }, { "scopeDescription": "Bài 2 - ..." } ]
}
```

```http
→ 201  WeeklyTaskBulkResultDto
→ 400  tuan da co lich (cung subject+grade+week) / khong co giao vien active nao day khoi nay / danh sach bai rong
```

- Target: mọi Teacher `ACTIVE` cùng `subject` **và (mới)** có `grade` trong `teacher_grades`.
- **(mới)** check trùng lịch theo `(subject, grade, weekStartDate)` thay vì chỉ `(subject,
  weekStartDate)` — 2 khối khác nhau được phép có lịch riêng cùng tuần.

### 5. `PATCH /api/weekly-tasks/{id}` — Sửa task còn hạn (UC-82, BR-47)

```json
{ "teacherId": "uuid", "weekStartDate": "2026-08-03", "scopeDescription": "..." }
```

```http
→ 200  WeeklyTaskDetailDto
→ 400  da qua han sua (BR-47) / tuan moi da ket thuc
→ 403  khong cung subject / giao vien moi khong active, khac subject, hoac khac khoi task hien tai
```

- **(mới)** bỏ `deadline` khỏi request (đổi `weekStartDate` sẽ tự tính lại deadline theo BR-52); `grade`
  **không sửa được** qua endpoint này — giữ nguyên `grade` gốc của task, chỉ đổi giáo viên/tuần/mô tả.
  Nếu đổi giáo viên: giáo viên mới phải có cùng `grade` của task.

### 6. `POST /api/weekly-tasks/{id}/submission` — Nộp giáo án (UC-84)

```json
{ "libraryContentId": "uuid | omit", "documentUrl": "string | omit", "documentName": "string | omit" }
```

```http
→ 200  WeeklyTaskDetailDto
→ 400  qua han / khong dung 1 nguon / trang thai khong cho phep nop (chi NOT_SUBMITTED hoac REJECTED)
→ 403  khong phai Teacher duoc giao / giao an khong thuoc so huu / khong phai loai LESSON_PLAN
```

Không đổi so với hiện tại.

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

- Query: `page`, `size` (như hiện tại) **+ (mới)** `grade` (optional — lọc đúng khối) và `search`
  (optional — tìm text trong `scopeDescription`, chưa có taxonomy chương/bài có cấu trúc nên đây là
  tìm-kiếm-tự-do, không đảm bảo khớp chính xác).
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
  reject) đều bắn `NotificationStreamPort` qua `notify()` — không đổi bởi phần mở rộng này.
- **Không có transaction đọc/ghi lẫn lộn**: `schedule`/`get`/`listModerationQueue`
  `@Transactional(readOnly = true)`, còn lại `@Transactional` ghi.
- **Optimistic locking**: `version` (`@Version`) trên `weekly_tasks` — không đổi.
- **Rate-limit, CORS, error envelope**: theo `api-chung.md`.

## Phụ thuộc & thứ tự build (phần mở rộng)

1. Migration `V37__add_grade_to_weekly_tasks.sql` (xem `grade-scoped-deadline-and-review.md` mục 3) —
   xác nhận dữ liệu cũ trước khi chạy trên DB chung.
2. `WeeklyTask` (domain record) + `WeeklyTaskEntity` + `WeeklyTaskJpaRepository`/`JpaWeeklyTaskRepository`
   + `WeeklyTaskRepository` (interface): thêm field/param `grade`, thêm query method lọc theo grade và
   check trùng lịch theo `(subject, grade, weekStartDate)`.
3. `WeeklyTaskService`: bỏ `deadline` khỏi tham số các method ghi, thêm helper tính deadline từ
   `weekStartDate` (BR-52); thêm `grade` vào `create`/`bulkCreate`/`schedule`/`listModerationQueue`; inject
   `TeacherGradeRepository` để validate giáo viên theo khối.
4. DTO (`presentation/dto/weeklytask/`): `CreateWeeklyTaskRequest`, `BulkCreateWeeklyTaskRequest`
   (+ `LessonSlot`), `UpdateWeeklyTaskRequest` — bỏ `deadline`, thêm `grade` (create/bulk).
5. `WeeklyTaskController`: thêm query param `grade` (schedule, moderation-queue).
6. `WeeklyTaskViews`: thêm `grade` vào `Summary`/`Detail`.
7. FE: `fe/lib/weekly-task.ts` (types + hàm gọi API), `weekly-schedule/page.tsx` (chọn khối + đổi lưới
   tuần sang lịch thực + bỏ input hạn nộp), `lesson-plan-approval/page.tsx` (thêm filter khối + tìm bài).
   Chi tiết ở `grade-scoped-deadline-and-review.md` mục 5.
8. Smoke test qua Swagger: bulk-create 2 khối cùng tuần (không bị chặn trùng lịch), giáo viên không dạy
   khối đó không nhận được task/notify, deadline trả về đúng Chủ Nhật giờ VN không nhận từ client, submit
   /reject/nộp lại trong tuần vẫn hoạt động như cũ (regression UC-84/85/88/89), moderation-queue lọc đúng
   theo `grade` + `search`.

## Điểm mở

- Backfill `grade` cho dữ liệu `weekly_tasks` cũ (nếu có) trên DB Supabase chung — chưa quyết.
- `search` ở moderation-queue là tìm-kiếm-tự-do trên `scopeDescription`, không phải filter chương/bài có
  cấu trúc — nâng cấp lên taxonomy thật (nếu cần) là một thiết kế riêng sau này.
