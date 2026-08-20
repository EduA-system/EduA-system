# BÁO CÁO DỰ ÁN EDUA — Report 1: Giới thiệu dự án

> **Bản dịch tiếng Việt** của `AAA_docs_sau_khi_nop_9_8/Report1_Project_Introduction.docx` (bản trên Google Drive, đã cập nhật ngày 19/08/2026).
> Bản gốc viết bằng tiếng Anh; đây là bản dịch để dùng nội bộ — khi nộp vẫn dùng file .docx tiếng Anh.
> Mã định danh FE-xx / LI-xx / EX-xx giữ nguyên theo bản gốc. Bảng Loại trừ đã rút từ 16 xuống 14 mục ngày 19/08/2026 (gộp "không có tài khoản phụ huynh" vào EX-03, bỏ "không sinh nội dung offline" vì trùng LI-12) và **đánh số lại** — mã EX ở đây khác các bản RP1 trước ngày đó. Các biểu đồ khảo sát trong .docx được đánh dấu bằng `[Biểu đồ]`.
> Rà soát liên quan: [../review/report1-vs-code-gap.md](../review/report1-vs-code-gap.md), [../review/report1-phan-bien-hoi-dong.md](../review/report1-phan-bien-hoi-dong.md).

Hà Nội, tháng 6 năm 2026

---

## I. Lịch sử thay đổi

| Ngày | A\*M, D | Người phụ trách | Nội dung thay đổi |
| --- | --- | --- | --- |
| 19/05/2026 | A | Bach | II. Định nghĩa và từ viết tắt; III. Giới thiệu dự án; 1. Tổng quan; 1.1 Thông tin dự án; 1.2 Nhóm dự án; 2. Bối cảnh sản phẩm; 3. Các hệ thống hiện có |
| 21/05/2026 | A | Bach | 4. Cơ hội kinh doanh; 5. Tầm nhìn sản phẩm |
| 22/05/2026 | M | Bach | 2. Bối cảnh sản phẩm |
| 30/05/2026 | A | Bach | 6. Phạm vi và giới hạn dự án; 6.1 Tính năng chính; 6.2 Giới hạn; 6.3 Loại trừ |
| 01/06/2026 | M | Bach | 6.1 Tính năng chính; 6.2 Giới hạn; 6.3 Loại trừ |
| 02/06/2026 | M | Bach | 6. Phạm vi và giới hạn dự án; 6.1 Tính năng chính; 6.2 Giới hạn; 6.3 Loại trừ |
| 18/06/2026 | M | Bach | 2. Bối cảnh sản phẩm; 4. Cơ hội kinh doanh; 5. Tầm nhìn sản phẩm; 6. Phạm vi và giới hạn dự án; 6.1 Tính năng chính; 6.2 Giới hạn; 6.3 Loại trừ |
| 01/07/2026 | M | Bach | 6. Phạm vi và giới hạn dự án; 6.1 Tính năng chính |
| 16/07/2026 | M | Bach | 6.2 Loại trừ; 6.3 Loại trừ |
| 19/08/2026 | M | Bach | 2. Bối cảnh sản phẩm; 3. Các hệ thống hiện có; 4. Cơ hội kinh doanh; 5. Tầm nhìn sản phẩm; 6.1 Tính năng chính; 6.2 Giới hạn; 6.3 Loại trừ |

\*A – Thêm mới; M – Sửa; D – Xoá

---

## II. Định nghĩa và từ viết tắt

| Từ viết tắt | Định nghĩa |
| --- | --- |
| EDUA | Nền tảng AI hỗ trợ soạn bài giảng và mô phỏng cho giáo viên STEM bậc THPT (tên chính thức của dự án) |
| SEP490 | Mã môn Đồ án tốt nghiệp tại Đại học FPT |
| SU26 | Học kỳ Hè 2026 (học kỳ thực hiện dự án) |
| STEM | Khoa học, Công nghệ, Kỹ thuật và Toán học (tiếp cận giáo dục liên môn) |
| SGK | Sách giáo khoa (bộ sách giáo khoa quốc gia của Việt Nam) |
| KNTT | Kết nối tri thức (một bộ SGK do Nhà xuất bản Giáo dục Việt Nam phát hành) |
| MOET | Bộ Giáo dục và Đào tạo Việt Nam |
| GV | Giáo viên — vai trò người dùng chính của nền tảng EDUA |
| THPT | Trung học phổ thông (lớp 10–12) |
| AI | Trí tuệ nhân tạo |
| LLM | Mô hình ngôn ngữ lớn (mô hình AI dùng để sinh giáo án và slide từ dữ liệu SGK) |
| API | Giao diện lập trình ứng dụng |
| UI | Giao diện người dùng |
| UC | Use Case (ca sử dụng) |
| FE | Feature — mã tính năng chính trong phạm vi dự án, ví dụ FE-01 Xác thực |
| FN | Function — mã chức năng con bên trong một tính năng, ví dụ FN-07 |
| EX | Exclusion — mã hạng mục nằm ngoài phạm vi, ví dụ EX-08 Không có token/thanh toán |
| SRS | Đặc tả yêu cầu phần mềm (Report 3) |
| SDS | Đặc tả thiết kế phần mềm (Report 4) |
| WBS | Cấu trúc phân rã công việc |
| RACI | Ma trận phân công trách nhiệm (Responsible, Accountable, Consulted, Informed) |
| POC | Proof of Concept |
| UAT | Kiểm thử chấp nhận của người dùng |

---

## III. Giới thiệu dự án

### 1. Tổng quan

#### 1.1 Thông tin dự án

- **Tên dự án:** Nền tảng hỗ trợ sinh tài liệu giảng dạy cho giáo viên khoa học tự nhiên bậc THPT
- **Mã dự án:** EDUA
- **Tên nhóm:** SEP490_SU26_G20
- **Loại phần mềm:** Ứng dụng web

#### 1.2 Nhóm dự án

| Họ và tên | Vai trò | Email | Điện thoại |
| --- | --- | --- | --- |
| Bùi Minh Hoài | Giảng viên hướng dẫn | hoaibm@fpt.edu.vn | 0962040389 |
| Vũ Đình Đăng | Trưởng nhóm | dangvdhe180699@fpt.edu.vn | 0915238314 |
| Nguyễn Tuấn Bách | Thành viên | bachnthe181895@fpt.edu.vn | 0349794140 |
| Vũ Tuấn Hiệp | Thành viên | hiepvthe181347@fpt.edu.vn | 0971538809 |
| Vũ Nhật Minh | Thành viên | minhvnhe181434@fpt.edu.vn | 0948087201 |
| Nguyễn Hồng Nhã | Thành viên | Nhanhhe181669@fpt.edu.vn | 0946786898 |

---

### 2. Bối cảnh sản phẩm

Chương trình Giáo dục phổ thông 2018 yêu cầu học sinh được thực hành thí nghiệm, làm câu hỏi gắn với ứng dụng thực tế và lập luận liên môn ở hai môn Hoá học và Vật lí. Trường THPT Lê Quý Đôn Hà Đông — trường khách hàng của dự án này — phải dạy theo chuẩn đó trong điều kiện cơ sở vật chất và khối lượng công việc hiện có của giáo viên. Để xác định khó khăn cụ thể tại trường, nhóm đã tổ chức một buổi hỏi đáp chuyên sâu với các giáo viên Hoá học của Lê Quý Đôn. Sau đó, hai khảo sát định lượng — 92 giáo viên Hoá học và 91 giáo viên Vật lí ở các trường THPT khác — được dùng làm đối chiếu liên trường nhằm kiểm chứng rằng những vấn đề quan sát được ở Lê Quý Đôn không phải cá biệt của riêng trường này. Các phát hiện dưới đây được trình bày theo đúng thứ tự giáo viên Lê Quý Đôn nêu ra, kèm số liệu khảo sát làm bằng chứng bổ trợ.

