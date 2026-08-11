# R8 — Đề kiểm tra & xuất tài liệu

Quét ngày 2026-08-12 trên `main`, đọc tay.

Phạm vi: `be/.../service/practiceexam/`, `service/documentexport/`, controller/DTO/WebSocket adapter
liên quan, `fe/components/dashboard/PracticeExam*`, `fe/components/LessonEditor/usePracticeExamStream.ts`,
`fe/lib/document-export.ts` và client STOMP.

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R8-01 | `PracticeExamCreateDashboard.tsx:271` | Sinh đề bắt đầu trước khi FE subscribe; `PLAN_READY` có thể mất vĩnh viễn | **Cao** | Sửa |
| R8-02 | `StompAuthChannelInterceptor.java:37` | Topic theo session không kiểm chủ sở hữu ở `SUBSCRIBE` | **Cao** | Sửa |
| R8-03 | `PracticeExamService.java:136` | Timeout toàn phiên vẫn phát `DONE`, bỏ lại câu pending không có retry | **Cao** | Sửa |
| R8-04 | `PracticeExamService.java:396` | Không giới hạn số câu/số lô → một request có thể tạo số task AI cực lớn | **Cao** | Sửa |
| R8-05 | `usePracticeExamStream.ts:161` | Reload/rời trang giữa stream làm mất phiên và không thể khôi phục kết quả | TB | Sửa |
| R8-06 | `PracticeExamService.java:159` | Regenerate bypass validation cấu hình và không kiểm order thuộc đề | TB | Sửa |
| R8-07 | `DocumentExportService.java:75` | HTML export cho ảnh URL ngoài đi vào PDF renderer; có nguy cơ SSRF và treo render | **Cao** | Sửa |
| R8-08 | `DocumentExportService.java:66` | Không có giới hạn kích thước HTML/PDF hoặc timeout render | TB | Sửa |

---

## R8-01 — Sinh đề bắt đầu trước khi FE subscribe; `PLAN_READY` có thể mất vĩnh viễn **[Cao]**

`PracticeExamCreateDashboard.generate():271` gọi `POST /generate-stream`, đợi 202, rồi mới lưu
session và chuyển sang `/exam-edit-new` (`:272-277`). BE submit ngay tại
`GeneratePracticeExamStreamUseCase.start():38-46`, còn `PracticeExamService.generateStreaming():106-108`
phát `PLAN_READY` ngay sau validate/load knowledge. Simple broker `/topic` không lưu hay replay event.

**Kịch bản lỗi:** AI chưa cần chạy; chỉ cần validate/load knowledge xong trước khi Next chuyển trang,
WebSocket connect và `SUBSCRIBE` hoàn tất. `PLAN_READY` không có subscriber nên mất. FE vẫn mở skeleton
(`PracticeExamEditDashboard:56`) nhưng `usePracticeExamStream` không có timeout/REST resume; mọi batch
sau đó cũng không có block đích để render. Người dùng phải tạo lại đề, trong khi AI vẫn đã tiêu tốn lượt.

**Sửa:** subscribe và chờ receipt/ack trước khi kickoff, hoặc lưu trạng thái/event stream theo session
và thêm endpoint resume. Không dựa vào topic broadcast như một hàng đợi có replay.

## R8-02 — Topic theo session không kiểm chủ sở hữu ở `SUBSCRIBE` **[Cao]**

`StompAuthChannelInterceptor.preSend():37-54` chỉ parse JWT với `CONNECT`; mọi command khác, gồm
`SUBSCRIBE`, đi qua nguyên trạng. `StompPracticeExamStreamAdapter:54-56` broadcast dữ liệu đề vào
`/topic/practice-exam/{sessionId}`. Không có session registry lưu `userId`, và simple broker không biết
ai tạo topic.

**Kịch bản lỗi:** một Teacher/Moderator đã đăng nhập biết hoặc đoán được `sessionId` (URL/topic hiện
được log phía FE) có thể subscribe trực tiếp tới topic đó, đọc toàn bộ knowledge-derived questions,
đáp án và rubric của người khác. Họ cũng có thể POST cùng `sessionId`, làm hai luồng đan event vào một
topic.

**Sửa:** đăng ký session server-side với chủ sở hữu trước khi chạy; chặn `SUBSCRIBE` nếu principal khác
chủ session, hoặc dùng user destination (`convertAndSendToUser`) thay vì `/topic` broadcast. Reject
sessionId không đúng UUID và sessionId đang active.

## R8-03 — Timeout toàn phiên vẫn phát `DONE`, bỏ lại câu pending không có retry **[Cao]**

Trong `generateStreaming():136-149`, `TimeoutException` chỉ set `cancelled` và cancel futures.
Sau đó code chỉ kiểm `successCount == 0`; nếu ít nhất một batch thành công thì vẫn
`publishDone()` tại `:150-155`. Các task bị cancel khi đang chờ semaphore đi vào nhánh
`InterruptedException` ở `:125-126` mà không phát `BATCH_FAILED`; những task đang bị hủy cũng không
được tổng hợp order thất bại.

**Kịch bản lỗi:** đề có nhiều batch, batch đầu xong, các batch sau hết total timeout. FE nhận một số
`BATCH_READY`, sau đó `DONE`; những block còn lại giữ `pending`. Hook chỉ cài nút retry cho block
`failed` (`usePracticeExamStream.ts:263-293`), nên pending không có cách tự phục hồi và phần đáp án
được dựng từ đề thiếu câu.

**Sửa:** trước `DONE`, phát `BATCH_FAILED` cho tất cả order chưa ready hoặc phát một event terminal
`PARTIAL/ERROR` chứa danh sách incomplete. FE cần reconcile khi terminal event đến và chỉ dựng đáp án
khi mọi stub đã ready hay được đánh dấu failed.

