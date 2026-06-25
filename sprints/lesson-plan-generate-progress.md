# Lesson Plan Generate — Progress Tracker

> Sprint task list cho luồng **UC-23 Create Lesson Plan**.
> Quy ước: `[ ]` = chưa làm · `[~]` = đang làm · `[x]` = xong.
> Mục tiêu: sinh giáo án từ sách/chương/bài đã chọn, stream tiến trình qua STOMP, render kết quả vào editor.

---

## 0. Mục tiêu sprint

- [ ] Hoàn thành luồng chọn SGK/chương/bài từ `GET /api/textbooks`.
- [ ] Gọi `POST /api/lesson-plans/generate` để sinh giáo án.
- [ ] Stream tiến trình qua `/topic/lesson-plan/{sessionId}`.
- [ ] Lưu giáo án vào DB với status mặc định `Private`.
- [ ] Render giáo án đã sinh vào Lesson Plan Editor.

---

## 1. Hiện trạng đã có

- [x] `GET /api/textbooks` trả cây `book -> chapter -> lesson`.
- [x] DB đã có `textbooks`, `chapters`, `lessons`.
- [x] `lessons.knowledge_json` đã có nội dung tri thức cho phần lớn bài học.
- [x] `TextbookCatalogRepository.findLessonKnowledge(...)` lấy được tri thức theo `bookId/chapterId/lessonId`.
- [x] `AiClient` gateway đã có.
- [x] `OpenAiAdapter`, `DeepSeekAdapter`, `FallbackAiClient` đã có.
- [x] STOMP endpoint `/ws` đã có.
- [x] `LessonPlanStreamPort` và `StompLessonPlanStreamAdapter` đã có.
- [x] `POST /api/uploads` đã có cho file tham chiếu.
- [ ] `POST /api/lesson-plans/generate` chưa có.
- [ ] Bảng/entity lưu lesson plan chưa có.
- [ ] DTO giáo án 5512 hiện còn placeholder.

---

## 2. Backend tasks

### 2.1 DTO và contract API

- [ ] Mở rộng `LessonPlan5512Dto` đủ field để FE render editor.
- [ ] Mở rộng `Activity5512Dto` đủ field cho hoạt động dạy học 5512.
- [ ] Tạo `GenerateLessonPlanRequest`.
- [ ] Tạo `GenerateLessonPlanResponse`.
- [ ] Tạo response lỗi rõ cho thiếu `bookId/chapterId/lessonId`.
- [ ] Tạo `GET /api/lesson-plans/{id}` để mở lại giáo án sau khi generate.
- [ ] Tạo `POST /api/lesson-plans/generate`.

### 2.2 Persistence

- [ ] Tạo migration bảng `lesson_plans`.
- [ ] Lưu tối thiểu: `id`, `title`, `status`, `content_json`, `book_code`, `chapter_code`, `lesson_code`, `created_at`, `updated_at`.
- [ ] Tạo domain model hoặc persistence model cho lesson plan.
- [ ] Tạo service-facing `LessonPlanRepository`.
- [ ] Tạo JPA entity/repository/adapter cho `lesson_plans`.
- [ ] Khi generate xong, lưu status mặc định `Private`.

### 2.3 Generate service

- [ ] Tạo `LessonPlanService.generate(...)`.
- [ ] Validate input: phải có đủ `bookId`, `chapterId`, `lessonId`.
- [ ] Lấy `knowledge_json` bằng `TextbookCatalogRepository.findLessonKnowledge(...)`.
- [ ] Nếu không có `knowledge_json`, trả lỗi rõ hoặc publish `ERROR`.
- [ ] Tạo `LessonPlan5512PromptBuilder`.
- [ ] Prompt phải tách rõ dữ liệu SGK/user prompt là data, không phải instruction.
- [ ] Gọi `AiClient.generate(prompt)`.
- [ ] Parse output AI thành `LessonPlan5512Dto`.
- [ ] Nếu parse lỗi, publish `ERROR`.
- [ ] Lưu giáo án vào DB.
- [ ] Publish `FRAME_READY` khi có giáo án draft.
- [ ] Publish `DONE` sau khi lưu thành công.
- [ ] Publish `ERROR` khi AI hoặc DB fail.

### 2.4 Async/STOMP

- [ ] API `POST /api/lesson-plans/generate` trả ngay `202 Accepted`.
- [ ] Response gồm `sessionId` và `lessonPlanId`.
- [ ] Client phải subscribe `/topic/lesson-plan/{sessionId}` trước khi gọi generate.
- [ ] Service chạy generate nền, không block request HTTP.
- [ ] Dùng event hiện có: `FRAME_READY`, `DONE`, `ERROR`.
- [ ] `ACTIVITY_READY` có thể để phase sau nếu v1 sinh cả giáo án một lần.

---

## 3. Frontend tasks

