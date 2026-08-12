# Outline thuyết trình đồ án EDUA

## I. Đặt vấn đề và các thay đổi quan trọng

### 1. Bối cảnh dự án

- Tập trung giải quyết các bài toán thực tế tại THPT Lê Quý Đôn: thiếu thiết bị thí nghiệm an toàn, áp lực soạn bài (1–2 giờ/tiết) và nhu cầu trực quan hóa các khái niệm trừu tượng.
- EDUA không chỉ là công cụ tạo nội dung bằng AI, mà là hệ sinh thái hỗ trợ toàn bộ vòng đời dạy – học: tạo học liệu, biên tập, kiểm duyệt, chia sẻ cho lớp học và theo dõi tiến độ.

### 2. Tiếp thu phản hồi từ Hội đồng

- **Bổ sung vai trò Tổ trưởng chuyên môn (Moderator):** thiết lập quy trình tạo, giao, nộp và phê duyệt giáo án tuần trước khi giáo viên triển khai.
- **Mở rộng Classroom:** giáo viên giao tài nguyên/bài tập; học sinh truy cập, nộp bài, nộp lại hoặc thu hồi bài nộp. Hệ thống phân biệt bài nộp đúng hạn và trễ hạn.
- **Điều chỉnh vai trò Hiệu trưởng (Principal):** tập trung vào thống kê tổng thể theo môn học, loại học liệu AI, nhiệm vụ tuần, tiến độ duyệt học liệu và tài khoản.
- **Bổ sung IT Staff:** quản lý system prompt AI và nhật ký hoạt động để tăng khả năng vận hành, kiểm soát hệ thống.

## II. Giải pháp tổng thể và phân quyền

### 1. Năm nhóm người dùng

- **Teacher:** tạo giáo án, đề kiểm tra, slide, mô phỏng; biên tập và chia sẻ học liệu cho lớp.
- **Student:** truy cập tài nguyên lớp học và nộp bài theo hạn.
- **Moderator:** duyệt giáo án tuần, duyệt học liệu chia sẻ và điều phối theo tổ bộ môn.
- **Principal:** quản lý tài khoản cấp trường và theo dõi số liệu tổng hợp.
- **IT Staff:** quản lý system prompt AI, theo dõi hoạt động hệ thống.

### 2. Vòng đời học liệu khép kín

`AI tạo giáo án/slide/đề và hỗ trợ mô phỏng → Giáo viên biên tập → Lưu vào Thư viện → Nộp giáo án cho nhiệm vụ tuần để duyệt → Tổ trưởng phê duyệt/từ chối → Giáo viên chia sẻ tài nguyên hoặc bài tập cho lớp → Học sinh học/nộp bài → Giáo viên theo dõi bài nộp, nhà trường theo dõi chỉ số quy trình tổng hợp`

- Duyệt giáo án tuần khác với kiểm duyệt Community Hub: giáo viên nộp giáo án từ Thư viện vào Weekly Task; Tổ trưởng (Moderator) phê duyệt hoặc từ chối kèm lý do, sau đó giáo viên có thể chỉnh sửa và nộp lại.
- Học liệu được tổ chức qua Thư viện và Community Hub. Kiểm duyệt Community Hub là luồng tùy chọn, độc lập để kiểm soát việc chia sẻ rộng rãi; hệ thống hỗ trợ bình luận, báo cáo nội dung và duyệt/từ chối.
- Thông báo thời gian thực hỗ trợ người dùng nhận biết các sự kiện như giao nhiệm vụ, nộp bài và phê duyệt.

## III. Kiến trúc AI và quản lý tri thức

### 1. Lớp điều phối AI

- **Cơ chế dự phòng:** DeepSeek là nhà cung cấp chính cho tác vụ văn bản; khi gặp lỗi, hệ thống tự chuyển sang OpenAI. Với tác vụ nhận ảnh/vision, OpenAI là nhà cung cấp phù hợp.
- **Sinh ảnh minh họa:** hệ thống sử dụng OpenAI Images và lưu ảnh lên Cloudflare R2. Nếu không sinh được ảnh, luồng tạo slide vẫn tiếp tục với placeholder, không làm gián đoạn toàn bộ bài giảng.
- **Kiểm soát định dạng:** các luồng sinh dữ liệu cấu trúc yêu cầu AI trả JSON; backend kiểm tra schema trước khi đưa dữ liệu sang giao diện, giúp hạn chế lỗi định dạng.
- **An toàn AI:** tách rõ dữ liệu tham chiếu/đề bài khỏi instruction, kiểm tra dữ liệu đầu ra và duy trì giáo viên là người kiểm duyệt cuối cùng.

### 2. Textbook Grounding

- Hệ thống lưu nội dung cốt lõi của SGK Kết nối tri thức theo cấu trúc `textbooks → chapters → lessons`; mỗi bài học có `knowledge_json`.
- Khi giáo viên chọn bài học, hệ thống truy xuất tri thức tương ứng làm context cho AI để nội dung bám sát chương trình.
- Grounding giúp giảm nguy cơ AI sinh nội dung sai lệch; giáo viên vẫn rà soát trước khi sử dụng trong lớp.

