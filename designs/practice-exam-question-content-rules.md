# Quy định cho các loại bài tập trong chức năng tạo đề kiểm tra (`/exam-create-new`)

Phạm vi: đề ôn tập nhanh cho giáo viên (không phải đề thi chính thức mô phỏng Bộ GD&ĐT nên **không cần ma trận đề / phân bổ cấp độ nhận thức** — xem lý do ở mục 2).

Nguồn: đọc code (`fe/components/dashboard/PracticeExamCreateDashboard.tsx`, `fe/services/practiceExamService.ts`, `be/src/main/java/com/edua/beeduasystem/service/practiceexam/PracticeExamService.java`, `be/src/main/java/com/edua/beeduasystem/presentation/controller/PracticeExamController.java`) + nghiên cứu web về chuẩn ra đề Việt Nam. Xem thêm `designs/exam-create-new-inputs.md` cho luồng input/UI chi tiết của trang này.

---

## 1. Quy định hiện có trong code (đã implement)

### 1.1 Cấu trúc đề chung (`validateStructure`, be `PracticeExamService.java`)

- Thời lượng: số nguyên, 1–90 phút.
- Độ khó: `EASY | MEDIUM | HARD` — chỉ ảnh hưởng bảng thời gian ước tính/câu, **không** ảnh hưởng nội dung/độ khó thật của câu hỏi AI sinh ra.
- Tổng điểm toàn đề: bắt buộc đúng 10 điểm (1000 centi-points).
- Mỗi dạng câu: `questionCount = 0` ⇔ điểm dạng đó = 0 (không được lệch pha).
- Tổng số câu khai báo phải khớp tổng theo từng dạng.
- Phạm vi kiến thức: bắt buộc chọn 1 SGK + ít nhất 1 bài học.

### 1.2 Kiểm tra khả thi thời gian (`feasibility`, dùng chung FE/BE)

Phút ước tính/câu theo độ khó (Dễ / Vừa / Khó):

| Loại câu | Dễ | Vừa | Khó |
|---|---|---|---|
| Trắc nghiệm nhiều lựa chọn | 0.75 | 1 | 1.5 |
| Đúng – sai | 2 | 3 | 4 |
| Trả lời ngắn | 1.5 | 2.5 | 4 |
| Tự luận | 4 | 6 | 9 |

- Dung sai vượt thời lượng: 5 phút (đề < 30p) hoặc 10 phút (đề ≥ 30p).
- `FEASIBLE` → tạo bình thường · `WARNING` → cần giáo viên tick xác nhận · `INFEASIBLE` → chặn hẳn.
- **Lưu ý:** bảng phút/câu này là tự đặt trong app, không đối chiếu được với văn bản MOET nào (MOET chỉ quy định tổng thời gian đề, không chia theo dạng câu).

### 1.3 Ràng buộc cấu trúc riêng từng loại câu (`validateQuestionStructure`)

- **MULTIPLE_CHOICE**: bắt buộc đúng 4 phương án A/B/C/D.
- **TRUE_FALSE**: bắt buộc đúng 4 mệnh đề (khớp định dạng thi TN THPT 2025).
- **SHORT_ANSWER**: không ràng buộc riêng, chỉ cần content + answer + nguồn.
- **ESSAY**: bắt buộc có rubric, tổng điểm rubric phải khớp chính xác điểm câu.
- **Chung**: mọi câu phải có `content`, `answer`, và ít nhất 1 `sourceLessonRefs` — nhưng **không có bước xác minh nội dung thực sự khớp knowledge_json**, chỉ tin AI tự gắn nhãn đúng.

### 1.4 Giới hạn hình thức khi AI sinh (`batchPrompt`)

- `content` ≤ 60 từ, `explanation` ≤ 40 từ, mỗi tiêu chí rubric ≤ 12 từ, ESSAY ≤ 4 tiêu chí rubric.
- Công thức toán/lý/hóa bắt buộc LaTeX (`$...$` inline, `$$...$$` cho lời giải nhiều bước) — có lớp tự sửa lỗi LaTeX phổ biến (`repairMathText`, `normalizeLatex`).
- Câu hỏi phải nằm trong phạm vi SGK/bài học đã chọn.

