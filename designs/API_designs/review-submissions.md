# Review Submissions — API Design (UC-44 → UC-46)

> Endpoint đặc thù phía **Teacher**: xem danh sách bài nộp, xem chi tiết 1 bài nộp, và tải file bài nộp
> của học sinh cho 1 class resource có bật `submissionEnabled` (**UC-44 View Submissions List**, **UC-45
> View Submission Detail**, **UC-46 Download Submission File**) — nhánh Teacher-đọc của nhóm Submission
> (`UC-44→48`), đối xứng với nhánh Student-ghi đã thiết kế ở
> [`submit-assignment.md`](./submit-assignment.md) (UC-47/48).
> Luồng & thiết kế triển khai BE: [`../review-submissions/flow.md`](../review-submissions/flow.md).
> Hạ tầng dùng chung auth/RBAC/rate-limit theo [`api-chung.md`](./api-chung.md).

## Quyết định riêng

- **Bám sát SRS, đúng 3 use case, nhưng UC-46 không có endpoint riêng**: `UC-44`/`UC-45` map trực tiếp
  thành 2 endpoint đọc mới. `UC-46 Download Submission File` **không** cần endpoint backend mới — xem
  bullet tiếp theo.
- **Không có file-download proxy nào trong codebase — UC-46 tái dùng `url` public đã có**: đã grep toàn
  bộ `be/src/main/java` cho `download`/`Download`, không có kết quả nào. Toàn bộ luồng file hiện tại
  (`POST /api/uploads` → `{url, fileName, contentType, sizeBytes}` public R2 link,
  `ClassResourceSummaryDto.attachment.url`, `SubmissionDetailDto.files[].url`) đều phục vụ file qua URL
  public của R2, không có bước backend proxy/stream lại file. `UC-45`'s response
  (`TeacherSubmissionDetailDto.files[].url`) đã đủ để FE kích hoạt download trực tiếp từ trình duyệt
  (`<a href download>` hoặc `fetch` + blob) — không có round-trip qua backend cho UC-46. Đây là kế thừa
  đúng tradeoff kiến trúc đã chấp nhận từ trước (public R2 URL, không có authorization check riêng ở
  thời điểm tải file), không phải một khoảng hở mới phát sinh ở tài liệu này.
- **Owner-only, không check `ACTIVE` (BR-39)**: khác nhóm ghi (`manage-class-resources.md`,
  `submit-assignment.md` đều chặn khi `INACTIVE`), cả 2 endpoint đọc ở đây hoạt động bất kể trạng thái
  lớp — đúng SRS UC-46 Alt Flow "Step 6_Class is inactive ... permits the file download according to
  BR-39", và nhất quán với `GET /{id}/resources` (`view-class-resources.md`).
- **`GET .../submissions` không phân trang**: SRS UC-44 Normal Flow mô tả "the system retrieves the
  currently enrolled students" và "displays all enrolled students sorted by name" như một khối duy
  nhất — không có bước phân trang nào được nhắc tới, khác hẳn `GET /members`
  (`add-student.md`) vốn phân trang cho danh sách thành viên. Tái dùng đúng pattern không-phân-trang đã
  có ở `ClassMemberRepository.findAllStudentIds` (dùng cho notify-all, BR-46) thay vì
  `findByClassId` phân trang — vì đây là màn hình dashboard 1 lớp, số lượng học sinh luôn nhỏ.
- **Roster đầy đủ, không chỉ học sinh đã nộp**: theo SRS Alt Flow "Step 5_No students have submitted" →
  vẫn hiển thị toàn bộ học sinh enrolled với trạng thái `Not Submitted`, không trả danh sách rỗng. Vì
  vậy response phải merge 2 nguồn: roster (`ClassMemberRepository` + `AppUserRepository`) và submission
  đã có (`SubmissionRepository`) — không thể chỉ query 1 chiều từ bảng `submissions`.
