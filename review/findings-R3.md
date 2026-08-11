# R3 — Weekly Task nộp / chấm

Quét ngày 2026-08-10 trên `main`. Hai lượt: `/code-review high` (R3-10…R3-16) và đọc tay (R3-01…R3-04).

Phạm vi: `be/.../service/weeklytask/` (604 loc), `WeeklyTaskController`, `fe/app/weekly-schedule/` (927 loc),
`fe/components/weeklytask/`.

**Cụm này là bản tham chiếu về mặt hạ tầng giao dịch.** `WeeklyTaskEntity:43` là chỗ **duy nhất trong
toàn bộ backend** có `@Version`, và mọi method mutating đều `@Transactional`. Đúng những thứ R1 thiếu.
Nên finding ở đây không phải lỗi hạ tầng mà là **lỗi luật nghiệp vụ**: các guard chặn đúng thứ nhưng
chặn cả trường hợp hợp lệ, hoặc bỏ sót đường thoát.

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R3-10 | `WeeklyTaskService.java:224` | Nút "Sửa" của moderator luôn lỗi ở khối có ≥2 giáo viên | **Cao** | Sửa |
| R3-01 | `WeeklyTaskService.java:255,388` | Bị từ chối sau hạn nộp = kẹt vĩnh viễn, không ai gỡ được | **Cao** | Sửa |
| R3-02 | `WeeklyTaskService.java:294` | Rút nộp xoá sạch vết từ chối; nhánh khôi phục REJECTED là code chết | **Cao** | Sửa |
| R3-11 | `fe/app/weekly-schedule/page.tsx:105` | Lệch tuần đầu tháng → ẩn hẳn tuần đang nộp dở | **Cao** | Sửa |
| R3-12 | `fe/app/weekly-schedule/page.tsx:386` | Modal nộp giữ danh sách giáo án của task trước → nộp nhầm | **Cao** | Sửa |
| R3-03 | `WeeklyTaskService.java:287` | Rút nộp không báo moderator (BR-48) | TB | Sửa |
| R3-13 | `WeeklyTaskService.java:259` | `documentUrl` không kiểm tra scheme/host, moderator bấm thẳng | TB | Sửa |
| R3-14 | `WeeklyTaskService.java:305` | Hàng chờ duyệt không có `ORDER BY` → trùng/sót khi lật trang | TB | Sửa |
| R3-04 | `WeeklyTaskService.java:281,320` | Đẩy thông báo WebSocket bên trong transaction, rollback không thu hồi được | TB | Sửa |
| R3-15 | `fe/app/weekly-schedule/page.tsx:779` | `expandedGroupKey` dùng `lessonCode` trần → hai tuần mở/đóng cùng nhau | Thấp | Sửa |
| R3-16 | `fe/app/weekly-schedule/page.tsx:278` | `load()` không có cancellation guard | Thấp | Sửa |

---

## R3-10 — Nút "Sửa" của moderator luôn lỗi ở khối có ≥2 giáo viên **[Cao]**

`bulkCreate():195-202` tạo một task cho **mỗi giáo viên × mỗi bài**:

```java
for (AppUser teacher : teachers) {
    for (ResolvedLesson lesson : resolvedLessons) {
        created.add(repository.save(new WeeklyTask(UUID.randomUUID(), ..., lesson.lessonCode(), ...)));
```

Nên với 3 giáo viên dạy khối 10, một bài học sinh ra 3 task cùng `lessonCode`.

`update():224` gọi `requireLessonSlotAvailable(..., t.id())`, mà hàm này
(`:476-479`) chỉ loại **đúng task đang sửa**:

```java
.filter(t -> excludeTaskId == null || !t.id().equals(excludeTaskId))
```

Hai task anh em của hai giáo viên kia vẫn nằm trong `existing`, nên `existingLessonCodes.contains(code)`
đúng và hàm ném "Bài này đã được giao trong tuần — sửa nhiệm vụ hiện có thay vì tạo lại."

**Kịch bản lỗi:** moderator chỉ muốn dời hạn nộp hoặc sửa tiêu đề một nhiệm vụ. Check chạy **trước** khi
so `lessonCode` có thực sự đổi hay không, nên lỗi xảy ra kể cả khi không đụng gì tới bài học. Ở bất kỳ
khối nào có từ 2 giáo viên trở lên, chức năng sửa nhiệm vụ **không dùng được**, và thông điệp lỗi lại
khuyên đúng cái việc người dùng đang làm.

