# Quy tắc chỉnh sửa Ma trận và Bản đặc tả

Tài liệu này quy định dữ liệu nào được chỉnh sửa tại `/exam-matrix`, dữ liệu
nào phải được khóa để nhất quán với cấu hình giáo viên đã xác nhận tại
`/exam-create`, và các điều kiện cần thỏa mãn trước khi tạo đề kiểm tra.

---

## 1. Nguyên tắc nguồn dữ liệu

Luồng nghiệp vụ:

```text
/exam-create
  → Giáo viên chọn thông tin kiểm tra và xác nhận cấu trúc đề
  → Hệ thống xác định phạm vi SGK
  → AI tạo Ma trận và Bản đặc tả

/exam-matrix
  → Giáo viên chỉnh nội dung chuyên môn và cách phân bổ chi tiết
  → Hệ thống kiểm tra lại các ràng buộc đã chốt
  → Tạo đề kiểm tra
```

Những gì giáo viên đã xác nhận tại `/exam-create` là ràng buộc đầu vào, không
được sửa trực tiếp tại `/exam-matrix`. Nếu muốn thay đổi, giáo viên phải quay
lại `/exam-create`; Ma trận, Bản đặc tả và Đề kiểm tra đã sinh từ cấu hình cũ
phải được đánh dấu là cần tạo lại.

---

## 2. Dữ liệu phải khóa từ `/exam-create`

Các dữ liệu sau không được chỉnh trực tiếp trong hai bảng tại `/exam-matrix`:

- môn học;
- lớp;
- loại kiểm tra;
- phạm vi kiến thức tương ứng;
- mức độ chung `EASY`, `MEDIUM`, `HARD`;
- danh sách dạng câu hỏi được sử dụng;
- tổng số câu của từng dạng;
- điểm mỗi câu;
- tổng điểm của từng dạng;
- tỉ lệ điểm của từng dạng;
- tỉ lệ Nhận biết, Thông hiểu và Vận dụng;
- cấu hình có hoặc không có Tự luận đối với lớp 12;
- tổng điểm toàn đề là 10 điểm.

Các giá trị này có thể được hiển thị tại `/exam-matrix` để giáo viên đối chiếu,
nhưng phải ở trạng thái chỉ đọc.

---

## 3. Quy tắc chỉnh sửa bảng Ma trận

### 3.1. Ô được chỉnh sửa

Giáo viên được chỉnh:

- `Chủ đề/Chương` do AI đề xuất;
- `Nội dung/đơn vị kiến thức` do AI đề xuất;
- số câu phân bổ cho từng đơn vị kiến thức theo tổ hợp:
  - Nhiều lựa chọn × Nhận biết/Thông hiểu/Vận dụng;
  - Đúng–Sai × Nhận biết/Thông hiểu/Vận dụng;
  - Trả lời ngắn × Nhận biết/Thông hiểu/Vận dụng;
  - Tự luận × Nhận biết/Thông hiểu/Vận dụng.

Các ô phân bổ số câu được chỉnh có điều kiện: tổng sau chỉnh sửa phải tiếp tục
khớp với số câu, số điểm và tỉ lệ nhận thức đã xác nhận tại `/exam-create`.

### 3.2. Ô không được chỉnh sửa

Các ô sau phải khóa:

- tiêu đề và header bảng;
- tên các dạng câu hỏi;
- tên ba mức độ nhận thức;
- trạng thái có hoặc không có dạng Tự luận;
- STT, do hệ thống tự đánh số;
- cột tổng theo từng dòng;
- cột `Tỉ lệ % điểm`;
- hàng `Tổng số câu`;
- hàng `Tổng số điểm`;
- hàng `Tỉ lệ %`.

Mọi ô tổng hợp phải được hệ thống tự tính từ dữ liệu phân bổ, không cho giáo
viên nhập tay.

### 3.3. Phân loại ô trong Ma trận

| Nhóm ô | Cho sửa | Cách xử lý |
|---|---:|---|
| Chủ đề/chương | Có | AI đề xuất, giáo viên được chỉnh trong phạm vi SGK |
| Nội dung/đơn vị kiến thức | Có | AI đề xuất, giáo viên được chỉnh trong phạm vi SGK |
| Phân bổ số câu | Có điều kiện | Không được phá vỡ tổng cấu hình đã chốt |
| STT | Không | Hệ thống tự đánh số |
| Tổng theo dòng | Không | Hệ thống tự tính |
| Tổng theo dạng câu | Không | Lấy từ cấu hình và đối chiếu với phân bổ |
| Tổng điểm | Không | Hệ thống tự tính |
| Tỉ lệ điểm | Không | Hệ thống tự tính |
| Header, dạng câu và mức độ | Không | Cấu trúc cố định của hệ thống |

---

## 4. Quy tắc chỉnh sửa bảng Bản đặc tả

### 4.1. Ô được chỉnh sửa

Giáo viên được chỉnh:

- `Yêu cầu cần đạt`;
- nội dung diễn giải chuyên môn gắn với từng đơn vị kiến thức.

`Chủ đề/Chương` và `Nội dung/đơn vị kiến thức` phải dùng cùng nguồn dữ liệu với
Ma trận. Nếu sản phẩm cho phép chỉnh các trường này trong Bản đặc tả thì thay
đổi phải cập nhật ngay sang Ma trận, không được tạo hai bản dữ liệu độc lập.

