# Submit Assignment — API Design

> Endpoint đặc thù phía **Student**: nộp bài / thu hồi bài nộp cho 1 class resource có bật
> `submissionEnabled` (**UC-47 Submit Assignment**, **UC-48 Unsubmit Assignment**) — nhánh Student-ghi
> của nhóm Submission (`UC-44→48`) mà [`manage-class-resources.md`](./manage-class-resources.md) và
> [`view-class-resources.md`](./view-class-resources.md) để ở "Điểm mở".
> **Khác SRS**: SRS gốc (mục 2.7.19 UC-47) chỉ mô tả nộp bằng **file**. Tài liệu này mở rộng cho phép
> nộp **text (rich text)**, **file**, hoặc **cả hai cùng lúc** trong 1 lần nộp — quyết định sản phẩm,
> xem "Quyết định riêng".
> Phía Teacher đọc danh sách/chi tiết bài nộp (`UC-44/45/46`) đã thiết kế ở
> [`review-submissions.md`](./review-submissions.md).
> Luồng & thiết kế triển khai BE: [`../submit-assignment/flow.md`](../submit-assignment/flow.md).
> Hạ tầng dùng chung auth/RBAC/rate-limit/upload theo [`api-chung.md`](./api-chung.md).

## Quyết định riêng

- **Mở rộng ngoài SRS: text + file kết hợp được, không loại trừ nhau**: 1 submission có thể chỉ có
  `textContent`, chỉ có `files`, hoặc cả hai — khác hẳn pattern loại trừ `sourceType`
  (`LIBRARY_SNAPSHOT` / `FILE_UPLOAD`) đã dùng ở Class Resource. Ràng buộc duy nhất: phải có **ít nhất
  một** trong hai, không được nộp submission rỗng.
- **Không thêm cấu hình phía Teacher**: `submissionEnabled = true` là đủ để bật nộp bài; không thêm
  field kiểu `submissionMode` vào `PostClassResourceRequest`/`UpdateClassResourceRequest` — học sinh
  luôn được tự do chọn text/file/cả hai. Giữ nguyên schema `class_resources` đã có.
- **Text là rich text (HTML), tái dùng `BlogContentSanitizer`** (`service/blog/`) để sanitize trước
  khi lưu — class này đã được dùng chéo feature (`HubCommentService` cũng dùng), không phải sanitizer
  riêng của blog dù tên gói còn giữ `blog`. Không viết sanitizer mới trùng lặp allowlist.
- **Empty-check dùng lại `sanitizer.isEmpty(html)`**: submission có `textContent` toàn thẻ rỗng
  (`<p></p>`) và không có `files` → coi như rỗng, trả `400`, giống cách Blog/Hub Comment coi nội dung
  rỗng sau sanitize là không hợp lệ.
- **"Một active submission" (BR-36) = upsert, không version history**: submit lại (dù trước đó đã
  unsubmit hay chưa) **thay thế toàn bộ** submission cũ — text cũ, danh sách file cũ — chứ không cộng
  dồn hay giữ lịch sử. Unique constraint `(class_resource_id, student_id)` ở tầng DB đảm bảo đúng 1
  dòng `submissions` cho mỗi cặp.
- **Unsubmit = xóa hẳn dòng `submissions`** (cascade `submission_files`), không phải cờ soft-delete:
  BR-36 không yêu cầu giữ lịch sử, submit lại sau đó tạo dòng mới hoàn toàn.
- **Multi-file, khác Class Resource (chỉ 1 attachment)**: SRS UC-47 Normal Flow "selects one or more
  supported files" → bảng con `submission_files` (1-nhiều), không tái dùng shape 1-attachment của
  `ClassResourceSummaryDto`.
- **On Time / Late tính và lưu tại thời điểm submit, không tính lại về sau**: so `submittedAt` với
  `resource.deadline` ngay lúc ghi transaction — đúng SRS "assigns the applicable On Time or Late tag
  based on the deadline". Giữ nguyên giá trị đã lưu kể cả khi deadline resource bị sửa sau đó (Update
  Class Resource, `manage-class-resources.md`) — không có cơ chế backfill.
