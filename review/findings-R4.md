# R4 — Lớp học & import danh sách

Quét ngày 2026-08-11 trên `main`. Hai lượt: đọc tay trước (R4-01…R4-07), `/code-review high` sau
(R4-10…R4-17). Hai lượt **độc lập trùng nhau ở đúng 2 finding** (R4-01 hardcode 0, R4-05 tuổi lệch năm)
— dấu hiệu tốt, cả hai đều là bug rõ ràng chứ không phải suy đoán.

Phạm vi: `be/.../service/classroom/` (8 file: `ClassEnrollmentService`, `ClassManagementService`,
`ClassResourceService`, `SubmissionService`, `ClassMemberViews`, `ClassResourceViews`, `ClassViews`,
`SubmissionViews`), `ClassController.java`, `fe/components/classroom/` (18 file, 4348 loc).

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R4-01 | `ClassManagementService.java:139-157` | `resourceCount`/`submissionCount` luôn trả về 0, FE hiển thị sai | **Cao** | Đã sửa |
| R4-02 | `ClassResourceService.java:196-201` | Xóa resource cascade xóa sạch bài nộp của học sinh, không cảnh báo | **Cao** | Sửa |
| R4-03 | `fe/components/classroom/ResourceDetailPage.tsx:60-83,184-195` | Nháp nộp bài lưu localStorage không theo user, đè lên bài đã nộp thật | **Cao** | Đã sửa |
| R4-10 | `ClassEnrollmentService.java:148` | `removeStudent()` dùng `requireOwnedClass` thay vì `requireOwnedActiveClass` — bỏ qua khóa lớp lưu trữ | **Cao** | Đã sửa |
| R4-12 | `SubmissionService.java:126` vs `:147` | `listSubmissions()` chặn khi `submissionEnabled=false`, `getSubmissionDetail()` thì không — giáo viên khóa nộp bài xong không xem được roster | **Cao** | Đã sửa |
| R4-04 | `SubmissionService.java:103-111` | `unsubmit()` không báo giáo viên | TB | Sửa |
| R4-05 | `ClassEnrollmentService.java:448`, `AddStudentPage.tsx:291` | Kiểm tra tuổi 16 lệch tới 364 ngày (trừ theo năm, không theo ngày) — cả 2 lượt quét đều bắt được | TB | Sửa |
| R4-06 | `ClassEnrollmentService.java:289-294,311-316` | Không khóa khi kiểm tra sĩ số → race hai request cùng lúc có thể vượt 60 | TB | Sửa |
| R4-11 | `ClassEnrollmentService.java:147-167` | `removeStudent()` không bắt buộc lý do, không báo học sinh bị gỡ | TB | Sửa |
| R4-13 | `ClassController.java:83` (và 3 endpoint list khác) | `size` không có trần trên, client gửi `size` cực lớn ép DB fetch không giới hạn | TB | Sửa |
| R4-16 | `ClassDetailPage.tsx:621`, `ClassResourcesPage.tsx:48` | `canManage` ở FE chỉ dựa `status === "ACTIVE"`, không theo quyền sở hữu — MODERATOR/giáo viên không sở hữu vẫn thấy nút sửa/xóa rồi bị 403 | TB | Sửa |
| R4-07 | `AddStudentPage.tsx:161-162`, `ResourceDetailPage.tsx:212-217` | `load()` không có cancellation guard khi đổi lớp/resource nhanh | Thấp | Sửa |
| R4-14 | `ClassResourceService.java:338` | `normalizeDescription()` không giới hạn độ dài, khác `ClassManagementService` (2000 ký tự) | Thấp | Sửa |
| R4-15 | `ResourceDetailPage.tsx:242` | `userEditedRef` không reset khi đổi resource nếu component không remount — autosave có thể ghi nháp sai tài nguyên | Thấp | Ghi nhận (cần remount thật để khai thác, hiện route đổi resource luôn remount) |
| R4-17 | `ClassEnrollmentService.java:492` | Catch-all `IOException \| RuntimeException` khi parse file gộp cả bug parser thật vào thông báo "file hỏng" chung chung | Thấp | Sửa |

---

## R4-01 — `resourceCount`/`submissionCount` luôn = 0 **[Cao]**

`ClassManagementService.toDetail()`:

```java
return new ClassViews.ClassDetail(
        classroom.id(), classroom.name(), classroom.description(), classroom.subject(),
        classroom.grade(), classroom.status(), classroom.ownerId(), ownerName,
        memberCount,
        0L, 0L, 0L,   // resourceCount, assignmentCount, submissionCount — hard-coded
        classroom.createdAt(), classroom.updatedAt());
```

