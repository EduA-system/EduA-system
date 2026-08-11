# Đối chiếu SRS v1.2 với code — kết luận

Nguồn: `C:\Users\konan_1947\Desktop\nop_tai_lieu_ngay_9_8\Report3_Software_Requirement_Specification_v1.2.docx`
(116 Use Case ở mục 1.3.2, 49 Business Rule ở mục 5.1).

Đối chiếu thực hiện ngày 2026-08-10 trên nhánh `main`, kiểm tra trực tiếp `be/` và `fe/`
(controller, service, route, permission), không dựa vào `WBS_CHECKLIST.md`.

Ba nhóm kết quả:

- [A. Thiếu hẳn — chưa có code](#a-thiếu-hẳn--chưa-có-code)
- [B. Có code nhưng lệch/thiếu so với business rule](#b-có-code-nhưng-lệchthiếu-so-với-business-rule)
- [C. SRS ghi khác code — cần sửa một trong hai phía](#c-srs-ghi-khác-code--cần-sửa-một-trong-hai-phía)
- [D. Đã làm rồi nhưng `WBS_CHECKLIST.md` còn ghi sai](#d-đã-làm-rồi-nhưng-wbs_checklistmd-còn-ghi-sai)
- [Đề xuất ưu tiên](#đề-xuất-ưu-tiên)

---

## A. Thiếu hẳn — chưa có code

| # | SRS | Tình trạng code |
| --- | --- | --- |
| A1 | **UC-116 Export Statistics** — xuất PDF/Excel từ Reports Dashboard | `fe/app/statistics/page.tsx` không có nút xuất nào. Dashboard (UC-115) đã có, phần export thì chưa. |
| A2 | **UC-82 Update Teacher Account** | `be/.../presentation/controller/ModeratorController.java` chỉ có GET / POST / DELETE / `reactivate` — không có PATCH sửa thông tin. UI `fe/app/user-management/page.tsx` cũng không có nút "Sửa". |
| A3 | **UC-107 Update Moderator Account** | `be/.../presentation/controller/PrincipalController.java` không có endpoint update. |
| A4 | **UC-112 Update IT Support Account** | Tương tự A3. |
| A5 | **UC-113 Replace IT Support Account** | Có `POST /api/principal/moderators/{id}/replacement` nhưng **không có** `/api/principal/it-staff/{id}/replacement`. |
| A6 | **Xuất Word (.docx)** — UC-07 (giáo án) và UC-20 (đề kiểm tra) | `be/.../service/documentexport/DocumentExportService.java` chỉ render PDF (openhtmltopdf). Không có thư viện/luồng sinh docx. UC-20 còn yêu cầu **chọn định dạng** và **tùy chọn kèm đáp án** — cả hai đều chưa có (`fe/components/dashboard/PracticeExamEditDashboard.tsx:119`). |
| A7 | **Non-UI #12 Scheduled Storage Cleanup** (mục 1.4.3) | Không có `@Scheduled` hay `@EnableScheduling` nào trong toàn bộ `be/`. |
| A8 | **Sinh giáo án từ tài liệu tham khảo** — UC-05, alternative flow "Add a reference document" | `GenerateLessonPlanRequest` / `GenerateLessonPlanStreamRequest` chỉ nhận `bookId/chapterId/lessonId/userPrompt`. File upload chưa nối vào luồng sinh giáo án. |
| A9 | **BR-13: outline slide từ "supported external document"** | `fe/components/dashboard/SlideCreateDashboard.tsx:116` chỉ lấy nguồn từ giáo án có sẵn trong Thư viện cá nhân. |

---

## B. Có code nhưng lệch/thiếu so với business rule

### B1. Notification — thiếu 4 trigger SRS bắt buộc

| Rule | Yêu cầu | Code hiện tại |
| --- | --- | --- |
| **BR-49** | Khi staff sửa tài khoản người khác, hệ thống báo cho người đó | Mọi thay đổi tài khoản (thêm / thu hồi / kích hoạt lại / thay thế) chỉ ghi `activityLogService`, **không** gửi notification. Xem `PrincipalItStaffService.java`, `PrincipalModeratorService.java`, `ModeratorTeacherService.java` — không service nào inject `NotificationService`. |
| **BR-29 / BR-30** | Ẩn bình luận thì báo cho tác giả bình luận | `HubCommentService.hideByContentOwner()` và `BlogCommentService.hideByPostAuthor()` chỉ set cờ ẩn, không gửi notification. |
| **BR-23** (và UC-67) | Rút bài khỏi hàng chờ duyệt thì báo moderator phụ trách | `LibraryContentService.unsubmit()` chỉ đổi status về `PRIVATE`. |
| **BR-48** | Rút nộp Weekly Task thì báo moderator | `WeeklyTaskService.unsubmit()` chỉ đổi `reviewStatus`. |

Các trigger notification khác (bình luận mới, gửi duyệt, duyệt/từ chối, sự kiện lớp học BR-46, gỡ bài blog BR-21) **đã có**.

### B2. Publish Status state machine (BR-23) chưa đúng mô hình SRS

- `LibraryContentService.update()` giữ nguyên `c.status()` → sửa nội dung **đã APPROVED là sửa thẳng bản đang public**.
  SRS (UC-64 *Edit Own Public Content*) yêu cầu tạo **Draft revision** riêng, bản Published giữ nguyên cho tới khi
  revision được duyệt lại.
- Nội dung ở trạng thái `SUBMITTED` (Pending Publish) **không bị khóa sửa**; BR-23 yêu cầu khóa cho tới khi
  teacher thực hiện Unpublish.
- **UC-65 Delete Own Public Content**: hiện chỉ có `DELETE /api/library/contents/{id}` xóa luôn item.
  BR-32 tách rõ hai hành động: gỡ bản Published khỏi Hub ≠ xóa bản trong Thư viện cá nhân.

### B3. Ràng buộc nhân sự BR-41 / BR-44 — làm cho Moderator, bỏ sót IT Staff

| | Moderator | IT Staff |
| --- | --- | --- |
| Chặn "mỗi vị trí đúng 1 tài khoản Active" khi thêm (BR-41) | ✔ `existsActiveByRoleAndSubject` trong `PrincipalModeratorService.addModerator()` | ✘ `PrincipalItStaffService.add()` không kiểm tra gì |
| Ban bắt buộc có người thay thế (BR-44) | ✔ `deleteModerator()` ném `ForbiddenOperationException`, buộc dùng `replacement` | ✘ `disable()` thu hồi thẳng, không cần người thay |
| Endpoint thay thế | ✔ `POST /moderators/{id}/replacement` | ✘ không có (trùng A5) |

Hệ quả: hệ thống có thể rơi vào trạng thái **0 IT Supporter Active**, vi phạm BR-41.

### B4. BR-19 auto-save mỗi phút

Không có `setInterval` nào trong `fe/`. Lesson editor lưu bằng nút bấm và khi sinh xong
(`fe/components/dashboard/LessonEditDashboard.tsx`); slide editor debounce 400ms nhưng vào store local
(`fe/components/slide-editor/SlideEditor.tsx:98`), không phải lên Thư viện.
Tức là "tự động lưu mỗi phút trong lúc soạn" theo BR-19 chưa được cài.

---

## C. SRS ghi khác code — cần sửa một trong hai phía

| Rule | SRS ghi | Code làm | Ghi chú |
| --- | --- | --- | --- |
| **BR-10** | File tối đa **100 MB** | **10 MB** (`UploadService.MAX_SIZE_BYTES`, `be/src/main/resources/application.properties:51-52`) | Nên sửa SRS xuống cho khớp; 100 MB không thực tế với R2 + multipart hiện tại |
| **BR-09** | `.docx .pdf .pptx .png .jpg .jpeg` | Code cho thêm `.webp` | Bổ sung `.webp` vào SRS |
| **BR-38** | Template import cần cột *Full name, Date of birth, Gender, Class, Grade, Address, Email* | `ClassEnrollmentService` dùng *fullName, phoneNumber, dateOfBirth, email* | Thiếu Gender / Class / Grade / Address, thừa phoneNumber |
| **BR-12** | 3 khung đề: 15 phút / 45 phút / **giữa kỳ** | 15 / 45 / **custom** (`PracticeExamCreateDashboard.tsx:351`) | Không có preset "giữa kỳ"; custom phủ được về mặt chức năng nhưng lệch mô tả |

### C5. Đánh số UC trong chính SRS bị lệch

Mục **1.3.2** và mục **2 (Use Case Specifications)** dùng bộ số mới, nhưng mục **3 (Functional Requirements)**
vẫn dùng bộ số cũ:

| ID | Mục 1.3.2 (mới) | Mục 3 (cũ) |
| --- | --- | --- |
| UC-20 | Export Test | View Blog List |
| UC-53 | View Physics Simulation Analysis | View Periodic Table |
| UC-54 | Save Simulation to Personal Library | View Electron Model |

`WBS_CHECKLIST.md` trong repo cũng đang trace theo **bộ số cũ** (ví dụ dòng "Create Lesson Plan" ghi UC-24,
trong khi SRS v1.2 đánh UC-05). Truy vết requirement sẽ sai khi chấm — cần thống nhất một bộ số
rồi cập nhật cả SRS mục 3 lẫn `WBS_CHECKLIST.md`.

Ngoài ra mục **2.8.4 Customize Physics Simulation** có đặc tả đầy đủ nhưng **không được cấp UC ID**
trong bảng 1.3.2 (bảng nhảy từ UC-53 sang UC-54).

---

## D. Đã làm rồi nhưng `WBS_CHECKLIST.md` còn ghi sai

| Dòng trong checklist | Checklist ghi | Thực tế |
| --- | --- | --- |
| Export Test / Exam (Word / PDF) | `Pending` | **PDF đã xong** — `PracticeExamEditDashboard.exportPdf()` gọi `POST /api/document-exports/pdf`. Chỉ còn thiếu Word (xem A6). |
| Physics Hub (view, detail, customize via AI) | `Partially Coded` — "missing backend AI customization và persistence" | **Đã xong cả hai** — `POST /api/physics-simulations/ai-edit` (`PhysicsSimulationController`) và lưu `type: "SIMULATION"` vào Thư viện (`fe/app/mo-phong-vat-ly/page.tsx:1040`). |
| AI Content Statistics Dashboard | `Planned` | **Đã xong** — `/statistics` cùng `PrincipalStatisticsController` và `ModeratorStatisticsController`. |
| Principal Management Dashboard | `Planned` | Có `/statistics` cho PRINCIPAL và `/user-management`; tùy định nghĩa mà có thể tính là xong. |

---

## Đề xuất ưu tiên

1. **Rẻ nhất, lấp trọn 4 UC**: A2–A5 (endpoint + UI sửa tài khoản Teacher / Moderator / IT Staff, và
   replace IT Staff) cộng B3 (ràng buộc BR-41/BR-44 cho IT Staff). Cùng một màn `/user-management`,
   cùng một pattern đã có sẵn cho Moderator.
2. **Rẻ và lấp 4 business rule**: B1 — chỉ cần inject `NotificationService` vào 4 chỗ đã xác định.
3. **Trung bình**: A1 (export thống kê) và A6 (export Word) — cùng chạm tầng document export.
4. **Đắt nhất**: B2 — mô hình Draft revision cần đổi schema (thêm bảng/cột revision), nên cân nhắc
   sửa SRS cho khớp code thay vì ngược lại, nếu deadline gấp.
5. **Không tốn code**: mục C — chỉnh SRS và `WBS_CHECKLIST.md` cho khớp thực tế, đặc biệt là C5
   (đánh số UC) vì ảnh hưởng trực tiếp tới điểm truy vết requirement.