- **Không cho Teacher (owner) gọi endpoint ghi**: khác các endpoint teacher-write khác trong nhóm
  Class, ở đây RBAC là "enrolled student, không phải owner" — teacher không nộp bài cho lớp mình dạy.
  Thêm guard mới `requireEnrolledActiveClass` (khác `requireOwnedActiveClass` đã có).
- **Thêm 1 endpoint đọc ngoài đúng 2 UC (47/48): `GET .../submission`** — cần thiết để FE hiển thị lại
  submission hiện tại (text/files) khi học sinh mở lại màn resource detail; SRS không mô tả use case
  này nhưng không có nó thì FE không có cách lấy lại nội dung đã nộp để xem/sửa. Trả `404` nếu chưa
  nộp.
- **Cập nhật `submissionStatus` trong `ClassResourceSummaryDto` từ placeholder sang giá trị thật**: mở
  rộng enum `SubmissionStatus` có sẵn (hiện chỉ `NOT_APPLICABLE`/`NOT_SUBMITTED`) thêm `ON_TIME`/
  `LATE`; `GET /{id}/resources` (`view-class-resources.md`) sau khi có bảng `submissions` sẽ tra đúng
  trạng thái nộp bài của **học sinh đang xem** — owner/teacher luôn nhận `NOT_APPLICABLE` vì không
  phải người nộp bài.
- **Không dọn file cũ trên R2 khi resubmit thay file**: nhất quán với cách `Update Class Resource`
  không dọn file cũ khi đổi `attachment` — ngoài phạm vi tài liệu này.
- **Không có notification khi nộp/thu hồi bài**: `BR-46` chỉ định notify khi thêm học sinh hoặc đăng
  resource; nộp bài không nằm trong `BR-46`, không tự thêm hành vi notify mới.

---

## Danh sách endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | POST | `/api/classes/{classId}/resources/{resourceId}/submission` | UC-47 Submit Assignment | enrolled STUDENT |
| 2 | DELETE | `/api/classes/{classId}/resources/{resourceId}/submission` | UC-48 Unsubmit Assignment | enrolled STUDENT |
| 3 | GET | `/api/classes/{classId}/resources/{resourceId}/submission` | Hỗ trợ FE (ngoài SRS, xem "Quyết định riêng") | enrolled STUDENT |

Tất cả request cần `Authorization: Bearer <access>` theo JWT filter của `auth.md`.

---

## Data contract

### `SubmitAssignmentRequest`

```json
{
  "textContent": "<p>Bài làm của em...</p>",
  "files": [
    { "url": "https://.../baitap1.pdf", "fileName": "baitap1.pdf", "contentType": "application/pdf", "sizeBytes": 204800 }
  ]
}
```

- `textContent`: optional, HTML thô từ rich text editor phía FE — sanitize server-side bằng
  `BlogContentSanitizer.sanitize(...)` trước khi lưu.
- `files`: optional, mảng 0..n — mỗi phần tử cùng shape response `POST /api/uploads` (`api-chung.md`)
  bỏ `fileId`: `{ "url", "fileName", "contentType", "sizeBytes" }`.
- Ràng buộc: sau sanitize, `textContent` rỗng (`sanitizer.isEmpty(...)`) **và** `files` rỗng/`null` →
  `400`. Có 1 trong 2 (hoặc cả hai) là hợp lệ.

### `SubmissionDetailDto` (response)

```json
{
  "id": "uuid",
  "textContent": "<p>Bài làm của em...</p>",
  "files": [
    { "fileName": "baitap1.pdf", "url": "https://.../baitap1.pdf", "contentType": "application/pdf", "sizeBytes": 204800 }
  ],
  "status": "ON_TIME",
  "submittedAt": "2026-07-30T10:15:00Z"
}
```