## IV. Các quy trình nghiệp vụ và tính năng nổi bật

### 1. Phê duyệt giáo án tuần

`Tổ trưởng tạo nhiệm vụ tuần → Giáo viên nộp giáo án (từ thư viện hoặc tài liệu) → Tổ trưởng phê duyệt/từ chối kèm lý do → Giáo viên hoàn thiện và triển khai`

### 2. Teacher AI Pipeline

- Sinh giáo án theo định hướng Công văn 5512.
- Sinh đề kiểm tra bám phạm vi kiến thức đã chọn.
- Sinh outline slide theo **2 pha**: tạo khung bài trình chiếu trước, sau đó tạo chi tiết từng phần/slide để người dùng có thể theo dõi tiến trình và thử lại phần lỗi.
- Các tác vụ AI dài chạy theo phiên và cập nhật tiến độ qua WebSocket/STOMP, tránh việc người dùng chờ một request kéo dài.

### 3. Pipeline thiết kế slide thông minh

- **Bước 1 – Skin deck:** AI tạo phong cách trực quan chung: nền, palette và vùng header.
- **Bước 2 – Dynamic layout:** thuật toán frontend tự bố trí nội dung theo loại slide, độ dày nội dung và các quan hệ ngữ nghĩa; không phụ thuộc hoàn toàn vào template cố định.
- **Bước 3 – Content fill:** AI điền text/hình vào từng slot theo dữ liệu nguồn chính xác.
- Slide editor hỗ trợ kéo-thả, căn chỉnh, chỉnh thuộc tính, sắp xếp slide, undo/redo, chèn text/shape/ảnh và mô phỏng.

### 4. Mô phỏng và công cụ bộ môn

- **Physics Hub:** các mô phỏng tương tác cho cơ học, dao động, sóng, nhiệt học, điện – từ, hạt nhân/phóng xạ và mạch điện; người dùng thay đổi tham số và quan sát hiện tượng/kết quả trực quan.
- **Chemistry Lab:** bảng tuần hoàn tương tác, mô hình electron và sinh mô hình phân tử 3D từ tên gọi hoặc công thức.
- Mô phỏng có thể được đưa vào học liệu/slide để tăng khả năng trực quan hóa khái niệm trừu tượng.

## V. Kiến trúc hệ thống và khả năng vận hành

- Frontend: Next.js, React, TypeScript; backend: Spring Boot; cơ sở dữ liệu PostgreSQL.
- WebSocket/STOMP phục vụ cập nhật tiến độ AI và thông báo thời gian thực.
- Cloudflare R2 lưu trữ tệp tải lên và tài nguyên ảnh.
- Phân lớp backend theo Presentation → Service → Domain → Repository/Infrastructure, giúp tách biệt nghiệp vụ với tích hợp AI, lưu trữ và messaging.

## VI. Kiểm thử và đánh giá

### 1. Phương pháp đánh giá

- Kiểm thử các luồng chính: tạo giáo án, tạo outline/slide, tạo đề, upload tài liệu, quản lý lớp, giao/nộp bài, phê duyệt và phân quyền.
- Đánh giá chất lượng học liệu AI bằng rubric: độ bám sát yêu cầu, độ chính xác kiến thức, tính sư phạm và chất lượng hiển thị.
- Đánh giá trải nghiệm qua các tình huống lỗi: AI/provider lỗi, JSON không hợp lệ, kết nối thời gian thực gián đoạn, tài liệu upload sai định dạng, nộp muộn và từ chối phê duyệt.

### 2. Kết quả trình bày

- Chỉ đưa số liệu như số bài giảng thử nghiệm hoặc điểm rubric trung bình khi có bảng dữ liệu, tiêu chí chấm và minh chứng demo đi kèm.
- Ưu tiên trình bày demo end-to-end: chọn bài SGK → sinh giáo án/slide → chỉnh sửa → chia sẻ lớp → học sinh nộp bài → theo dõi kết quả.

## VII. Giới hạn và hướng phát triển

- **Tính chủ động dữ liệu:** dữ liệu SGK hiện do nhóm chuẩn hóa; hướng tới module để nhà trường cập nhật, kiểm duyệt và nhúng tri thức bài học mới.
- **Rà soát sư phạm:** AI là trợ lý, không thay thế giáo viên trong quyết định cuối cùng về nội dung và phương pháp dạy.
- **Hiệu năng thiết bị:** mô hình 3D và mô phỏng cần trình duyệt hỗ trợ WebGL 2.0 để có trải nghiệm tốt.
- **Mở rộng tương lai:** tăng số môn học, bổ sung dữ liệu SGK, hoàn thiện bộ rubric đánh giá AI, phân tích học tập từ dữ liệu lớp học và mở rộng kho mô phỏng.