`ClassViews.ClassDetail` có ba trường `resourceCount`/`assignmentCount`/`submissionCount` nhưng
không có repository call nào tính chúng — luôn là `0L`. `fe/components/classroom/ClassOverviewPage.tsx:48-49`
hiển thị hai ô thống kê "Tài nguyên" và "Bài nộp" trực tiếp từ hai trường này:

```tsx
<Stat label="Tài nguyên" value={detail.resourceCount} icon={BookOpen} />
<Stat label="Bài nộp" value={detail.submissionCount} icon={ClipboardList} />
```

**Kịch bản lỗi:** giáo viên mở trang tổng quan lớp (Class Hub) của một lớp đã đăng 10 tài nguyên và
nhận 40 bài nộp — hai ô thống kê vẫn hiện "0" mọi lúc. Không phải bug hiếm khi bấm nhầm; đây là hằng
số cứng, xảy ra 100% số lần tải trang.

**Sửa:** thêm `countByClassId` cho `class_resources` và `submissions` (join qua `class_resource_id`),
gọi trong `toDetail()`. `assignmentCount` (đếm riêng resource có `submissionEnabled=true`) cũng đang bỏ trống,
kiểm tra xem FE có dùng không trước khi quyết định có cần tính hay bỏ field.

## R4-02 — Xóa resource cascade xóa sạch bài nộp, không cảnh báo **[Cao]**

`ClassResourceService.deleteResource()`:

```java
@Transactional
public void deleteResource(UUID classId, UUID resourceId) {
    requireOwnedActiveClass(classId);
    ClassResource existing = requireClassResource(classId, resourceId);
    classResourceRepository.deleteById(existing.id());
}
```

`submissions.class_resource_id` có `ON DELETE CASCADE` (`V27__create_submissions.sql:11`), và
`submission_files.submission_id` cũng cascade tiếp. Không có check số lượng bài nộp hiện có, không có
soft-delete, không có bản ghi log riêng cho việc mất dữ liệu, và học sinh có bài đã nộp không được báo.

**Kịch bản lỗi:** giáo viên đăng một assignment, 30 học sinh nộp bài (một số nộp file, một số viết
text dài), sau đó giáo viên bấm Xóa vì gõ nhầm tiêu đề hoặc muốn đăng lại — toàn bộ 30 bài nộp và file
đính kèm biến mất vĩnh viễn khỏi DB (file trên R2 vẫn còn, thành rác không tham chiếu được từ đâu nữa).
Không có "thùng rác", không có xác nhận nào ở backend ghi rõ hậu quả (FE có thể có `window.confirm`,
nhưng đó chỉ là UI, backend không chặn).

**Sửa:** chặn xóa khi resource có submission (báo giáo viên dùng "lưu trữ" thay vì xóa), hoặc đổi sang
soft-delete để có đường khôi phục.

## R4-03 — Nháp nộp bài trong localStorage không theo user, đè lên bài đã nộp thật **[Cao]**

`fe/components/classroom/ResourceDetailPage.tsx`:

```ts
function draftStorageKey(classId: string, resourceId: string): string {
  return `edua:submission-draft:${classId}:${resourceId}`;
}
```

Khóa lưu nháp chỉ phụ thuộc `classId`/`resourceId`, **không có id người dùng**. Và trong `load()`:

```ts
const draft = readDraft(classId, resourceId);
if (draft) {
  setInitialText(draft.textContent); setTextContent(draft.textContent);
  setFiles(draft.files); setSavedAt(draft.savedAt); setSaveStatus("saved");
} else {
  setInitialText(own?.textContent ?? ""); setTextContent(own?.textContent ?? "");
  setFiles(own?.files ?? []);
}
```

Nháp cục bộ luôn được ưu tiên hơn bài đã nộp thật trên server (`own`), không so sánh thời gian, không
xóa nháp khi có bài nộp mới từ nơi khác. `clearDraft()` chỉ chạy sau khi `submit()`/`unsubmit()` thành
công trên **chính phiên đó**.

**Hai kịch bản lỗi:**