- `textContent`: `null` nếu submission không có text.
- `files`: `[]` nếu submission không có file.
- `status`: `ON_TIME | LATE` — tính 1 lần tại thời điểm submit, không đổi sau đó.

---

## Chi tiết endpoint

### 1. `POST /api/classes/{classId}/resources/{resourceId}/submission` — Nộp bài (tạo mới hoặc thay thế)

```http
body: SubmitAssignmentRequest
→ 200  SubmissionDetailDto
→ 400  ca textContent (sau sanitize) va files deu rong
→ 403  khong phai enrolled student (ke ca owner), hoac lop Inactive (MSG23), hoac
       resource.submissionEnabled = false
→ 404  lop khong ton tai / resourceId khong ton tai hoac khong thuoc lop nay
→ 502/500 loi ghi du lieu (MSG25)
```

- Guard thứ tự: load class → verify **enrolled student** (không phải owner,
  `requireEnrolledActiveClass`) → verify lớp `ACTIVE` (BR-37) → load resource theo `resourceId` (404
  nếu không thuộc `classId`) → verify `resource.submissionEnabled = true` (`403` nếu `false`) →
  validate body.
- Sanitize `textContent` (nếu có) bằng `BlogContentSanitizer`; validate ít nhất 1 trong 2 field có nội
  dung thật.
- Tính `status` = so `now()` với `resource.deadline` (`ON_TIME` nếu `now() <= deadline`, ngược lại
  `LATE`).
- Upsert: xoá toàn bộ `submission_files` cũ (nếu có submission cũ) → ghi/replace dòng `submissions`
  (unique theo `class_resource_id + student_id`) → insert `submission_files` mới từ `files`. Tất cả
  trong 1 transaction.
- Map: `UC-47` Normal Flow + Alternative "Class is Inactive" / "File is invalid" (đã validate ở
  `/api/uploads` trước khi gửi `files` lên đây) / "Student cancels submission" (hành vi FE, không gọi
  endpoint) / "File upload fails" (đã xảy ra ở bước gọi `/api/uploads`, không lặp lại ở đây) /
  "Submission save fails".

### 2. `DELETE /api/classes/{classId}/resources/{resourceId}/submission` — Thu hồi bài nộp

```http
→ 204  (khong body)
→ 403  khong phai enrolled student, hoac lop Inactive (MSG23)
→ 404  lop/resource khong ton tai, hoac khong co active submission de thu hoi
```

- Guard giống bước 1 (trừ bước validate `submissionEnabled` — resource đã có submission thì chắc chắn
  từng bật) + kiểm tra tồn tại submission của đúng student cho đúng resource.
- Xóa hẳn dòng `submissions` (cascade `submission_files`) — không phải soft-delete.
- Không có bước xác nhận ở tầng API — popup xác nhận (SRS Normal Flow step 3) là trách nhiệm FE.
- Map: `UC-48` Normal Flow + Alternative "Class is Inactive" / "Active submission is unavailable" /
  "Student cancels withdrawal" (hành vi FE) / "Withdrawal fails".

### 3. `GET /api/classes/{classId}/resources/{resourceId}/submission` — Xem lại bài đã nộp (ngoài SRS)

```http
→ 200  SubmissionDetailDto
→ 404  chua nop bai (khong co active submission)
→ 403  khong phai enrolled student, hoac khong co quyen truy cap lop
```

- Đọc được kể cả khi lớp `INACTIVE` (nhất quán BR-39, giống `GET /{id}/resources`) — chỉ chặn theo
  quyền enrolled, không chặn theo status lớp.
- Không có postcondition ghi.

---

## Cross-cutting

- **RBAC**: không dùng `@PreAuthorize("hasRole('TEACHER')")` — check "enrolled student, không phải
  owner" trong service (`requireEnrolledActiveClass` mới, khác `requireOwnedActiveClass`/
  `requireAccessibleClass` đã có ở `ClassResourceService`).