### 1.5 Giới hạn kỹ thuật (batch AI, không phải rule nghiệp vụ)

Số câu tối đa/lô gọi AI: MULTIPLE_CHOICE 5, SHORT_ANSWER 3, TRUE_FALSE 2, ESSAY 1 (do ESSAY sinh lâu hơn, timeout riêng 90s so với 60s).

---

## 2. Chuẩn thực tế Việt Nam — đã cân nhắc và quyết định bỏ qua

- Ma trận đề (mạch nội dung × 4 cấp độ nhận thức: Nhận biết/Thông hiểu/Vận dụng/Vận dụng cao), bản đặc tả, tỉ lệ % theo cấp độ.
- Ánh xạ từng câu hỏi với "Yêu cầu cần đạt" (YCCĐ) theo chương trình GDPT 2018.
- **Lý do bỏ qua hợp lệ về mặt quy chuẩn**: theo Thông tư 22/2021/TT-BGDĐT, yêu cầu bám ma trận/đặc tả/YCCĐ chỉ bắt buộc với **kiểm tra định kỳ** (giữa kỳ, cuối kỳ), không bắt buộc với hình thức ôn luyện/kiểm tra thường xuyên — đúng use-case của tính năng này.

## 3. Chuẩn thực tế Việt Nam — CHƯA có trong code, áp dụng cho mọi loại đề (kể cả đề ôn tập nhanh)

Đây là nguyên tắc sư phạm cơ bản (không phải thủ tục hành chính riêng cho đề thi chính thức), nên vẫn liên quan dù đã bỏ ma trận.

### 3.1 Trắc nghiệm nhiều lựa chọn (MCQ) — nguồn: Công văn 8773/BGDĐT-GDTrH

- Câu dẫn đặt vấn đề trực tiếp, cụ thể, không chép nguyên văn SGK.
- Phương án nhiễu phải "hợp lý" — dựa trên lỗi/ngộ nhận điển hình của học sinh, không phải nhiễu ngẫu nhiên vô nghĩa.
- Chỉ 1 đáp án đúng duy nhất; tránh "tất cả đều đúng/sai".
- Các phương án nhất quán về độ dài/hình thức (tránh đáp án đúng dài/ngắn khác biệt bất thường — vô tình gợi ý đáp án).
- Tránh phủ định kép trong câu dẫn; nếu dùng "KHÔNG"/"ngoại trừ" phải làm nổi bật.
- Đáp án câu này không được gợi ý cho câu khác.

→ **Prompt AI hiện tại (`batchPrompt`) không có dòng nào về việc này.**

### 3.2 Đúng-sai 4 ý

- 4 ý nên độc lập nhau (mỗi ý kiểm tra 1 khía cạnh riêng) hoặc theo mạch suy luận nối tiếp.
- Tránh tình trạng cả 4 ý cùng đúng hoặc cùng sai (làm mất ý nghĩa thiết kế chống khoanh bừa của định dạng này).

→ Prompt không có hướng dẫn tránh "cả 4 đúng/cả 4 sai" — rủi ro thật vì AI có xu hướng tạo statement dễ đoán.

### 3.3 Trả lời ngắn / điền đáp số

- Về bản chất là "tự luận rút gọn" — đáp án bắt buộc duy nhất, dạng số/chuỗi rõ ràng, không có nhiều cách diễn đạt hợp lệ khác nhau.

→ Prompt không yêu cầu AI đảm bảo đáp án SHORT_ANSWER là duy nhất/không mơ hồ (ví dụ "5m" vs "5"). Rủi ro thật nếu có chấm tự động khớp chuỗi.

### 3.4 Tự luận & biểu điểm — nguồn: Công văn 8773

