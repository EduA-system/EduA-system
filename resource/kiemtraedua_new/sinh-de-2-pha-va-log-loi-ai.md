# Tách pha sinh đề (câu hỏi / lời giải) và logging debug lỗi AI

> Tài liệu này bổ sung cho `khung-tao-de-luyen-tap-ai.md` (spec gốc của luồng
> `/exam-create-new`). Không thay thế spec gốc — chỉ mô tả 2 cải tiến áp dụng
> lên cùng luồng đó: (1) tách pha sinh câu hỏi và lời giải cho MC/TF để giáo
> viên thấy đề nhanh hơn, (2) logging có cấu trúc để debug lỗi JSON khi AI
> không sinh được đề.

---

## 1. Vấn đề hiện tại

Luồng hiện tại gọi `POST /api/practice-exams/generate` một lần; backend chạy
song song nhiều batch AI theo dạng câu hỏi, nhưng **mỗi batch sinh cả câu hỏi
lẫn đáp án/lời giải/rubric cùng một lượt gọi AI**. Giáo viên phải chờ đến khi
batch chậm nhất xong (thường là `ESSAY`, timeout 90 giây/batch) mới thấy được
đề, dù phần lớn thời gian đọc-duyệt đề của giáo viên không cần lời giải xuất
hiện ngay lập tức.

Bên cạnh đó, lỗi phổ biến nhất khi vận hành là AI trả JSON sai (cú pháp lỗi,
thiếu field, hoặc bị cắt cụt do chạm giới hạn token) khiến không sinh được câu
hỏi. Log hiện tại chỉ ghi độ dài response và cờ "có fenced code block hay
không" — không lưu lại nội dung thật của response nên không có gì để xem khi
điều tra sự cố.

---

## 2. Mục tiêu

1. Rút ngắn thời gian từ lúc giáo viên bấm "Tạo đề" đến lúc **thấy được đề**,
   mà không giảm chất lượng đáp án.
2. Khi AI sinh JSON sai, có đủ dữ liệu log (raw response, phân loại lỗi,
   thời gian từng giai đoạn, số lần retry) để xác định nguyên nhân mà không
   cần tái hiện lỗi thủ công.

---

## 3. Phạm vi tách pha

| Dạng câu hỏi | Xử lý |
|---|---|
| `MULTIPLE_CHOICE`, `TRUE_FALSE` | Tách 2 pha: sinh câu hỏi + đáp án cốt lõi trước, sinh `explanation` sau. |
| `SHORT_ANSWER`, `ESSAY` | **Giữ nguyên** sinh gộp 1 pha như hiện tại. |

Lý do không tách `SHORT_ANSWER`/`ESSAY`: lời giải và rubric của 2 dạng này
thường có tính toán nhiều bước và LaTeX phức tạp. Nếu tách ra một lượt gọi AI
riêng để "giải lại" bài toán từ nội dung câu hỏi, AI có thể ra kết quả không
khớp với chính câu hỏi nó không tạo ra — rủi ro sai lệch đáp án cao hơn lợi
ích giảm độ trễ.

---

## 4. Luồng 2 pha

```text
Pha 1 — Sinh câu hỏi (POST /api/practice-exams/generate-questions)
  → MC/TF: Prompt A — chỉ sinh content, options, answer (đáp án đúng),
    scoreCentiPoints, sourceLessonRefs. KHÔNG sinh explanation.
  → SHORT_ANSWER/ESSAY: prompt gộp hiện tại, không đổi (đủ answer +
    explanation + rubric ngay pha này).
  → Validate cấu trúc (đủ 4 options, tổng điểm, phạm vi SGK...).
  → Lưu đề vào Thư viện (createLibraryContent), MC/TF có explanation = null.
  → Trả về FE, FE hiển thị đề ngay (điều hướng sang /exam-edit-new).

Pha 2 — Sinh lời giải cho MC/TF (POST /api/practice-exams/generate-explanations)
  → FE tự động gọi ngay khi trang chỉnh sửa phát hiện có câu explanation = null.
  → Backend tự nạp lại knowledge_json theo sourceLessonRefs của các câu này
    (không dùng dữ liệu do FE gửi lên) để tránh client chỉnh sửa câu hỏi
    trước khi xin lời giải.
  → Prompt B — input là content + options + answer đã CỐ ĐỊNH; chỉ yêu cầu
    AI viết explanation bám theo đáp án đã cho. Không yêu cầu AI giải lại
    bài toán, nên rủi ro lệch đáp án thấp hơn nhiều so với tách pha SHORT_
    ANSWER/ESSAY.
  → FE merge explanation vào từng câu theo order, lưu lại đề đầy đủ vào Thư
    viện (updateLibraryContent).
```

Trong lúc chờ pha 2, trình soạn thảo ở `/exam-edit-new` bị khóa read-only
(`editor.setEditable(false)`) — nên không cần cơ chế version/hash để xử lý
race condition giữa việc giáo viên sửa nội dung và việc lời giải được patch
vào.

---

## 5. Schema JSON

### 5.1. Pha 1 — MULTIPLE_CHOICE (Prompt A)

```json
{
  "order": 1,
  "type": "MULTIPLE_CHOICE",
  "content": "...",
  "options": [
    { "key": "A", "content": "..." },
    { "key": "B", "content": "..." },
    { "key": "C", "content": "..." },
    { "key": "D", "content": "..." }
  ],
  "answer": { "correctOptionKey": "B" },
  "explanation": null,
  "scoreCentiPoints": 50,
  "sourceLessonRefs": [{ "bookCode": "LY10-KNTT", "chapterCode": "C2", "lessonCode": "B5" }]
}
```