### 3.1 Creation form

- [ ] Màn `/lesson-create` gọi `GET /api/textbooks`.
- [ ] Render dropdown sách/lớp từ `catalog.books`.
- [ ] Khi chọn sách, render `book.chapters`.
- [ ] Khi chọn chương, render `chapter.lessons`.
- [ ] Lưu `bookId`, `chapterId`, `lessonId` trong form state.
- [ ] Thêm textarea Additional Objectives / yêu cầu AI tùy chỉnh.
- [ ] Validate thiếu sách/chương/bài trước khi submit.
- [ ] Hiển thị inline error cho field thiếu.

### 3.2 Generate flow

- [ ] Sinh `sessionId` ở client trước khi gọi API.
- [ ] Kết nối STOMP tới `/ws`.
- [ ] Subscribe `/topic/lesson-plan/{sessionId}` trước khi gọi generate.
- [ ] Gọi `POST /api/lesson-plans/generate`.
- [ ] Hiển thị trạng thái "Generating..." trong lúc chờ event.
- [ ] Nhận `FRAME_READY` và cập nhật lesson plan draft.
- [ ] Nhận `DONE` và chuyển sang editor với `lessonPlanId`.
- [ ] Nhận `ERROR` và hiển thị lỗi retry.

### 3.3 Editor integration

- [ ] Editor nhận dữ liệu thật thay vì `lessonMock`.
- [ ] Editor gọi `GET /api/lesson-plans/{id}` khi mở từ `lessonPlanId`.
- [ ] Render title, metadata, sections/activities từ `LessonPlan5512Dto`.
- [ ] Giữ khả năng edit tay hiện có.
- [ ] Nút save tạm thời có thể vẫn là mock nếu PATCH chưa làm trong sprint này.

---

## 4. Test plan

### 4.1 Backend

- [ ] `GET /api/textbooks` trả catalog có books/chapters/lessons.
- [ ] `POST /api/lesson-plans/generate` thiếu field trả 400.
- [ ] Generate với `bookId/chapterId/lessonId` hợp lệ trả 202.
- [ ] Response generate có `sessionId` và `lessonPlanId`.
- [ ] Service lấy đúng `knowledge_json` theo bài đã chọn.
- [ ] AI lỗi thì publish `ERROR`.
- [ ] Parse lỗi thì publish `ERROR`.
- [ ] Generate thành công thì DB có record trong `lesson_plans`.
- [ ] Generate thành công thì publish `FRAME_READY` và `DONE`.

### 4.2 Frontend

- [ ] Dropdown sách/chương/bài render đúng từ catalog.
- [ ] Đổi sách reset chương/bài đã chọn.
- [ ] Đổi chương reset bài đã chọn.
- [ ] Không cho generate khi thiếu required fields.
- [ ] Subscribe STOMP trước API call.
- [ ] Nhận `FRAME_READY` thì editor có dữ liệu.
- [ ] Nhận `ERROR` thì hiện trạng thái lỗi và cho retry.

### 4.3 Manual scenario

- [ ] Chạy backend.
- [ ] Chạy frontend.
- [ ] Vào `/lesson-create`.
- [ ] Chọn `Vật lí 11 -> Chương 1. Dao động -> Bài 1. Dao động điều hoà`.
- [ ] Nhập Additional Objectives tùy chọn.
- [ ] Bấm Generate.
- [ ] Thấy trạng thái đang sinh.
- [ ] WebSocket nhận `FRAME_READY`.
- [ ] WebSocket nhận `DONE`.
- [ ] Editor hiển thị giáo án.
- [ ] DB có bản ghi lesson plan mới.

---

## 5. Tạm để sau

- [ ] Auth và owner check.
- [ ] Rate limit `10 req/phút/user`.
- [ ] Upload file tham chiếu làm nguồn generate thay cho SGK.
- [ ] AI edit `POST /api/lesson-plans/{id}/ai-edit`.
- [ ] Auto-save `PATCH /api/lesson-plans/{id}`.
- [ ] Personal Library `GET /api/lesson-plans`.
- [ ] Delete lesson plan.
- [ ] Export PDF/Word.
- [ ] Review/publish workflow.

---

## 6. Ghi chú kỹ thuật

- Catalog không cần filter API ở phase này; FE gọi một lần `GET /api/textbooks` và lọc local.
- `sessionId` do FE sinh, backend echo lại trong response.
- V1 có thể sinh cả giáo án một lần và publish `FRAME_READY -> DONE`.
- `ACTIVITY_READY` giữ lại cho phase tối ưu streaming từng hoạt động.
- Cần giữ `AiClient` là gateway mỏng; prompt security đặt ở prompt builder.
- Tests hiện có thể fail nếu Maven test không load đúng DB env; cần cấu hình test DB hoặc profile test riêng trước khi xem test suite là nguồn सत्य.