**Vấn đề thứ nhất** ở Lê Quý Đôn là không thể tiến hành các thí nghiệm nguy hiểm tại trường. Trường không có tủ hút và phòng thí nghiệm không có đường nước, nên các thí nghiệm liên quan đến clo, phenol, brom và những chất độc khác không thể thực hiện an toàn — một giáo viên cho biết đã từng hít phải khí clo trong một lần thử trước đây. Sĩ số 46–48 học sinh mỗi lớp khiến chỉ một chiếc đèn cồn bị đổ cũng thành nguy cơ mất an toàn, nên phần lớn thí nghiệm bị rút gọn thành giáo viên biểu diễn trên bục hoặc chiếu video quay sẵn lấy từ YouTube. Chỉ những thí nghiệm cơ bản, ít rủi ro — Cu(OH)₂ với ancol đơn chức và đa chức, natri tác dụng với nước, sắt cháy trong oxi, phản ứng tráng bạc của glucose — mới được cho học sinh trực tiếp tham gia. Cùng một hiện trạng lặp lại trên diện rộng ở các trường khác: 56,5% giáo viên Hoá và 53,8% giáo viên Lí được khảo sát cho biết trường mình gần như không tổ chức thí nghiệm thực hành, và lần lượt 57,6% và 54,9% nói thí nghiệm thật chỉ diễn ra ở dưới 20% số tiết có nội dung thí nghiệm.

`[Biểu đồ: tần suất cần dùng thí nghiệm trong các tiết học]`

80,2% giáo viên được khảo sát có dùng đến thí nghiệm ở hơn năm tiết mỗi tuần, cho thấy thí nghiệm không phải chuyện bên lề mà là nhu cầu giảng dạy thường xuyên. Khi không thể làm thí nghiệm thật, 100% giáo viên ở cả hai môn quay sang dùng video YouTube. Giáo viên Lê Quý Đôn chỉ ra cái giá phải trả: video thì chắc chắn "thành công" và tiết kiệm thời gian, nhưng học sinh không được chạm vào dụng cụ, không được chứng kiến một lần thí nghiệm thất bại, và không hình thành được kỹ năng thao tác trong phòng thí nghiệm.

**Vấn đề thứ hai** là thời gian bỏ ra để soạn bài. Giáo viên Lê Quý Đôn mô tả một quy trình cố định cho mọi tiết có thí nghiệm — viết giáo án, làm phiếu học tập và câu hỏi ngắn, thiết kế slide PowerPoint, chèn video minh hoạ, và gõ công thức hoá học với chỉ số dưới, chỉ số trên cùng công thức cấu tạo hữu cơ. Hai bước tốn công nhất là thiết kế slide và chèn công thức hoá học, thứ mà trình soạn slide thông thường không hiển thị được nếu không cài thêm add-in. Gánh nặng còn nhân lên vì lớp ban A (chuyên sâu) và lớp ban D (đại trà) cần hai bộ slide khác nhau cho cùng một bài. Khảo sát cho thấy mức tải này ở các trường khác cũng tương tự.

`[Biểu đồ: thời gian chuẩn bị một tiết có thí nghiệm]`

70,3% giáo viên mất từ một đến hai giờ để chuẩn bị giáo án và slide cho một tiết có thí nghiệm, thêm 22% mất từ ba mươi phút đến một giờ.

`[Biểu đồ: bước nào trong quá trình chuẩn bị tốn công nhất]`

38,2% giáo viên cho rằng việc tìm hình ảnh hoặc video minh hoạ phù hợp là khâu nặng nhất, và 24,7% chọn khâu chèn công thức hoá học và sơ đồ phản ứng. Đây đúng là hai nút thắt mà giáo viên Lê Quý Đôn đã mô tả một cách độc lập trong buổi phỏng vấn — xác nhận rằng vấn đề quy trình ở Lê Quý Đôn cũng chính là vấn đề được phản ánh trên toàn mẫu khảo sát.

**Vấn đề thứ ba** ở Lê Quý Đôn là kiểm tra đánh giá ngay tại lớp. Giáo viên cần một cách nhanh để kiểm tra mức độ hiểu bài ngay sau mỗi đơn vị kiến thức, chứ không chỉ ở cuối chương; những bài kiểm tra ngắn này là hình thức **đánh giá thường xuyên**, do giáo viên tự chấm và tự nhập vào sổ điểm hiện có của trường. Các dạng câu hỏi bám theo cấu trúc ba phần của kỳ thi tuyển sinh mới — 18 câu trắc nghiệm nhiều lựa chọn, câu đúng/sai, và câu trả lời ngắn không thể đoán mò — để học sinh làm quen dần, nhưng mục đích của chính những bài kiểm tra đó là củng cố kiến thức tại lớp chứ không phải thi cử chính thức. Ràng buộc đi kèm là học sinh không được dùng điện thoại trong giờ (thiết bị bị khoá trong hộp ở cửa lớp) nhằm ngăn tra đáp án, nên mô hình làm bài trắc nghiệm online thông thường không dùng được.

**Vấn đề thứ tư** là dạy những nội dung trừu tượng không quan sát được bằng mắt: cấu tạo nguyên tử (electron, proton, neutron) ở chương đầu lớp 10; lai hoá sp/sp²/sp³ trong CH₄, C₂H₄ và C₂H₂; các cơ chế phản ứng như thế gốc; và hình học tứ diện, bát diện của phức chất mới được đưa vào cuối chương trình lớp 12. Những chủ đề này khó với cả học sinh lẫn giáo viên nếu không có mô hình 3D. Trên toàn mẫu khảo sát, giáo viên thể hiện nhu cầu rõ rệt đúng ở những hướng này.

`[Biểu đồ: nhu cầu hỗ trợ theo từng đầu việc]`

97,8% giáo viên muốn được hỗ trợ soạn giáo án, 76,9% muốn hỗ trợ chuẩn bị slide, 62,6% hỗ trợ chuẩn bị thí nghiệm, và 60,4% hỗ trợ soạn câu hỏi và đề kiểm tra. Giáo viên Lê Quý Đôn thường dùng hai khung đề — kiểm tra ngắn 15 phút và bài kiểm tra 45 phút — và nhiều khi cần ngay một đề có sẵn khi phát sinh nhu cầu kiểm tra mức độ hiểu bài không nằm trong kế hoạch của tiết học.

Hai ràng buộc nữa xuất hiện từ khảo sát. 82,6% giáo viên cho biết các nền tảng quốc tế sẵn có như PhET ít hữu ích hơn so với học liệu bám sát SGK Việt Nam, vì thứ tự chương, ví dụ mẫu và dạng câu hỏi không khớp với những gì họ dạy — và đây đúng là chỗ một hệ thống xây quanh SGK Việt Nam cùng khung đề ba phần có lợi thế mà công cụ quốc tế đại trà không sao chép được. 60,4% giáo viên Vật lí **bác bỏ** nhận định rằng slide sinh ra "không cần đẹp bằng Canva hay PowerPoint miễn là tiết kiệm thời gian", nghĩa là chất lượng hình thức là một kỳ vọng cứng, không phải thứ giáo viên sẵn sàng đánh đổi để lấy tốc độ. Ngoài chất lượng hình thức, giáo viên Lê Quý Đôn còn mong muốn được tuỳ biến bố cục slide — đổi nền và chủ đề màu — để học liệu đa dạng và cuốn hút, thay vì lặp lại đơn điệu giữa các bài và các lớp. Nhu cầu tuỳ biến này đã hàm chứa sẵn trong việc tách lớp ban A và ban D, khi cùng một bài được dạy bằng hai bộ slide khác nhau: giáo viên muốn được tự do thay đổi cách trình bày, không chỉ nội dung.

