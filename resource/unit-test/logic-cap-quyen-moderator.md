# Các case cấp quyền Moderator

Phạm vi: chỉ `ADMINISTRATOR` được quản lý Moderator. Mỗi môn (`MATH`, `PHYSICS`, `CHEMISTRY`) chỉ có một Moderator chưa bị vô hiệu hóa.

## 1. Cấp Moderator mới

| Case | Điều kiện | Kết quả dự kiến |
|---|---|---|
| Cấp mới thành công | Email chưa tồn tại, môn chưa có Moderator | Tạo tài khoản `INVITED`, role `MODERATOR` |
| Email viết hoa/kèm khoảng trắng | Email có thể chuẩn hóa | Chuẩn hóa rồi xử lý như email bình thường |
| Có tên hiển thị | `fullName` được gửi | Lưu tên hiển thị |
| Không có tên hiển thị | Không gửi `fullName` | Vẫn tạo tài khoản, tên để trống |
| Môn đã có Moderator | Có Moderator chưa bị `DISABLED` trong cùng môn | Từ chối cấp mới |
| Email đã tồn tại và đang dùng | Tài khoản có trạng thái khác `DISABLED` | Từ chối vì email đã tồn tại |
| Email cũ bị khóa | Tài khoản `DISABLED`, môn chưa có Moderator active | Cấp lại: chuyển thành `INVITED`, gán `MODERATOR` |
| Môn không hợp lệ | Không thuộc enum môn học | Từ chối request |
| Không có quyền Admin | Token không có `ADMINISTRATOR` | Từ chối `403` |

## 2. Đăng nhập sau khi được cấp quyền

| Case | Điều kiện | Kết quả dự kiến |
|---|---|---|
| Đăng nhập lần đầu | Google xác minh đúng email đang `INVITED` | Chuyển thành `ACTIVE`, phát token Moderator |
| Đăng nhập lại | Tài khoản đã `ACTIVE` | Cho phép và phát token theo role hiện tại |
| Chưa được cấp quyền | Email không có trong hệ thống | Từ chối đăng nhập |
| Google email chưa xác minh | Google trả email chưa verified | Từ chối đăng nhập |
| Tài khoản bị khóa | Trạng thái `DISABLED` | Từ chối đăng nhập/refresh token |
| Đăng nhập sai email | Google trả email khác email đã cấp | Từ chối vì email chưa được cấp quyền |

## 3. Thay Moderator

| Case | Điều kiện | Kết quả dự kiến |
|---|---|---|
| Thay thành công, giữ tài khoản cũ | Người thay thế khác email, cùng môn | Người mới thành `MODERATOR`; người cũ hạ thành `TEACHER` |
| Thay thành công, khóa tài khoản cũ | Như trên và `disablePrevious = true` | Người cũ thành `TEACHER` + `DISABLED` |
| Email thay thế trùng email cũ | Cùng một email | Từ chối |
| Người thay thế khác môn | Tài khoản đã có subject khác | Từ chối |
| Moderator hiện tại không tồn tại | ID không tìm thấy | Trả không tìm thấy |
| Moderator hiện tại đã bị khóa | `DISABLED` | Không thể dùng làm Moderator cần thay thế |
| Người thay thế đang là Moderator active | Có Moderator active ở môn đó | Từ chối |
| Thay thế bằng tài khoản cũ bị khóa | Tài khoản cùng môn, `DISABLED` | Kích hoạt lại thành `INVITED`, rồi gán `MODERATOR` |

## 4. Thu hồi và kích hoạt lại

| Case | Điều kiện | Kết quả dự kiến |
|---|---|---|
| Xóa Moderator độc lập | Gọi `DELETE /moderators/{id}` | Luôn từ chối; phải thay thế trước |
| Kích hoạt lại thành công | Tài khoản `DISABLED` vẫn có role `MODERATOR`, môn chưa có Moderator active | Chuyển thành `INVITED` |
| Kích hoạt lại khi môn đã có Moderator | Có Moderator active cùng môn | Từ chối |
| Kích hoạt lại tài khoản không bị khóa | Status khác `DISABLED` | Trả không tìm thấy/không hợp lệ |
| Kích hoạt lại tài khoản không còn role Moderator | Chỉ còn role khác, ví dụ `TEACHER` | Trả không tìm thấy/không hợp lệ |

## 5. Case dữ liệu cần lưu ý

| Case | Hệ quả |
|---|---|
| `DISABLED` nhưng vẫn role `MODERATOR` | Vẫn xuất hiện trong danh sách Moderator; không đăng nhập được; có thể thử kích hoạt lại |
| `DISABLED` sau luồng thay thế chuẩn | Theo logic hiện tại tài khoản cũ sẽ mang role `TEACHER`, nên không nên xuất hiện trong danh sách Moderator |
| Có nhiều Moderator active cùng môn | Vi phạm rule nghiệp vụ; cần kiểm tra dữ liệu hoặc thao tác trực tiếp DB |
| Không có thông tin người vô hiệu hóa | API hiện chưa có audit log đầy đủ, khó truy nguyên nguyên nhân khóa tài khoản |