- **`SubmissionStatus.NOT_APPLICABLE` không xuất hiện ở endpoint này**: `GET .../submissions` luôn 403
  trước khi trả dữ liệu nếu `resource.submissionEnabled = false` (SRS Alt Flow "Step
  3_Submissions are not enabled"), nên mọi row trả về chỉ dùng 3 giá trị còn lại của
  `SubmissionStatus` (`NOT_SUBMITTED | ON_TIME | LATE`).
- **`UC-45` khoá theo `studentId`, không phải `submissionId`**: SRS "The teacher selects a student entry
  from the Submissions List" — mỗi hàng trong danh sách UC-44 là 1 student, kể cả khi chưa nộp bài; dùng
  `studentId` (đã có sẵn trong response UC-44) làm khoá cho UC-45 thay vì lộ thêm `submissionId` ra
  danh sách chỉ để dùng làm khoá. `404` khi học sinh đó chưa nộp hoặc đã thu hồi (SRS "Step
  2_Submission is unavailable" bao gồm cả 2 trường hợp).
- **Response UC-45 mang theo `studentId`/`studentName`, khác `SubmissionDetailDto` phía Student**: màn
  Submission Detail của Teacher cần định danh học sinh đang xem (không suy ra được từ JWT như phía
  Student), nên không tái dùng thẳng `SubmissionDetailDto` — thêm DTO riêng
  `TeacherSubmissionDetailDto` cùng field còn lại (`textContent`, `files`, `status`, `submittedAt`).
- **Lộ thêm `firstSubmittedAt` (= `Submission.createdAt`) cạnh `submittedAt`, cả ở roster lẫn detail**:
  BR-36 không giữ version history nên không đếm được chính xác số lần sửa, nhưng bảng `submissions`
  đã có sẵn `created_at` (giữ nguyên qua mỗi lần upsert) và `submitted_at`/`updated_at` (ghi đè mỗi lần
  nộp lại) — không cần schema mới. FE so sánh 2 mốc này để hiện badge "Đã chỉnh sửa" + "Nộp lần đầu lúc
  X · Sửa lần cuối lúc Y" khi khác nhau. Không phải audit log đầy đủ từng lần sửa, chỉ là 2 mốc đầu/cuối.
- **Không thêm exception loại mới**: cả 2 endpoint chỉ cần `ForbiddenOperationException` (403),
  `ResourceNotFoundException` (404) — đã map sẵn trong `GlobalExceptionHandler`, giống
  `view-class-resources.md`/`submit-assignment.md`.

---

## Danh sách endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | GET | `/api/classes/{classId}/resources/{resourceId}/submissions` | UC-44 View Submissions List | TEACHER owner |
| 2 | GET | `/api/classes/{classId}/resources/{resourceId}/submissions/{studentId}` | UC-45 View Submission Detail | TEACHER owner |
| — | — | (UC-46 Download Submission File) | không có endpoint — xem "Quyết định riêng" | — |

Tất cả request cần `Authorization: Bearer <access>` theo JWT filter của `auth.md`.

---

## Data contract

### `SubmissionRosterEntryDto`

```json
{
  "studentId": "uuid",
  "studentName": "Nguyen Van A",
  "studentEmail": "student@gmail.com",
  "status": "ON_TIME",
  "firstSubmittedAt": "2026-07-29T21:40:00Z",
  "submittedAt": "2026-07-30T10:15:00Z"
}
```

- `status`: `NOT_SUBMITTED | ON_TIME | LATE` — không bao giờ là `NOT_APPLICABLE` (xem "Quyết định
  riêng").
- `firstSubmittedAt`/`submittedAt`: `null` khi `status = NOT_SUBMITTED`. Khác nhau ⇒ học sinh đã nộp
  lại ít nhất 1 lần (xem "Quyết định riêng").

### `SubmissionRosterDto` (response UC-44)

```json
{
  "resourceId": "uuid",
  "deadline": "2026-08-01T23:59:59Z",
  "items": [ SubmissionRosterEntryDto ]
}
```

- `items`: sắp xếp theo `studentName` tăng dần. Không có `page`/`size`/`total` — xem "Quyết định
  riêng".
- `items: []` khi lớp không có học sinh enrolled nào (SRS Alt Flow "Step 4_No students are enrolled").

### `TeacherSubmissionDetailDto` (response UC-45)

```json
{
  "studentId": "uuid",
  "studentName": "Nguyen Van A",
  "textContent": "<p>Bai lam cua em...</p>",
  "files": [
    { "fileName": "baitap1.pdf", "url": "https://.../baitap1.pdf", "contentType": "application/pdf", "sizeBytes": 204800 }
  ],
  "status": "ON_TIME",
  "firstSubmittedAt": "2026-07-29T21:40:00Z",
  "submittedAt": "2026-07-30T10:15:00Z"
}
```

- Shape giống `SubmissionDetailDto` (`submit-assignment.md`) cộng `studentId`/`studentName`.
- `files[].url`: dùng thẳng cho UC-46 (FE kích hoạt download trình duyệt từ URL này).

---

## Chi tiết endpoint

### 1. `GET /api/classes/{classId}/resources/{resourceId}/submissions` — Xem danh sách bài nộp (UC-44)

```http
→ 200  SubmissionRosterDto
→ 403  khong phai owner, hoac resource.submissionEnabled = false
→ 404  lop khong ton tai / resourceId khong ton tai hoac khong thuoc lop nay
→ 502/500 loi truy van du lieu (MSG25)
```

- Guard: load class → verify owner (BR-34, `403` nếu không phải owner — SRS Alt Flow "Step
  2_Teacher is not the class owner") → load resource theo `resourceId` (404 nếu không thuộc `classId`
  — SRS Alt Flow "Step 3_Resource does not exist") → verify `submissionEnabled = true` (403 nếu `false`
  — SRS Alt Flow "Step 3_Submissions are not enabled"). Không check `ACTIVE`.
- Lấy toàn bộ `studentId` enrolled (`ClassMemberRepository.findAllStudentIds`, không phân trang) → batch
  fetch tên/email (`AppUserRepository.findAllById`) → lấy toàn bộ submission của đúng `resourceId`
  (`SubmissionRepository.findAllByResource`, method mới) → merge: học sinh không có dòng submission →
  `NOT_SUBMITTED`, `submittedAt = null`; có → dùng `status`/`submittedAt` đã lưu.
- Sắp xếp kết quả theo `studentName`.
- Roster rỗng (không ai enrolled) → `200`, `items: []` (MSG01). Roster không rỗng nhưng chưa ai nộp →
  `200`, mọi row `NOT_SUBMITTED` (MSG01 chỉ là copy hiển thị phía FE, không phải lỗi).
- Không có postcondition ghi.
- Map: `UC-44` Normal Flow + Alternative "Teacher is not the class owner" / "Resource does not exist" /
  "Submissions are not enabled" / "No students are enrolled" / "Submission data fails to load" / "No
  students have submitted" / "Teacher selects a submitted item" (→ điều hướng sang endpoint 2, không xử
  lý ở đây).

### 2. `GET /api/classes/{classId}/resources/{resourceId}/submissions/{studentId}` — Xem chi tiết 1 bài nộp (UC-45)

```http
→ 200  TeacherSubmissionDetailDto
→ 403  khong phai owner
→ 404  lop/resource khong ton tai hoac khong thuoc dung cap, hoac hoc sinh do chua nop/da thu hoi bai
→ 502/500 loi truy van du lieu (MSG25)
```

- Guard: load class → verify owner → load resource theo `resourceId` (404 nếu không thuộc `classId`) →
  tìm submission theo `(resourceId, studentId)` — không có (chưa nộp hoặc đã thu hồi) → `404` (SRS Alt
  Flow "Step 2_Submission is unavailable").
- Trả kèm `studentId`/`studentName` (tra `AppUserRepository.findById(studentId)`) để màn hình detail
  không phụ thuộc state của màn danh sách.
- Không có postcondition ghi — thuần đọc, hoạt động cả khi lớp `INACTIVE`.
- Map: `UC-45` Normal Flow + Alternative "Submission is unavailable" / "Data retrieval fails". SRS "File
  preview is supported" / "File retrieval fails" là hành vi FE khi render `files[].url` (preview ảnh/PDF
  trực tiếp từ R2), không có logic backend riêng.

### (UC-46 Download Submission File — không có endpoint)

- FE lấy `files[].url` từ response endpoint 2 (`TeacherSubmissionDetailDto`) và kích hoạt tải file
  bằng cơ chế trình duyệt (thẻ `<a download>` hoặc `fetch` blob), giống cách UC-43 Download Assigned
  Material dự kiến tái dùng `ClassResourceSummaryDto.attachment.url` khi được thiết kế.
- SRS Alt Flow "Step 2_Teacher is not the class owner" / "Step 3_Submission has been withdrawn" /
  "Step 3_Submitted file does not exist" đã được phủ bởi endpoint 2 (`403`/`404` trước khi FE có `url`
  để tải). "Step 6_Class is inactive" — không áp dụng do endpoint 2 không chặn theo `ACTIVE` (BR-39).
  "Step 7_Download is cancelled" là hành vi trình duyệt/FE thuần túy.

---

## Cross-cutting

- **RBAC**: không dùng `@PreAuthorize("hasRole('TEACHER')")` — check "owner" trong service, giống
  `GET /{id}/resources` (`view-class-resources.md`) vì bản chất là owner-check chứ không phải role-check
  (một Teacher không sở hữu lớp vẫn bị `403`).
- **Owner-only, đọc được cả khi `INACTIVE`**: khác nhóm ghi (`manage-class-resources.md`), theo BR-39.
- **Không có transaction ghi**: cả 2 endpoint đều `@Transactional(readOnly = true)`.
- **Rate-limit, CORS, error envelope**: theo `api-chung.md`.

## Phụ thuộc & thứ tự build

1. Mở rộng `SubmissionRepository` (`repository/repositories/`): thêm `findAllByResource(UUID
   classResourceId): List<SubmissionWithFiles>` — tái dùng record `SubmissionWithFiles` đã có. Thêm
   implementation tương ứng ở adapter JPA (`infrastructure/persistence/`, cạnh
   `JpaSubmissionRepository`).
2. `SubmissionService` (`service/classroom/SubmissionService.java`, file đã có): thêm guard mới
   `requireOwnedClass(classId)` (owner-only, không check `ACTIVE` — khác 2 guard hiện có
   `requireEnrolledActiveClass`/`requireEnrolledClass`; mirror đúng cặp private
   `requireOwnedClass`/`requireOwnedActiveClass` đã có ở `ClassResourceService`, giữ bản riêng theo đúng
   nguyên tắc "mỗi service tự có guard" đã dùng xuyên suốt nhóm Class) + 2 method mới:
   `listSubmissions(classId, resourceId)`, `getSubmissionDetail(classId, resourceId, studentId)`.
3. `SubmissionViews` (file đã có): thêm record `RosterEntry`, `Roster`, `TeacherDetail`.
4. DTO mới (`presentation/dto/classroom/`): `SubmissionRosterDto`, `SubmissionRosterEntryDto`,
   `TeacherSubmissionDetailDto`.
5. Thêm 2 method vào `ClassController` hiện có (cùng resource
   `/api/classes/{classId}/resources/{resourceId}`, không tách controller riêng — giống cách 3 method
   submission của Student đã được thêm).
6. Không có migration mới — dùng đúng bảng `submissions`/`submission_files` từ
   `V25__create_submissions.sql`.
7. Smoke test qua Swagger: List với lớp có/không có học sinh, resource chưa ai nộp, resource có người
   nộp On Time/Late, non-owner gọi cả 2 endpoint (403), resource `submissionEnabled=false` gọi List
   (403), Detail của học sinh chưa nộp (404), Detail sau khi học sinh Unsubmit (404), List/Detail khi
   lớp `INACTIVE` (vẫn 200).

## Điểm mở

- UI Teacher-side (danh sách bài nộp, màn chi tiết bài nộp, nút tải file) ở FE
  (`fe/components/classroom/`) chưa tồn tại, sẽ thiết kế sau khi API được chốt.
- Giới hạn tổng số file/tổng dung lượng cho 1 lần nộp vẫn chưa được định nghĩa — kế thừa nguyên trạng
  từ `submit-assignment.md`, không thuộc phạm vi tài liệu này.
