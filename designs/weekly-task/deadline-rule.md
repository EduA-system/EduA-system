# Weekly Task Deadline Rule (đề xuất bổ sung SRS)

Trạng thái: **Đề xuất mới** — chưa có trong `Report3_Software Requirement Specification v1.2.docx` và chưa có trong code (`WeeklyTaskService.java` hiện chỉ validate `deadline > now()`, không ràng buộc gì với `weekStartDate`). Tài liệu này mô tả rule để bổ sung như một Business Rule mới (đặt tên tạm `BR-50`, nối tiếp `BR-49` cuối SRS hiện tại) và các UC bị ảnh hưởng.

## 1. Phát biểu rule

> **Muốn dạy bài của tuần A thì giáo án phải được nộp (Submit) xong trước Chủ Nhật của tuần A-1 (tuần liền trước tuần A).**

Nói cách khác: hạn nộp (`deadline`) của một Weekly Task cho tuần dạy A luôn là **23:59:59 Chủ Nhật của tuần ngay trước tuần A** — không phải một giá trị tự do do mod nhập tay như hiện tại.

## 2. Công thức

```
deadline(A) = ngày Chủ Nhật liền trước weekStartDate(A), lúc 23:59:59 (giờ VN, UTC+7)
```

Nếu tuần dạy quy ước bắt đầu vào **Thứ Hai** (ISO week, `weekStartDate` = Monday):

```
deadline(A) = weekStartDate(A) - 1 ngày, 23:59:59
```

## 3. Vướng mắc cần chốt trước khi implement

### 3.1 `weekStartDate` hiện tại không phải lúc nào cũng là Thứ Hai

FE đang quy ước 4 "tuần" cố định trong tháng là ngày **1 / 8 / 15 / 22** (`monthWeekStarts`, `fe/app/weekly-schedule/page.tsx:56-59`) — đây là chia đều theo ngày dương lịch, **không neo theo Thứ Hai thực tế**. Ví dụ tháng có ngày 1 rơi vào Thứ Năm thì "tuần" đó không phải tuần lịch chuẩn (Mon–Sun).

→ Công thức "Chủ Nhật liền trước" chỉ có nghĩa rõ ràng nếu `weekStartDate` được đổi sang **neo theo Thứ Hai của tuần ISO thực tế** thay vì 1/8/15/22 cố định. Đây là điều kiện tiên quyết, không chỉ là chi tiết cài đặt — nếu giữ nguyên quy ước 1/8/15/22 thì phải định nghĩa lại "Chủ Nhật liền trước" là gì cho một tuần bắt đầu ngày 15 chẳng hạn.

**Khuyến nghị:** chuyển `weekStartDate` sang luôn là Thứ Hai (ISO week start) khi tạo Weekly Task, thay cho quy ước 1/8/15/22 hiện tại của FE.

### 3.2 Mod có còn được tự chỉnh deadline không?

Hai lựa chọn:
- **(a) Deadline hoàn toàn tự tính**, mod không sửa được — đơn giản, nhất quán, nhưng cứng nhắc nếu trường có ngoại lệ (ví dụ tuần đầu năm học không có "tuần A-1" hợp lệ để nộp trước).
- **(b) Deadline tự tính làm giá trị mặc định (prefill), mod vẫn sửa được** trong lúc tạo/sửa task — giữ được linh hoạt như hiện tại, nhưng vẫn cần một rule validate (ví dụ: cảnh báo nếu mod chọn deadline sau Chủ Nhật tuần A-1).

Vì SRS hiện tại (BR-47, UC-81/82) đã xác lập nguyên tắc "mod tự set deadline", đề xuất chọn **(b)**: tự tính làm mặc định + cho sửa, để không phá vỡ luồng nghiệp vụ đã duyệt trước đó, trừ khi người dùng xác nhận muốn khóa cứng theo (a).

### 3.3 Tuần đầu tiên của học kỳ/năm học

Tuần A đầu tiên không có "tuần A-1" nào có Weekly Task trước đó. Cần một rule riêng cho trường hợp này — ví dụ: nếu A là tuần dạy đầu tiên (không có tuần liền trước cùng subject), mod được phép set deadline tự do như UC-81 hiện tại (không áp công thức).

### 3.4 Tương tác với nghỉ lễ / dời lịch (đã bàn trước đó, chưa có trong SRS)

Nếu sau này bổ sung cơ chế loại trừ tuần nghỉ hoặc "shift" lịch (xem thảo luận trước, cũng chưa có trong SRS/code) thì công thức ở mục 2 phải tính trên **tuần dạy thực tế liền trước** (sau khi đã loại nghỉ), không phải tuần theo lịch dương thuần túy — nếu không, deadline sẽ rơi vào đúng tuần nghỉ.

## 4. Business Rule đề xuất (định dạng giống SRS)

**BR-50 (đề xuất):** Hạn nộp của một Weekly Task cho tuần dạy A được tính là 23:59:59 Chủ Nhật của tuần liền trước tuần A (`weekStartDate(A) − 1 ngày`). Hệ thống dùng giá trị này làm mặc định khi mod tạo/sửa task; mod có thể điều chỉnh nhưng hệ thống cảnh báo nếu deadline được chọn sau mốc này. Quy tắc không áp dụng cho Weekly Task của tuần dạy đầu tiên trong một subject, khi không tồn tại tuần liền trước để tham chiếu.

## 5. UC bị ảnh hưởng

- **UC-81 (Create Weekly Task):** thêm bước hệ thống tính và hiển thị deadline mặc định theo BR-50 trước khi mod xác nhận; giữ khả năng mod tự sửa.
- **UC-82 (Edit Weekly Task):** khi đổi `weekStartDate`, hệ thống phải tính lại deadline mặc định theo tuần mới.
- **Bulk create (UC-81 bulk):** áp cùng công thức cho toàn bộ lesson trong 1 lần tạo, vì tất cả cùng chung `weekStartDate`.

## 6. Việc chưa quyết định (cần xác nhận với người yêu cầu trước khi code)

1. Chuyển `weekStartDate` sang neo Thứ Hai ISO thay vì 1/8/15/22 — có đồng ý đổi quy ước hiển thị lịch hiện tại của FE không?
2. Chọn phương án (a) khóa cứng hay (b) mặc định + cho sửa.
3. Cách xử lý tuần dạy đầu tiên (không có tuần A-1).
4. Rule này có tính luôn cho trường hợp "shift lịch vì nghỉ" hay để riêng cho một thiết kế sau?