**Sửa:** loại theo `(lessonCode, teacherId)` thay vì theo `id`, hoặc bỏ qua check khi `lessonCode` không đổi.

## R3-01 — Bị từ chối sau hạn nộp = kẹt vĩnh viễn **[Cao]**

Ba guard hợp lại thành ngõ cụt:

- `submit():254` gọi `requireBeforeDeadline(t)` → `:388-391` chặn nộp sau hạn.
- `unsubmit():289` cũng `requireBeforeDeadline(t)`.
- `update():223` gọi `requireWeekNotEnded(deadline)` → `:407-410` chặn moderator sửa sau khi tuần kết thúc.

`reject()` thì **không** có guard hạn nào — moderator từ chối lúc nào cũng được.

**Kịch bản lỗi:** giáo viên nộp đúng hạn. Moderator duyệt vào cuối tuần, sau hạn (kịch bản bình thường
nhất), và bấm Từ chối. Task về REJECTED. Giáo viên muốn sửa rồi nộp lại → `requireBeforeDeadline` chặn.
Moderator muốn dời hạn để giáo viên nộp lại → `requireWeekNotEnded` chặn. Task đứng vĩnh viễn ở REJECTED,
**không vai trò nào trong hệ thống gỡ được**.

Đây là hệ quả trực tiếp của việc `reject()` không bị ràng buộc hạn trong khi mọi đường khắc phục thì có.

## R3-02 — Rút nộp xoá sạch vết từ chối; nhánh khôi phục REJECTED là code chết **[Cao]**

`unsubmit():294` định khôi phục trạng thái trước khi nộp:

```java
WeeklyTaskReviewStatus reverted = t.rejectionReason() != null
        ? WeeklyTaskReviewStatus.REJECTED : WeeklyTaskReviewStatus.NOT_SUBMITTED;
```

Nhưng `submit():278-280` đã set `rejectionReason`, `reviewedBy`, `reviewedAt` về `null` khi nộp. Task
đang ở SUBMITTED thì `rejectionReason` **luôn** null, nên nhánh REJECTED không bao giờ chạy được —
đúng điều javadoc `:286` hứa ("REJECTED nếu lần nộp này theo sau 1 lần bị từ chối") lại là điều
không xảy ra.

**Kịch bản lỗi:** giáo viên bị từ chối kèm nhận xét chi tiết → sửa và nộp lại → nhận ra nộp nhầm file
→ rút nộp. Task về NOT_SUBMITTED và **toàn bộ nhận xét của moderator đã mất** (bị `submit()` xoá từ
trước), cùng với `reviewedBy`/`reviewedAt`. Giáo viên không còn cách nào đọc lại lý do bị từ chối.

**Sửa:** giữ `rejectionReason`/`reviewedBy`/`reviewedAt` qua lần nộp lại thay vì null hoá, hoặc tách
lịch sử duyệt ra bảng riêng.

## R3-11 — Lệch tuần đầu tháng, ẩn hẳn tuần đang nộp dở **[Cao]**

`fe/app/weekly-schedule/page.tsx:105` — `monthRange` bắt đầu từ ngày 1 của tháng, trong khi
`mondaysInMonth` render cả thứ Hai thuộc tháng trước. Tuần đó không nằm trong khoảng fetch nên task của
nó không bao giờ được tải.

Hệ quả: moderator thấy một hàng đầu tiên rỗng giả, còn giáo viên **không nhìn thấy tuần đang nộp dở**.
Xảy ra ở khoảng 6/7 số tháng — chỉ tháng nào ngày 1 rơi đúng thứ Hai mới không lỗi.

## R3-12 — Modal nộp giữ danh sách giáo án của task trước **[Cao]**

`fe/app/weekly-schedule/page.tsx:386` — modal nộp mở ra trên `ownedLessonPlans` của task trước đó, không
có trạng thái clear/loading và không huỷ request cũ.

**Kịch bản lỗi:** giáo viên mở nhiệm vụ A, đóng, mở nhiệm vụ B. Trong lúc danh sách của B đang tải, modal
vẫn hiển thị giáo án đã lọc theo A. Giáo viên chọn và bấm nộp → nộp giáo án sai bài cho B.

Cùng họ với R1-12 và R1-13: trạng thái cũ không bị xoá khi chuyển đối tượng.

## R3-03 — Rút nộp không báo moderator **[TB]**

Xác nhận BR-48 (`after8_9.md` B1). `submit():281` có `notify(t.moderatorId(), ...)`,
`approve():320` và `reject():339` đều `notify(t.teacherId(), ...)`. Riêng `unsubmit():287-300` **không
gửi gì**.

