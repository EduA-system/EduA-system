# Vấn đề giữa code, SRS và SDS

Danh sách các chỗ lệch giữa **code thực tế**, **Report 3 (SRS)** và **Report 4 (SDS)**, phát hiện trong quá trình đối chiếu từng use case để vẽ lại diagram (18/08/2026).

Mỗi mục cần một quyết định trước khi bảo vệ:

| Ký hiệu | Nghĩa |
|---|---|
| 🔧 | Phải sửa **code** |
| 📄 | Phải sửa **tài liệu** |
| 💬 | Giữ nguyên, nhưng phải **giải thích được** khi hội đồng hỏi |

---

## A. Endpoint tồn tại nhưng người dùng không chạm tới được (code chết)

Backend có API, nhưng không màn hình nào gọi tới. Đã **loại khỏi danh sách use case** — không vẽ diagram, không đưa vào SRS.

| Chức năng | Bằng chứng | Đề xuất |
|---|---|---|
| Report Hub Content | `POST /api/hub/contents/{id}/reports` + bảng `hub_content_reports` (V20) tồn tại, frontend không có màn báo cáo vi phạm nào | 🔧 làm nốt UI, hoặc chấp nhận là scope đã cắt |
| Customize Physics Simulation | `POST /api/physics-simulations/ai-edit` có, nhưng `fe/lib/api/physics-simulations.ts` **không được module nào import** | 🔧 hoặc 💬 |
| Ban Moderator Account | `DELETE /api/principal/moderators/{id}` có; UI chỉ hiện "Thay Moderator" khi active và "Kích hoạt lại" khi disabled — không có nút thu hồi | 💬 tài khoản cũ bị vô hiệu qua luồng Replace |
| Ban IT Support Account | `DELETE /api/principal/it-staff/{id}` có; bảng IT Support trên UI chỉ có Thêm + Thay thế | 💬 như trên |
| Reactivate IT Support Account | `PATCH /api/principal/it-staff/{id}/reactivate` có; UI không có nút kích hoạt lại cho IT Support (Moderator và Teacher thì có) | 🔧 thiếu đối xứng so với hai vai trò kia |
| Export tài liệu qua backend | `POST /api/document-exports/pdf` (`DocumentExportController`, openhtmltopdf) **không được frontend gọi**. Xuất giáo án và đề thi đều chạy `openDocumentPrintDialog` — in từ trình duyệt | 💬 đừng vẽ endpoint này vào sequence |
| Validate cấu hình đề thi | `POST /api/practice-exams/validate-configuration` và Route Handler `fe/app/api/practice-exams/validate-configuration/route.ts` đều **không được gọi**; màn cấu hình tự ước lượng ở client, backend validate lại bên trong `generateStreaming` | 📄 SRS mô tả bước "system validates the configuration" không khớp cách hiện thực |
| Route Handler sinh đề đồng bộ | `fe/app/api/practice-exams/generate/route.ts` (maxDuration 180) không còn được gọi sau khi chuyển sang streaming | 🔧 xoá code chết |

---

## B. Tài liệu mô tả nhưng code không có

| Use case | Vấn đề | Đề xuất |
|---|---|---|
| UC-110 Export School Performance Report | Trang `/statistics` chỉ có biểu đồ recharts; không có nút xuất, frontend không có thư viện xlsx/csv/print | 🔧 đã quyết giữ trong tài liệu → **phải code trước khi bảo vệ** |
| UC-112 Export Subject Performance Report | như trên | 🔧 |
| Update Moderator Account | Không có `PATCH /api/principal/moderators/{id}`; màn `/user-management` không có chức năng sửa | 📄 đã bỏ khỏi Report 4 |
| Update IT Support Account | như trên | 📄 đã bỏ khỏi Report 4 |
| UC-19 Edit Test — bước "validate answer-key consistency" | `LibraryContentService.update` chỉ kiểm quyền sở hữu + title/subject; **không** kiểm tính nhất quán đáp án hay cấu trúc đề | 🔧 hoặc 📄 |
| UC-20 Export Test — bước "chọn có kèm đáp án hay không" | Không có trong code; luôn in toàn bộ tài liệu trong editor, gồm cả đáp án | 🔧 hoặc 📄 |
| UC-06 Edit Lesson Plan — auto-save | SRS ghi "The system auto-saves the valid changes"; code chỉ có nút Lưu (kèm cảnh báo `beforeunload` khi có thay đổi chưa lưu) | 📄 |
| UC-10 Update Content — auto-save định kỳ (BR-19) | Không có lời gọi PATCH định kỳ nào | 📄 |
| UC-10 — precondition "chỉ sửa khi Publish Status cho phép" | Code cho update ở **mọi** trạng thái, kể cả `SUBMITTED` và `APPROVED` | 🔧 hoặc 📄 |

