# Khung tạo đề luyện tập trên lớp bằng AI

> Chức năng này tạo đề để giáo viên dùng trong lớp hoặc cho học sinh tự luyện.
> Đây là một luồng **độc lập** với tạo đề kiểm tra định kì: không lập Ma trận,
> không lập Bản đặc tả và không dùng lại workspace của luồng `/exam-create`.
>
> Giáo viên chủ động chọn nội dung SGK, số câu, dạng câu, điểm và độ khó. Hệ
> thống không áp đặt số câu theo thời lượng, nhưng phải kiểm tra cấu hình có khả
> thi trong thời gian đã chọn trước khi gọi AI.

---

## 1. Mục tiêu và nguyên tắc

Luồng tạo đề nhận cấu hình do giáo viên lập, dùng dữ liệu SGK trong database để
sinh đề, đáp án và hướng dẫn chấm. Mọi câu hỏi phải bám vào phạm vi kiến thức
giáo viên đã chọn.

### 1.1. Giáo viên quyết định

- Môn học và lớp.
- Loại đề/thời lượng: dùng preset `15`, `45`, `60` phút hoặc tự đặt nhãn và số
  phút khác.
- Tổng số câu của đề. Đây là số tự do, **không** bị loại đề đặt mặc định hay
  khóa cứng.
- Số câu thuộc từng dạng câu hỏi.
- Mức độ chung của đề: `EASY`, `MEDIUM`, hoặc `HARD`.
- Điểm từng dạng/câu/ý sau khi xem gợi ý của hệ thống.
- Sách, chương và bài SGK xuất hiện trong đề.

### 1.2. Hệ thống quyết định

- Danh sách dạng câu hỏi được hỗ trợ và JSON schema đầu ra.
- Cách cộng điểm, kiểm tra tổng điểm bằng 10 và kiểm tra tổng số câu.
- Ước tính tính khả thi của cấu hình theo thời lượng, dạng câu và mức độ.
- Chỉ nạp `knowledge_json` của các bài đã được giáo viên chọn.
- Kiểm tra kết quả AI trước khi hiển thị/lưu đề.

### 1.3. AI được phép làm

- Sinh nội dung câu hỏi, phương án, đáp án, lời giải, rubric và giải thích.
- Điều chỉnh độ phức tạp cách hỏi theo mức độ chung của đề.
- Gắn mỗi câu với một hoặc nhiều bài SGK nguồn nằm trong phạm vi đã chọn.

AI không được tự tăng/giảm số câu, đổi loại câu, sửa điểm, thay đổi thời lượng
hoặc dùng kiến thức ngoài các bài SGK đã chọn.

---

## 2. Luồng giáo viên tạo đề

```text
1. Chọn môn học và lớp
2. Chọn loại đề/thời lượng
   └─ Preset: 15 phút | 45 phút | 60 phút
   └─ Hoặc: nhãn + số phút tự nhập
3. Chọn phạm vi SGK
   └─ Sách → một/nhiều chương → một/nhiều bài
4. Nhập cấu trúc đề
   └─ Tổng số câu tự do
   └─ Phân bổ số câu theo từng dạng
   └─ Chọn mức độ chung
   └─ Hệ thống gợi ý điểm để đủ 10 điểm; giáo viên có thể sửa
5. Hệ thống kiểm tra tổng câu, tổng điểm và thời lượng khả thi
6. Giáo viên xác nhận cảnh báo (nếu có) và yêu cầu AI tạo đề
7. Giáo viên xem trước đề, đáp án và hướng dẫn chấm
   └─ Có thể sửa thủ công hoặc tạo lại riêng từng câu
8. Lưu đề riêng tư / dùng để in hoặc phát trong lớp
```

Tổng số câu của các dạng phải bằng tổng số câu giáo viên nhập:

```text
Tổng số câu = TN nhiều lựa chọn + Đúng–Sai + Trả lời ngắn + Tự luận
```

Ví dụ: đề 15 phút có thể là 5 câu hoặc 12 câu. Việc 12 câu có hợp lý hay không
được xác định bởi bộ kiểm tra thời lượng, không chỉ bởi số câu.

---

