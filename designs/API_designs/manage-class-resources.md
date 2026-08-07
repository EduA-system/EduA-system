# Manage Class Resources — API Design

> Endpoint đặc thù phía **Teacher**: đăng/sửa/xóa resource-assignment trong lớp mình sở hữu
> (**UC-38 Post Class Resource**, **UC-39 Update Class Resource**, **UC-40 Delete Class Resource**).
> Đây là nguồn ghi dữ liệu vào `class_resources` mà [`view-class-resources.md`](./view-class-resources.md)
> (UC-41, phía đọc) đang giả định đã tồn tại.
> Hạ tầng CRUD lớp (tạo/xem/sửa/đổi trạng thái) tách ở [`class-management.md`](./class-management.md).
> Hạ tầng Add Student tách ở [`add-student.md`](./add-student.md).
> Luồng & thiết kế triển khai BE: [`../manage-class-resources/flow.md`](../manage-class-resources/flow.md).
> Hạ tầng dùng chung auth/RBAC/rate-limit/upload theo [`api-chung.md`](./api-chung.md).

## Quyết định riêng

- **Bám sát SRS, đúng 3 use case**: mapping trực tiếp `UC-38 Post Class Resource`, `UC-39 Update
  Class Resource`, `UC-40 Delete Class Resource`. Không làm `UC-42 View Class Resource Detail`,
  `UC-43 Download Assigned Material` hay nhóm `UC-44→48` (Submission) — liệt kê ở "Điểm mở".
- **Không có bảng mới**: `V23__create_class_resources.sql` (đã build cho UC-41) đã tạo đủ cột cho cả
  ghi lẫn đọc. Tài liệu này chỉ thêm service/repository/controller thao tác trên bảng có sẵn, không
  cần migration mới.
- **2 nguồn nội dung loại trừ nhau khi Post**: theo SRS Normal Flow + Alternative Flow của UC-38,
  teacher chọn **hoặc** một item từ Personal Library (`sourceType = LIBRARY_SNAPSHOT`) **hoặc** upload
  file trực tiếp (`sourceType = FILE_UPLOAD`) — không kết hợp cả hai trong 1 lần post.
- **Resource là snapshot độc lập, không sửa được `sourceType` sau khi tạo (BR-35)**: `Update Class
  Resource` cho sửa `title`/`description`/`attachment`/`submissionEnabled`/`deadline`, nhưng
  **không** cho đổi `sourceType` hay `sourceLibraryContentId` — nguồn Personal Library gốc (nếu có)
  không bị ảnh hưởng bởi bất kỳ thao tác Update/Delete nào ở đây.
- **Chỉ notify lại khi đổi submission setting hoặc deadline**: theo SRS UC-39 Alternative Flow
  "Step 4_Update submission settings or deadline" → chỉ nhánh này mới gửi notification cho học sinh
  enrolled; sửa `title`/`description`/`attachment` thường thì không notify.
- **Reuse `ClassResourceSummaryDto` có sẵn** (từ UC-41) làm response cho cả Post và Update — không
  tạo DTO response mới trùng lặp field.
- **`attachment` request tái dùng shape response của `POST /api/uploads`** (`api-chung.md`), bỏ
  `fileId`: FE gọi upload trước để lấy `{url, fileName, contentType, sizeBytes}`, rồi gửi lại đúng
  shape đó khi Post/Update resource kiểu `FILE_UPLOAD` — khớp đúng field `attachment` đã định nghĩa
  sẵn trong `ClassResourceSummaryDto`.
- **`title` optional khi `LIBRARY_SNAPSHOT`, bắt buộc khi `FILE_UPLOAD`**: SRS không mô tả bước nhập
  title riêng cho nhánh Personal Library (chỉ "select an owned item" + optional description) — mặc
  định lấy `LibraryContent.title()` nếu teacher bỏ trống. Nhánh upload file không có nguồn title tự
  nhiên nên bắt buộc nhập.
- **Không cần exception loại mới**: 3 endpoint chỉ cần `IllegalArgumentException` (400),
  `ForbiddenOperationException` (403), `ResourceNotFoundException` (404) — đã map sẵn trong
  `GlobalExceptionHandler`, khác với Add Student cần thêm exception riêng cho case 409 phức tạp hơn.
- **Owner-only + Active-only cho cả 3 endpoint**: khác hẳn UC-41 (đọc được cả khi `INACTIVE`, BR-39),
  UC-38/39/40 đều chặn nếu lớp `INACTIVE` (BR-37) — theo đúng nguyên tắc đã dùng ở
  `class-management.md`/`add-student.md`.