Một điểm bối cảnh cuối cùng liên quan đến bộ sách. Lê Quý Đôn hiện dùng bộ Cánh Diều và sẽ chuyển sang Kết nối tri thức (KNTT) từ năm học tới. Ba bộ sách — KNTT, Cánh Diều và Chân trời sáng tạo — khác nhau chủ yếu ở thứ tự chương và vị trí đặt ví dụ mẫu; vì phần kiến thức nền không đổi, học liệu đã sinh cho một bộ vẫn dùng lại được phần lớn sau khi chuyển bộ, và việc mở rộng cơ sở dữ liệu kiến thức sang bộ khác là công việc chuẩn bị dữ liệu tăng dần của nhóm dự án chứ không phải làm lại từ đầu — nên việc trường đổi bộ sách không làm mất giá trị của học liệu giáo viên đã tạo ra.

Tổng hợp lại, bốn vấn đề ở Lê Quý Đôn là:

1. **(i)** Các thí nghiệm nguy hiểm và cả nhiều thí nghiệm thông thường không thể thực hiện tại trường do không có tủ hút, không có đường nước và sĩ số lớp không bảo đảm an toàn.
2. **(ii)** Việc soạn bài tiêu tốn một đến hai giờ cho mỗi tiết có thí nghiệm, tập trung ở thiết kế slide, tìm video và gõ công thức hoá học, lại còn bị nhân đôi giữa lớp ban A và ban D.
3. **(iii)** Kiểm tra tại lớp không thể dựa vào thiết bị của học sinh, trong khi giáo viên cần cách nhanh để tạo đề ngắn có sẵn theo khung đề ba phần mới.
4. **(iv)** Các chủ đề trừu tượng như cấu tạo nguyên tử, lai hoá orbital và hình học phức chất rất khó dạy nếu không có mô hình 3D — khó khăn mà những công cụ trực quan hoá hiện có trong tay giáo viên không giải quyết được.

Bốn vấn đề này **không được đáp ứng ở cùng một mức độ** trong thời lượng dự án. Release 1.0 đáp ứng **(ii)** bằng việc sinh giáo án, slide và đề kiểm tra dựa trên cơ sở dữ liệu kiến thức SGK đã chuẩn bị sẵn; đáp ứng **(iii)** bằng các đề ngắn in được, dựng theo khung ba phần; và đáp ứng **(iv)** bằng mô hình nguyên tử, phân tử 3D tương tác cùng bảng tuần hoàn tương tác. Với **(i)**, bản phát hành cung cấp thư viện mô phỏng Vật lí tương tác thay cho việc biểu diễn các hiện tượng vật lí; còn phòng thí nghiệm Hoá học ảo với thao tác trộn chất và dự đoán phản ứng đã được lên kế hoạch nhưng không kịp hoàn thành trong thời lượng dự án (LI-22), nên với môn Hoá, bản phát hành hỗ trợ trực quan hoá cấu trúc chứ chưa hỗ trợ thực hiện thí nghiệm. Bốn vấn đề cũng khác nhau về nhịp sử dụng: một bộ slide hay một giáo án phần lớn là tài sản tạo một lần, trong khi các bài kiểm tra ngắn tại lớp, các mô hình 3D được dùng lại mỗi lần dạy đến chương đó, và chu trình hằng tuần gồm giao nhiệm vụ soạn giáo án — tổ trưởng chuyên môn duyệt — rồi mới làm slide và đề, lặp lại đều đặn mỗi tuần. Chính những nhu cầu lặp lại đó, chứ không phải việc sinh slide một lần, mới là thứ tạo nên giá trị lâu dài của hệ thống.

---

### 3. Các hệ thống hiện có

#### 3.1 PowerPoint

Phần mềm trình chiếu truyền thống của Microsoft, là công cụ chính để soạn slide bài giảng của phần lớn giáo viên THPT Việt Nam.

| Thuộc tính | Mô tả |
| --- | --- |
| Website | https://www.microsoft.com/microsoft-365/powerpoint |
| Người dùng mục tiêu | Nhân viên văn phòng, giáo viên, học sinh, doanh nghiệp — mục đích chung |
| Tính năng lõi | Soạn slide thủ công, chèn ảnh/video/biểu đồ, hiệu ứng chuyển, trình chiếu |
| Điểm mạnh | Quen thuộc với giáo viên; chạy offline; tương thích với mọi trường; định dạng chuẩn |
| Điểm yếu | Hoàn toàn thủ công — không có AI, không gợi ý nội dung; giáo viên phải tự tìm và chèn mọi học liệu; không có sẵn thư viện mô hình hay mô phỏng tương tác |
| Khoảng trống cho EDUA | Không tự sinh giáo án/slide; không có cơ sở dữ liệu SGK; giáo viên vẫn phải đi lùng video/mô phỏng/mô hình — đúng nỗi đau mà EDUA làm nhẹ đi |

#### 3.2 Canva (Canva AI Slide)

Nền tảng thiết kế trực tuyến, có module AI sinh slide từ câu lệnh.

| Thuộc tính | Mô tả |
| --- | --- |
| Website | https://www.canva.com |
| Người dùng mục tiêu | Người thiết kế không chuyên, người sáng tạo nội dung, giáo viên trẻ |
| Tính năng lõi | Kho template phong phú, sinh slide bằng AI từ prompt, chèn ảnh/video, cộng tác thời gian thực |
| Điểm mạnh | Giao diện đẹp, AI nhanh, template dồi dào |
| Điểm yếu | Nội dung AI mang tính chung chung (ưu tiên tiếng Anh), không bám SGK Việt Nam; không có mô hình 3D Hoá học tương tác và không có mô phỏng bám chương trình; gói trả phí tính bằng USD |
| Khoảng trống cho EDUA | Nội dung AI không bị neo vào SGK Việt Nam → nguy cơ sai kiến thức Hoá học; thiếu thư viện mô phỏng/mô hình bám chương trình THPT Việt Nam |

#### 3.3 ChatGPT

AI hội thoại đa dụng của OpenAI; nhiều giáo viên dùng để sinh nhanh các đoạn nội dung cho slide.

| Thuộc tính | Mô tả |
| --- | --- |
| Website | https://chat.openai.com |
| Người dùng mục tiêu | Người dùng phổ thông cần trợ giúp từ AI |
| Tính năng lõi | Trò chuyện AI, sinh văn bản, trả lời câu hỏi |
| Điểm mạnh | Linh hoạt, bản cơ bản miễn phí, rất phổ biến |
| Điểm yếu | Kiến thức chung chung, không bám SGK Việt Nam; "ảo giác" — đưa ra kiến thức sai mà không cảnh báo; chỉ trả về văn bản, không trực tiếp sinh slide; không tích hợp mô phỏng/mô hình |
| Khoảng trống cho EDUA | Đánh trúng nỗi sợ lớn nhất của giáo viên — kiến thức sai. EDUA dùng prompt có kiểm soát, cơ sở dữ liệu kiến thức SGK do nhóm dự án chuẩn bị, và bắt buộc giáo viên duyệt lại, nhằm giảm rủi ro nội dung AI thiếu chính xác |

#### 3.4 MagicSchool (khía cạnh mô phỏng)

Bộ công cụ AI dành cho giáo viên K-12 tại thị trường Mỹ.