1. **Nháp cũ đè bài nộp thật:** học sinh gõ bài trên máy A, nháp tự lưu (`AUTOSAVE_DEBOUNCE_MS`),
   nhưng đóng tab mà không bấm "Nộp bài". Sau đó nộp bài thành công trên máy B (hoặc trình duyệt
   khác). Khi mở lại tài nguyên này trên máy A, `readDraft` vẫn trả về bản nháp cũ, hiển thị y như bài
   đã nộp gần nhất là bản nháp lỗi thời — nếu học sinh bấm "Nộp lại" sẽ **ghi đè bài nộp thật bằng nội
   dung cũ**, mất luôn bài đúng đã nộp trên máy B.
2. **Lộ nháp giữa hai tài khoản dùng chung máy:** phòng máy tính dùng chung trình duyệt, học sinh A
   gõ bài (nháp lưu localStorage) rồi đăng xuất không nộp; học sinh B đăng nhập trên cùng máy, mở đúng
   tài nguyên đó (cùng `classId`/`resourceId` nếu học chung lớp) sẽ thấy nội dung nháp của học sinh A.

**Sửa:** thêm `userId` vào khóa localStorage, và chỉ dùng nháp khi `!own` hoặc khi nháp mới hơn
`own.submittedAt`; xóa nháp cũ chủ động khi phát hiện `own` mới hơn thời điểm lưu nháp.

## R4-04 — `unsubmit()` không báo giáo viên **[TB]**

Cùng họ với R3-03. `SubmissionService.submit():99` gọi `notifyTeacherSubmission(...)`, nhưng
`unsubmit():103-111` xóa thẳng bản ghi (`submissionRepository.deleteByResourceAndStudent`) không gửi
thông báo nào. Giáo viên đang xem roster (`SubmissionsRosterPanel`) hoặc đang mở chi tiết bài
(`SubmissionDetailPanel`) của học sinh đó sẽ không biết bài đã bị rút cho tới khi tự bấm "Làm mới", và
nếu đang mở đúng trang chi tiết thì lần tải lại tiếp theo sẽ ra lỗi "No submission found" khó hiểu.

## R4-05 — Kiểm tra tuổi tối thiểu lệch tới 364 ngày **[TB]**

Backend (`ClassEnrollmentService.validateProfileMessage:448`):

```java
if (LocalDate.now().getYear() - dateOfBirth.getYear() < MIN_STUDENT_AGE_YEARS) {
    return "Học sinh phải từ 16 tuổi trở lên.";
}
```

Frontend (`AddStudentPage.tsx:291`, dùng làm `max` cho input ngày sinh):

```ts
const latestAllowedBirthDate = `${new Date().getFullYear() - MIN_STUDENT_AGE_YEARS}-12-31`;
```

Cả hai đều trừ theo **năm dương lịch**, không phải khoảng cách ngày thật. Với ngày hôm nay
2026-08-11: học sinh sinh 2010-12-31 (thực tế còn 4 tháng rưỡi nữa mới tròn 16 tuổi) vẫn qua được cả
hai kiểm tra, vì `2026 - 2010 = 16` không nhỏ hơn `16`. Học sinh sinh cuối năm bị enroll sớm tới gần 1
năm so với ngưỡng tuổi thật.

**Sửa:** dùng `Period.between(dateOfBirth, LocalDate.now()).getYears()` ở backend; ở FE tính `max`
bằng ngày chính xác (`today - 16 years`) thay vì chốt cứng "31/12".

## R4-06 — Không khóa khi kiểm tra sĩ số, race có thể vượt 60 **[TB]**

`requireCapacity()` (dùng cho `addStudent`) và `validateImportPlan()` (dùng cho `importStudents`) đều
là đọc `COUNT` rồi so sánh, không `SELECT ... FOR UPDATE`, không advisory lock. Bảng `class_members`
không có ràng buộc DB nào giới hạn sĩ số (chỉ có `UNIQUE (class_id, student_id)` — xem
`V15__create_class_management.sql:24`, sau đổi tên ở `V23`). `MAX_CLASS_SIZE = 60` chỉ tồn tại ở tầng
service.

**Kịch bản lỗi:** lớp đang có 59/60. Giáo viên mở hai tab, bấm "Thêm học sinh" gần như đồng thời cho
hai email khác nhau (hoặc bấm nhầm hai lần liên tiếp trước khi tab đầu phản hồi). Cả hai transaction
đều đọc `count = 59 < 60`, đều pass, đều `INSERT` — lớp thành 61/60. Cùng logic áp dụng khi vừa
`addStudent` một email vừa `importStudents` một file chạy chồng lên nhau.