---

## C. Code có nhưng tài liệu không mô tả

| Chức năng | Bằng chứng | Đề xuất |
|---|---|---|
| View Other User Profile | `GET /api/users/{id}/profile`, route `/user-profile/[id]`, dùng bởi `UserProfileViewPage.tsx`; §1.4.2 của SRS có liệt kê màn hình này | 📄 thêm thành UC-113 |
| Bộ lọc prompt-injection cho AI | `LessonPlanAdditionalRequestValidator` — phân loại `userPrompt` bằng AI, fail-closed | 📄 nên đưa vào SRS/SDS, đây là điểm cộng về bảo mật |
| Chặn lưu khi còn diff AI chưa xử lý | `scanPendingDiffs` trong luồng sửa giáo án: còn gợi ý AI chưa Chấp nhận/Bỏ thì không cho lưu | 📄 |
| Personal Library mở được bởi Moderator | `LibraryContentController` gắn `@PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")`; SRS chỉ ghi actor Teacher | 📄 |
| Nộp bài bằng rich-text | SRS mô tả nộp bài chỉ bằng file; code nhận **text và/hoặc file**, sanitize bằng `BlogContentSanitizer` | 📄 |

---

## D. Code chạy khác đặc tả

Nhóm nguy hiểm nhất — chức năng chạy được nhưng **hành vi khác tài liệu**.

| Use case | SRS nói | Code làm | Đề xuất |
|---|---|---|---|
| **UC-11 Delete Content** | Hậu điều kiện: nội dung "no longer accessible from any other location"; alt flow nói xoá cũng gỡ khỏi Community Hub | Nội dung đã duyệt tồn tại **2 hàng** (bản gốc + snapshot có `sourceLibraryContentId`). `delete()` chỉ soft-delete bản gốc; **snapshot vẫn hiển thị công khai trên Hub** (xem comment `findApprovedForHubById`) | 🔧 cao — người dùng tưởng đã xoá mà nội dung vẫn công khai |
| UC-49 Submit Assignment | Quá hạn là nhánh lỗi | Quá hạn **vẫn nhận bài**, đánh dấu `LATE`; `requireSubmittableResource` chỉ kiểm `submissionEnabled` | 💬 hành vi hợp lý, nên sửa tài liệu |
| UC-05 Create Lesson Plan | "The system saves the lesson plan to the Personal Library as Draft" | Backend **không lưu**: `publishDone(sessionId, null)`, comment "chưa persist DB". Frontend nhận `DONE` rồi mới `POST /api/library/contents` | 💬 |
| UC-06 Edit Lesson Plan | AI "identifies **the** section matching the instruction" (một mục) | Hai pha: `selectTargetIds` (1 lời gọi AI chọn N mục) → `writeSection` (N lời gọi song song) | 📄 |
| UC-10 Update Content | Bảng UC mục 1.3 nói chỉ sửa metadata, "without changing the content body or its current status" | Có đổi status: `APPROVED` + đã có snapshot Hub → hạ về `PRIVATE`, xoá `submittedAt/reviewedBy/reviewedAt/rejectionReason` | 📄 khớp BR-23 ở Normal Flow, chỉ sai ở bảng 1.3 |
| UC-08 View Personal Library | "Weekly Task Review Status" hiển thị cùng danh sách | Không do `/api/library/contents` trả về; frontend gọi riêng `getWeeklySchedule` rồi ghép ở client | 💬 |
| UC-08 | "Grouped by content type" | Thực tế là **tab**: gửi `type` như filter, mỗi lần hiển thị một loại | 📄 |
| UC-09 View Personal Content Detail | Có màn xem chi tiết nội dung | **Không có màn riêng**; mở thẳng editor theo loại: `/lesson-edit`, `/slide-maker`, `/exam-edit-new`, `/molecules`, `/mo-phong-vat-ly` kèm `?libraryId=` | 📄 |
| UC-11 | Popup cảnh báo riêng khi nội dung đã lên Hub / đang chờ duyệt | Dialog chỉ có một câu chung, không phân biệt trạng thái | 🔧 nhẹ |
| UC-18 Create Test | Một luồng liền mạch | Hai màn: `/exam-create-new` khởi tạo → `sessionStorage` → `/exam-edit-new` mở STOMP | 📄 |
| UC-07 / UC-20 Export | Secondary actor: File Storage Service | Không đụng dịch vụ lưu trữ nào; trình duyệt tự ghi PDF ra máy người dùng | 📄 |