- **Xác nhận xóa (MSG09) là hành vi FE, không phải endpoint riêng**: `DELETE` xóa ngay khi được gọi;
  popup xác nhận trước khi gọi là trách nhiệm của FE.
- **Xóa submission liên quan (BR-45) chưa áp dụng được**: domain `Submission` (UC-44→48) chưa tồn
  tại, nên hiện tại `DELETE` chỉ xóa đúng 1 dòng `class_resources`. Khi bảng `submissions` được thiết
  kế, cần FK `ON DELETE CASCADE` từ `submissions.class_resource_id` để giữ đúng postcondition BR-45
  mà không cần sửa lại endpoint này.

---

## Danh sách endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | POST | `/api/classes/{id}/resources` | UC-38 Post Class Resource | TEACHER owner |
| 2 | PATCH | `/api/classes/{id}/resources/{resourceId}` | UC-39 Update Class Resource | TEACHER owner |
| 3 | DELETE | `/api/classes/{id}/resources/{resourceId}` | UC-40 Delete Class Resource | TEACHER owner |

Tất cả request cần `Authorization: Bearer <access>` theo JWT filter của `auth.md`.

---

## Data contract

### `PostClassResourceRequest`

```json
{
  "title": "Bài tập chương 1 - Phản ứng oxi hóa khử",
  "description": "Hoàn thành bài tập trang 12-15 SGK.",
  "sourceType": "LIBRARY_SNAPSHOT",
  "sourceLibraryContentId": "uuid",
  "attachment": null,
  "submissionEnabled": true,
  "deadline": "2026-08-01T23:59:59Z"
}
```

- `title`: bắt buộc khi `sourceType = FILE_UPLOAD`; optional khi `LIBRARY_SNAPSHOT` (mặc định lấy
  `LibraryContent.title()` nếu bỏ trống).
- `sourceType`: `LIBRARY_SNAPSHOT | FILE_UPLOAD` — bắt buộc, quyết định field nào bên dưới cần có.
- `sourceLibraryContentId`: bắt buộc khi `LIBRARY_SNAPSHOT`, phải trỏ tới item do chính teacher sở
  hữu (verify qua `LibraryContentRepository.findActiveById` + so `ownerId`); bỏ qua khi `FILE_UPLOAD`.
- `attachment`: bắt buộc khi `FILE_UPLOAD` — shape giống response `POST /api/uploads` (`api-chung.md`)
  bỏ `fileId`: `{ "url", "fileName", "contentType", "sizeBytes" }`; `null` khi `LIBRARY_SNAPSHOT`.
- `submissionEnabled`: default `false`.
- `deadline`: bắt buộc khi `submissionEnabled = true`, ngược lại phải là `null`.

### `UpdateClassResourceRequest`

```json
{
  "title": "Bài tập chương 1 (đã chỉnh sửa)",
  "description": "Cập nhật lại hướng dẫn nộp bài.",
  "attachment": { "url": "https://.../v2.pdf", "fileName": "v2.pdf", "contentType": "application/pdf", "sizeBytes": 300000 },
  "submissionEnabled": true,
  "deadline": "2026-08-05T23:59:59Z"
}
```

- Tất cả field optional — chỉ field có mặt trong body mới được cập nhật (partial update).
- `attachment`: chỉ hợp lệ khi resource gốc có `sourceType = FILE_UPLOAD`; gửi field này cho resource
  `LIBRARY_SNAPSHOT` → `400`.
- Không có field `sourceType`/`sourceLibraryContentId` — không cho đổi nguồn sau khi tạo (BR-35).
- Đổi `submissionEnabled` hoặc `deadline` so với giá trị hiện tại → sau khi save thành công, notify
  lại toàn bộ học sinh enrolled. Đổi các field khác thì không notify.

### Response — tái dùng `ClassResourceSummaryDto` (đã định nghĩa ở `view-class-resources.md`)

```json
{
  "id": "uuid",
  "title": "Bài tập chương 1 - Phản ứng oxi hóa khử",
  "description": "Hoàn thành bài tập trang 12-15 SGK.",
  "sourceType": "LIBRARY_SNAPSHOT",
  "thumbnailUrl": "https://.../thumb.png",
  "attachment": null,
  "submissionEnabled": true,
  "deadline": "2026-08-01T23:59:59Z",
  "postedByName": "Nguyen Van A",
  "postedAt": "2026-07-24T15:00:00Z",
  "submissionStatus": "NOT_APPLICABLE"
}
```

- `submissionStatus` trả cố định theo `submissionEnabled` giống UC-41 (chưa có dữ liệu nộp bài thật).

---

## Chi tiết endpoint

### 1. `POST /api/classes/{id}/resources` — Đăng resource/assignment mới vào lớp

