# R10 — Thông báo / Activity Log / Statistics

Quét ngày 2026-08-12 trên `main`, đọc tay.

Phạm vi: `be/.../service/notification/`, `service/activitylog/`, `service/statistics/`, các controller/repository/adapter liên quan, `fe/app/notifications/` và `fe/app/statistics/`.

## Tổng hợp

| # | File:line | Vấn đề | Mức | Xử lý |
| --- | --- | --- | --- | --- |
| R10-01 | `NotificationService.java:64-68,136-140` | Broadcast lấy cả tài khoản `DISABLED` | **Cao** | Sửa |
| R10-02 | `NotificationService.java:78,100,119,150` | Đẩy WebSocket trước khi transaction commit, làm mất thông báo realtime | **Cao** | Sửa |
| R10-03 | `ActivityLogEntity.java:40`, `LibraryContentService.java:70-80` | Metadata log bị giới hạn 1.000 ký tự nhưng lý do từ chối không giới hạn; lỗi log khiến nghiệp vụ đã lưu dở dang | **Cao** | Sửa |
| R10-04 | `PrincipalStatisticsService.java:78-97` | Khoảng tuần thống kê không có giới hạn, có thể cấp phát hàng trăm nghìn bucket | **Cao** | Sửa |
| R10-05 | `NotificationController.java:50-54`, `ActivityLogController.java:39-47` | Phân trang nhận `page`/`size` không kiểm tra biên và không có trần | TB | Sửa |
| R10-06 | `fe/app/notifications/page.tsx:70-72` | UI chỉ nạp 50 thông báo mới nhất, bỏ qua `total` và không có phân trang | TB | Sửa |
| R10-07 | `fe/app/notifications/page.tsx:67-91` | Nhiều lần tải song song có thể ghi đè dữ liệu mới bằng response cũ | TB | Sửa |

---

## R10-01 — Broadcast lấy cả tài khoản `DISABLED` **[Cao]**

`NotificationService.create()` và `notifyRoleSubject()` gọi `findAllByRoleAndSubject()` với
`Pageable.unpaged()`. Query bên dưới tại `AppUserJpaRepository:22-23` chỉ lọc role và subject,
không lọc trạng thái user, dù service mô tả đây là thông báo cho user active.

**Kịch bản lỗi:** Principal vô hiệu hóa một giáo viên, nhưng Moderator vẫn broadcast đến subject đó.
Một dòng `notification_recipients` mới và event STOMP vẫn được tạo cho tài khoản không còn được phép
hoạt động. Dữ liệu inbox của account bị vô hiệu hóa tiếp tục tăng; nếu luồng xác thực/token chưa bị thu
hồi ngay, tài khoản đó còn có thể nhận được nội dung nghiệp vụ mới.

**Sửa:** thêm repository method/query chỉ lấy `status = ACTIVE` (hoặc policy trạng thái nhận thông báo
được thống nhất), rồi dùng nó cho toàn bộ fan-out. Với `notifyRecipient`, kiểm tra người nhận còn hợp lệ
trước khi ghi; đồng thời dọn recipient của account khi disable/hard-delete theo chính sách lưu trữ.

## R10-02 — Đẩy WebSocket trước khi transaction commit **[Cao]**

Tất cả đường tạo notification đều gọi `streamPort.publishNew()` ngay trong method `@Transactional`.
Adapter STOMP (`StompNotificationStreamAdapter:22-24`) gửi event ngay lập tức, không đợi commit.
Frontend nhận event tại `notifications/page.tsx:88-91` rồi gọi lại API danh sách một lần.

**Kịch bản lỗi:** event tới client trước khi transaction notification commit. Lần `GET /api/notifications`
do frontend kích hoạt chưa thấy dòng recipient mới, sau đó transaction mới commit nhưng không có event
thứ hai để reload. Badge/list không đổi cho tới khi người dùng tự refresh hay có event kế tiếp. Nếu phần
cuối transaction lỗi, client còn nhận event cho notification không tồn tại.

**Sửa:** phát event sau commit, ví dụ domain event + `@TransactionalEventListener(phase = AFTER_COMMIT)`,
hoặc outbox có worker publish. Không publish side effect mạng trong transaction ghi DB.

## R10-03 — Metadata log quá dài làm nghiệp vụ đã lưu trả lỗi và thiếu notification **[Cao]**

`ActivityLogEntity.metadata` là `VARCHAR(1000)`, nhưng cả DTO và service từ chối Community Hub chỉ kiểm
tra lý do không rỗng. `LibraryContentService.reject()` lưu content `REJECTED` trước, sau đó ghi nguyên
`rawReason.trim()` vào activity log và mới gửi notification. Service này không có transaction bao ngoài;
repository save và `ActivityLogService.record()` là các transaction riêng.