---

## E. Vấn đề nội tại của SRS

| Vấn đề | Chi tiết |
|---|---|
| **Bảng 5.2 System Messages rỗng** | Chỉ còn heading, không có nội dung. Mọi mã `MSG02/08/09/10/13/25/80/85` trích trong diagram **chưa đối chiếu được** với nội dung thật | 📄 |
| UC-10 tự mâu thuẫn | Bảng mục 1.3 và Normal Flow mục 2.3.3 mô tả hai hành vi khác nhau (xem nhóm D) | 📄 |
| Số hiệu UC từng lệch giữa SRS và Report 4 | Đã xử lý: bảng 1.3 đánh số lại liên tục UC-01…UC-112, Report 4 dựng lại mục 2 khớp hoàn toàn | ✅ xong |
| 119 tham chiếu `UC-xx` ở mục 3 và bảng 5.4 vẫn dùng dãy số cũ | Chưa sửa — sẽ patch tự động khi chốt xong danh sách UC | 📄 |
| 5 UC chưa có spec ở mục 2 | UC-27 Reply to Blog Comment · UC-95 Manage Notification Read State · UC-98 View Subject Statistics Dashboard · UC-106 Reactivate Moderator Account · UC-112 Export Subject Performance Report | 📄 cần Normal/Alternative Flow mới vẽ được nhánh `alt` |

---

## Thứ tự ưu tiên đề xuất

1. **UC-11 snapshot không bị xoá** (nhóm D) — lỗi nghiệp vụ thật, người dùng thấy được.
2. **UC-110 / UC-112 export báo cáo** (nhóm B) — đã quyết giữ trong tài liệu nên bắt buộc phải code.
3. **Bảng 5.2 System Messages** (nhóm E) — mọi diagram đang trích mã MSG mà không có nguồn đối chiếu.
4. **5 UC thiếu spec** (nhóm E) — chặn việc vẽ 10 hình.
5. Còn lại là sửa câu chữ trong tài liệu, làm cùng đợt rà cuối.

---

# Đợt vẽ 2 — phát hiện thêm (Blog, Class, Presentation)

Từ 4 subagent vẽ mục 2.4, 2.6, 2.7 (phần 1). Cùng cách phân loại như trên.

## F. Code chạy khác đặc tả — bổ sung