| Thuộc tính | Mô tả |
| --- | --- |
| Website | https://www.magicschool.ai |
| Người dùng mục tiêu | Giáo viên K-12 (chủ yếu ở Mỹ) |
| Tính năng lõi | Bộ công cụ AI cho giáo viên: soạn giáo án, sinh câu hỏi, sinh nội dung; một số mô phỏng đại trà |
| Điểm mạnh | Nhiều công cụ AI tích hợp trong một nền tảng; có cộng đồng |
| Điểm yếu | Thiết kế cho chương trình Mỹ — không phù hợp SGK Việt Nam; mô phỏng đại trà và không bám chương trình Việt Nam; chỉ có tiếng Anh; gói trả phí tính bằng USD |
| Khoảng trống cho EDUA | Không có thư viện mô phỏng tương tác và không có mô hình 3D Hoá học bám SGK Việt Nam; không có cộng đồng giáo viên Việt Nam |

#### 3.5 MolView

Công cụ trực tuyến chuyên về trực quan hoá mô hình phân tử.

| Thuộc tính | Mô tả |
| --- | --- |
| Website | https://molview.org |
| Người dùng mục tiêu | Học sinh, người nghiên cứu hoá học |
| Tính năng lõi | Dựng mô hình phân tử 2D/3D (que-cầu, lấp đầy không gian); tra cứu tính chất chất |
| Điểm mạnh | Miễn phí, mã nguồn mở; chuyên sâu hoá học; chất lượng dựng hình cao |
| Điểm yếu | Là công cụ tra cứu độc lập — không tích hợp vào slide bài giảng; không có giáo án; không bám SGK Việt Nam; giao diện chỉ tiếng Anh; không có quy trình dành cho giáo viên |
| Khoảng trống cho EDUA | Đứng tách rời như một học liệu rời — giáo viên phải chụp màn hình rồi tự dán vào slide, quay lại đúng nỗi đau "tìm bên ngoài rồi chèn tay" |

#### 3.6 Eduaide.AI

Không gian làm việc AI cho giáo viên K-12 (do Thomas Thompson — một cựu giáo viên Mỹ — sáng lập); đã ra mắt với người dùng thật.

| Thuộc tính | Mô tả |
| --- | --- |
| Website | https://eduaide.ai |
| Người dùng mục tiêu | Giáo viên K-12 (chủ yếu Mỹ), giảng viên đại học, cán bộ quản lý giáo dục, giáo viên giáo dục đặc biệt; cả người dạy phi truyền thống và người đào tạo doanh nghiệp |
| Tính năng lõi | Sinh giáo án, bài đánh giá, phiếu học tập, sơ đồ tư duy, trò chơi lớp học và rubric từ chủ đề/mục tiêu/nguồn do giáo viên cung cấp; cho phép tải lên chương trình/khung chuẩn để định hướng AI; phần đánh giá hỗ trợ 9 dạng câu hỏi có điều chỉnh độ khó; có công cụ chỉnh mức độ đọc hiểu, hỗ trợ đa ngôn ngữ, prompt hỗ trợ tiếp cận |
| Điểm mạnh | Đã ra mắt với người dùng thật; sinh học liệu đa dạng tốt; cho phép tải chương trình lên để bám chuẩn; giá rõ ràng (miễn phí 15 lượt/tháng + Premium 5,99 USD/tháng); giữ quyền kiểm soát cho giáo viên (không có phần dành cho học sinh) |
| Điểm yếu | Chung chung — không có sẵn cơ sở dữ liệu chương trình quốc gia (cho tải lên nhưng đẩy gánh nặng bám chuẩn về phía giáo viên); chỉ có học liệu dạng văn bản — không có slide trình chiếu, không có mô phỏng/hình ảnh hoá học; thiết kế cho thị trường Mỹ, giao diện ưu tiên tiếng Anh |
| Khoảng trống cho EDUA | Không có sẵn cơ sở dữ liệu SGK Việt Nam (giáo viên phải tự tải lên và tin vào việc AI bám chuẩn — rủi ro với giáo viên Việt Nam); không sinh slide bài giảng kèm học liệu chèn sẵn; không có mô phỏng/hình ảnh hoá học chuyên biệt; không có cộng đồng giáo viên Việt Nam |

#### 3.7 Zperiod

Công cụ tương tác cho môn Hoá học bậc phổ thông (lớp 9–12), do Philip Zhao — học sinh lớp 11 tại Toronto — phát triển.

| Thuộc tính | Mô tả |
| --- | --- |
| Website | https://zperiod.app |
| Người dùng mục tiêu | Học sinh Hoá học lớp 9–12; hữu ích một phần cho giáo viên cần học liệu hoá học |
| Tính năng lõi | Bảng tuần hoàn tương tác 118 nguyên tố (tô màu theo nhóm, dữ liệu trạng thái ở điều kiện chuẩn); mô hình nguyên tử 3D có lớp electron và thẻ thông tin vuốt được; không gian Tools gồm công cụ cân bằng phương trình, tính khối lượng mol, bảng tính tan, phòng thí nghiệm ảo; công cụ sinh phiếu bài tập cân bằng phương trình có điều chỉnh độ khó, nhiều loại phản ứng và xuất PDF |
| Điểm mạnh | Hình ảnh hoá học chất lượng cao (nguyên tử 3D, bảng tuần hoàn); công cụ hoá học chuyên biệt; miễn phí (có tuỳ chọn ủng hộ); hỗ trợ tiếng Việt và hơn 20 ngôn ngữ; đã ra bản v2.5 |
| Điểm yếu | Hướng tới học sinh chứ không phải giáo viên — không có giáo án, không có slide, không có học liệu giảng dạy; không sinh nội dung bằng AI (chỉ có công cụ); không bám SGK Việt Nam (kiến thức hoá học chung); không có cộng đồng; chỉ có môn Hoá, không có kế hoạch mở rộng môn khác |
| Khoảng trống cho EDUA | Là tập hợp công cụ rời rạc cho học sinh — giáo viên vẫn phải tự ghép vào slide, quay lại nỗi đau "tìm bên ngoài rồi chèn tay" (giống MolView); không sinh giáo án/slide; không có quy trình cho giáo viên; không bám SGK; không có cơ chế cộng đồng |

#### 3.8 NotebookLM

Công cụ AI nghiên cứu và tạo nội dung dựa trên nguồn của Google: AI chỉ trả lời và sinh nội dung dựa trên tài liệu người dùng tải lên, kèm trích dẫn — cùng triết lý "bám nguồn, ít bịa" mà EDUA theo đuổi. Đây là công cụ đa dụng cho mọi môn, không chuyên cho chương trình Việt Nam.