## 3. Dạng câu hỏi và chấm điểm

| Mã | Dạng câu hỏi | Dữ liệu AI phải trả |
|---|---|---|
| `MULTIPLE_CHOICE` | Trắc nghiệm nhiều lựa chọn | Nội dung, tối thiểu 4 phương án, đáp án đúng, giải thích, điểm |
| `TRUE_FALSE` | Trắc nghiệm đúng–sai | Đoạn dẫn, các mệnh đề, đáp án từng mệnh đề, giải thích, điểm |
| `SHORT_ANSWER` | Trả lời ngắn | Nội dung, đáp án chuẩn, các đáp án chấp nhận được nếu có, giải thích, điểm |
| `ESSAY` | Tự luận | Nội dung, đáp án/lời giải, rubric theo ý, điểm từng ý và tổng điểm |

Hệ thống đề xuất cách chia điểm ban đầu dựa vào số lượng và dạng câu. Giáo viên
có thể sửa điểm mỗi câu hoặc mỗi ý, nhưng cấu hình chỉ hợp lệ khi tổng bằng
`10.00` điểm. Backend lưu điểm theo số nguyên centi-point (`1000 = 10.00 điểm`)
để không phát sinh sai số số thực.

Với câu đúng–sai, điểm của câu và cách chấm phải được lưu rõ ràng. V1 có thể
chấm theo tổng điểm của các mệnh đề; nếu dùng quy tắc lũy tiến thì quy tắc này
phải là một trường cấu hình tường minh, không để AI tự suy diễn.

---

## 4. Kiểm tra tính khả thi theo thời lượng

Giáo viên được tự do tăng số câu để làm đề áp lực hơn, nhưng hệ thống phải chặn
cấu hình bất khả thi cho học sinh. Tính khả thi không thay thế quyền quyết định
chuyên môn; nó ngăn các cấu hình không thể hoàn thành về mặt thời gian.

### 4.1. Thời gian chuẩn V1

Đơn vị: phút cho mỗi câu/khối câu.

| Dạng câu | Dễ | Vừa | Khó |
|---|---:|---:|---:|
| TN nhiều lựa chọn | 0.75 | 1.00 | 1.50 |
| Đúng–Sai (một câu gồm 4 ý) | 2.00 | 3.00 | 4.00 |
| Trả lời ngắn | 1.50 | 2.50 | 4.00 |
| Tự luận | 4.00 | 6.00 | 9.00 |

Các giá trị này là cấu hình nghiệp vụ có thể hiệu chỉnh theo phản hồi giáo
viên, không phải chuẩn cố định của chương trình.

### 4.2. Công thức

```text
estimatedMinutes = Σ(questionCount[type] × baseMinutes[type][difficulty])
```

Trong V1, toàn đề dùng một mức độ chung nên bảng thời gian được chọn theo
`difficulty` của đề. Nếu sau này hỗ trợ mức độ riêng từng câu hoặc tỉ lệ mức
độ, hệ thống tính từng nhóm câu rồi cộng lại.

Hệ thống dành 15% thời lượng cho đọc đề, chuyển câu và soát bài:

```text
workingMinutes = durationMinutes × 0.85
```

### 4.3. Kết quả kiểm tra

| Trạng thái | Điều kiện | Hành vi |
|---|---|---|
| `FEASIBLE` | `estimatedMinutes ≤ workingMinutes` | Cho phép tạo đề bình thường. |
| `WARNING` | `workingMinutes < estimatedMinutes ≤ durationMinutes` | Hiển thị cảnh báo; giáo viên phải xác nhận mới được tạo. |
| `INFEASIBLE` | `estimatedMinutes > durationMinutes` | Chặn tạo đề và chỉ rõ số phút vượt; không gọi AI. |

Ví dụ: đề `15 phút`, `10 câu tự luận`, mức `HARD` có thời lượng ước tính
`10 × 9 = 90 phút`. Cấu hình là `INFEASIBLE`; giáo viên phải giảm số câu, giảm
độ khó hoặc tăng thời lượng. Ngược lại, đề 15 phút với nhiều câu trắc nghiệm có
thể hợp lệ nếu thời lượng ước tính không vượt ngưỡng.