### 5.2. Pha 1 — TRUE_FALSE (Prompt A)

TRUE_FALSE là dạng **4 mệnh đề Đúng/Sai độc lập**, không phải "chọn 1 đáp án
đúng" như MC. `answer` phải là map boolean theo từng mệnh đề, không dùng
`correctOptionKey`:

```json
{
  "order": 3,
  "type": "TRUE_FALSE",
  "content": "...",
  "options": [
    { "key": "A", "content": "..." },
    { "key": "B", "content": "..." },
    { "key": "C", "content": "..." },
    { "key": "D", "content": "..." }
  ],
  "answer": { "a": true, "b": false, "c": true, "d": false },
  "explanation": null,
  "scoreCentiPoints": 200,
  "sourceLessonRefs": [{ "bookCode": "LY10-KNTT", "chapterCode": "C2", "lessonCode": "B5" }]
}
```

### 5.3. Pha 2 — request gửi đi

```json
{
  "bookCode": "LY10-KNTT",
  "questions": [
    { "order": 1, "type": "MULTIPLE_CHOICE", "content": "...", "options": [...],
      "answer": { "correctOptionKey": "B" }, "scoreCentiPoints": 50,
      "sourceLessonRefs": [...] }
  ]
}
```

### 5.4. Pha 2 — response trả về

```json
{
  "explanations": [
    { "order": 1, "explanation": "..." },
    { "order": 3, "explanation": "..." }
  ]
}
```

---

## 6. API

| Trước | Sau |
|---|---|
| `POST /api/practice-exams/generate` | `POST /api/practice-exams/generate-questions` |
| _(không có)_ | `POST /api/practice-exams/generate-explanations` |

Cả hai endpoint giữ nguyên quyền truy cập `TEACHER`/`MODERATOR` như endpoint
cũ. `generate-questions` trả `PracticeExam` đầy đủ cấu trúc (MC/TF có
`explanation = null`, `SHORT_ANSWER`/`ESSAY` đầy đủ). `generate-explanations`
chỉ trả phần lời giải để FE tự merge, không trả lại toàn bộ đề.

---

## 7. Validation tách theo ranh giới

| Bước | Kiểm tra |
|---|---|
| Sau pha 1 | Tổng số câu, tổng điểm = 1000 centi-point, đủ 4 options cho MC/TF, `sourceLessonRefs` thuộc phạm vi đã chọn. **Không** kiểm tra `explanation` non-blank cho MC/TF (vì null là hợp lệ ở bước này). |
| Sau pha 2 | Tập `order` trả về khớp chính xác tập đã gửi (không thiếu, không thừa), `explanation` không rỗng cho mọi câu. |

---

## 8. Logging debug lỗi JSON

Mục tiêu: khi AI trả JSON sai khiến không sinh được câu hỏi, có đủ dữ liệu để
xác định nguyên nhân mà không cần tái hiện lỗi.

- **`runId`**: UUID sinh ra ở đầu mỗi lần gọi `generate-questions` hoặc
  `generate-explanations`, xuất hiện trong mọi dòng log của lần gọi đó (thay
  cho việc chỉ định danh bằng `type + offset` như hiện tại).
- **Log raw response trước khi parse**: khi parse thất bại, ghi lại nội dung
  response thật (rút gọn, một dòng) thay vì chỉ ghi độ dài — theo đúng pattern
  đã có sẵn trong `ExamGenerationService` (hàm `preview()`).
- **Phân loại lỗi thành 3 nhóm** (thay vì chỉ ghi tên class exception):
  - `TRUNCATED_OUTPUT`: response không kết thúc bằng `]`/`}` hợp lệ, hoặc lỗi
    parse kiểu "end-of-input" — dấu hiệu bị cắt cụt do hết giới hạn token.
  - `JSON_SYNTAX_ERROR`: lỗi cú pháp JSON khác (thường do escape sai trong
    chuỗi — LaTeX, dấu ngoặc kép lồng nhau).
  - `SCHEMA_ERROR`: parse JSON thành công nhưng sai số lượng câu/loại câu/
    thiếu field — nguyên nhân là AI hiểu sai mô tả schema trong prompt.
- **Tách thời gian chờ tài nguyên và thời gian AI xử lý**: đo riêng thời gian
  chờ `Semaphore` (giới hạn số batch chạy đồng thời) và thời gian AI thực sự
  phản hồi, để biết hệ thống chậm do nghẽn tài nguyên hay do AI phản hồi
  chậm.
- **Log kết quả retry**: không chỉ log khi retry thất bại như hiện tại, mà
  còn log rõ khi một batch **thành công sau khi retry** — để sau này đánh giá
  được tỷ lệ retry có thực sự cải thiện kết quả hay không.

**Không làm ở lần này**: không tạo bảng riêng trong database
(`ai_generation_failure_log`). Log dạng có cấu trúc ra console là đủ cho nhu
cầu debug hiện tại; chỉ cân nhắc thêm bảng nếu sau này cần dựng dashboard
phân tích xu hướng lỗi theo thời gian dài.

---

## 9. Ảnh hưởng lên tài liệu spec gốc

`khung-tao-de-luyen-tap-ai.md` cần cập nhật 3 mục để không lệch với code sau
khi triển khai tài liệu này:

- §6.3 "Đề AI phải trả": ghi chú `explanation` có thể `null` cho MC/TF ngay
  sau pha 1, và sửa ví dụ schema `answer` của TRUE_FALSE thành map boolean.
- §7 "Pipeline sinh đề": thêm bước tách pha cho MC/TF.
- §9 "Định hướng API": cập nhật danh sách endpoint theo mục 6 ở trên.
