# R5 — Sinh giáo án (streaming)

Quét ngày 2026-08-11 trên `main`. Đọc tay trước (R5-01…R5-03), `/code-review high` sau (R5-10…).

Phạm vi: `be/.../service/lessonplan/` (5 file, 1581 loc: `GenerateLessonPlanStreamUseCase`,
`LessonPlanService`, `LessonPlan5512PromptBuilder`, `LessonPlanEditPromptBuilder`,
`LessonPlanGenerationException`), `LessonPlanController.java`, `fe/lib/ws/lesson-plan-client.ts`,
`fe/components/LessonEditor/` (18 file, 4470 loc, trọng tâm `useLessonPlanStream.ts`,
`LessonEditor.tsx`), `fe/components/dashboard/LessonEditDashboard.tsx`,
`fe/components/dashboard/UserDashboard.tsx`, `fe/components/layout/AssistantPanel.tsx`.

**Ghi nhận trước khi vào finding:** đây là cụm được viết cẩn thận nhất trong 4 cụm đã quét — comment
trong `LessonPlanService.parseJson/repairLatexEscapes`, `useLessonPlanStream.ts` (cancelled ref,
frameReceivedRef, inFlightRef cho retry) và `AssistantPanel.tsx` (chặn gửi yêu cầu mới khi còn diff AI
chưa xử lý) đều cho thấy nhiều vòng debug thực tế đã được vá. Phần lớn lớp lỗi "hiển nhiên" ở checklist
(gõ đè con trỏ, double-submit AI edit, AI trả JSON hỏng, LaTeX chưa escape) đã có xử lý rõ ràng — xem
mục "Kiểm tra nhưng không có vấn đề". Finding còn sót lại nằm ở tầng kiến trúc streaming, không phải
lỗi vặt.

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R5-01 | `GenerateLessonPlanStreamUseCase.java:105-106`, `WebSocketConfig.java:48`, `LessonEditDashboard.tsx:281-284` | Không có gì lưu giáo án phía server; chỉ có DONE (client) mới trigger lưu — client mất kết nối giữa chừng thì mất trắng | **Cao** | Sửa |
| R5-02 | `UserDashboard.tsx:206-208`, `useLessonPlanStream.ts:165-256` | Backend bắt đầu sinh (và publish) trước khi FE chắc chắn đã subscribe — SimpleBroker không phát lại, có thể mất FRAME_READY mà không báo lỗi | TB | Sửa |
| R5-03 | `LessonPlanController.java` (toàn bộ 6 endpoint) | Không endpoint sinh giáo án nào có `@PreAuthorize`, và `LessonPlanService`/`GenerateLessonPlanStreamUseCase` không tự kiểm vai trò — bất kỳ role nào đã đăng nhập (kể cả STUDENT) đều gọi được | TB | Sửa |

---

## R5-01 — Không có gì lưu giáo án phía server; mất kết nối giữa chừng = mất trắng **[Cao]**

Ba mảnh ghép cộng lại thành một lỗ hổng:

1. `GenerateLessonPlanStreamUseCase.run()` không bao giờ ghi DB. Comment tự nhận:
   ```java
   if (completed.incrementAndGet() == total) {
       // Chưa persist DB → lessonPlanId null.
       stream.publishDone(sessionId, null);
   }
   ```
2. `WebSocketConfig.java:48` dùng `registry.enableSimpleBroker("/topic", "/queue")` — broker in-memory
   của Spring, publish kiểu fire-and-forget, **không phát lại** cho subscriber đến sau.
3. Điểm lưu **duy nhất** vào Personal Library nằm ở FE, kích hoạt bởi sự kiện `DONE`:
   ```tsx
   // LessonEditDashboard.tsx:281-284
   useLessonPlanStream(editor, (session) => {
     setLessonSession(session);
     void saveLesson(session);
   }, !libraryId);
   ```

Nghĩa là: **AI đã chạy xong (tốn tiền + thời gian: 3 call dựng khung + tối đa 4 call chi tiết hoạt
động) nhưng nội dung chỉ tồn tại trong đúng một message STOMP.** Nếu trình duyệt không còn ở đó để nhận
— đóng tab, mất mạng, điều hướng đi chỗ khác, hoặc chỉ đơn giản là chưa kịp mở lại `/lesson-edit` sau
khi `router.push` — thì:

- Không ai gọi `saveLesson`, nên không có `POST /api/library-contents` nào được gửi.
- Không có gì trong DB tham chiếu tới lần sinh đó — không `lessonPlanId`, không log, không bản ghi
  "đang chờ" để về sau khôi phục.
- `sessionStorage` (nơi giữ `sessionId`) đã bị `clearLessonPlanSession()` xoá ngay khi `/lesson-edit`
  mount lần đầu ("Tiêu thụ phiên ngay để reload trang không mở lại stream") — nên **quay lại/tải lại
  trang cũng không cứu được**, kể cả khi generation phía server vẫn đang chạy.

**Kịch bản lỗi cụ thể:** giáo viên bấm "Tạo giáo án", được điều hướng sang `/lesson-edit`, nhưng đổi ý
bấm quay lại (hoặc mất mạng vài giây, hoặc đóng nhầm tab) trong lúc AI đang soạn (vài giây tới vài chục
giây cho 4 hoạt động). Quay lại `/lesson-edit` sau đó: không có phiên nào trong `sessionStorage`, editor
chỉ hiện khung mock trống. Toàn bộ nội dung đã sinh (và tiền/thời gian gọi AI đã tốn) biến mất, không
lỗi nào được báo — chỉ đơn giản như chưa từng bấm tạo.

**Sửa:** khi `completed == total` (mọi hoạt động — kể cả lỗi — đã xử lý xong), lưu kết quả xuống DB từ
chính `GenerateLessonPlanStreamUseCase` (draft trong `library_contents` hoặc bảng riêng) thay vì chờ FE
xác nhận; `DONE` mang theo `lessonPlanId` thật (đúng như trường đã có sẵn trong sự kiện nhưng luôn
`null`) để FE chỉ cần mở lại bằng id đó nếu bỏ lỡ stream.

## R5-02 — Backend bắt đầu publish trước khi FE chắc chắn đã subscribe **[TB]**

`UserDashboard.tsx:206-208`:

```ts
await startLessonPlanStream(session, authFetch);   // 202 ngay khi executor.submit() nhận việc
storeLessonPlanSession(displaySession);
router.push("/lesson-edit");                       // điều hướng, MOUNT, connect WS, subscribe — tất cả sau đây
```