Moderator có thể đang mở task đó trong hàng chờ duyệt; sau khi giáo viên rút, thao tác duyệt sẽ lỗi mà
moderator không hiểu vì sao.

## R3-13 — `documentUrl` không kiểm tra scheme/host **[TB]**

`submit():259` chỉ `documentUrl.trim()` rồi lưu. Không kiểm tra scheme, không giới hạn host về domain
R2 của hệ thống. `/lesson-plan-approval` render nó thành `<a href target="_blank">` để moderator bấm.

Giáo viên nộp `documentUrl` trỏ ra ngoài (hoặc scheme lạ) thì moderator bấm thẳng vào. Nên whitelist
theo `APP_R2_PUBLIC_URL`, hoặc tối thiểu ép `https://` và kiểm host.

## R3-14 — Hàng chờ duyệt không có thứ tự ổn định **[TB]**

`listModerationQueue():305-308` tạo `PageRequest.of(page, size)` **không có `Sort`**, và
`JpaWeeklyTaskRepository.searchModerationQueue:54` cũng không có `ORDER BY`. PostgreSQL không đảm bảo
thứ tự giữa các lần truy vấn, nên lật trang có thể thấy lại task đã xem hoặc bỏ sót task chưa xem.

So sánh: `LibraryContentService` hàng chờ duyệt có `Sort.by("submittedAt").ascending()`
(`JpaLibraryContentRepository:53`). Cùng một loại màn hình, một chỗ có một chỗ không.

Ngoài ra response trả về `page`/`size` **thô** từ tham số (`:307`) trong khi truy vấn dùng bản đã clamp
`Math.max(0,page)` / `Math.min(...,100)` — client gửi `size=500` sẽ nhận về `size: 500` nhưng chỉ có 100 item.

## R3-04 — Đẩy thông báo WebSocket bên trong transaction **[TB]**

`approve():320` và `reject():339` gọi `notify(...)` **trong** transaction. `NotificationService` cuối
cùng gọi `streamPort.publishNew(...)` đẩy thẳng qua WebSocket — một side effect **không nằm trong
transaction và không thể rollback**.

Nếu transaction fail sau đó (ghi activity log lỗi, optimistic lock đụng độ), DB quay về trạng thái cũ
nhưng giáo viên đã nhận popup "Giáo án đã được duyệt". Cửa sổ hẹp, nhưng hậu quả là thông báo nói sai
sự thật.

Áp dụng cho cả R1 (`LibraryContentService:63,77`) — nên xử lý chung bằng cách hoãn publish tới sau commit.

## R3-15 — `expandedGroupKey` dùng `lessonCode` trần **[Thấp]**

`fe/app/weekly-schedule/page.tsx:779` — khoá mở rộng chỉ là `lessonCode`, vốn chỉ duy nhất **trong một
tuần**. Cùng một bài xuất hiện ở hai tuần thì hai thẻ mở/đóng đồng thời.

## R3-16 — `load()` không có cancellation guard **[Thấp]**

`fe/app/weekly-schedule/page.tsx:278` — không có cờ huỷ hay số thứ tự request, nên đáp ứng chậm của
tháng/khối cũ có thể ghi đè kết quả mới hơn. Cùng họ R1-13.

---

## Kiểm tra nhưng không có vấn đề

- **Optimistic locking**: `WeeklyTaskEntity:43` là entity duy nhất trong backend có `@Version`, và
  `WeeklyTask` mang `version` qua mọi lần dựng lại record. Không có lỗ mất-cập-nhật kiểu R1-02.
- **Transaction**: mọi method mutating đều `@Transactional`; `approve`/`reject` bao trọn save + notify +
  activity log, nên không có ca "đã duyệt nhưng mất log" như R1-15.
- **Ràng buộc nguồn nộp**: `submit():257-273` bắt đúng một nguồn (`hasLibraryContent == hasDocument` thì
  từ chối), kiểm quyền sở hữu giáo án, và kiểm đúng `LESSON_PLAN`.
- **Ảnh chụp nội dung**: `submit():278` lưu `source.payload().deepCopy()` — giáo viên sửa giáo án gốc
  sau khi nộp không làm đổi bản moderator đang chấm.
- **Ghi log kiểm duyệt**: `approve`/`reject` đều `activityLogService.record(...)`, khác với
  `LibraryContentService.delete()` (R1-07) không ghi gì.
