# View Class Resources — API Design

> Endpoint đặc thù chức năng **View Class Resources (UC-41)**: Student xem danh sách resource/assignment
> đã được đăng trong một lớp mình đang enrolled.
> Hạ tầng CRUD lớp (tạo/xem/sửa/đổi trạng thái) tách ở [`class-management.md`](./class-management.md).
> Hạ tầng Add Student tách ở [`add-student.md`](./add-student.md).
> Luồng & thiết kế triển khai BE: [`../view-class-resources/flow.md`](../view-class-resources/flow.md).
> Hạ tầng dùng chung auth/RBAC/rate-limit theo [`api-chung.md`](./api-chung.md).

## Quyết định riêng

- **Bám sát SRS, chỉ 1 use case**: mapping trực tiếp `UC-41 View Class Resources`. Không làm
  `UC-38 Post Class Resource`, `UC-39 Update Class Resource`, `UC-40 Delete Class Resource` (phía
  Teacher ghi dữ liệu — xem [`manage-class-resources.md`](./manage-class-resources.md)),
  `UC-42 View Class Resource Detail`, `UC-43 Download Assigned Material` hay nhóm `UC-44→48`
  (Submission) trong tài liệu này — tất cả liệt kê ở "Điểm mở".
- **Chưa có bảng `class_resources` trong DB**: đã grep `ClassResource` trong `be/src` — không có kết
  quả nào, khác với `classes`/`class_members` đã build xong cho Class Management/Add Student. Tài
  liệu này đề xuất schema tối thiểu đủ để endpoint đọc hoạt động (xem
  [`flow.md`](../view-class-resources/flow.md#5-model-du-lieu-du-kien)); việc ghi dữ liệu
  (Post/Update/Delete) không thuộc phạm vi ở đây.
- **Access: owner HOẶC enrolled student**, không phải "Student only"**: SRS ghi Primary Actor của
  UC-41 là Student, nhưng tài liệu này tái dùng đúng pattern `requireAccessibleClass` đã có ở
  `ClassManagementService` (owner hoặc enrolled student) — nhất quán với `GET /api/classes/{id}` của
  `class-management.md`, vì Class Hub là 1 màn hình dùng chung cho cả 2 vai trò và Teacher cũng cần
  thấy resource mình đã đăng.
- **Đọc được bất kể trạng thái lớp (BR-39)**: khác với các endpoint ghi ở `add-student.md`/
  `class-management.md` (chặn khi `INACTIVE`), endpoint GET ở đây **không** chặn theo status — lớp
  Inactive vẫn phải xem/tải được resource cũ.
- **`submissionStatus` là placeholder, chưa có logic chấm nộp bài thật**: chưa có domain/entity
  `Submission` nào trong code (`UC-44`→`UC-48` chưa được thiết kế). Response trả cố định
  `NOT_APPLICABLE` khi resource không bật submission, `NOT_SUBMITTED` khi có bật submission — không
  giả lập trạng thái `ON_TIME`/`LATE` vì chưa có dữ liệu nộp bài thật. Sẽ thay bằng giá trị thật khi
  UC-47 (Submit Assignment) được thiết kế.
- **Danh sách rỗng không phải lỗi**: theo SRS "Step 5_No resources are available" → vẫn trả `200` với
  `items: []`, FE hiển thị MSG01 ("Không tìm thấy kết quả.") thay vì báo lỗi.

---

## Danh sách endpoint

| # | Method | Path | UC / Role | Auth |
|---|--------|------|-----------|------|
| 1 | GET | `/api/classes/{id}/resources` | UC-41 View Class Resources | TEACHER owner / enrolled STUDENT |

Tất cả request cần `Authorization: Bearer <access>` theo JWT filter của `auth.md`.

---

## Data contract

### `ClassResourceSummaryDto`

```json
{
  "id": "uuid",
  "title": "Bài tập chương 1 - Phản ứng oxi hóa khử",
  "description": "Hoàn thành bài tập trang 12-15 SGK.",
  "sourceType": "LIBRARY_SNAPSHOT",
  "thumbnailUrl": "https://.../thumb.png",
  "attachment": {
    "fileName": "bai-tap-chuong-1.pdf",
    "url": "https://.../bai-tap-chuong-1.pdf",
    "contentType": "application/pdf",
    "sizeBytes": 245678
  },
  "submissionEnabled": true,
  "deadline": "2026-08-01T23:59:59Z",
  "postedByName": "Nguyen Van A",
  "postedAt": "2026-07-24T15:00:00Z",
  "submissionStatus": "NOT_SUBMITTED"
}
```

- `sourceType`: `LIBRARY_SNAPSHOT | FILE_UPLOAD` — theo BR-35, snapshot độc lập từ Personal Library
  hoặc file upload trực tiếp; không có field nào trỏ ngược lại nguồn gốc.
- `attachment`: `null` khi resource là `LIBRARY_SNAPSHOT` không kèm file tải về riêng (nội dung xem
  trực tiếp), có giá trị khi resource có file đính kèm (đặc biệt luôn có với `FILE_UPLOAD`). Shape
  giống response `POST /api/uploads` ở `api-chung.md`, bỏ `fileId` (không cần thiết cho FE hiển thị).
- `deadline`: `null` khi `submissionEnabled = false`.
- `submissionStatus`: `NOT_APPLICABLE | NOT_SUBMITTED` — xem "Quyết định riêng"; giá trị `ON_TIME`/
  `LATE` sẽ được thêm khi UC-47 thiết kế xong (không có trong enum ở phiên bản này).

### `ClassResourcePageDto`

```json
{
  "items": [ ClassResourceSummaryDto ],
  "page": 0,
  "size": 20,
  "total": 8
}
```

---

## Chi tiết endpoint

### 1. `GET /api/classes/{id}/resources` — Xem danh sách resource của lớp

```http
query: ?page=0&size=20
→ 200  ClassResourcePageDto
→ 403  khong phai owner va khong phai enrolled student (SRS "Class is unavailable or inaccessible")
→ 404  lop khong ton tai
→ 502/500 loi truy van du lieu (MSG25, SRS "Resource retrieval fails")
```

- Điều kiện truy cập giống `GET /api/classes/{id}` trong `class-management.md`: owner hoặc enrolled
  student, theo `BR-34`. Không có điều kiện `status = ACTIVE` — hoạt động cả khi `INACTIVE` (`BR-39`).
- Sắp xếp mặc định theo `postedAt` giảm dần.
- Danh sách rỗng vẫn trả `200` với `items: []`, `total: 0` — FE hiển thị MSG01, không coi là lỗi.
- Không thay đổi dữ liệu nào (read-only), không có postcondition ghi.
- Map: `UC-41` Normal Flow + Alternative "Class is unavailable or inaccessible" / "Resource retrieval
  fails" / "No resources are available".

---

## Cross-cutting

- **RBAC**: dùng `authenticated()`, owner/enrollment check trong service — giống pattern
  `GET /api/classes/{id}` của `class-management.md`, không dùng `@PreAuthorize("hasRole(...)")` vì
  cả 2 role đều được phép.
- **Participant access**: chỉ owner hoặc enrolled student mới đọc được, theo `BR-34`.
- **Không phụ thuộc trạng thái lớp**: đọc được cả `ACTIVE` lẫn `INACTIVE`, theo `BR-39`.
- **Rate-limit, CORS, error envelope**: theo `api-chung.md`.

## Phụ thuộc & thứ tự build

1. Migration `V23__create_class_resources.sql` tạo bảng `class_resources` (xem
   [`flow.md`](../view-class-resources/flow.md#5-model-du-lieu-du-kien)).
2. Domain model `ClassResource` (`domain/model/classroom/`), enum `ResourceSourceType`.
3. Repository interface `ClassResourceRepository` (`repository/repositories/`) với
   `findByClassId(classId, page, size)` trả `PageResult`, giống khuôn `ClassMemberRepository`.
4. Entity `ClassResourceEntity` + Spring Data JPA repo + adapter (`infrastructure/persistence/`).
5. Service mới `ClassResourceService` (`service/classroom/`) — trong phạm vi tài liệu này chỉ có
   method đọc `listResources(classId, page, size)`, tái dùng owner/enrollment check kiểu
   `requireAccessibleClass` (tách logic dùng chung với `ClassManagementService` nếu hợp lý, hoặc gọi
   `ClassRepository`/`ClassMemberRepository` trực tiếp).
6. DTO trong `presentation/dto/classroom/`: `ClassResourceSummaryDto`, `ClassResourcePageDto`.
7. Thêm 1 method `GET /{id}/resources` vào `ClassController` hiện có (cùng resource
   `/api/classes/{id}`, không tách controller riêng — giống cách `/members` được thêm).
8. Vì `UC-38 Post Class Resource` chưa build, bảng `class_resources` sẽ rỗng sau migration — smoke
   test qua Swagger cần insert dữ liệu mẫu thủ công bằng SQL để kiểm tra endpoint list, hoặc chờ
   `UC-38` triển khai.

## Điểm mở

- `UC-38 Post Class Resource`, `UC-39 Update Class Resource`, `UC-40 Delete Class Resource` — phía
  Teacher ghi dữ liệu vào `class_resources` mà tài liệu này giả định đã tồn tại. Đã thiết kế ở
  [`manage-class-resources.md`](./manage-class-resources.md) /
  [`../manage-class-resources/flow.md`](../manage-class-resources/flow.md).
- `UC-42 View Class Resource Detail` và `UC-43 Download Assigned Material` là bước tiếp theo tự nhiên
  sau danh sách này, kế thừa cùng `ClassResourceRepository`.
- `UC-47/48` (Submit/Unsubmit Assignment, phía Student) đã thiết kế ở
  [`submit-assignment.md`](./submit-assignment.md) — sau khi `ClassResourceService.listResources`
  được cập nhật theo tài liệu đó, `submissionStatus` ở đây sẽ phản ánh dữ liệu thật (`ON_TIME`/`LATE`)
  thay vì placeholder `NOT_SUBMITTED`.
- `UC-44/45/46` (View Submissions List/Detail, Download Submission File, phía Teacher) — kế thừa cùng
  `SubmissionRepository` đã định nghĩa ở `submit-assignment.md` — đã thiết kế ở
  [`review-submissions.md`](./review-submissions.md).
- UI Class Resources ở FE (`fe/components/classroom/`) chưa tồn tại, sẽ thiết kế sau khi API được
  chốt.