`executor` là `Executors.newVirtualThreadPerTaskExecutor()` (`VirtualThreadExecutorConfig.java:21`) —
task bắt đầu chạy gần như ngay khi `submit()` trả về, tức là **trước khi** `/lesson-edit` kịp mount,
mở WebSocket, CONNECT (có xác thực JWT) và subscribe topic. Không có bất kỳ đồng bộ hoá nào (ack "đã
subscribe, sẵn sàng nhận") giữa hai phía.

Với broker fire-and-forget ở R5-01, nếu `FRAME_READY` publish xong **trước** khi subscribe hoàn tất,
message đó mất vĩnh viễn. Vì `pendingActivity` node chỉ được tạo ra khi xử lý `FRAME_READY`
(`useLessonPlanStream.ts:207`, `editor.commands.setContent(lessonPlan5512ToHtml(merged, {
pendingOrders }))`), các `ACTIVITY_READY` tới sau đó sẽ không tìm thấy block để `replacePendingBlock`
— chỉ log `console.warn` rồi bỏ qua nội dung. `DONE` vẫn tới bình thường (không phụ thuộc `FRAME_READY`)
và vẫn gọi `saveLesson` — **lưu xuống Library đúng bản mock/skeleton mặc định**, không phải nội dung AI
đã sinh, mà không có lỗi nào hiển thị cho giáo viên (editor không hề vào trạng thái lỗi vì kết nối WS
vẫn sống bình thường suốt, `onClose`/`showErrorFallback` chỉ chạy khi *mất* kết nối).

Rủi ro thực tế phụ thuộc độ trễ tương đối: sinh khung (`Phần I+II+III-outline`, chờ đủ 3 call AI song
song) thường mất vài giây, còn điều hướng+mở WS+subscribe thường dưới 1-2 giây, nên phần lớn thời điểm
race này tự thắng theo hướng an toàn — nhưng không có gì đảm bảo (mạng chậm, JWT đang refresh, hoặc một
lần sinh "may mắn" ngắn hơn bình thường đều có thể lật kèo).

**Sửa:** thêm bước bắt tay — client subscribe topic trước, gửi một sự kiện "ready"/hoặc BE chỉ bắt đầu
generate sau khi nhận xác nhận subscribe qua chính kênh STOMP (ví dụ dùng
`SessionSubscribeEvent`/`ApplicationListener` để trigger `start()` thay vì gọi trực tiếp từ controller).

## R5-03 — Không endpoint sinh giáo án nào kiểm tra vai trò **[TB]**

Toàn bộ 6 endpoint của `LessonPlanController` (`/generate`, `/generate-materials`,
`/generate-activities`, `/generate-activities-details`, `/edit-section`, `/generate-stream`) không có
`@PreAuthorize`. `LessonPlanService`/`GenerateLessonPlanStreamUseCase` cũng không gọi
`CurrentUserProvider` hay kiểm tra role ở bất kỳ đâu trong hai file này. So sánh với `ClassController`
(mọi endpoint ghi đều `@PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")`) — cụm sinh giáo án là cụm
tốn AI-call nhất trong hệ thống (tối đa 3+4 = 7 call một lần "Tạo giáo án", cộng dồn theo mỗi "Thử lại"
và mỗi "Sửa bằng AI") mà lại là cụm duy nhất không giới hạn ai được gọi.

**Kịch bản lỗi:** một tài khoản role STUDENT (hoặc bất kỳ role nào có JWT hợp lệ) gọi thẳng
`POST /api/lesson-plans/generate-stream` (hoặc 5 endpoint đồng bộ còn lại) — request được xử lý bình
thường, tốn chi phí AI, không có gì ngăn hay ghi log là truy cập trái vai trò.

**Sửa:** thêm `@PreAuthorize("hasAnyRole('TEACHER','MODERATOR')")` cho cả 6 endpoint, khớp quy ước đã
dùng ở `ClassController`.

---

## Kiểm tra nhưng không có vấn đề

- **AI trả JSON hỏng/thiếu escape LaTeX**: `LessonPlanService.parseJson()` +
  `repairLatexEscapes()` (dòng 519-598) xử lý rất kỹ — có hẳn 3 đoạn comment giải thích các ca thật đã
  gặp (`\overrightarrow`, `\begin{cases}` không bọc `\[...\]`, đóng `\[` thiếu `\]`) và tại sao whitelist
  ký tự escape hợp lệ của JSON không dùng được (đụng chữ cái đầu của lệnh LaTeX phổ biến).
- **AI lỗi/timeout từng phần**: `generateAndParse()` tự retry `maxAttempts` (mặc định 3) với backoff
  tuyến tính cho cả lỗi gọi AI lẫn lỗi parse; `generateActivitiesDetails()`/`editSection()` chỉ coi là
  lỗi toàn phần khi **tất cả** activity/section đều thất bại, còn lại giữ skeleton — không có chuyện
  một hoạt động lỗi kéo sập cả giáo án.
- **Bấm "Tạo giáo án" hai lần / generate chồng**: `canGenerate` (`UserDashboard.tsx:142`) khoá nút khi
  `generating=true`; `useLessonPlanStream` tiêu thụ `sessionStorage` ngay khi đọc
  (`clearLessonPlanSession()`) nên không mở lại stream cũ khi remount/reload.
- **Bấm "Thử lại" (retry một hoạt động) hai lần**: `inFlightRef` (`useLessonPlanStream.ts:120,283-284`)
  chặn trùng theo `order` khi đang chạy.
- **"Sửa bằng AI" (edit-section) gửi yêu cầu mới khi còn đề xuất chưa xử lý**:
  `AssistantPanel.tsx:87-88,98` chặn cả nút gửi lẫn early-return trong handler khi `pendingDiffs.length
  > 0` hoặc `status === "loading"`.
- **Client ngắt STOMP giữa chừng (sau khi đã nhận một phần)**: `onClose` (`useLessonPlanStream.ts:251-
  256`) chỉ coi là lỗi khi **chưa từng** nhận `FRAME_READY` (`frameReceivedRef`) — mất kết nối sau khi
  khung đã về thì giữ nguyên phần đã render thay vì phá nội dung giáo viên có thể đã bắt đầu sửa; đúng
  hướng xử lý hợp lý (khác hẳn lỗ hổng R5-01/R5-02, vốn là mất *trước khi* có gì để giữ).
- **Executor bị quá tải / `RejectedExecutionException`**: `slideSessionExecutor`
  (`VirtualThreadExecutorConfig.java:21`) là `newVirtualThreadPerTaskExecutor()` — không giới hạn, không
  bao giờ từ chối task.
