# Quy trình lập ma trận Unit Test

Tài liệu này là quy trình dùng chung để lập Unit Test matrix trong workbook `Report5.1_Unit Test_logic.xlsx`. Nó không phụ thuộc vào một class, method, module hoặc nghiệp vụ cụ thể nào. Mỗi sheet method phải cho phép người đọc trả lời được bốn câu hỏi: **trạng thái ban đầu là gì, input cụ thể là gì, kết quả mong đợi là gì, và UTC nào kiểm tra điều đó**.

Phạm vi mặc định là service-level unit test. Nếu sheet kiểm thử controller, API, UI hoặc integration, phải ghi rõ phạm vi vì input, precondition và expected result sẽ khác.

## 1. Thu thập thông tin từ code

Với mỗi method, đọc theo thứ tự sau:

1. **Caller**: controller, job, event listener hoặc service gọi method. Lấy input thực sự truyền vào method.
2. **Method được test**: đọc từ đầu đến cuối; đánh dấu normalize/validation, các điều kiện `if`, mọi `return`, mọi `throw` và các side effect.
3. **Model và rule nghiệp vụ**: enum, state/status, role, ownership, relationship, giới hạn số lượng, validation annotation và domain exception.
4. **Repository/gateway/client khi cần**: đọc contract để hiểu chính xác ý nghĩa của `find`, `exists`, `save`, request external service, không đoán từ tên method.
5. **Test có sẵn**: dùng để đối chiếu code hiện tại; không coi là nguồn sự thật nếu test đã cũ.

Tạo bảng nháp trước khi mở Excel:

| Nhóm thông tin | Câu hỏi cần trả lời | Vị trí trong matrix |
|---|---|---|
| Input | Caller truyền tham số nào vào method? | `Input value` |
| Precondition | Trước khi gọi cần có dữ liệu, quyền, trạng thái hoặc cấu hình gì? | `Precondition` |
| Success outcome | Method trả gì và state nghiệp vụ thay đổi thế nào? | `Return value` |
| Failure outcome | Nhánh nào ném exception và lý do là gì? | `Exception` |

Biến nội bộ service như giá trị đã normalize, timestamp hiện tại, ID được tạo trong code hoặc biến trung gian **không phải input**. Chỉ đưa chúng vào expected result nếu chính hành vi đó cần được kiểm tra.

## 2. Suy ra danh sách UTC

Liệt kê các điểm rẽ nhánh của method rồi lập tối thiểu một UTC cho mỗi kết quả khác nhau:

- Validation/chuyển đổi input: null, blank, trim, case conversion, parse, enum, format, min/max.
- Authorization: caller có/không có quyền hoặc ownership cần thiết.
- State dữ liệu: bản ghi có/chưa có, status hợp lệ/không hợp lệ, relationship phù hợp/không phù hợp.
- Rule nghiệp vụ: giới hạn số lượng, trùng lặp, conflict, thời hạn, thứ tự xử lý.
- Success branch: tạo mới, cập nhật, xóa, chuyển trạng thái, không thay đổi.
- Failure branch: từng `throw`, `orElseThrow`, validation error hoặc dependency error được xử lý.
- Boundary: giới hạn trên/dưới, phần tử đầu/cuối, collection rỗng, ngày giờ biên.

Không tạo UTC theo số lời gọi repository. Tạo UTC theo **hành vi và kết quả nghiệp vụ khác nhau**. Một UTC có thể dùng nhiều precondition, nhưng chỉ có một tổ hợp input/state dẫn đến expected result cụ thể.

## 3. Điền sheet method/function

Mỗi sheet là một method. Cột UTC (thường từ cột `F`) là các test case; cột mô tả bên trái tạo thành ma trận. Dấu `O` cho biết một điều kiện, input, return hoặc exception áp dụng cho UTC nào.

### 3.1 Thông tin đầu sheet

| Trường | Cách điền |
|---|---|
| Code Module | Tên class/module chứa method. |
| Method | Tên method được test. |
| Created By | Người tạo test case. |
| Executed By | Chỉ điền khi đã chạy test. |
| Test requirement | Một câu mô tả yêu cầu nghiệp vụ cần kiểm tra. |
| UTC ID | Mã duy nhất, nhất quán với quy ước dự án. |

Không đổi `Passed`, `Failed`, `Untested`, `Executed Date` chỉ vì đã viết tài liệu. Chúng phản ánh việc thực thi test.

### 3.2 Condition → Precondition

`Precondition` là trạng thái tồn tại trước khi gọi function. Nó không phải tham số truyền vào và không phải cách mock framework hoạt động.

Các dạng precondition phổ biến:

- Caller có role/quyền/ownership cần thiết.
- Bản ghi liên quan có hoặc không có trong hệ thống.
- State/status/role hiện tại của entity.
- Quan hệ giữa entity: cùng owner, khác owner, đúng/sai category, quantity đã đạt giới hạn.
- Môi trường đầu vào: file tồn tại, token hợp lệ, feature flag bật, thời điểm nằm trong khoảng cho phép.

Ghi precondition chung một lần rồi đánh dấu `O` ở mọi UTC áp dụng. Nếu state thay đổi theo case, tạo từng hàng riêng và đặt `O` chính xác cho các UTC cần state đó.

Ví dụ trung tính:

| Precondition | UTC-01 | UTC-02 | UTC-03 |
|---|:---:|:---:|:---:|
| Caller has the required permission. | O | O | O |
| No matching record exists. | O | O | |
| A matching record exists with inactive status. | | | O |

Trong source JUnit/Mockito có thể mock repository/provider/client để tạo state này. Trong Excel, mô tả **business state** (`No matching record exists`) thay vì mô tả kỹ thuật (`repository.find... returns empty`).