Frontend cần cập nhật thời lượng ước tính và trạng thái ngay khi giáo viên đổi
số câu, dạng câu hoặc mức độ. Backend phải tính lại độc lập; không tin giá trị
thời lượng do frontend gửi lên.

---

## 5. Phạm vi kiến thức SGK

Giáo viên chọn phạm vi thủ công theo cây dữ liệu:

```text
Môn + Lớp
  → Sách
    → Chương
      → Bài
```

- Có thể chọn nhiều chương và nhiều bài trong cùng sách.
- Chỉ các bài được chọn mới trở thành `lessonRefs` của cấu hình.
- Backend đọc `knowledge_json` nội bộ từ database cho đúng các `lessonRefs` đã
  xác nhận.
- Frontend chỉ cần dữ liệu tóm tắt để chọn sách/chương/bài; không nhận toàn bộ
  `knowledge_json`.
- Mỗi câu AI sinh phải trả `sourceLessonRefs` không rỗng; mọi tham chiếu phải
  thuộc `lessonRefs` đã chọn.

---

## 6. Bộ xương JSON

### 6.1. Cấu hình gửi để tạo đề

```json
{
  "title": "Kiểm tra 15 phút - Chương 2",
  "subject": "PHYSICS",
  "grade": 10,
  "duration": {
    "label": "Kiểm tra 15 phút",
    "minutes": 15,
    "preset": "15_MINUTES"
  },
  "totalQuestionCount": 12,
  "difficulty": "HARD",
  "totalScoreCentiPoints": 1000,
  "questionTypes": [
    {
      "type": "MULTIPLE_CHOICE",
      "questionCount": 8,
      "totalScoreCentiPoints": 400,
      "pointsPerQuestionCentiPoints": 50
    },
    {
      "type": "TRUE_FALSE",
      "questionCount": 1,
      "itemsPerQuestion": 4,
      "totalScoreCentiPoints": 200,
      "scoringRule": "EACH_ITEM_EQUAL"
    },
    {
      "type": "SHORT_ANSWER",
      "questionCount": 2,
      "totalScoreCentiPoints": 200,
      "pointsPerQuestionCentiPoints": 100
    },
    {
      "type": "ESSAY",
      "questionCount": 1,
      "totalScoreCentiPoints": 200,
      "subQuestionPointsCentiPoints": [100, 100]
    }
  ],
  "knowledgeScope": {
    "bookCode": "LY10-KNTT",
    "lessonRefs": [
      { "chapterCode": "C2", "lessonCode": "B5" },
      { "chapterCode": "C2", "lessonCode": "B6" }
    ]
  },
  "teacherConfirmedWarning": false
}
```

`totalQuestionCount` phải bằng tổng `questionCount` trong `questionTypes`.
`totalScoreCentiPoints` phải bằng tổng điểm mọi dạng và luôn bằng `1000`.

### 6.2. Kết quả kiểm tra khả thi

```json
{
  "status": "WARNING",
  "durationMinutes": 15,
  "workingMinutes": 12.75,
  "estimatedMinutes": 14.0,
  "overrunMinutes": 1.25,
  "breakdown": [
    { "type": "MULTIPLE_CHOICE", "count": 8, "estimatedMinutes": 12.0 },
    { "type": "TRUE_FALSE", "count": 1, "estimatedMinutes": 4.0 }
  ],
  "message": "Thời lượng ước tính 14 phút, cao hơn thời lượng làm bài an toàn 12.75 phút."
}
```

### 6.3. Đề AI phải trả