| Use case | SRS nói | Code làm | Đề xuất |
|---|---|---|---|
| **UC-25 Delete Own Blog Post** | "All comments associated with the blog post are deleted" | Chỉ soft-delete bài (`status = DELETED_BY_AUTHOR`); các dòng `blog_comments` **vẫn nằm trong DB**, chỉ không truy cập được vì bài bị lọc | 🔧 cùng kiểu lỗi với UC-11 — xoá mềm để lại dữ liệu con |
| **UC-96 View Assigned Subject Blog List** | Có nhánh "Subject assignment cannot be identified" → báo lỗi | Moderator không có `subject` thì **liệt kê blog của mọi môn** (`user.subject ? "?subject=…" : "?size=50"`) | 🔧 hoặc 📄 |
| **UC-34 Set Class Status** | Secondary actor Notification Service; BR-46: chuyển Inactive thì báo học sinh | `updateStatus` **không gửi thông báo**; chỗ gửi lại nằm ở `updateClass` (UC-33) — nơi SRS không ghi | 📄 đảo BR-46 sang UC-33, hoặc 🔧 bổ sung thông báo |
| **UC-12 Create Slide Outline** | Bước 3 có popup xác nhận, kèm Alternative Flow "teacher cancels generation" | Code **không có popup**, bấm là chạy thẳng | 📄 hoặc 🔧 |
| **UC-14 Create Slide Deck** | Bước 3 "validate the confirmed slide outline (BR-13)" | Backend không validate khi sinh deck; validate chỉ có ở outline editor (UC-13) | 📄 |
| **UC-17 Export Slide** | Secondary actor: File Storage Service | Thuần client, không đụng dịch vụ lưu trữ | 📄 giống UC-07 và UC-20 |
| **UC-33 Edit Class Information** | Normal Flow không có bước xác nhận | Code có `ConfirmDialog` "Lưu thay đổi lớp?" | 📄 |

## G. Luật chỉ có trong code, SRS không nhắc — bổ sung

| Chức năng | Bằng chứng |
|---|---|
| Bình luận blog tối đa **200 từ** | `COMMENT_MAX_WORDS` trong `BlogCommentService`; SRS chỉ nói "comment is empty" |
| Giáo viên chỉ tạo/sửa lớp **trong môn và khối được phân công** | `requireOwnSubject`, `requireOwnGrade` → `TeacherGradeRepository`; SRS 2.7.2/2.7.3 không nhắc |
| Bộ lọc theo môn ở màn Blog chung | FE luôn gửi `?subject=`; SRS 2.6.1 không nhắc (dễ lẫn với UC-96) |
| Trả lời bình luận **chỉ 1 cấp** | `parent.postId == postId && parent.parentCommentId == null` |
| Xoá bình luận cha thì xoá luôn trả lời | `ON DELETE CASCADE`, migration V50 |

## H. Actor rộng hơn tài liệu — bổ sung

| Endpoint | SRS ghi | Code cho phép |
|---|---|---|
| `GET/POST/PATCH /api/classes*` | Teacher | `hasAnyRole('TEACHER','MODERATOR')` |
| UC-35 / UC-36 | "Teacher or Student" | Hai màn khác nhau cho hai vai, không phải một màn dùng chung |

## I. Quyết định ký pháp đã áp dụng (không phải lỗi, ghi để nhất quán)

- **Module TS không có class** (`lib/api/slides.ts`, `stores/slide-editor-store.ts`, `lib/slide-html-export.ts`…) được mô hình hoá thành class đặt tên PascalCase theo tên file: `SlideApi`, `SlideEditorStore`, `SlideHtmlExport`. Đã dùng từ UC-04 (`LessonPlanPdfExport`), giữ cho toàn bộ 112 UC.
- **Không vẽ lifeline cho lớp chỉ làm một nhịp phụ trợ** (`BlogAuthorResolver` resolve tên tác giả) — viết thành bước nội bộ, giữ trong class diagram.
- **Đặt tên hộp theo nơi khai báo method**, không theo tên route: `CreateBlogPostForm` thay vì `CreateBlogPostPage`.
- **UC-14 auto-save** vẽ thành self-message; đường lưu đầy đủ (controller → service → repository → DB) đã có ở UC-15.
- **UC-16** vẽ đường trình chiếu overlay ngay trong editor; đường `/slide-present?libraryId=` chỉ để ở class diagram.

## J. Năm chính sách đang chờ chốt

14 câu hỏi từ các subagent quy về 5 tình huống lặp lại. Chốt xong sẽ ghi vào `MASTER.md` để các đợt sau tự áp dụng.

