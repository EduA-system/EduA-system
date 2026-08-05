# Ma trận vấn đề nghiệp vụ: quản lý học sinh trong lớp

Ngày cập nhật: 2026-08-04  
Phạm vi: thêm học sinh, gỡ học sinh khỏi lớp và thêm lại học sinh vào lớp.

## Mục đích tài liệu

Tài liệu này giúp giáo viên, quản lý nhà trường và đội dự án hiểu rõ điều gì xảy ra với học sinh, lớp học và dữ liệu học tập khi thực hiện các thao tác quản lý thành viên lớp. Các vấn đề được trình bày theo tác động nghiệp vụ, không theo cách hệ thống được lập trình.

## Quy ước đang áp dụng

- **Học sinh chưa đăng nhập**: tài khoản đã được tạo/invite nhưng học sinh chưa sử dụng hệ thống.
- **Học sinh đang hoạt động**: học sinh đã đăng nhập và đang sử dụng hệ thống.
- **Gỡ khỏi lớp**: chỉ bỏ học sinh ra khỏi một lớp cụ thể do giáo viên chủ lớp thực hiện; không phải xóa tài khoản học sinh khỏi hệ thống.
- **Thêm lại vào lớp**: đưa lại chính học sinh đó vào lớp đã từng bị gỡ.

## Kết luận nghiệp vụ hiện tại

Khi giáo viên gỡ một học sinh khỏi lớp, hệ thống chỉ ảnh hưởng đến **lớp đang được quản lý**:

| Nhóm học sinh | Kết quả khi giáo viên gỡ khỏi lớp A |
|---|---|
| Chưa đăng nhập | Không bị xóa tài khoản. Chỉ không còn trong lớp A; vẫn còn ở các lớp khác nếu đã được thêm. |
| Đang hoạt động | Không còn trong lớp A và nhận thông báo kèm lý do xóa. Tài khoản, thông tin cá nhân và các lớp khác vẫn giữ nguyên. |
| Tài khoản bị khóa | Không còn trong lớp A; không thể được thêm lại cho đến khi quản trị mở khóa tài khoản. |

## Ma trận vấn đề cần quản lý

| Mã | Tình huống nghiệp vụ | Ảnh hưởng đối với lớp và học sinh | Mức độ ưu tiên | Đề xuất BA / quyết định cần chốt |
|---|---|---|---|---|
| BA-01 | **Gỡ học sinh chưa đăng nhập khỏi một lớp.** | Sau thay đổi hiện tại, học sinh chỉ bị gỡ khỏi lớp mà giáo viên đang quản lý. Tài khoản và việc có mặt ở các lớp khác được giữ nguyên. Điều này tránh việc một giáo viên vô tình ảnh hưởng đến lớp của giáo viên khác. | Đã xử lý | Giữ nguyên quy tắc này. Trên giao diện nên dùng nút/nhãn “Gỡ khỏi lớp” thay cho “Xóa học sinh” để tránh hiểu là xóa toàn bộ tài khoản. |
| BA-02 | **Học sinh đang hoạt động bị gỡ rồi được thêm lại vào cùng lớp.** | Học sinh có thể vào lại lớp và xem các tài nguyên của lớp. Bài đã nộp trước thời điểm bị gỡ có thể xuất hiện trở lại. Điều này có thể gây tranh cãi nếu việc gỡ học sinh được dùng như một hình thức loại khỏi đợt đánh giá. | Cao | Nhà trường cần chọn một trong hai chính sách: (1) thêm lại là khôi phục toàn bộ quá trình học và bài nộp cũ; hoặc (2) thêm lại là một lần tham gia mới, không dùng lại bài nộp cũ. Cần chốt trước khi mở rộng chức năng. |
| BA-03 | **Không có lịch sử học sinh rời lớp.** | Sau khi gỡ, giáo viên không có danh sách rõ ràng về học sinh đã rời lớp, thời điểm rời, người thực hiện và lý do. Điều này khó xử lý khi có khiếu nại về sĩ số, điểm hoặc quyền truy cập. | Cao | Bổ sung lịch sử thành viên lớp: ngày vào lớp, ngày rời lớp, người gỡ và lý do. Danh sách học sinh hiện tại chỉ hiển thị người đang còn trong lớp. |
| BA-04 | **Giáo viên có thể gỡ học sinh khi lớp đã ngừng hoạt động.** | Sĩ số và quyền truy cập của học sinh vẫn thay đổi dù lớp được hiểu là đã đóng/chỉ xem. Học sinh đang hoạt động còn có thể nhận thông báo bị gỡ. | Trung bình - cao | Chốt quy định: lớp ngừng hoạt động có được phép thay đổi danh sách hay không. Nếu không, khóa thao tác gỡ; nếu có, cần hiển thị cảnh báo và lưu lý do thay đổi. |
| BA-05 | **Lớp gần đủ 60 học sinh, nhiều giáo viên/thao tác thêm diễn ra cùng lúc.** | Lớp có nguy cơ vượt sĩ số tối đa hoặc người dùng nhận thông báo kết quả không nhất quán. | Trung bình | Thống nhất cách xử lý khi lớp còn ít chỗ: hệ thống cần xác nhận chỗ trống tại thời điểm thêm cuối cùng và báo rõ ai được thêm thành công. |
| BA-06 | **Thông báo thêm/gỡ được gửi ngay trong lúc xử lý.** | Trong trường hợp thao tác cuối cùng không hoàn tất, học sinh có thể nhận thông báo “đã được thêm” hoặc “đã bị gỡ” nhưng danh sách lớp không thay đổi. | Trung bình | Chỉ gửi thông báo sau khi hệ thống xác nhận thao tác đã hoàn tất. Giao diện học sinh nên ưu tiên trạng thái danh sách lớp thực tế. |
| BA-07 | **Giáo viên nhập thông tin khác với hồ sơ đã có của học sinh khi thêm lại.** | Giáo viên có thể nghĩ mình đã cập nhật tên, số điện thoại hoặc ngày sinh, nhưng hệ thống tiếp tục dùng hồ sơ cũ của học sinh. Điều này gây nhầm lẫn về danh tính và liên hệ phụ huynh. | Trung bình | Khi phát hiện email đã tồn tại, hiển thị rõ thông tin hồ sơ hiện có để giáo viên xác nhận. Việc sửa hồ sơ cần là một quy trình riêng, có quyền hạn và lịch sử chỉnh sửa. |
| BA-08 | **Import danh sách có dòng sai hoặc trùng.** | Một tệp có thể bị từ chối dù chỉ một phần học sinh hợp lệ có thể thêm được, nhất là khi lớp gần đủ chỗ. Giáo viên khó biết chính xác cần sửa gì. | Trung bình | Sau khi kiểm tra tệp, hiển thị: số học sinh thêm được, số học sinh không thêm được, lý do từng dòng và số chỗ còn lại. Cần thống nhất có cho phép thêm phần hợp lệ hay bắt buộc sửa toàn bộ tệp. |
| BA-09 | **Khái niệm “xóa học sinh” bị hiểu là xóa tài khoản.** | Giáo viên có thể sợ thao tác này làm mất toàn bộ dữ liệu học sinh; học sinh có thể hiểu nhầm là bị khóa tài khoản hoặc bị loại khỏi mọi lớp. | Thấp | Chuẩn hóa ngôn ngữ: dùng “Gỡ khỏi lớp” cho thao tác của giáo viên; “Khóa tài khoản” và “Xóa tài khoản” là nghiệp vụ quản trị riêng của nhà trường. |
| BA-10 | **Học sinh đã có tài khoản từ lớp khác được thêm vào lớp mới.** | Giáo viên có thể nhầm thông báo “tài khoản đã tồn tại” thành “học sinh đã có trong lớp hiện tại”. Thực tế, một học sinh có thể hợp lệ ở nhiều lớp, nhưng mỗi lớp quản lý membership độc lập. | Đã xử lý | Giao diện nêu rõ tên lớp đang chọn và xác nhận rằng thao tác chỉ thêm học sinh vào lớp này, không làm thay đổi các lớp khác. |