- **Owner-exclusion**: owner (teacher) gọi cả 3 endpoint → `403`.
- **Transaction**: `POST` (upsert submission + replace files) và `DELETE` (xóa submission + cascade
  files) đều là 1 transaction — lỗi giữa chừng thì rollback toàn bộ.
- **Rate-limit, CORS, error envelope**: theo `api-chung.md`.

## Phụ thuộc & thứ tự build

1. Migration mới `V25__create_submissions.sql`: bảng `submissions` (unique
   `(class_resource_id, student_id)`, FK `class_resource_id → class_resources(id) ON DELETE CASCADE`
   để đáp ứng BR-45 khi xóa resource) + bảng con `submission_files`
   (FK `submission_id → submissions(id) ON DELETE CASCADE`). Chi tiết cột: xem
   [`../submit-assignment/flow.md`](../submit-assignment/flow.md#5-model-dữ-liệu).
2. Domain model mới (`domain/model/classroom/`): `Submission`, `SubmissionFile`. Mở rộng enum
   `SubmissionStatus` có sẵn (hiện chỉ có `NOT_APPLICABLE`/`NOT_SUBMITTED`) thêm `ON_TIME`/`LATE`.
3. Repository interface mới `SubmissionRepository` (`repository/repositories/`):
   `findByResourceAndStudent`, `upsert(Submission, List<SubmissionFile>)`, `deleteByResourceAndStudent`.
4. Entity + Spring Data JPA repo + adapter (`infrastructure/persistence/`): `SubmissionEntity`,
   `SubmissionFileEntity`.
5. Service mới `SubmissionService` (`service/classroom/`), với guard riêng
   `requireEnrolledActiveClass(classId)` (khác `ClassResourceService`/`ClassEnrollmentService` đã có),
   tái dùng `BlogContentSanitizer` qua constructor injection.
6. DTO mới (`presentation/dto/classroom/`): `SubmitAssignmentRequest`, `SubmissionFileRequest`,
   `SubmissionDetailDto`.
7. Thêm 3 method vào `ClassController` hiện có (cùng resource
   `/api/classes/{classId}/resources/{resourceId}`, không tách controller riêng).
8. Cập nhật `ClassResourceService.listResources`/`toSummary` (đã có ở `manage-class-resources.md`) để
   tra `SubmissionRepository` và trả `submissionStatus` thật cho học sinh đang xem, thay placeholder
   `NOT_SUBMITTED` cố định.
9. Smoke test qua Swagger: Submit chỉ text, Submit chỉ file, Submit cả hai, Submit rỗng (400), Submit
   sau deadline (kiểm tra `LATE`), Unsubmit rồi gọi lại `GET .../submission` (404), Submit lại sau khi
   unsubmit (kiểm tra thay thế đúng, không giữ 2 dòng).

## Điểm mở

- `UC-44 View Submissions List`, `UC-45 View Submission Detail`, `UC-46 Download Submission File` —
  phía Teacher đọc danh sách/chi tiết bài nộp của học sinh trong lớp mình, kế thừa cùng
  `SubmissionRepository`/`SubmissionFile` — đã thiết kế ở
  [`review-submissions.md`](./review-submissions.md).
- `UC-42 View Class Resource Detail`, `UC-43 Download Assigned Material` vẫn chưa thiết kế (xem
  `manage-class-resources.md`).
- Giới hạn số lượng file/kích thước tổng của 1 submission — hiện dùng đúng rule từng file của
  `POST /api/uploads` (`.docx/.pdf/.pptx/.png/.jpg/.jpeg`, ≤ 10MB/file), chưa có giới hạn tổng số file
  hay tổng dung lượng cho 1 lần nộp.
- UI Student-side (nộp bài / thu hồi / xem lại bài đã nộp) ở FE (`fe/components/classroom/`) chưa tồn
  tại, sẽ thiết kế sau khi API được chốt.