| # | Tình huống | Đề xuất |
|---|---|---|
| 1 | Thông báo: SRS và code gắn vào UC khác nhau | Không vẽ ở mọi UC (quy tắc 2), chỉ vẽ đủ ở UC-93; lệch lạc ghi vào file này |
| 2 | Xoá mềm để lại dữ liệu con (UC-11 snapshot Hub, UC-25 comment) | Vẽ theo code, **ghi là lỗi cần sửa code** |
| 3 | Actor trong code rộng hơn SRS | Vẽ đúng actor SRS ghi, không thêm; ghi vào file này |
| 4 | Luật chỉ có trong code (200 từ, môn/khối, confirm dialog) | **Vẫn vẽ** — hệ thống thật; đồng thời bổ sung vào SRS |
| 5 | UC chưa có spec (UC-27, 95, 98, 106, 112) | Vẽ theo code, đánh dấu "cần rà lại sau khi có spec" |

---

# Đợt sửa SRS 18/08/2026

Đã vá thẳng vào `Report3_Software_Requirement_Specification_v1.2.docx` trên Drive (bản gốc trước khi sửa giữ ở scratchpad `srsfix/orig.docx`). Mọi thao tác đều đối chiếu đúng câu cũ trước khi ghi.

## Đã sửa

| Mục | Sửa gì |
|---|---|
| 1.3 bảng UC (UC-10) | Bỏ "or its current status"; thêm câu Publish Status bị đặt lại theo BR-23 khi nội dung đã duyệt và đã lên Hub |
| 2.2.2 | AI sửa **mọi** mục khớp lệnh, không phải một mục |
| 2.2.3 / 2.4.6 / 2.5.3 | Secondary Actor **File Storage Service → None** |
| 2.2.3 / 2.5.3 | Xuất PDF là in từ trình duyệt, không gửi server, không có download link; gộp nhánh lỗi trùng |
| 2.3.1 | "grouped by content type" → tab theo loại; mở item là mở editor/preview, không phải màn chi tiết |
| 2.3.3 | Bỏ điều kiện "editable Publish Status" ở Precondition và bước 2 |
| 2.3.4 | Precondition đang ghi nhầm nội dung hậu điều kiện → viết lại; Postcondition nêu rõ snapshot Hub vẫn công khai (BR-32) |
| 2.4.1 | Bỏ bước xác nhận và nhánh "teacher cancels generation"; đánh lại số nhánh 4→3, 5→4 |
| 2.4.3 | Bỏ bước validate outline (BR-13) và nhánh "outline invalid"; đánh lại số nhánh 5→4, 7→6 |
| 2.5.1 | Sửa lỗi gõ "is ...saved"; nêu rõ Test Editor mở ngay khi sinh; bước cuối là rà soát trong editor |
| 2.6.2 | Moderator không có môn thì liệt kê blog **mọi môn** thay vì báo lỗi (Precondition + Postcondition + nhánh Step 3) |
| 2.6.6 | Comment không bị xoá khỏi DB, chỉ không truy cập được cùng bài |
| 2.6.7 | Thêm giới hạn **200 từ** ở bước validate và nhánh lỗi |
| 2.7.2 | Thêm điều kiện giáo viên phải có môn/khối được phân công; bước validate kiểm tra điều đó |
| 2.7.3 | Thêm popup xác nhận, kiểm môn/khối, thông báo học sinh (BR-46), Secondary Actor Notification Service; đánh lại nhánh Step 8→9 |
| 2.7.4 | Bỏ Notification Service và bước gửi thông báo; Postcondition ghi rõ đặt Inactive **không** gửi thông báo |
| 2.7.19 | Nộp bài bằng **văn bản và/hoặc tệp** (Description, Postcondition, bước 3 và 5) |
| Toàn tài liệu | Đánh lại **96 tham chiếu** dạng "UC-NN: Tên" theo bảng 1.3.2; sửa thêm 6 tham chiếu tên cũ ở 5.3; xoá 3 dòng "Mapped Use Case" trỏ tới UC đã bỏ |

Giữ nguyên theo yêu cầu: mọi mô tả **auto-save** (BR-19, 2.4.3, 2.3.3) — BR-19 hiện đã mô tả đúng code (auto-save lần sinh đầu, sau đó lưu tay kèm cảnh báo rời trang).

## Còn lại