```json
{
  "title": "Kiểm tra 15 phút - Chương 2",
  "instructions": "Thời gian làm bài: 15 phút, không kể thời gian phát đề.",
  "durationMinutes": 15,
  "totalScoreCentiPoints": 1000,
  "questions": [
    {
      "order": 1,
      "type": "MULTIPLE_CHOICE",
      "difficulty": "HARD",
      "content": "...",
      "options": [
        { "key": "A", "content": "..." },
        { "key": "B", "content": "..." },
        { "key": "C", "content": "..." },
        { "key": "D", "content": "..." }
      ],
      "answer": { "correctOptionKey": "B" },
      "explanation": "...",
      "scoreCentiPoints": 50,
      "sourceLessonRefs": [
        { "bookCode": "LY10-KNTT", "chapterCode": "C2", "lessonCode": "B5" }
      ]
    },
    {
      "order": 9,
      "type": "TRUE_FALSE",
      "difficulty": "HARD",
      "content": "...",
      "options": [
        { "key": "A", "content": "..." },
        { "key": "B", "content": "..." },
        { "key": "C", "content": "..." },
        { "key": "D", "content": "..." }
      ],
      "answer": { "a": true, "b": false, "c": true, "d": false },
      "explanation": "...",
      "scoreCentiPoints": 200,
      "sourceLessonRefs": [
        { "bookCode": "LY10-KNTT", "chapterCode": "C2", "lessonCode": "B5" }
      ]
    },
    {
      "order": 12,
      "type": "ESSAY",
      "difficulty": "HARD",
      "content": "...",
      "answer": { "solution": "..." },
      "rubric": [
        { "criterion": "Ý 1", "scoreCentiPoints": 100 },
        { "criterion": "Ý 2", "scoreCentiPoints": 100 }
      ],
      "scoreCentiPoints": 200,
      "sourceLessonRefs": [
        { "bookCode": "LY10-KNTT", "chapterCode": "C2", "lessonCode": "B6" }
      ]
    }
  ]
}
```

Schema chi tiết của mỗi `answer` phụ thuộc `type`: `MULTIPLE_CHOICE` dùng
`{"correctOptionKey": "..."}`; `TRUE_FALSE` dùng map boolean theo từng mệnh đề
`{"a": bool, "b": bool, "c": bool, "d": bool}` (không dùng `correctOptionKey`
vì cả 4 mệnh đề đều có thể đúng hoặc sai độc lập). Đáp án, điểm và
`sourceLessonRefs` là bắt buộc với mọi câu; riêng `explanation` bắt buộc
non-null với `SHORT_ANSWER`/`ESSAY`, còn với `MULTIPLE_CHOICE`/`TRUE_FALSE` có
thể tạm thời là `null` ngay sau khi tạo câu hỏi và được điền bổ sung sau — xem
`sinh-de-2-pha-va-log-loi-ai.md`.

---

## 7. Pipeline sinh đề

```text
Giáo viên xác nhận cấu hình
  → Backend validate cấu trúc, tổng điểm và phạm vi SGK
  → Backend tính FeasibilityResult
  → INFEASIBLE: trả lỗi, dừng
  → WARNING chưa xác nhận: trả cảnh báo, dừng
  → Nạp knowledge_json của lessonRefs đã chọn
  → AI sinh PracticeExam JSON — MULTIPLE_CHOICE/TRUE_FALSE chỉ sinh câu hỏi +
    đáp án cốt lõi (chưa có explanation); SHORT_ANSWER/ESSAY sinh gộp đầy đủ
    như cũ
  → Backend parse + validate toàn cục
  → Sai schema/cấu hình/phạm vi: yêu cầu AI sửa phần lỗi (retry giới hạn)
  → Đúng: trả đề để giáo viên xem trước ngay (MC/TF hiện đáp án đúng, lời
    giải đang chờ)
  → Backend tự động sinh explanation cho MC/TF ở một lượt gọi AI riêng, dùng
    lại content/options/answer đã cố định — không giải lại bài toán
  → Giáo viên lưu đề hoặc tạo lại riêng một câu
```

Chi tiết bước tách pha sinh câu hỏi/lời giải cho MC/TF: xem
`sinh-de-2-pha-va-log-loi-ai.md`.

Khi tạo lại một câu, request phải giữ nguyên loại câu, điểm, mức độ, phạm vi
SGK và vị trí câu. Backend chỉ thay thế câu đó sau khi kiểm tra tổng thể.

---

## 8. Quy tắc validation