**Kịch bản lỗi:** Moderator gửi lý do 1.001 ký tự. Nội dung Community Hub đã bị chuyển sang `REJECTED`,
nhưng INSERT audit log lỗi do quá dài, API trả lỗi và notification cho giáo viên không được gọi. Người dùng
thấy request thất bại rồi retry có thể gặp trạng thái không còn `SUBMITTED`; audit trail cũng thiếu.
`WeeklyTaskService.reject():331-346` có cùng input không giới hạn (ở đây transaction bao ngoài làm rollback,
nhưng vẫn trả 500 thay vì lỗi input rõ ràng).

**Sửa:** đặt `@NotBlank`/`@Size(max = ...)` tại request và enforce ở service theo một hằng số dùng chung;
hoặc giữ reason đầy đủ ở entity nghiệp vụ nhưng truncate/serialize metadata có chủ đích. Bao các thay đổi
cần nguyên tử trong transaction; quyết định rõ audit-log failure phải rollback nghiệp vụ hay được xử lý
qua outbox, không để partial success trả 500.

## R10-04 — Khoảng tuần thống kê không có giới hạn **[Cao]**

`weeklyTaskStatus()` chỉ từ chối `from > to`. Nó dùng trọn khoảng người gọi đưa vào cho query và tạo một
`WeeklyTaskStatusBucket` cho từng tuần bằng `datesUntil(...).toList()`. Controller không áp dụng giới hạn
nào cho hai `LocalDate` này.

**Kịch bản lỗi:** Principal gọi API với khoảng nhiều nghìn năm. Service tạo hàng trăm nghìn object trong
memory, trả response rất lớn và ép PostgreSQL quét/group theo khoảng tương ứng. Một request hợp lệ từ
tài khoản có quyền có thể làm chậm service hoặc gây OOM; với `LocalDate` cận trên còn có thể overflow ở
`resolvedTo.plusWeeks(1)` và trả 500.

**Sửa:** định nghĩa giới hạn nghiệp vụ (ví dụ tối đa 52/104 tuần), validate trước query và trả 400; dùng
range/aggregate theo tháng cho báo cáo dài. UI nên chỉ gửi khoảng giới hạn đó.

## R10-05 — Phân trang không kiểm tra biên hoặc giới hạn kích thước **[TB]**

Hai controller chuyển thẳng `page` và `size` vào `PageRequest.of()`. Giá trị âm/zero ném
`IllegalArgumentException` thành 500; `size` cực lớn buộc query và mapping nạp quá nhiều item. Activity
log còn thực hiện thêm batch lookup tên actor sau khi nạp trang.

**Sửa:** validate `page >= 0`, `size > 0`, giới hạn cứng (chẳng hạn 100), và trả `400 Bad Request` với
thông báo rõ ràng. Có thể dùng DTO/query parameter validation thống nhất cho các list endpoint.

## R10-06 — UI không thể xem notification cũ hơn 50 bản ghi **[TB]**

Frontend luôn gọi `listNotifications(..., { size: 50 })` và chỉ render `data.items`; response có `total`
nhưng không được dùng để tạo nút tải thêm/trang kế. Sau khi inbox có hơn 50 notification, các bản ghi cũ
không còn đường truy cập trên giao diện, kể cả khi chúng chưa đọc.

**Sửa:** bổ sung phân trang hoặc "tải thêm" dựa trên `page`, `size`, `total`; reset trang khi đổi filter
và vẫn hiển thị badge `unreadCount` tổng.

## R10-07 — Race condition khi tải inbox **[TB]**

`load()` có thể chạy đồng thời khi đổi filter, retry, gửi broadcast và nhận event STOMP. Không có
`AbortController`, request sequence, hoặc cờ hủy khi effect cleanup; mọi response đều gọi `setItems` và
`setUnreadCount`.

**Kịch bản lỗi:** người dùng bật "chưa đọc" trong khi request full inbox cũ còn chờ. Request mới hoàn tất
trước, rồi response cũ về sau ghi lại toàn bộ inbox và unread count cũ dù toggle đang bật. Tương tự, event
đến sát lúc người dùng đánh dấu đã đọc có thể đảo ngược optimistic state.

**Sửa:** hủy request cũ hoặc lưu `requestId` và chỉ áp dụng response mới nhất; serialize/debounce reload từ
STOMP, và reconcile thao tác đánh dấu đọc bằng response/server state.

## Kiểm tra nhưng không có vấn đề

- Notification recipient có unique constraint `(notification_id, recipient_id)` và các API `markRead`/
  `markAllRead` luôn scope theo recipient hiện tại.
- Query thống kê Community Hub/content đã dùng repository count loại bản ghi soft-deleted; `aiContentTrend`
  đã clamp khoảng tháng vào 1–24.
- Activity Log controller được giới hạn cho `IT_STAFF`; statistics controller tách quyền Principal và
  Moderator.