| Việc | Vì sao chưa làm |
|---|---|
| 2.5.2 bước "validate answer-key consistency" | Chưa chốt: bỏ khỏi SRS hay bổ sung code |
| 2.5.3 tuỳ chọn "kèm đáp án" (bước 2 + Postcondition) | Như trên |
| UC-11 snapshot Hub vẫn công khai sau khi xoá | Đã hoãn để sửa code; nếu sửa code thì phải sửa lại Postcondition 2.3.4 |
| Thêm UC-113 View Other User Profile | Cần thêm dòng bảng 1.3 + spec mới ở mục 2 + hình trong Report 4 |
| 5 UC chưa có spec (UC-27, 95, 98, 106, 112) | Cần viết Normal/Alternative Flow |
| 2 dòng 5.3 gắn "UC-56: Run Chemistry Virtual Lab Experiment" | Không còn UC tương ứng trong hệ thống, cần chọn UC thay thế hoặc bỏ dòng |
| UC-110 / UC-112 xuất báo cáo | Phải code trước bảo vệ |

Bảng 5.2 System Messages **đã có nội dung đầy đủ** (MSG01–MSG82) — mục này trong danh sách trên đã xử lý xong.

---

# Đợt vẽ 3 — 73 UC còn lại (18/08/2026)

9 subagent vẽ nốt UC-38…UC-112. Toàn bộ 112 UC đã có class + sequence, checker 0 lỗi. Dưới đây là các chỗ lệch mới phát hiện. Ký hiệu như phần đầu file (🔧 sửa code · 📄 sửa tài liệu · 💬 giữ nhưng phải giải thích được).

## K. Mã MSG — vấn đề lớn nhất của đợt này

Bảng **5.2 System Messages** (dựng từ chuỗi thật trong FE, MSG01–MSG82) và các mã trích trong **luồng UC ở mục 2** là **hai hệ đánh số khác nhau**. Chỉ MSG01, MSG02, MSG80 là trùng nghĩa.

| Mã | Mục 2 dùng làm | Bảng 5.2 định nghĩa |
|---|---|---|
| MSG25 | lỗi thao tác chung — **78 lần** | popup xác nhận ẩn bình luận blog |
| MSG08 | thông báo thành công — **28 lần** | thiếu cấu hình Google Client ID |
| MSG09 | popup xác nhận xoá | script Google Sign-In lỗi |
| MSG10 | xoá thành công | ảnh đại diện sai định dạng |
| MSG23 | lớp Inactive / read-only | popup xác nhận xoá bình luận blog |
| MSG13 | tệp tải lên sai định dạng | cập nhật hồ sơ thất bại |

Tổng **243 chỗ trích dẫn** trong mục 1–3. 📄 Đề xuất: sửa mục 2 theo bảng 5.2 (bảng đang khớp code), đồng thời patch mã trong 224 file `.puml`. Hiện tất cả hình đang trích theo mục 2 để đồng nhất với 39 hình vẽ trước.

## L. Code chạy khác đặc tả — bổ sung đợt 3

