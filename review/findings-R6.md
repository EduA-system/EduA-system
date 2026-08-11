# R6 — Sinh slide & thiết kế slide

Quét ngày 2026-08-11 trên `main`. Đọc tay trước (R6-01…R6-02), `/code-review high` sau (R6-10…).

Phạm vi: `be/.../service/slides/` (6 file, 2063 loc: `GenerateSlideOutlineUseCase` — 1108 loc,
`SlidePromptBuilder`, `LessonContentChunker`, `OutlineGenerationSessionStore`,
`SlideLessonContextFactory`, `LessonSourceContext`) + `be/.../service/slidedesign/` (5 file, 1573 loc:
`GenerateSlideHtmlDesignUseCase`, `FillSlideContentUseCase`, `SlideHtmlExtractor`,
`SlideImageGenerator`/`GenerateSlideImageUseCase`, `SlideDesignPromptBuilder`), `SlideController.java`,
`SlideDesignController.java`, `fe/lib/slide-create/`, `fe/lib/ws/outline-client.ts`,
`fe/components/outline-editor/`, `fe/components/slide-maker/SlideMakerClient.tsx`.

**Ghi nhận trước khi vào finding:** đây là cụm backend lớn nhất nhưng cũng phòng thủ tốt nhất trong 5
cụm đã quét. `GenerateSlideOutlineUseCase`/`FillSlideContentUseCase`/`GenerateSlideHtmlDesignUseCase`
đều có retry JSON, xử lý lỗi từng phần không sập cả pipeline (`consolidateDeck` best-effort, ảnh lỗi giữ
placeholder), và **tự kiểm tra chất lượng output AI** bằng một loạt cảnh báo heuristic
(`data-layer="bg"`, `data-zone=`, so khớp chữ ký decoration giữa các bước — xem
`GenerateSlideHtmlDesignUseCase:116-149`). Đáng chú ý nhất: cụm này đã **tự vá đúng lỗi race mà R5 mắc
phải** — xem R6 "Kiểm tra nhưng không có vấn đề". Hai finding còn lại đều thuộc dạng "khoảng trống kiến
trúc lặp lại giữa các cụm", không phải bug cục bộ.

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R6-01 | `SlideController.java`, `SlideDesignController.java` (toàn bộ endpoint) | Không endpoint sinh slide/thiết kế nào có `@PreAuthorize` — cùng lỗ với R5-03 | TB | Sửa |
| R6-02 | `OutlineGenerationSessionStore.java:14-17`, `fe/lib/slide-create/session.ts` | Tiến trình sinh chỉ sống trong bộ nhớ server (TTL 30p, 1 instance) + `sessionStorage` FE — đóng tab/crash giữa chừng vẫn mất, dù đã đỡ hơn R5-01 nhiều nhờ resume cùng tab | Thấp/TB | Ghi nhận — áp dụng ngược cơ chế resume ở đây cho R5-01 |

---

## R6-01 — Không endpoint sinh slide/thiết kế nào kiểm tra vai trò **[TB]**

Giống hệt R5-03. `SlideController` (`/generate-outline`, `/outline-sessions/{id}/start`,
`/retry-outline-session-part`, `/retry-outline-session-slide`, `/retry-outline-part`) và
`SlideDesignController` (`/generate-html`, `/fill-content`, `/generate-image`) không có
`@PreAuthorize` nào, và các use case tương ứng không tự kiểm `CurrentUserProvider`/role ở bất kỳ đâu.
Đây là cụm tốn AI-call nhiều nhất hệ thống (outline: 1 call blueprint + N call skeleton part + N call
expand + 1 call consolidate; design: 3 bước HTML × mỗi slide + fill-content + generate-image) — cùng họ
lỗ hổng với R5-03, khả năng nên sửa chung một lượt cho toàn bộ nhóm endpoint sinh nội dung AI
(`/api/lesson-plans/*`, `/api/slides/*`, `/api/slide-design/*`).

## R6-02 — Tiến trình sinh chỉ sống trong bộ nhớ, đóng tab vẫn mất (nhẹ hơn R5-01) **[Thấp/TB]**

`OutlineGenerationSessionStore` tự ghi chú thẳng trong code: `/** In-memory state only... */`
(dòng 13) — `ConcurrentHashMap` một instance, TTL 30 phút (dòng 16), không repository/DB nào phía sau
(xác nhận: không có `@Transactional`/`.save(` nào trong `GenerateSlideOutlineUseCase.java`). Về bản
chất đây là cùng lỗ kiến trúc với R5-01 (không gì phía server lưu kết quả AI đã sinh cho tới khi client
chủ động lưu) — nhưng FE ở đây đã tự vá phần lớn:

- `patchSlideCreateSession()` (`fe/lib/slide-create/session.ts:36`) ghi **tiến độ dần dần** vào
  `sessionStorage` mỗi khi `OUTLINE_PART_READY`/`OUTLINE_SLIDE_READY` về (`slide-create/outline/
  page.tsx:184,224,300`), không đợi tới sự kiện cuối như bên giáo án (`R5-01`).
- Bước thiết kế (design) có cơ chế **resume sau khi reload cùng tab**:
  `SlideMakerClient.tsx:58,155-163` đọc `readActiveGeneration()` khi vào trang với
  `?generating=1`, khôi phục `sessionId`/`topic` đã lưu ở `writeActiveGeneration()`
  (`outline/page.tsx:408`) để nối lại đúng phiên đang chạy thay vì hiện trắng trang.

Vẫn còn lỗ: `sessionStorage` không sống qua việc **đóng tab** (khác `localStorage`), và không có gì ghi
xuống DB — nên tắt hẳn trình duyệt hoặc crash giữa lúc AI đang chạy (outline hoặc design) vẫn mất tiến
độ chưa lưu, không có bản ghi nào ở backend để biết phiên đó từng tồn tại. Khác biệt với R5-01 chỉ là
mức độ: cửa sổ rủi ro hẹp hơn nhiều (còn tab thì còn cứu được), không phải "luôn mất khi rời trang".

**Khuyến nghị:** không cần sửa riêng ở đây — nên **áp dụng ngược cơ chế `ActiveGeneration`/resume-cùng-
tab đã có ở luồng slide sang luồng giáo án** để giải quyết chung với R5-01, thay vì hai cách vá khác
nhau cho cùng một lớp vấn đề.

---

## Kiểm tra nhưng không có vấn đề

- **Race giữa "bắt đầu sinh" và "FE đã subscribe" (đúng lỗi R5-02 mắc phải) — ĐÃ ĐƯỢC VÁ ở đây.**
  `GenerateSlideOutlineUseCase.execute()` chỉ tạo session và trả `sessionId`/`topic`, **không** sinh gì
  cả; việc sinh thật sự chỉ bắt đầu khi FE gọi riêng `start(sessionId)`
  (javadoc dòng 97: *"Starts only after the client subscribed to the session topic."*). FE tuân đúng
  hợp đồng này: `slide-create/outline/page.tsx:317-325` chỉ gọi `startOutlineSession(...)` bên trong
  callback `onReady` của `connectOutlineStream` — tức **sau khi** lệnh STOMP `SUBSCRIBE` đã được gửi đi,
  không phải sau khi nhận `202`. Đây chính là kiểu bắt tay mà R5-02 (luồng giáo án) còn thiếu — nên dùng
  làm mẫu khi sửa R5-02.
- **Double-start cùng session**: `Session.startOnce()` (`OutlineGenerationSessionStore.java:49`) dùng
  `synchronized` + cờ `started`, chặn `start()` chạy hai lần cho cùng `sessionId` (vd double-click hoặc
  StrictMode double-invoke).
- **Một part/slide lỗi không sập cả deck**: `start()` đếm `failures`/`remaining` qua `AtomicInteger`,
  publish `publishPartError`/`publishSlideError` riêng cho phần lỗi, các phần khác vẫn tiếp tục; tương
  tự `generateActivitiesDetails` ở R5.
- **AI trả JSON/HTML hỏng**: `FillSlideContentUseCase.generateCompleteJson()` retry tối đa 2 lần kèm
  prompt nhắc "trả JSON ngắn hơn, đóng đủ ngoặc"; `GenerateSlideHtmlDesignUseCase` tự kiểm tra hàng loạt
  bất biến cấu trúc (`data-layer="bg"`, `data-zone=`, số lượng zone không giảm giữa các bước, header
  không bị xoá) và trả `warning` mô tả đúng chỗ sai thay vì chỉ ném lỗi chung chung.
- **Blank HTML ở bước quan trọng không trôi qua im lặng**: `run-design-pipeline.ts:115` (`if
  (!step1.html.trim()) throw ...`) và tương tự ở các bước sau — `warning` từ BE chỉ mang tính thông tin
  cho các lệch nhỏ, còn output rỗng ở điểm chặn đều bị FE chặn cứng bằng `throw` với thông báo tiếng
  Việt rõ ràng.
- **Ảnh sinh lỗi không chặn slide**: `FillSlideContentUseCase.tryGenerateImageUrl()` bọc try/catch
  riêng cho từng ảnh, lỗi thì giữ `imagePrompt` làm placeholder + trả `warning`, giáo viên bấm "tạo lại
  ảnh" ở slide editor sau (`GenerateSlideImageUseCase`) — không có ảnh lỗi nào kéo sập cả response.