### 3.3 Condition → Input value

Theo tab `Example`, dùng hai hàng liên tiếp:

1. **Tên nhóm điều kiện kiểm thử hoặc mô tả loại input**.
2. **Giá trị input cụ thể** dùng để tái lập test.

Ví dụ:

| Nhóm điều kiện | Input value | UTC |
|---|---|---|
| Valid value in the normal range | `quantity=10; category="STANDARD"` | UTC-01 |
| Value with leading/trailing whitespace | `name=" Sample "` | UTC-02 |
| Value outside the allowed enum | `category="UNKNOWN"` | UTC-03 |

Đặt `O` ở **hàng có giá trị input cụ thể**, như tab `Example`. Input phải là tham số thực của method/request và ghi đủ giá trị cần thiết để chạy lại case. Không biến input thành precondition, và không ghi mock setup trong vùng này.

### 3.4 Confirm → Return → Return value

`Return value` chỉ ghi kết quả nghiệp vụ mong đợi của nhánh thành công:

- Giá trị/object trả về có ý nghĩa.
- Field cần kiểm tra sau normalize hoặc mapping.
- Entity được tạo/cập nhật/xóa hoặc state được chuyển.
- Side effect nghiệp vụ quan trọng, nếu là một phần yêu cầu.

Ví dụ:

> Returns the created record with status=PENDING and normalized name="sample". The record is linked to the requesting user.

Không ghi `verify(...)`, `when(...)`, tên repository/provider hay cú pháp mock framework trong `Return value`.

### 3.5 Confirm → Exception

Mỗi kết quả lỗi khác nhau cần một dòng exception. Ghi tên exception theo code và lý do nghiệp vụ ngắn gọn.

Ví dụ:

- `ResourceNotFoundException: the requested record does not exist.`
- `DuplicateResourceException: a record with this key already exists.`
- `ForbiddenOperationException: the caller cannot update this record.`
- `IllegalArgumentException: the supplied category is invalid.`

Không đưa `verifyNoInteractions`, mock return value hoặc chi tiết dependency vào ô Exception.

### 3.6 Result

- `N`: normal case.
- `A`: abnormal/invalid case.
- `B`: boundary case.
- `Passed/Failed`: chỉ cập nhật sau khi test chạy.
- `Executed Date`: chỉ điền khi test đã thực thi.
- `Defect ID`: điền mã defect khi failure được theo dõi như một bug.

## 4. Chuyển từ matrix sang JUnit/Mockito

Matrix mô tả **what**: state, input, expected outcome. JUnit/Mockito mô tả **how** tạo state đó và verify code chạy đúng.

Với mỗi UTC, source test thường có cấu trúc:

1. Arrange: tạo input và stub dependency để đáp ứng precondition.
2. Act: gọi method một lần.
3. Assert: kiểm tra return value hoặc exception.
4. Verify: kiểm tra side effect/dependency interaction khi cần.

Nếu một precondition không thể tạo bằng unit mock mà cần database, external service hoặc transaction thực, hãy ghi rõ đó là integration test hoặc điều chỉnh phạm vi test.

## 5. MethodList

Mỗi method có một dòng trong `MethodList`.

| Cột | Cách điền |
|---|---|
| No. | Số thứ tự liên tục. |
| Code Module | Class/module chứa method. |
| Method | Tên method. |
| Sheet/Function link | Tên hoặc hyperlink đến sheet matrix tương ứng. |
| Test requirement | Tóm tắt requirement được test. |
| Test environment setup description | Framework, runtime, test DB/mock strategy hoặc điều kiện chạy chung. |

Khi thêm method mới: tạo sheet trước, đặt tên sheet, tạo hyperlink từ `MethodList`, sau đó kiểm tra link. Không dùng lại UTC ID của sheet khác.

## 6. Statistics

`Statistics` tổng hợp kết quả từ từng sheet method. Khi tạo/sửa matrix, kiểm tra:

- Tên method khớp `MethodList`, tên sheet và dòng `Statistics`.
- Tổng `Normal`, `Abnormal`, `Boundary` bằng số UTC thực tế của sheet.
- `Passed + Failed + Untested` bằng `Total Test Cases` theo quy tắc template.
- Dòng subtotal/grand total bao gồm method mới.
- Công thức tổng vẫn đúng sau khi chèn thêm sheet hoặc dòng; template có thể không tự mở rộng phạm vi `SUM`.

## 7. Checklist hoàn tất

1. Đã xác định phạm vi test: service, controller, API, UI hoặc integration.
2. Mọi nhánh/exception nghiệp vụ quan trọng của code có UTC tương ứng hoặc có lý do không test riêng.
3. Mỗi UTC có input cụ thể và một expected outcome rõ ràng.
4. Precondition mô tả state nghiệp vụ trước khi gọi, không mô tả cú pháp mock.
5. Input `O` nằm ở hàng giá trị cụ thể; các `O` khác nằm đúng hàng state/outcome tương ứng.
6. Return/Exception phản ánh code hiện tại và không chứa thao tác Mockito/JUnit.
7. MethodList, Statistics, số UTC và công thức tổng nhất quán.
8. Sau khi chạy test, cập nhật Passed/Failed/Untested, ngày thực thi và defect ID.

## 8. Khi code và tài liệu mâu thuẫn

Không chỉnh ma trận để che mâu thuẫn. Lập ghi chú gồm:

- Method/file và nhánh code hiện tại.
- Hành vi code đang thực hiện.
- Requirement/tài liệu đang mong đợi.
- UTC bị ảnh hưởng.
- Quyết định cần thiết: sửa code, sửa requirement, hay sửa test case.

Chỉ cập nhật expected result sau khi đã xác định nguồn sự thật được nhóm chấp thuận.