| UC | SRS nói | Code làm | Đề xuất |
|---|---|---|---|
| UC-42 Delete Class Resource | Học sinh được thông báo khi tài nguyên bị gỡ (BR-46) | `deleteResource` không gọi notify (post/update thì có) | 📄 hoặc 🔧 |
| UC-45 / UC-48 Download | Đi qua File Storage Service | URL R2 public lưu sẵn trong DB, trình duyệt tải thẳng, backend không tham gia | 📄 |
| UC-47 View Submission Detail | File Storage Service cung cấp thông tin file | Metadata lấy từ bảng `submission_files`, không có preview | 📄 |
| UC-50 Unsubmit | — | Xoá cứng `submission_files` rồi `submissions` | 💬 |
| UC-51/52/53 Physics | Có nhánh lỗi tải dữ liệu (MSG80) | Thuần client, preset tĩnh trong `fe/components/simulations/presets/`, không có backend | 📄 |
| UC-55 Save Molecule | Secondary actor AI/LLM Service | `save()` không gọi AI; có bước **chống trùng** (trả lại bản đã lưu); Moderator Hoá cũng lưu được | 📄 |
| UC-56 View Periodic Table | Lọc không ra kết quả thì hiện MSG01 | Làm mờ toàn bộ ô + bộ đếm `0 / 118`, không có text nào | 📄 |
| UC-57 / UC-58 | Hai use case tách rời | Một popup `ElementDetailPanel` gồm cả thuộc tính lẫn mô hình 3D | 📄 |
| UC-60 Generate Molecule | Parse công thức trực tiếp, thiếu input hiện MSG02 | Chỉ tra bảng 7 công thức đơn chất (H2, N2, O2, F2, Cl2, Br2, I2); `parseFormula` chỉ đối chiếu lại kết quả AI; thiếu input thì **disable nút** | 📄 |
| **UC-65 Delete Own Public Content** | Xoá khỏi cả Hub lẫn Thư viện cá nhân | Chỉ soft-delete **hàng snapshot Hub**, bản gốc còn nguyên | 📄 (popup FE cũng chỉ nói "gỡ khỏi Hub") |
| UC-61 View Community Hub | Không nêu ràng buộc môn | Ép lọc theo môn của tài khoản đăng nhập | 📄 |
| UC-66 Publish Hub Content | — | Chặn gửi duyệt nội dung `SIMULATION` môn Vật lý | 📄 |
| UC-67 Unpublish | Secondary actor Notification Service, báo moderator | `unsubmit()` không gửi thông báo | 📄 |
| UC-68 View Content Comments | Bình luận mới nhất trước | `ORDER BY created_at ASC` (cũ trước), FE gom reply bên dưới | 📄 |
| **UC-111 Edit Own Public Content** | Giữ Published, bản Hub cập nhật ngay | Hạ về `PRIVATE`, xoá `submittedAt/reviewedBy/reviewedAt`; snapshot cũ vẫn công khai với nội dung cũ | 🔧 hoặc 📄 |
| UC-73 View Content List | Hiện tác giả và nguồn; tìm kiếm/lọc | API không trả `ownerName`; lọc chạy **phía client** trên 100 bản ghi đã tải | 📄 |
| UC-75 Approve Content | Có popup xác nhận | Bấm "Duyệt lên Hub" là chạy thẳng | 📄 hoặc 🔧 |
| UC-76 Reject Content | Nhập lý do rồi popup xác nhận | Một panel lý do inline, nút xác nhận disable khi rỗng | 📄 |
| UC-77 View Teacher List | Có Alternative Flow tìm kiếm/lọc | Chỉ có phân trang, không có ô tìm kiếm | 📄 |
| UC-78 View Teacher Detail | — | Không có `GET /api/moderator/teachers/{id}`; chi tiết lấy từ danh sách | 📄 |
| UC-80 Update Teacher Account | Lớp và task hiện có được giữ nguyên | `deactivateActiveByOwnerIdExcludingGrades` — lớp ACTIVE thuộc khối bị bỏ tự chuyển INACTIVE | 📄 hoặc 🔧 |
| UC-81 Reactivate Teacher | Có popup xác nhận | Gọi thẳng, không popup; đưa về `INVITED` chứ không `ACTIVE` | 📄 |
| UC-87 Submit Lesson Plan | Chọn giáo án hoặc upload file | FE đã bỏ upload, chỉ chọn từ thư viện; BE vẫn nhận `documentUrl` (code chết) | 📄 + 🔧 xoá code chết |
| UC-88 Unsubmit Weekly Task | Bước 6 báo moderator | Không gửi (đúng BR-48) — **SRS tự mâu thuẫn** | 📄 |
| UC-84 Assign Weekly Task | Giao cho từng giáo viên | FE luôn gọi `/bulk`; endpoint đơn lẻ và `createWeeklyTask` ở FE là code chết | 🔧 |
| UC-85 Edit Weekly Task | — | Chặn sửa cụm đã có giáo án `APPROVED`; không đổi giáo viên riêng lẻ khi cụm nhiều task | 📄 |
| UC-89 Approval List | Moderator tìm kiếm hoặc lọc | Chỉ có lọc theo khối/chương/bài, không có ô tìm tự do | 📄 |
| UC-90 Lesson Plan Detail | Secondary actor File Storage Service | Trình duyệt mở thẳng URL R2 | 📄 |
| **UC-97 Remove Blog Post** | Xoá bài và toàn bộ bình luận | Soft-delete `REMOVED_BY_MODERATOR`; `blog_comments` còn nguyên trong DB | 🔧 cùng kiểu với UC-11 và UC-25 |
| UC-99 Activity Log | Lọc theo feature | Chỉ lọc theo actor, category, khoảng thời gian | 📄 |
| UC-103 View Staff Detail | Có màn chi tiết riêng kèm hành động | Dùng chung `/user-profile/{id}` read-only; hành động nằm ở màn danh sách | 📄 |
| UC-104 Add Moderator | Secondary actor Google Identity Service | Luồng thêm không gọi Google (chỉ UC-02 mới gọi) | 📄 |
| UC-105 / UC-108 Replace | Popup xác nhận riêng sau khi submit | Một modal vừa là form vừa là xác nhận | 📄 |
| UC-105 | Moderator cũ về làm Teacher khối 10, 11, 12 | Principal tự chọn khối (`previousTeacherGrades`, mặc định 10/11/12) | 📄 |
| UC-109 School Statistics | Lọc theo khoảng ngày và môn | UI chỉ truyền `subject`; `from/to` có ở API nhưng không dùng | 📄 |
| UC-98 Subject Statistics | Bảng 1.3 ghi lọc theo khoảng ngày | Code lọc theo tuần / quý | 📄 |