```http
body: PostClassResourceRequest
→ 201  ClassResourceSummaryDto
→ 400  thieu title (khi FILE_UPLOAD) / thieu sourceLibraryContentId (khi LIBRARY_SNAPSHOT) /
       thieu attachment (khi FILE_UPLOAD) / submissionEnabled=true nhung thieu deadline
→ 403  khong phai owner, hoac lop Inactive (MSG23), hoac sourceLibraryContentId khong thuoc
       so huu cua teacher
→ 404  lop khong ton tai / sourceLibraryContentId khong ton tai (hoac da xoa)
→ 502/500 loi ghi du lieu (MSG25, SRS "Save fails")
```

- Guard đầu tiên: owner + lớp `ACTIVE` (BR-34, BR-37) — chặn trước khi đụng tới bất kỳ dữ liệu nào
  khác, giống thứ tự guard của `POST /members` (`add-student.md`).
- Nếu `LIBRARY_SNAPSHOT`: tra `LibraryContentRepository.findActiveById(sourceLibraryContentId)` →
  không có → `404`; có nhưng `ownerId != currentUserId` → `403`. Copy `title` (nếu request bỏ trống),
  `thumbnailUrl` từ `LibraryContent` vào bản ghi mới — đây là bước tạo "independent snapshot" (BR-35),
  sau bước này `class_resources` không còn phụ thuộc `LibraryContent` để hiển thị.
- Nếu `FILE_UPLOAD`: validate `title` + `attachment` bắt buộc có mặt; không tra `LibraryContent`.
- Validate `submissionEnabled`/`deadline` theo cặp bắt buộc đi cùng nhau.
- Ghi 1 dòng `class_resources` mới (`postedBy = currentUserId`, `createdAt = updatedAt = now()`).
- Notify **toàn bộ** học sinh đang enrolled trong lớp (BR-46) — dùng danh sách đầy đủ, không phân
  trang (khác `GET /members` phân trang cho UI).
- Hiện MSG08 khi thành công.
- Map: `UC-38` Normal Flow + Alternative "Upload a file directly" / "Add a description" / "Enable
  student submissions" / "Teacher cancels posting" / "Class or source item is unavailable" /
  "Save fails".

### 2. `PATCH /api/classes/{id}/resources/{resourceId}` — Sửa resource đã đăng

```http
body: UpdateClassResourceRequest (partial)
→ 200  ClassResourceSummaryDto
→ 400  attachment gui cho resource LIBRARY_SNAPSHOT / submissionEnabled=true nhung deadline null
       sau khi merge / du lieu khong hop le khac
→ 403  khong phai owner, hoac lop Inactive (MSG23)
→ 404  lop khong ton tai / resourceId khong ton tai hoac khong thuoc lop nay
→ 502/500 loi ghi du lieu (MSG25, SRS "Save fails")
```

- Guard: owner + lớp `ACTIVE`, resource tồn tại và thuộc đúng `classId` — giống thứ tự SRS "The
  system verifies the class, ownership, status, and resource existence."
- Merge field có mặt trong body vào bản ghi hiện tại, validate lại invariant `submissionEnabled`/
  `deadline` sau khi merge (không chỉ validate riêng field vừa gửi).
- So sánh `submissionEnabled`/`deadline` **trước và sau** merge — khác nhau thì sau khi save thành
  công mới notify enrolled students; các field khác đổi thì không notify (theo "Quyết định riêng").
- `updatedAt = now()` sau khi save.
- Hiện MSG08 khi thành công.
- Map: `UC-39` Normal Flow + Alternative "Class or resource is unavailable" / "Update submission
  settings or deadline" / "Teacher cancels editing" / "Changes are invalid" / "Save fails".

### 3. `DELETE /api/classes/{id}/resources/{resourceId}` — Xóa resource khỏi lớp

```http
→ 204  (khong body)
→ 403  khong phai owner, hoac lop Inactive (MSG23)
→ 404  lop khong ton tai / resourceId khong ton tai hoac khong thuoc lop nay
```

- Guard: owner + lớp `ACTIVE`, resource tồn tại và thuộc đúng `classId`.
- Xóa vĩnh viễn dòng `class_resources` tương ứng. Xóa submission liên quan (BR-45) hiện chưa có tác
  dụng vì chưa có bảng `submissions` — xem "Quyết định riêng" và "Điểm mở".
- Không có bước xác nhận ở tầng API — popup xác nhận (MSG09) và thông báo kết quả (MSG10) là trách
  nhiệm FE, gọi `DELETE` sau khi user xác nhận.
- Map: `UC-40` Normal Flow + Alternative "Class is inactive".

---