| Thuộc tính | Mô tả |
| --- | --- |
| Website | https://notebooklm.google.com |
| Người dùng mục tiêu | Học sinh, nhà nghiên cứu, người đi làm và giáo viên ở mọi môn — đa dụng |
| Tính năng lõi | Tải nguồn lên (PDF, Google Docs, web, YouTube, audio); trò chuyện bám nguồn có trích dẫn; các đầu ra Studio: bộ slide, câu hỏi, thẻ ghi nhớ, bản tóm tắt audio (podcast), video tổng quan, sơ đồ tư duy, báo cáo, infographic, bảng dữ liệu; xuất PPTX (4/2026); ứng dụng iOS/Android; bản NotebookLM Plus có hạn mức cao hơn; tích hợp vào ứng dụng Gemini (5/2026) |
| Điểm mạnh | Được Google hậu thuẫn (độ tin cậy, quy mô); cơ chế bám nguồn kèm trích dẫn đã hoàn thiện; đầu ra đa định dạng kể cả audio/video; nhận mọi nguồn và mọi môn; có app di động; đa ngôn ngữ, có tiếng Việt; bản miễn phí phổ biến |
| Điểm yếu | Việc bám nguồn phụ thuộc vào tài liệu giáo viên tự tải lên — không có sẵn chương trình đã được kiểm chứng; càng nhiều nguồn thì mức chi tiết trên từng nguồn càng loãng; slide sinh ra về cơ bản là ảnh/PDF, khả năng chỉnh sửa trực tiếp hạn chế; các đầu ra rời rạc, không gom được thành đơn vị chương trình; không có mô phỏng tương tác / mô hình 2D-3D; không có khung đề Việt Nam; không có cộng đồng giáo viên |
| Khoảng trống cho EDUA | NotebookLM bám vào những gì giáo viên tải lên, không bảo đảm nguồn đó đúng, đủ hay bám chương trình — gánh nặng kiểm chứng vẫn thuộc về giáo viên. Nó không có mô phỏng tương tác, không có click-to-simulate, không có sẵn cơ sở dữ liệu kiến thức SGK, không có khung đề Việt Nam, và không có cộng đồng giáo viên — đây là công cụ nghiên cứu/hỏi đáp, không phải một quy trình dạy học trọn vẹn cho lớp học Việt Nam |

**Tổng kết mục 3 — nhu cầu chưa được đáp ứng:** PowerPoint hoàn toàn thủ công, không có AI. Canva, ChatGPT và MagicSchool có AI nhưng không neo vào SGK Việt Nam, nên rủi ro sai kiến thức vẫn còn. MolView là công cụ phân tử mạnh nhưng đứng độc lập. Eduaide.AI sinh được nhiều loại học liệu nhưng chung chung, không có dữ liệu SGK, không có slide và không có hình ảnh hoá học. Zperiod có hình ảnh hoá học tốt nhưng hướng tới học sinh. NotebookLM gần với EDUA nhất về triết lý — tiên phong về AI bám nguồn có trích dẫn và nay đã sinh được slide, câu hỏi, học liệu — nhưng việc bám nguồn phụ thuộc tài liệu giáo viên tải lên (không có chương trình đã kiểm chứng sẵn), slide xuất ra là ảnh không sửa được, và không có mô phỏng tương tác, không có khung đề Việt Nam, không có cộng đồng giáo viên. Nói ngắn gọn, chưa nền tảng nào gộp đủ: hỗ trợ AI bám theo cơ sở dữ liệu kiến thức SGK do nhóm dự án chuẩn bị và rà soát cho các môn đã chọn, thư viện mô phỏng/mô hình tương tác bám chương trình, tự động chèn vào slide sửa được, cộng đồng giáo viên Việt Nam có trao đổi học liệu, và trải nghiệm click-to-simulate ngay khi đang trình chiếu. EDUA nhắm đúng vào phần giao đó.

---

### 4. Cơ hội kinh doanh

Những nỗi đau nêu trên cho thấy một cơ hội thị trường rõ ràng và phần lớn còn bỏ ngỏ. Giáo viên Vật lí và Hoá học bậc THPT muốn có một công cụ chuyên biệt giúp họ soạn giáo án, dựng slide, và làm sống dậy các hiện tượng vật lí cùng những cấu trúc trừu tượng bằng mô phỏng tương tác và mô hình 3D — phần công việc hiện tiêu tốn một đến hai giờ mỗi tiết mà vẫn khiến họ phải phụ thuộc vào video YouTube không tương tác. Đây là một nhu cầu cụ thể và xác định rõ, không phải một mong muốn mơ hồ: giáo viên không đòi hỏi một trợ lý đa năng, mà đòi hỏi hỗ trợ đúng vào những khâu tốn thời gian nhất và khó làm tốt nhất trong quy trình của họ.

Ba đặc điểm khiến cơ hội này hấp dẫn. **Thứ nhất**, nhu cầu rộng và nhất quán ở cả hai môn, nên một giải pháp duy nhất có thể phục vụ một tập người dùng lớn và tương đối đồng nhất. **Thứ hai**, cùng một bài học phải được dạy dưới nhiều biến thể — cho lớp ban tự nhiên và lớp ban xã hội, rồi lại dùng tiếp cho năm học sau — nên giáo viên cần học liệu sinh ra là thứ sửa được, lưu được và dùng lại được, chứ không phải một sản phẩm cố định dùng một lần; một công cụ hiểu chương trình kèm thư viện cá nhân sửa được đáp ứng trực tiếp nhu cầu đó, còn các công cụ sinh một lần thì không. Việc tự động điều chỉnh nội dung theo trình độ từng học sinh là hướng đi dài hạn, không nằm trong bản phát hành này. **Thứ ba**, không gian này phần lớn còn trống: dù một số giáo viên đã thử AI đa dụng như ChatGPT, rào cản niềm tin vẫn còn vì các công cụ đó không neo vào chương trình quốc gia, và đa số rõ rệt giáo viên cho rằng một giải pháp bám SGK Việt Nam sẽ có giá trị hơn các nền tảng quốc tế như PhET.

Tổng hợp lại, những điều kiện trên xác định cơ hội mà dự án theo đuổi: xây dựng một công cụ bản địa hoá, bám chương trình, giúp **giảm** gánh nặng soạn bài cho giáo viên khoa học tự nhiên và **thu hẹp** khoảng trống biểu diễn thí nghiệm do điều kiện lớp học và phòng thí nghiệm gây ra — trong một phân khúc mà các sản phẩm hiện có chưa phục vụ tốt.

---

### 5. Tầm nhìn sản phẩm

Dành cho giáo viên khoa học tự nhiên bậc THPT — những người mất một đến hai giờ chuẩn bị cho mỗi tiết học — EDUA là nền tảng AI trên nền web sinh ra giáo án, slide và đề kiểm tra bám SGK, dựa trên một cơ sở dữ liệu kiến thức được nhóm dự án bóc tách từ bộ Kết nối tri thức, cấu trúc hoá và rà soát thủ công, nhằm giảm rủi ro sai lệch của AI đa dụng.

Giá trị cốt lõi của EDUA là tính tích hợp: một giáo án, một bộ slide và một đề kiểm tra ngắn cùng sinh ra từ một phạm vi nội dung SGK, với mô hình 3D tương tác, bảng tuần hoàn tương tác và mô phỏng Vật lí được chèn thẳng vào slide ở đúng chỗ nội dung cần đến. Khác với công cụ thủ công như PowerPoint và Canva, hay AI đa dụng như ChatGPT, EDUA cho phép **click-to-simulate** ngay trong lúc trình chiếu — giáo viên không còn phải nhảy qua lại giữa các học liệu rời rạc để tìm thứ mình cần.

Vì giáo viên phải giữ quyền quyết định với những gì mình dạy, EDUA được xây quanh quy trình "AI sinh ra, giáo viên duyệt và sửa", chứ không phải AI tự quyết. Bao quanh phần lõi đó, nền tảng gánh luôn chu trình chuẩn bị của chính nhà trường: tổ trưởng chuyên môn giao nhiệm vụ soạn giáo án theo tuần và duyệt giáo án nộp lên trước khi bộ slide và đề kiểm tra được dựng trên đó, còn giáo viên phát học liệu đã duyệt xuống lớp mình và thu bài nộp của học sinh ngay trong hệ thống. Một cộng đồng chia sẻ (Community Hub) cho phép giáo viên trao đổi và dùng lại học liệu của nhau, biến việc soạn bài từ một công việc đơn độc thành công việc có cộng tác.