Với Vật lí/Hóa học/Toán, "tự luận" (ESSAY) **không phải luận văn mở** kiểu Ngữ văn — đây là **bài tập tính toán/giải quyết vấn đề**: cho dữ kiện, học sinh thiết lập công thức/phương trình → thay số → tính toán → kết luận (có đơn vị nếu cần). Đáp án cuối gần như luôn là một kết quả duy nhất, không phải "đáp án mở".

- Câu hỏi phải đo được vận dụng kiến thức, không chỉ ghi nhớ.
- Biểu điểm chuẩn ở VN cho dạng bài tính toán này là **chấm theo từng bước giải** (Công văn 8773 yêu cầu hướng dẫn chấm rõ ràng, cụ thể hóa thành tiêu chí): ví dụ thiết lập đúng công thức/phương trình = X điểm, thay số đúng = Y điểm, ra đúng kết quả + đơn vị = Z điểm — mỗi bước có điểm riêng, sai bước nào mất điểm bước đó nhưng các bước sau vẫn được xét nếu học sinh dùng đúng phương pháp ("điểm theo phương pháp", không chỉ chấm đúng/sai đáp số cuối).

→ Prompt hiện chỉ yêu cầu "rubric cộng đúng điểm" + giới hạn độ dài (tối đa 4 tiêu chí/12 từ) — không yêu cầu rubric phải tách theo bước giải (thiết lập → thay số → kết quả), nên rubric AI sinh ra có thể chỉ liệt kê tiêu chí chung chung thay vì chấm được theo từng bước tính toán như chuẩn thực tế.

### 3.5 Chấm điểm bậc thang cho Đúng-Sai (quy định chính thức thi TN THPT 2025)

- Đúng 1/4 ý = 0,1đ · 2/4 ý = 0,25đ · 3/4 ý = 0,5đ · cả 4/4 ý = 1,0đ.
- Đây là quy định **chấm bài**, không phải tạo đề — cần kiểm tra riêng phần chấm bài (nếu EDUA có tính năng chấm tự động) xem có áp dụng bậc thang này hay đang chấm nhị phân.

---

## 4. Đề xuất ưu tiên (nếu muốn cải thiện chất lượng nội dung câu hỏi)

**Phạm vi hệ thống hiện tại: chỉ tạo đề (generate), không có tính năng chấm bài/nộp bài cho đề này** (đã grep toàn backend, không có service chấm điểm nào cho `practiceexam` — `SubmissionService` chỉ dùng cho nộp bài tập lớp `classroom`, khác luồng). Vì vậy mục thang điểm bậc thang 0,1/0,25/0,5/1 cho Đúng-Sai (mục 3.5) là quy định **chấm bài**, không áp dụng ở đây — cố tình bỏ qua, không phải thiếu sót.

1. ✅ **Đã làm**: bổ sung đoạn `QUY TẮC CHẤT LƯỢNG NỘI DUNG` vào `batchPrompt()` (`PracticeExamService.java`) — chỉ sửa text prompt, không đổi schema/DTO/validation vì `rubric` đã đủ linh hoạt chứa tiêu chí theo bước và `validateQuestionStructure` đã check tổng điểm khớp:
   - MCQ: yêu cầu nhiễu hợp lý dựa trên lỗi thường gặp, tránh trùng lặp/gợi ý qua độ dài, không dùng "tất cả đều đúng/sai".
   - TRUE_FALSE: yêu cầu 4 mệnh đề độc lập, tránh toàn đúng/toàn sai.
   - SHORT_ANSWER: yêu cầu đáp án là giá trị duy nhất, không mơ hồ, có đơn vị nếu là số.
   - ESSAY: làm rõ đây là bài tập tính toán (không phải luận mở), rubric phải chia theo từng bước giải (thiết lập công thức → thay số → kết quả) thay vì liệt kê tiêu chí chung chung.
2. (Tùy chọn, không cấp thiết) Thêm bước xác minh nhẹ nội dung câu hỏi có thực sự bám `knowledge_json` của bài đã chọn, thay vì chỉ tin AI tự gắn `sourceLessonRefs`. Khác mục 1 — mục này cần logic code thật (so khớp sau khi AI trả về), không chỉ sửa prompt.