### 4.2. Ô không được chỉnh sửa

Các ô sau phải khóa:

- tiêu đề và header bảng;
- STT;
- tên dạng câu hỏi;
- tên mức độ nhận thức;
- số câu phân bổ theo dạng và mức độ, vì lấy từ Ma trận;
- hàng `Tổng số câu`;
- hàng `Tổng số điểm`;
- hàng `Tỉ lệ %`;
- mọi giá trị tổng hợp được tính từ Ma trận.

---

## 5. Nguồn dữ liệu chính giữa hai bảng

Không cho phép chỉnh độc lập số câu trong cả Ma trận và Bản đặc tả. Nếu cả hai
bảng cùng giữ một bản phân bổ riêng, hệ thống có thể phát sinh mâu thuẫn:

```text
Cấu hình tại /exam-create: 12 câu nhiều lựa chọn
Ma trận:                   12 câu nhiều lựa chọn
Bản đặc tả:                13 câu nhiều lựa chọn
```

Quy ước nguồn dữ liệu:

```text
Ma trận
  = nơi chỉnh phân bổ câu hỏi theo đơn vị kiến thức và mức độ

Bản đặc tả
  = đọc phân bổ từ Ma trận
  = nơi chỉnh Yêu cầu cần đạt và nội dung chuyên môn
```

Chương và đơn vị kiến thức phải dùng chung một model. Sửa tại một vị trí phải
cập nhật cho cả Ma trận và Bản đặc tả.

---

## 6. Validation khi chỉnh Ma trận

Sau mỗi thay đổi, hệ thống phải kiểm tra:

| Kiểm tra | Yêu cầu |
|---|---|
| Tổng số câu từng dạng | Bằng số câu đã xác nhận tại `/exam-create` |
| Tổng điểm từng dạng | Bằng tổng điểm đã xác nhận tại `/exam-create` |
| Tổng điểm toàn đề | Bằng 10 điểm |
| Tỉ lệ nhận thức | Bằng tỉ lệ Nhận biết/Thông hiểu/Vận dụng đã xác nhận |
| Giá trị số câu | Là số nguyên không âm |
| Phạm vi kiến thức | Không có đơn vị kiến thức ngoài phạm vi SGK đã chốt |
| Yêu cầu cần đạt | Đơn vị kiến thức có câu hỏi phải có Yêu cầu cần đạt |
| Đồng bộ hai bảng | Bản đặc tả phải khớp với Ma trận |

Thông báo lỗi phải chỉ rõ dạng câu hoặc mức độ đang sai. Ví dụ:

> Nhiều lựa chọn đang được phân bổ 13/12 câu. Vui lòng giảm 1 câu.

> Tỉ lệ Vận dụng hiện là 35%, khác cấu hình đã xác nhận là 30%.

Nút `Tạo đề thi` phải bị vô hiệu hóa trong khi còn lỗi validation.

---

## 7. Trạng thái hiển thị ô

Giao diện nên phân biệt trực quan ba loại ô:

| Trạng thái | Ý nghĩa | Gợi ý hiển thị |
|---|---|---|
| Có thể chỉnh | Nội dung giáo viên được phép thay đổi | Nền trắng, có focus/hover |
| Bị khóa | Giá trị đã chốt tại `/exam-create` hoặc cấu trúc hệ thống | Nền xám, con trỏ chỉ đọc |
| Tự tính | Giá trị hệ thống tính từ các ô khác | Nền nhạt, có biểu tượng máy tính |

Các ô bị khóa nên có tooltip giải thích, ví dụ:

> Giá trị này đã được xác nhận ở bước Cấu hình đề. Quay lại bước trước để thay đổi.

---

## 8. Yêu cầu triển khai editor

Không nên lưu Ma trận và Bản đặc tả chỉ dưới dạng HTML tự do trong một TipTap
editor, vì khi đó khó khóa từng ô, kiểm tra tổng và đồng bộ hai bảng.

Nên lưu dữ liệu nghiệp vụ dưới dạng structured state, ví dụ:

```text
ExamConfiguration
  → ExamMatrix
      → ChapterDistribution[]
          → KnowledgeUnit[]
              → QuestionAllocation
  → ExamSpecification
      → LearningOutcome[]
```

UI render bảng từ structured state. TipTap hoặc trường rich text chỉ nên dùng
cho nội dung văn bản cần định dạng như `Yêu cầu cần đạt`, không nên là nguồn dữ
liệu chính cho số câu, điểm hoặc tỉ lệ.

---

## 9. Luồng cuối cùng

```text
/exam-create
  → Chốt thông tin, cấu trúc, điểm và tỉ lệ

Ma trận
  → Chỉnh chương, đơn vị kiến thức và phân bổ chi tiết
  → Các tổng luôn được hệ thống tính và đối chiếu

Bản đặc tả
  → Đọc phân bổ từ Ma trận
  → Chỉnh Yêu cầu cần đạt và nội dung chuyên môn

Tạo đề
  → Chỉ cho phép khi Ma trận, Bản đặc tả và cấu hình ban đầu nhất quán
```