Ngoài bản phát hành hiện tại, hướng đi dài hạn của EDUA gồm: cá nhân hoá nội dung theo các mức năng lực khác nhau trong cùng một lớp, biến các bài kiểm tra tại lớp thành dữ liệu phân tích học tập để chỉ ra chỗ cả lớp đang yếu, mở rộng từ Vật lí/Hoá học sang các môn khoa học tự nhiên khác và các cấp lớp thấp hơn, và phát triển Community Hub thành một thư viện học liệu chia sẻ đã được thẩm định.

---

### 6. Phạm vi và giới hạn dự án

#### 6.1 Tính năng chính

Liên kết sơ đồ: https://miro.com/app/board/uXjVHM0nOps=/ — *Hình 1.1: Cây tính năng của dự án*

| Mã | Mô tả tính năng |
| --- | --- |
| **FE-01** | **Xác thực và hồ sơ người dùng.** Trang Landing công khai. Người dùng được cấp quyền đăng nhập bằng Google OAuth2 với email đã được cấp quyền truy cập nền tảng. Chỉ tài khoản không ở trạng thái Disabled mới đăng nhập được; lần đăng nhập đầu tiên của tài khoản Invited sẽ kích hoạt tài khoản đó. Phân quyền theo vai trò kiểm soát việc truy cập các màn hình và các chức năng riêng theo vai trò. Người dùng có thể đăng xuất và cập nhật thông tin hồ sơ như tên hiển thị, ảnh đại diện, trường và môn dạy. Principal quản lý tài khoản Moderator, còn mỗi Moderator quản lý tài khoản Teacher thuộc môn mình phụ trách. |
| **FE-02** | **Giáo án.** Giáo viên chọn phạm vi nội dung hợp lệ gồm môn, khối lớp, bài học và các đơn vị kiến thức liên quan để sinh giáo án dựa trên cơ sở dữ liệu kiến thức SGK Kết nối tri thức. Giáo viên có thể thêm một chỉ dẫn ngắn dạng văn bản tự do để định hướng nội dung sinh ra trong phạm vi đã chọn. Giáo án sinh ra theo cấu trúc Công văn 5512/BGDĐT. Giáo viên có thể sửa nội dung thủ công hoặc bằng chỉ dẫn AI, và xuất giáo án hoàn chỉnh ra file PDF qua hộp thoại in của trình duyệt. Giáo án được tự động lưu vào Thư viện cá nhân. Khi giáo án được nộp cho một nhiệm vụ tuần được giao, nó phải được Moderator của môn duyệt thì mới đủ điều kiện để tạo slide và đề kiểm tra. |
| **FE-03** | **Slide.** Từ một giáo án đủ điều kiện, hệ thống dùng AI sinh dàn ý slide. Giáo viên xem lại và chỉnh dàn ý trước khi sinh bộ slide hoàn chỉnh. Cả dàn ý lẫn bộ slide đều sửa được thủ công. Hệ thống hỗ trợ trình chiếu toàn màn hình trực tuyến và xuất HTML để trình chiếu offline. Nội dung slide được tự động lưu vào Thư viện cá nhân. |
| **FE-04** | **Mô phỏng và công cụ theo môn.** Physics Hub cho phép giáo viên Vật lí duyệt các hiện tượng vật lí tương tác và tự điều chỉnh các tham số mà mỗi mô phỏng hỗ trợ để quan sát hành vi của nó. Chemistry Lab cung cấp bảng tuần hoàn tương tác 118 nguyên tố, thông tin nguyên tố, mô hình nguyên tử 3D tương tác, và sinh mô hình phân tử hữu cơ 3D từ tên hoặc công thức hợp chất. |
| **FE-05** | **Đề kiểm tra.** Giáo viên cấu hình đề bằng cách chọn khung đề, số câu hỏi, mức độ, dạng câu hỏi và phạm vi nội dung SGK. Các khung đề được hỗ trợ gồm bài kiểm tra ngắn 15 phút, bài kiểm tra 45 phút, và thời lượng tuỳ chỉnh tối đa 90 phút. Việc tạo đề đi qua bốn bước có kiểm soát: Cấu hình → Ma trận → Bản đặc tả → Đề. Giáo viên có thể xem lại và chỉnh Ma trận và Bản đặc tả trước khi sinh câu hỏi. Thay đổi ở bước trước sẽ vô hiệu hoá các bước sau bị ảnh hưởng và cần xác nhận. Khi chỉ một phần phản hồi của AI không hợp lệ, hệ thống giữ lại các câu hỏi hợp lệ và chỉ sinh lại phần bị lỗi nếu có thể. Đề hoàn chỉnh cùng đáp án có thể xuất ra file in được. Đề sinh ra nhằm phục vụ kiểm tra thường xuyên tại lớp; việc chấm bài và ghi nhận điểm vẫn thuộc về giáo viên và sổ điểm hiện có của nhà trường (EX-01). |
| **FE-06** | **Thư viện cá nhân.** Thư viện cá nhân lưu giáo án, bộ slide, đề kiểm tra, các mô phỏng Vật lí đã tuỳ chỉnh, mô hình phân tử đã sinh và các học liệu khác thuộc sở hữu của giáo viên. Nội dung mới sinh được lưu ở dạng bản nháp riêng tư. Nội dung do giáo viên tạo được tự động lưu ở lần sinh đầu tiên; các thay đổi sau đó lưu thủ công. Chỉ chủ sở hữu mới sửa hoặc xoá được học liệu của mình. Giáo viên có thể tìm kiếm, lọc, dùng lại, xuất, nộp hoặc xoá nội dung của mình. Sửa nội dung đang chờ duyệt sẽ rút nó khỏi hàng chờ. Sửa nội dung đã công bố sẽ tạo một bản sửa riêng tư mới, trong khi bản đã công bố giữ nguyên cho tới khi bản mới được duyệt. |
| **FE-07** | **Community Hub.** Giáo viên có thể duyệt, tìm kiếm, lọc, xem và bình luận trên nội dung giảng dạy đã công bố. Giáo viên có thể gửi nội dung của mình cho Moderator của môn để duyệt, hoặc rút lại khi còn đang chờ. Nội dung được duyệt sẽ hiển thị công khai trên Community Hub; nội dung bị từ chối không được công bố và kèm lý do từ chối. Giáo viên có thể tuỳ biến một nội dung đã công bố bằng cách tạo một bản sao riêng tư độc lập trong Thư viện cá nhân; thay đổi trên bản sao không ảnh hưởng bản gốc. Giáo viên quản lý được bình luận của chính mình, còn chủ sở hữu nội dung có thêm quyền ẩn bình luận đăng trên nội dung của mình. |
| **FE-08** | **Quản lý theo vai trò.** Mỗi Moderator quản lý tài khoản Teacher, nội dung giảng dạy, giáo án nộp lên và kiểm duyệt bài blog gắn thẻ môn — chỉ trong phạm vi môn mình phụ trách. Moderator có thể thêm hoặc khoá tài khoản Teacher và duyệt hoặc từ chối nội dung trên Community Hub. Principal quản lý tài khoản Moderator, gồm thêm, thay thế và khoá Moderator, đồng thời xem báo cáo toàn trường. Mỗi môn phải có đúng một Moderator đang hoạt động, và một Moderator chỉ được gán cho một môn. IT Support Staff xem nhật ký hoạt động hệ thống và quản lý các system prompt của AI. |
| **FE-09** | **Blog.** Giáo viên và Moderator có thể tạo và đăng bài blog ngay lập tức mà không cần duyệt trước. Mỗi bài gắn một thẻ môn để phục vụ tìm kiếm và lọc. Tác giả có thể sửa hoặc xoá bài của mình, và tạo/sửa/xoá bình luận của mình. Moderator chỉ được gỡ một bài khi thẻ môn của bài đó trùng với môn mình phụ trách, và phải nêu lý do gỡ. |
| **FE-10** | **Lớp học.** Giáo viên có thể tạo và quản lý các lớp mình sở hữu, cập nhật thông tin lớp, và đặt lớp ở trạng thái Active hoặc Inactive. Học sinh được thêm thủ công hoặc nhập từ file theo mẫu hỗ trợ. Giáo viên có thể đăng học liệu hoặc bài tập bằng một bản chụp độc lập lấy từ Thư viện cá nhân hoặc file tải lên trực tiếp, cấu hình yêu cầu nộp bài và hạn nộp, cập nhật hoặc xoá học liệu đã đăng, xem tình trạng nộp bài của học sinh, xem chi tiết bài nộp và tải file bài nộp. Học sinh trong lớp có thể xem và tải học liệu, tải file bài làm lên, rút bài nộp trước hạn và nộp file thay thế. Mỗi học sinh chỉ giữ một bài nộp đang hiệu lực cho mỗi bài tập. Lớp ở trạng thái Inactive chỉ đọc, vẫn giữ nguyên học liệu và bài nộp hiện có. Tính năng Lớp học được định vị là kênh phát và thu học liệu do chính EDUA sinh ra, không nhằm thay thế hệ thống quản lý học tập (LMS) của nhà trường (EX-09). |
| **FE-11** | **Lịch tuần và duyệt giáo án.** Moderator và giáo viên xem được lịch nhiệm vụ soạn giáo án theo tuần. Moderator tạo nhiệm vụ, giao cho một giáo viên đủ điều kiện trong cùng môn và nêu phạm vi; hạn nộp được tính tự động là cuối tuần được giao. Nhiệm vụ có thể sửa trước hạn. Giáo viên được giao xem nhiệm vụ và nộp một giáo án thuộc sở hữu của mình trước hạn. Moderator xem bản chụp đã nộp rồi duyệt hoặc từ chối kèm lý do. Giáo án được duyệt sẽ đủ điều kiện để tạo slide và đề kiểm tra ở bước sau; giáo án bị từ chối phải sửa và nộp lại. |
| **FE-12** | **Thông báo.** Người dùng xem được thông báo với trạng thái đã đọc/chưa đọc. Hệ thống sinh thông báo cho các sự kiện liên quan như: được giao nhiệm vụ, nhiệm vụ có thay đổi, sắp đến hạn, kết quả duyệt giáo án, kết quả kiểm duyệt trên Community Hub, có học liệu mới trong lớp, và có bình luận mới. Moderator còn có thể tạo thông báo cấp môn, chỉ gửi tới giáo viên thuộc môn mình phụ trách. Thông báo được gửi trong ứng dụng web, gồm cả thông báo nổi thời gian thực khi người dùng đang trực tuyến. |
| **FE-13** | **Báo cáo và thống kê.** Principal xem được thống kê toàn trường về: lượng nội dung do AI sinh ra theo thời gian, phân bố nội dung theo môn, kết quả duyệt giáo án theo tuần, kết quả kiểm duyệt trên Community Hub, và tình trạng tài khoản theo vai trò. Một số báo cáo hỗ trợ lọc theo khoảng thời gian và theo môn. |