**Sửa:** thêm ràng buộc ở DB (ví dụ trigger đếm, hoặc constraint qua partial unique index không khả
thi cho COUNT) hoặc khóa pessimistic trên dòng `classes` khi ghi `class_members`.

## R4-07 — `load()` không có cancellation guard khi đổi lớp/resource nhanh **[Thấp]**

Cùng họ R1-13/R3-16. `AddStudentPage.tsx` (`useEffect` theo `classId`, dòng 153-162) và
`ResourceDetailPage.tsx` (`useEffect` theo `load`, dòng 212-217) không có cờ hủy hay số thứ tự
request. Đổi lớp/tài nguyên nhanh (chọn lớp A rồi B trong dropdown, hoặc back/forward giữa hai
resource) có thể khiến response chậm của A ghi đè lên dữ liệu B đang hiển thị.

---

## R4-10 — `removeStudent()` bỏ qua khóa lớp lưu trữ **[Cao]**

`ClassEnrollmentService.removeStudent():148` dùng `requireOwnedClass(classId)` — chỉ kiểm tra quyền sở
hữu, không kiểm tra `classroom.isActive()`. Mọi method ghi khác trong cùng service
(`addStudent`, `importStudents`) và cả `ClassResourceService`/`SubmissionService` đều dùng
`requireOwnedActiveClass` để khóa ghi khi lớp đã INACTIVE (đúng bất biến "lớp lưu trữ = chỉ đọc" mà
`ClassSettingsPage.tsx` và `AddStudentPage.tsx` quảng cáo với người dùng).

**Kịch bản lỗi:** giáo viên lưu trữ một lớp cũ (status INACTIVE, ý định đóng băng dữ liệu). Sau đó vẫn
gọi được `DELETE /api/classes/{id}/members/{studentId}` — gỡ mềm học sinh khỏi một lớp đáng lẽ chỉ
đọc. Vi phạm đúng bất biến mà toàn bộ phần còn lại của cụm cố gắng giữ.

**Sửa:** đổi `requireOwnedClass` → `requireOwnedActiveClass` ở dòng 148 (trừ khi lưu trữ+gỡ học sinh là
chủ ý — nếu vậy cần ghi rõ trong docstring, hiện docstring không nói gì về ngoại lệ này).

## R4-11 — `removeStudent()` không bắt buộc lý do, không báo học sinh **[TB]**

`removeStudent()` cho `reason` optional (`StringUtils.hasText(reason) ? reason.trim() : null`) và
không gọi notify nào cho học sinh bị gỡ — khác hẳn `postResource`/`addStudent` đều có
`notifyResourceChange`/`notifyEnrollment`. Học sinh chỉ phát hiện bị gỡ khi tự mở lại lớp và nhận
`ClassAccessRevokedException` (xử lý khá tốt ở FE — xem `ResourceDetailPage.tsx:413-430`, đếm ngược rồi
điều hướng), nhưng không có thông báo chủ động, và không có gì buộc giáo viên ghi lý do — nếu học sinh
khiếu nại thì không có gì đối chiếu.

**Sửa:** cân nhắc bắt buộc `reason` khi gỡ, và thêm `notify(studentId, ...)` giống các thao tác khác
trong cùng service.

## R4-12 — `listSubmissions()`/`getSubmissionDetail()` kiểm tra `submissionEnabled` không nhất quán **[Cao]**

`SubmissionService.listSubmissions():126` gọi `requireSubmittableResource()` — ném lỗi nếu
`resource.submissionEnabled() == false`. `getSubmissionDetail():147` gọi thẳng `requireClassResource()`,
không kiểm tra `submissionEnabled` chút nào.

**Kịch bản lỗi:** giáo viên đăng bài tập, học sinh nộp, hết hạn giáo viên tắt `submissionEnabled` (qua
`updateResource`) để khóa nộp thêm — dữ liệu bài nộp cũ trong DB không hề mất. Nhưng từ giờ
`GET /api/classes/{id}/resources/{resourceId}/submissions` (roster, UC-44 — màn chính để giáo viên chấm
bài) luôn ném lỗi, trong khi `GET .../submissions/{studentId}` (chi tiết từng học sinh, UC-45) vẫn hoạt
động bình thường nếu biết đúng `studentId`. Giáo viên mất đường vào roster của chính bài tập đã thu bài
xong — đúng lúc cần xem nhất.

**Sửa:** bỏ check `submissionEnabled` khỏi `listSubmissions()` (roster nên luôn xem được bất kể cờ này),
hoặc thêm cùng check vào `getSubmissionDetail()` để nhất quán — ưu tiên phương án đầu vì cờ này chỉ nên
chặn *nộp mới*, không chặn *xem bài đã nộp*.