## M. Luật chỉ có trong code — bổ sung đợt 3

| Chức năng | Bằng chứng |
|---|---|
| Lớp tối đa **60 học sinh**, học sinh tối thiểu **16 tuổi** | `MAX_CLASS_SIZE`, `MIN_STUDENT_AGE_YEARS` trong `ClassEnrollmentService` |
| Thêm học sinh bằng Gmail chưa có thì **tự tạo tài khoản** và gán role STUDENT | `resolveOrCreateStudent`; email đã có nhưng họ tên/SĐT/ngày sinh khác thì `PROFILE_MISMATCH` |
| Thêm / sửa / kích hoạt lại giáo viên đều gọi `assignOpenCurrentWeekTasks` | `ModeratorTeacherService` — giao weekly task tuần hiện tại cho giáo viên |
| Bình luận Hub cũng có giới hạn 200 từ, trả lời 1 cấp, soft-hide | `HubCommentService`, migration V40 |
| Thông báo gửi theo role + môn, **không lọc trạng thái tài khoản** | Tài khoản `DISABLED` vẫn nhận thông báo — 🔧 nên lọc |
| System prompt rỗng vẫn lưu được ở backend | Chỉ FE disable nút; `@NotNull` không chặn chuỗi rỗng — 🔧 nhẹ |

## N. Vấn đề nội tại của SRS — bổ sung

| Vấn đề | Chi tiết |
|---|---|
| Tên UC lệch giữa bảng 1.3 và mục 2.11 | Bảng ghi "Reactivate Teacher Account" (UC-81) / "Deactivate Teacher Account" (UC-82); mục 2.11.9–2.11.10 ghi "Ban Teacher" / "Reactivate Teacher" và đảo thứ tự. Hình vẽ theo bảng 1.3 |
| Mã BR trong javadoc lệch SRS | Javadoc weekly task dùng BR-51/52/53, SRS mới đánh BR-50…53 — 🔧 sửa javadoc |
| Javadoc `HubCommentService` lệch code | Ghi chủ nội dung xoá được bình luận, code chỉ cho tác giả — 🔧 sửa javadoc |
| UC-88 tự mâu thuẫn | Bước 6 của mục 2.12.6 trái với BR-48 |

## O. Hai UC vẽ theo thiết kế vì chưa có code

UC-110 và UC-112 (xuất báo cáo) chưa có code. Hình vẽ theo SRS, tái dùng hạ tầng export có thật (`DocumentPdfRenderer`, `StorageClient`) với các tên **mới đặt**: `PrincipalStatisticsReportService`, `ModeratorStatisticsReportService`, `StatisticsReportHtmlBuilder`, `SchoolStatisticsReport`, `SubjectStatisticsReport`, endpoint `GET /api/principal/statistics/report/pdf` và bản moderator tương ứng. Nếu code thật khác thiết kế này thì phải vẽ lại 4 hình.