#### 6.2 Giới hạn

| Mã | Mô tả |
| --- | --- |
| **LI-01** | **Nội dung do AI sinh ra không thể bảo đảm chính xác 100%:** công nghệ AI/LLM nền tảng không thể đạt độ chính xác tuyệt đối về mặt kiến thức. Mọi giáo án, bộ slide, đề kiểm tra và mô phỏng sinh ra đều cần giáo viên rà lại trước khi dùng. |
| **LI-02** | **Độ tin cậy hạn chế với chỉ dẫn nằm ngoài SGK:** chỉ dẫn dạng văn bản tự do của giáo viên có thể đưa vào những thông tin không nằm trong cơ sở dữ liệu SGK đã chuẩn bị. Phần nội dung đó không thể bảo đảm là đúng. |
| **LI-03** | **Yêu cầu phần cứng tối thiểu cho mô phỏng 3D:** mô hình nguyên tử 3D, mô hình phân tử và mô phỏng Vật lí tương tác cần thiết bị có tối thiểu 8 GB RAM để chạy ở mức chất lượng hiển thị tiêu chuẩn; dự án không tối ưu các tính năng này cho thiết bị dưới ngưỡng đó. |
| **LI-04** | **Không có thẩm định độc lập của chuyên gia cho nội dung trên Community Hub:** nội dung trên Community Hub do Moderator của môn duyệt và được đánh giá qua phản hồi cộng đồng. Dự án không cung cấp thẩm định chuyên môn độc lập cho từng nội dung được công bố. |
| **LI-05** | **Cấu trúc giáo án cố định:** giáo án sinh ra theo cấu trúc Công văn 5512/BGDĐT. Trường dùng mẫu bổ sung hoặc mẫu riêng có thể phải tự định dạng lại tài liệu đã xuất. |
| **LI-06** | **Cộng đồng khởi động nguội:** Community Hub và Blog giai đoạn đầu có thể ít giá trị vì số giáo viên tham gia, số bình luận và số học liệu chia sẻ còn ít trong giai đoạn thí điểm. |
| **LI-07** | **Dữ liệu SGK chuẩn bị thủ công:** cơ sở dữ liệu kiến thức SGK do nhóm dự án bóc tách, cấu trúc hoá, ánh xạ và kiểm tra thủ công. Sai sót trong dữ liệu đã chuẩn bị có thể ảnh hưởng tới nhiều đầu ra do AI sinh. |
| **LI-08** | **Không đối chiếu tự động đầu ra với nguồn:** nền tảng không có bộ máy kiểm chứng riêng để tự động so từng câu sinh ra với nội dung SGK gốc. |
| **LI-09** | **Độ trung thực của mô phỏng có giới hạn:** mô phỏng phục vụ giáo dục là mô hình đơn giản hoá và có thể không tái hiện mọi điều kiện vật lí hay hoá học của phòng thí nghiệm thật. |
| **LI-10** | **Sai lệch lan truyền trong chuỗi AI:** dữ liệu nguồn đúng vẫn có thể bị diễn đạt lại, bỏ sót hoặc đổi cấu trúc trong quá trình sinh giáo án, slide, đề kiểm tra hoặc mô phỏng. |
| **LI-11** | **Nội dung tải lên được mặc định tin cậy:** hệ thống kiểm tra loại và dung lượng file tải lên nhưng không kiểm chứng nội dung giáo dục bên trong có đúng hay không. |
| **LI-12** | **Phụ thuộc kết nối khi sinh nội dung:** việc sinh và tuỳ biến bằng AI cần kết nối Internet. Giáo án, đề kiểm tra và bộ slide HTML đã xuất trước đó có thể dùng offline, nhưng không thể sinh nội dung mới khi offline. |
| **LI-13** | **Phạm vi nội dung khi ra mắt còn hạn chế:** trong thời lượng dự án, nhóm chỉ chuẩn bị và kiểm tra được một phần nội dung KNTT cho Hoá học, Vật lí và Toán lớp 10–12. Không phải bài học nào trong SGK cũng có sẵn khi ra mắt. Môn Toán chỉ được phủ ở mức sinh giáo án, slide và đề kiểm tra, không có engine mô phỏng tương tác (EX-07). |
| **LI-14** | **Phụ thuộc dịch vụ bên ngoài:** xác thực, sinh nội dung bằng AI và lưu trữ file phụ thuộc Google Identity Service, một nhà cung cấp AI/LLM bên ngoài, và Cloudflare R2. Thay đổi về khả dụng, hiệu năng, giá hoặc API của các dịch vụ này đều có thể ảnh hưởng tới EDUA. |
| **LI-15** | **Nút thắt kiểm duyệt:** giáo án nộp qua nhiệm vụ tuần và nội dung gửi lên Community Hub phụ thuộc vào việc Moderator duyệt kịp thời. Duyệt chậm có thể khiến giáo viên không kịp hoàn thành các bước chuẩn bị sau đó. |
| **LI-16** | **Chỉ có thông báo trong ứng dụng:** thông báo chỉ hiển thị bên trong ứng dụng web EDUA. Hệ thống không gửi push di động, SMS hay email. |
| **LI-17** | **Hạn chế khi tải file:** học liệu tải lên nói chung chỉ nhận .docx, .pdf, .pptx, .png, .jpg, .jpeg và .webp, dung lượng tối đa 10 MB mỗi file. File nhập danh sách học sinh theo mẫu và định dạng riêng. |
| **LI-18** | **Không lưu lịch sử phiên bản bài nộp:** mỗi học sinh chỉ có một bài nộp đang hiệu lực cho một bài tập. Nộp lại sẽ thay thế bài trước đó chứ không giữ lịch sử đầy đủ các lần nộp. |
| **LI-19** | **Lớp Inactive chỉ đọc:** khi lớp chuyển sang Inactive, học liệu và bài nộp hiện có vẫn xem được, nhưng giáo viên và học sinh không thể thay đổi thành viên, học liệu hay bài nộp cho tới khi lớp được kích hoạt lại. |
| **LI-20** | **Chỉ một nhà cung cấp đăng nhập:** truy cập hệ thống cần tài khoản Google có email đã được cấp quyền. Hệ thống không hỗ trợ đăng nhập bằng email/mật khẩu hay nhà cung cấp danh tính khác. |
| **LI-21** | **Định dạng xuất không sửa được:** giáo án và đề kiểm tra được xuất qua chức năng in của trình duyệt để lưu thành PDF, còn bộ slide xuất ra gói ZIP chứa bản trình chiếu HTML kèm học liệu đi kèm. Nền tảng không xuất file nguồn sửa được như .docx hay .pptx. |
| **LI-22** | **Phạm vi tính năng bị thu hẹp do thời lượng dự án:** trong thời lượng có được, nhóm không thể hoàn thiện toàn bộ các tính năng tương tác dự kiến ban đầu. Phòng thí nghiệm Hoá học ảo — gồm bàn thí nghiệm kéo-thả, trộn chất và dự đoán phản ứng tự động — đã bị loại khỏi Release 1.0 vì lý do này. |
| **LI-23** | **Luồng quản lý lớp chưa đầy đủ:** trong thời lượng dự án, tính năng Lớp học mới chỉ triển khai các luồng lõi về lớp, học liệu và bài nộp. Các luồng bổ trợ như điểm danh, dạy trực tuyến thời gian thực, chat lớp học và quản lý sổ điểm chưa hoàn thành. |