## Cross-cutting

- **RBAC**: `@PreAuthorize("hasRole('TEACHER')")` cho cả 3 endpoint — khác `GET /{id}/resources`
  (UC-41) dùng `authenticated()` vì UC-41 cho cả Student đọc.
- **Owner-only + Active-only**: cả 3 endpoint check `class.ownerId == currentUserId` **và**
  `class.status == ACTIVE` trước khi làm bất kỳ thay đổi nào (BR-34, BR-37) — theo đúng pattern
  `requireOwnedActiveClass` đã có ở `ClassManagementService`/`ClassEnrollmentService`.
- **Participant notification**: `POST` và `PATCH` (khi đổi submission/deadline) đều notify toàn bộ
  học sinh enrolled (BR-46), tái dùng `NotificationRepository`/`NotificationStreamPort` giống cách
  `add-student.md` đã làm cho 1 học sinh — ở đây recipient là danh sách nhiều học sinh.
- **Transaction**: mỗi endpoint là 1 transaction đơn — lỗi hệ thống giữa chừng thì rollback toàn bộ,
  không ghi 1 phần dữ liệu.
- **Rate-limit, CORS, error envelope**: theo `api-chung.md`.

## Phụ thuộc & thứ tự build

1. Mở rộng `ClassResourceRepository` (`repository/repositories/`): thêm `save(ClassResource)`,
   `findById(UUID resourceId)` (verify thuộc `classId` ở tầng service), `deleteById(UUID resourceId)`
   — không cần migration mới, dùng đúng bảng `class_resources` từ `V23`.
2. Mở rộng `ClassMemberRepository`: thêm `findAllStudentIds(UUID classId)` trả `List<UUID>` đầy đủ
   (không phân trang) — dùng để notify toàn bộ enrolled students; khác `findByClassId` phân trang
   hiện có (dùng cho UI danh sách thành viên).
3. `ClassResourceService` (`service/classroom/`): thêm `postResource(...)`, `updateResource(...)`,
   `deleteResource(...)`, cùng cặp guard mới `requireOwnedActiveClass(classId)` /
   `requireOwnedClass(classId)` — lặp lại đúng pattern đã có ở `ClassManagementService`/
   `ClassEnrollmentService` (mỗi service tự có bản guard riêng, không tách helper dùng chung).
4. DTO mới trong `presentation/dto/classroom/`: `PostClassResourceRequest`,
   `UpdateClassResourceRequest`. Response tái dùng `ClassResourceSummaryDto` đã có.
5. Thêm 3 method vào `ClassController` hiện có (cùng resource `/api/classes/{id}`, không tách
   controller riêng) — giống cách `/members` và `/resources` (GET) đã được thêm.
6. Notification: gọi lại đúng `NotificationRepository.createWithRecipients(...)` +
   `NotificationStreamPort.publishNew(...)` mà `ClassEnrollmentService` đang dùng, với
   `recipientIds = findAllStudentIds(classId)`.
7. Smoke test qua Swagger: Post resource kiểu LIBRARY_SNAPSHOT (item của chính teacher và của teacher
   khác để test 403), Post kiểu FILE_UPLOAD, Update đổi deadline (kiểm tra notify), Update chỉ đổi
   description (kiểm tra không notify), Delete rồi gọi lại `GET /{id}/resources` để xác nhận đã biến
   mất.

## Điểm mở

- `UC-42 View Class Resource Detail`, `UC-43 Download Assigned Material` — kế thừa cùng
  `ClassResourceRepository`, thiết kế sau khi tài liệu này chốt.
- `UC-47/48` (Submit/Unsubmit Assignment, phía Student) đã thiết kế ở
  [`submit-assignment.md`](./submit-assignment.md) — `DELETE` ở đây giờ có FK
  `submissions.class_resource_id ON DELETE CASCADE` xóa submission liên quan thật sự (BR-45), không
  cần sửa lại endpoint.
- `UC-44/45/46` (View Submissions List/Detail, Download Submission File, phía Teacher) — kế thừa cùng
  `SubmissionRepository` định nghĩa ở `submit-assignment.md` — đã thiết kế ở
  [`review-submissions.md`](./review-submissions.md).
- UI Teacher-side (Post/Update/Delete resource) ở FE (`fe/components/classroom/`) chưa tồn tại, sẽ
  thiết kế sau khi API được chốt.
- Giới hạn kích thước/định dạng file khi `FILE_UPLOAD` dùng chung rule của `POST /api/uploads`
  (`api-chung.md`: `.docx/.pdf/.pptx/.png/.jpg/.jpeg`, ≤ 10MB) — chưa có rule riêng bổ sung cho Class
  Resource.