## R4-13 — `size` không có trần trên ở các endpoint danh sách **[TB]**

`ClassController.list()/listEnrolled()/members()/resources()` đều nhận `size` thẳng từ query param rồi
đưa vào `PageRequest.of(page, size)` không qua `Math.min(...)`. So sánh: `WeeklyTaskService` đã tự clamp
`Math.min(size, 100)` (ghi trong R3-14). Ở đây thì không — client gửi `size=2147483647` ép DB fetch/
materialize không giới hạn.

## R4-14 — `normalizeDescription()` không giới hạn độ dài (ClassResourceService) **[Thấp]**

`ClassResourceService.normalizeDescription():338-344` chỉ trim, không có `if (trimmed.length() > N)`.
`ClassManagementService.normalizeDescription():211-220` (mô tả lớp) thì chặn ở 2000 ký tự. Hai hàm cùng
tên, cùng mục đích, không dùng chung — mô tả tài nguyên có thể dài vô hạn trong khi mô tả lớp thì không.

## R4-15 — `userEditedRef` không reset khi đổi resource trong cùng instance **[Thấp]**

`ResourceDetailPage.tsx:242` — `userEditedRef.current = true` được set khi người dùng gõ, chỉ reset lại
`false` trong `handleSubmit`/`handleUnsubmit`, không reset trong `load()`. Hiện tại route
`/class-detail/assignments/...?resourceId=X` đổi resource luôn qua điều hướng Next.js làm remount
component nên chưa khai thác được, nhưng nếu sau này thêm nút "Bài tiếp theo" tái dùng cùng instance,
`userEditedRef` cũ sẽ khiến autosave ghi nháp cho resource mới dù người dùng chưa gõ gì ở đó. Ghi nhận
để không lặp lại khi làm tính năng điều hướng nhanh giữa các resource.

## R4-17 — Catch-all che giấu lỗi parser thật đằng sau thông báo "file hỏng" **[Thấp]**

`ClassEnrollmentService.parseFile():492` — `catch (IOException | RuntimeException ex)` bọc quanh toàn
bộ `parseCsv`/`parseWorkbook`, gộp cả lỗi hợp lệ (file thật sự hỏng) lẫn bug parser (NPE, index lỗi,
lỗi nội bộ POI) vào cùng một thông báo "File có thể bị hỏng hoặc không đúng định dạng". Nếu
`parseWorkbook` có bug ở một edge case ô ngày tháng cụ thể, giáo viên sẽ thấy thông báo sai nguyên
nhân, tải lại đúng file đó nhiều lần mà không hiểu vì sao luôn lỗi, còn bug thật thì không bao giờ lộ ra
log ở mức đủ rõ để phát hiện (đã log message theo `label`, nhưng người vận hành khó phân biệt "file
hỏng thật" với "code hỏng" nếu chỉ nhìn log tần suất).

---

## Kiểm tra nhưng không có vấn đề

- **Quyền thành viên đã bị gỡ (REMOVED)**: `JpaClassMemberRepository.existsByClassIdAndStudentId/
  findByClassIdAndStatus/findStudentIdsByClassId` đều lọc `status = ENROLLED` ở tầng JPA
  (`JpaClassMemberRepository.java:46-68`), nên học sinh đã bị gỡ khỏi lớp không truy cập được resource,
  không nộp được bài, không nằm trong danh sách nhận thông báo — không có lỗ IDOR kiểu "đã rời lớp vẫn
  thao tác được" mà checklist lo ngại.
- **Trùng dòng khi import**: `validateImportPlan()` bắt trùng email trong cùng file
  (`firstRowByEmail.putIfAbsent`) và trùng với DB (`ALREADY_ENROLLED`) trước khi ghi, atomic theo
  transaction — không có ca thêm trùng qua import.
- **Import atomic**: lỗi bất kỳ dòng nào (`plan.errors()` không rỗng) thì không ghi gì cả; nếu ghi
  giữa chừng gặp `DataAccessException` thì toàn bộ `@Transactional` rollback — không để lại bản ghi nửa
  vời.
- **Ảnh chụp thông tin đóng góp**: xóa mềm học sinh (`removeStudent`) giữ nguyên account, role,
  submission — đúng như mô tả UI (`"Chỉ gỡ khỏi lớp này"`), khớp giữa code và copy hiển thị.