## Tác động theo từng thao tác phổ biến

| Thao tác | Lớp đang thao tác | Các lớp khác của học sinh | Tài khoản và hồ sơ | Bài nộp / quá trình học |
|---|---|---|---|---|
| Thêm học sinh mới vào lớp | Sĩ số tăng, học sinh có quyền vào lớp. | Không thay đổi. | Tạo lời mời hoặc dùng tài khoản học sinh đã có. | Bắt đầu tham gia lớp. |
| Gỡ học sinh chưa đăng nhập | Sĩ số giảm, học sinh không còn trong lớp. | Không thay đổi. | Tài khoản và lời mời vẫn được giữ. | Thông thường chưa có dữ liệu học tập. |
| Gỡ học sinh đang hoạt động | Sĩ số giảm, học sinh mất quyền xem nội dung và nộp bài của lớp. | Không thay đổi. | Tài khoản và hồ sơ được giữ; học sinh nhận lý do gỡ. | Bài cũ được lưu lại nhưng không còn hiển thị trong danh sách học sinh hiện tại. |
| Thêm lại học sinh đang hoạt động | Sĩ số tăng, học sinh có lại quyền vào lớp. | Không thay đổi. | Dùng lại cùng tài khoản và hồ sơ cũ. | Bài cũ có thể xuất hiện lại; cần áp dụng chính sách tại BA-02. |

## Các yêu cầu nghiệp vụ nên ưu tiên tiếp theo

1. Chốt chính sách khi thêm lại học sinh: khôi phục bài cũ hay bắt đầu lần học mới.
2. Bổ sung lịch sử vào/rời lớp để phục vụ truy vết và xử lý tranh chấp.
3. Chốt quyền thay đổi danh sách học sinh khi lớp đã ngừng hoạt động.
4. Chuẩn hóa giao diện và thông báo theo thuật ngữ “Gỡ khỏi lớp”.
5. Hoàn thiện xử lý import và giới hạn sĩ số để giáo viên biết chính xác kết quả từng học sinh.

## Tiêu chí nghiệm thu nghiệp vụ cho thay đổi đã thực hiện

- Khi giáo viên gỡ một học sinh chưa đăng nhập khỏi lớp A, học sinh chỉ biến mất khỏi lớp A.
- Tài khoản học sinh chưa đăng nhập vẫn tồn tại và vẫn có thể được giáo viên khác quản lý ở lớp B.
- Học sinh chưa đăng nhập có thể được thêm lại vào lớp A bằng cùng email, không cần tạo tài khoản mới.
- Thao tác gỡ học sinh không làm mất thông tin cá nhân, role hay thông báo của học sinh.
- Khi email đã có tài khoản nhưng chưa thuộc lớp đang chọn, giao diện phải ghi rõ đây là tài khoản dùng chung trong hệ thống và xác nhận thao tác chỉ thêm vào lớp đang chọn.