| Kiểm tra | Yêu cầu |
|---|---|
| Môn, lớp, thời lượng | Bắt buộc; `minutes` là số nguyên dương. |
| Phạm vi SGK | Có ít nhất một bài; mọi bài thuộc đúng môn, lớp và sách đã chọn. |
| Tổng số câu | Số nguyên dương; bằng tổng số câu mọi dạng. |
| Dạng câu | Thuộc danh sách dạng hệ thống hỗ trợ; số câu không âm. |
| Tổng điểm | Chính xác `1000` centi-point, tương đương 10 điểm. |
| Điểm câu/ý | Dương với mọi câu được dùng; tổng rubric tự luận bằng điểm câu. |
| Khả thi thời lượng | `INFEASIBLE` bị chặn; `WARNING` cần `teacherConfirmedWarning = true`. |
| Cấu trúc AI trả | Đúng số câu, đúng loại, đúng thứ tự và đúng tổng điểm đã chốt. |
| Đáp án | Mọi câu có đáp án; tự luận có rubric; đúng–sai có đáp án theo từng ý. |
| Phạm vi AI | Mọi `sourceLessonRefs` thuộc phạm vi đã chọn; không rỗng. |
| Độ khó AI | Không vượt chương trình dù cấu hình là `HARD`. |

Ví dụ thông báo lỗi:

> Tổng phân bổ hiện là 11/12 câu. Vui lòng bổ sung hoặc giảm 1 câu.

> Tổng điểm hiện là 9.50/10.00 điểm. Vui lòng điều chỉnh điểm các dạng câu.

> Cấu hình cần khoảng 90 phút nhưng thời lượng đề chỉ là 15 phút. Giảm câu tự
luận, giảm mức độ hoặc tăng thời lượng trước khi tạo đề.

---

## 9. Định hướng API và giao diện

API nghiệp vụ dự kiến:

```text
GET  /api/textbooks/{bookCode}/chapters
GET  /api/textbooks/{bookCode}/chapters/{chapterCode}/lessons
POST /api/practice-exams/validate-configuration
POST /api/practice-exams/generate-questions
POST /api/practice-exams/generate-explanations
POST /api/practice-exams/{examId}/questions/{questionId}/regenerate
POST /api/practice-exams
GET  /api/practice-exams/{examId}
PATCH /api/practice-exams/{examId}
```

`validate-configuration` trả các lỗi cấu trúc, gợi ý điểm và
`FeasibilityResult` để frontend hiển thị ngay khi giáo viên đang cấu hình.
`generate-questions` chỉ được gọi khi cấu hình đã hợp lệ và cảnh báo (nếu có)
đã được xác nhận; trả đề để hiển thị ngay, MC/TF chưa có `explanation`.
`generate-explanations` được frontend tự động gọi ngay sau đó để bổ sung lời
giải cho MC/TF — xem `sinh-de-2-pha-va-log-loi-ai.md`.

Giao diện cần có:

- Cây chọn sách/chương/bài; hiển thị rõ số bài đã chọn.
- Ô tổng số câu và bảng phân bổ theo dạng, có dòng tổng tự tính.
- Bảng điểm được hệ thống gợi ý, cho sửa nhưng hiển thị tổng 10 điểm theo thời
  gian thực.
- Badge thời lượng `Khả thi` / `Cần xác nhận` / `Không khả thi`, kèm số phút
  ước tính và nguyên nhân.
- Màn xem trước tách **Đề học sinh** và **Đáp án + hướng dẫn chấm của giáo
  viên**, cùng nút tạo lại từng câu.

---

## 10. Phân biệt trách nhiệm

| Thành phần | Chủ thể quyết định |
|---|---|
| Môn, lớp, thời lượng, số câu, dạng câu, mức độ, phạm vi SGK | Giáo viên |
| Gợi ý điểm, cộng điểm, tính thời lượng, validation, schema | Hệ thống backend |
| Nội dung câu hỏi, phương án, đáp án, giải thích, rubric | AI |
| Phê duyệt, chỉnh sửa, lưu hoặc sử dụng đề | Giáo viên |

Nguyên tắc xuyên suốt:

```text
Cấu hình giáo viên
  → kiểm tra điểm + tính khả thi thời lượng
  → knowledge_json các bài đã chọn
  → AI sinh đề theo schema khóa
  → backend kiểm tra lại
  → giáo viên duyệt
  → lưu đề
```