#### 6.3 Loại trừ

| Mã | Mô tả |
| --- | --- |
| **EX-01** | **Không làm bài trực tuyến và không chấm tự động:** EDUA sinh và xuất đề kiểm tra kèm đáp án, nhưng học sinh không làm đề trên nền tảng và hệ thống không chấm câu trả lời hay tính điểm. Điểm của học sinh là hồ sơ chính thức của nhà trường, lưu trong sổ điểm điện tử hiện có; việc tích hợp với SIS của trường đã bị loại trừ tại EX-09. |
| **EX-02** | **Không có ứng dụng di động gốc:** EDUA là ứng dụng web đáp ứng đa thiết bị; dự án không cung cấp ứng dụng Android hay iOS cài đặt riêng. |
| **EX-03** | **Không phải hệ thống quản lý trường học đầy đủ:** quản lý lớp chỉ giới hạn ở lớp do giáo viên sở hữu, thành viên, học liệu chia sẻ, bài tập và bài nộp. Tuyển sinh, xếp thời khoá biểu toàn trường, quản lý điểm danh hành chính, hồ sơ học sinh chính thức, học phí, tài khoản và liên lạc phụ huynh, cùng các chức năng CRM của trường đều nằm ngoài phạm vi dự án. |
| **EX-04** | **Không soạn thảo cơ sở dữ liệu SGK trong ứng dụng:** cơ sở dữ liệu kiến thức KNTT do nhóm dự án chuẩn bị và duy trì bên ngoài ứng dụng; người dùng nền tảng không sửa được dữ liệu SGK lõi. |
| **EX-05** | **Không hỗ trợ chương trình, khối lớp hoặc môn ngoài phạm vi:** dự án phủ phần nội dung KNTT đã chọn cho Hoá học, Vật lí và Toán lớp 10–12; các bộ SGK khác, khối lớp thấp hơn, môn khác và chương trình quốc tế như Cambridge hay IB nằm ngoài phạm vi hiện tại. |
| **EX-06** | **Không có bộ máy kiểm chứng kiến thức tự động:** tính đúng đắn về chuyên môn vẫn là trách nhiệm của con người; nền tảng không tự động chứng nhận nội dung do AI sinh hoặc do giáo viên tải lên là chính xác. |
| **EX-07** | **Không có engine mô phỏng tương tác cho môn Toán:** môn Toán không có engine mô phỏng tuỳ chỉnh được như Physics Hub hay Chemistry Lab; nội dung Toán có thể dùng hình ảnh tĩnh làm sẵn thay thế. |
| **EX-08** | **Không có kinh tế token, thanh toán hay chợ nội dung:** nội dung trên Community Hub được chia sẻ miễn phí; dự án không hỗ trợ gói thuê bao, mua bán, chia sẻ doanh thu, token ảo hay nội dung trả phí. |
| **EX-09** | **Không tích hợp LMS hay SIS bên ngoài:** EDUA không đồng bộ lớp, học liệu, bài tập, bài nộp hay báo cáo với Google Classroom, Microsoft Teams, Moodle hoặc LMS/SIS của trường, và Google OAuth2 chỉ dùng để xác thực. Các tính năng lớp học chỉ tồn tại để phát và thu học liệu do chính nền tảng sinh ra. |
| **EX-10** | **Không phát hành thương mại rộng rãi:** hệ thống được phát triển để thí điểm tại trường khách hàng; việc phát hành công khai hoặc thương mại và phân phối lại nội dung dẫn xuất từ SGK nằm ngoài phạm vi dự án hiện tại. |
| **EX-11** | **Không có hệ thống quản lý phiên bản file đầy đủ:** EDUA giữ các bản sửa của nội dung đã công bố khi áp dụng được, nhưng không lưu lịch sử phiên bản cho mọi lần chỉnh sửa, mọi học liệu lớp hay mọi bài nộp. |
| **EX-12** | **Không có chỉnh sửa bằng AI cho slide và đề kiểm tra:** chỉnh sửa bằng chỉ dẫn văn bản tự do chỉ áp dụng cho giáo án và mô phỏng Vật lí; bộ slide, đề kiểm tra và mô hình phân tử chỉ sửa được thủ công. |
| **EX-13** | **Không tạo mô phỏng mới:** giáo viên sử dụng và tuỳ chỉnh thư viện mô phỏng Vật lí cùng các công cụ Chemistry Lab qua tham số, nhưng không thể tự viết mô phỏng tương tác mới hay thêm loại mô phỏng mới. |
| **EX-14** | **Học sinh không tự đăng ký vào lớp:** học sinh chỉ được thêm vào lớp bởi giáo viên sở hữu lớp, qua nhập tay hoặc nhập từ file; hệ thống không cung cấp mã tham gia lớp. |