## R8-04 — Không giới hạn số câu/số lô → một request có thể tạo số task AI cực lớn **[Cao]**

`validateStructure():396-410` chỉ bắt tổng số câu khác 0 và tổng điểm 1.000, không đặt maximum cho
`totalQuestionCount`/mỗi `questionCount`, số `lessonRefs`, độ dài `objective` hay số phần tử list.
`buildBatchTasks():271-283` tạo một task mỗi 1–5 câu, sau đó streaming dùng virtual-thread executor
không giới hạn (`GeneratePracticeExamStreamUseCase` dùng `slideSessionExecutor`).

**Kịch bản lỗi:** gọi API trực tiếp với hàng triệu MULTIPLE_CHOICE nhưng giữ tổng điểm 1.000. Validation
chấp nhận; server cố cấp phát hàng trăm nghìn `BatchTask`/future và liên tục đẩy lệnh AI, dẫn tới OOM,
cạn quota hoặc nghẽn executor cho người dùng khác. FE giới hạn input không bảo vệ endpoint.

**Sửa:** đặt upper bound server-side cho tổng câu, mỗi loại, lesson refs, objective/title và số request
đang chạy mỗi user; trả 400/429 trước khi tạo task. Cũng cần validate `grade` thuộc 10–12 và `subject`
thuộc enum được hỗ trợ.

## R8-05 — Reload/rời trang giữa stream làm mất phiên và không thể khôi phục kết quả **[TB]**

`usePracticeExamStream():161-164` đặt `startedRef` rồi xóa sessionStorage ngay khi editor vừa mount.
Khi người dùng reload, đóng tab, hoặc route bị unmount, cleanup chỉ disconnect STOMP (`:252-255`); BE
không biết client đã rời đi và vẫn generate. Lần mở lại không còn `PracticeExamSession`, nên trang hiển
thị đề mặc định thay vì kết quả đang chạy/đã xong.

**Sửa:** giữ session đến terminal event, persist state đủ để resume, hoặc thêm cancel endpoint gắn user
và gọi nó khi người dùng chủ động hủy. Một job detached phải có nơi lấy kết quả sau reconnect.

## R8-06 — Regenerate bypass validation cấu hình và không kiểm order thuộc đề **[TB]**

`regenerateQuestion():159-171` chỉ check `type` nằm trong set. Nó gọi `loadKnowledge()` trực tiếp,
không gọi `validateStructure()` và không xác nhận `order`/`scoreCentiPoints` khớp stub trong session.

**Kịch bản lỗi:** API client gửi `request.knowledgeScope = null` → NPE/500; hoặc gửi order âm/rất lớn,
score âm hay request có cấu hình không hợp lệ nhưng knowledge tồn tại. Server vẫn gọi AI hoặc trả lỗi
nội bộ thay vì 400. Vì session không lưu ở BE, nó cũng không thể biết đây có thật là câu failed của
người gọi.

**Sửa:** validate full request trước regenerate, xác nhận order/score/type với session server-side và
chỉ cho retry một stub failed/pending thuộc chủ session.

## R8-07 — HTML export cho ảnh URL ngoài đi vào PDF renderer; có nguy cơ SSRF và treo render **[Cao]**

`DocumentExportService.exportPdf():75-83` dùng `BlogContentSanitizer`, allow `img src` `http`, `https`
và `data`, rồi truyền HTML sang OpenHTMLtoPDF (`OpenHtmlDocumentPdfRenderer:34-40`) mà không có URI
resolver/allowlist. Renderer có thể resolve resource ảnh từ URL do người dùng đưa vào.

**Kịch bản lỗi:** user export HTML chứa ảnh `http://localhost:...`, IP private, metadata endpoint, hoặc
server ngoài phản hồi cực chậm/stream vô hạn. Backend renderer sẽ chủ động fetch từ mạng của backend;
vừa có rủi ro SSRF vừa giữ worker render cho đến khi thư viện/network timeout.

**Sửa:** chỉ cho asset R2/domain allowlist hoặc data image có kích thước giới hạn; cài URI resolver từ
chối toàn bộ private/IP không allowlist, timeout kết nối/đọc và giới hạn số/tổng byte resource. Nên có
test integration chứng minh renderer không fetch URL cấm.

## R8-08 — Không có giới hạn kích thước HTML/PDF hoặc timeout render **[TB]**

`DocumentExportService` nhận raw HTML không giới hạn, sanitize rồi render đồng bộ (`:75-83`).
`OpenHtmlDocumentPdfRenderer.render()` không áp deadline, giới hạn page/byte hay executor riêng. Một
document với bảng lồng sâu, ảnh base64 lớn hoặc CSS/layout khó có thể chiếm CPU/RAM lâu; FE chỉ disable
nút ở một tab, không bảo vệ API.

**Sửa:** giới hạn request body/HTML và data URI, render bằng executor có timeout + circuit breaker,
giới hạn output bytes/pages và trả lỗi thân thiện; đo/cleanup PDF nếu upload không hoàn tất.

## Kiểm tra nhưng không có vấn đề

- Generate batch có timeout riêng theo loại câu, retry một lần và parse JSON lỗi được đổi thành lỗi nghiệp vụ.
- Nội dung rỗng sau sanitize bị từ chối trước khi render PDF; title được escape khi dựng XHTML và filename
  được slug hóa.
- Lỗi renderer/R2 được chuyển thành `DocumentExportException` và controller trả 502 có message cho FE.
- Nút tạo đề và nút export trên FE có pending state, nên double-click happy path được chặn.
