# Khung Ma trận & Bản đặc tả Đề kiểm tra định kì — CV 7991/BGDĐT-GDTrH

> Giáo viên là người **chủ động nhập và chốt cấu trúc đề**: số câu, điểm/câu,
> tổng điểm từng dạng và tỉ lệ mức độ nhận thức.
> Hệ thống tự tính toán, kiểm tra và cảnh báo sai lệch so với khung tham khảo
> của Công văn 7991; AI **không được tự chọn hoặc tự sửa các con số này**.
> Sau khi giáo viên xác nhận, cấu hình đã chốt là đầu vào bắt buộc cho Ma trận,
> Bản đặc tả và Đề kiểm tra.
>
> Nguồn: Công văn 7991/BGDĐT-GDTrH ngày 17/12/2024 + các đề mẫu thực tế.

---

## 1. Quy trình chuẩn hóa đề kiểm tra

```
Bước 1: Chọn thông tin và cấu hình đề
  └─ Môn học (Toán / Lý / Hoá)
  └─ Lớp (10 / 11 / 12)
  └─ Loại kiểm tra (Giữa HK1 / Giữa HK2 / Cuối HK1 / Cuối HK2)
  └─ Giáo viên nhập số câu + điểm/câu cho từng dạng
  └─ Giáo viên nhập tỉ lệ Biết / Hiểu / Vận dụng
  └─ Hệ thống tính tổng và đối chiếu khung tham khảo CV 7991
  └─ Giáo viên xem cảnh báo và xác nhận cấu hình

Bước 2: Lập Ma trận
  └─ Dùng nguyên cấu trúc và tỉ lệ giáo viên đã xác nhận
  └─ Phân bổ điểm theo chương/chủ đề

Bước 3: Biên soạn Bản đặc tả
  └─ Liệt kê đơn vị kiến thức theo từng chương
  └─ Gán yêu cầu cần đạt (Biết/Hiểu/Vận dụng)
  └─ Xác định số câu hỏi theo từng mức + dạng thức

Bước 4: Soạn đề thi (file riêng)
  └─ Dựa vào Ma trận + Bản đặc tả để tạo đề
```

---

## 2. Nguyên tắc cấu hình và trường hợp Lớp 12

### 2.1. Giáo viên quyết định cấu trúc

- Không hardcode cấu trúc khác nhau theo lớp như một quy định bắt buộc của CV 7991.
- Khi bật chế độ **Theo CV 7991**, hệ thống điền sẵn cấu trúc tham khảo
  `3-2-2-3 điểm` và mức độ `40%-30%-30%`.
- Giáo viên được sửa số câu, điểm/câu và tỉ lệ. Hệ thống không chặn nếu tổng
  vẫn hợp lệ, nhưng phải chỉ rõ phần sai lệch so với cấu trúc tham khảo.
- AI chỉ phân bổ nội dung theo cấu hình cuối cùng do giáo viên xác nhận.

### 2.2. Khóa mềm Tự luận đối với Lớp 12

Khi chọn Lớp 12, giao diện áp dụng preset nhằm gợi ý cấu trúc gần với đề thi
tốt nghiệp THPT, nhưng đây **không phải lệnh cấm tự luận của CV 7991**:

- Mặc định đặt `essay.questionCount = 0` và ẩn/disable ô **Số câu** của Tự luận.
- Trong phần **Nâng cao**, cung cấp toggle `Cho phép tự luận`.
- Khi bật toggle, mở lại các ô Số câu và Điểm Tự luận để giáo viên cấu hình.
- Khi tắt lại toggle, hệ thống yêu cầu xác nhận trước khi đưa số câu và điểm
  Tự luận về `0`, tránh làm mất cấu hình ngoài ý muốn.
- Trạng thái toggle và cấu hình tự luận phải được lưu cùng cấu hình đề.

Như vậy, trường muốn đề giữa kỳ Lớp 12 có tự luận vẫn thực hiện được; hệ thống
chỉ đưa ra gợi ý mặc định, không chặn cứng quyết định chuyên môn của giáo viên.

---

## 3. Bộ xương Ma trận (JSON Schema)

> **Ma trận** xác định: dạng thức câu hỏi, tỉ lệ điểm, mức độ đánh giá, phân bổ theo chương.

### 3.1. Schema

```json
{
  "type": "exam_matrix",
  "metadata": {
    "subject": "toan | ly | hoa",
    "grade": "10 | 11 | 12",
    "examType": "giua_hk1 | giua_hk2 | cuoi_hk1 | cuoi_hk2",
    "duration": "45 phút | 60 phút | 90 phút",
    "totalScore": 10.0
  },
  "configuration": {
    "mode": "cv7991 | custom",
    "confirmedByTeacher": true,
    "allowEssayForGrade12": false,
    "complianceStatus": "MATCHED | DEVIATED | INVALID",
    "warnings": []
  },
  "questionTypes": {
    "multipleChoice": {
      "label": "Câu trắc nghiệm nhiều phương án lựa chọn",
      "shortLabel": "TNKQ",
      "ratio": 0.30,
      "score": 3.0,
      "pointsPerQuestion": 0.25,
      "questionCount": 12
    },
    "trueFalse": {
      "label": "Câu trắc nghiệm đúng – sai",
      "shortLabel": "Đúng-Sai",
      "ratio": 0.20,
      "score": 2.0,
      "itemsPerQuestion": 4,
      "scoringRule": "Chính xác 1 ý: 0.1đ | 2 ý: 0.25đ | 3 ý: 0.5đ | 4 ý: 1.0đ",
      "questionCount": 2
    },
    "shortAnswer": {
      "label": "Câu trắc nghiệm trả lời ngắn",
      "shortLabel": "Trả lời ngắn",
      "ratio": 0.20,
      "score": 2.0,
      "pointsPerQuestion": 0.5,
      "questionCount": 4
    },
    "essay": {
      "label": "Câu hỏi tự luận",
      "shortLabel": "Tự luận",
      "ratio": 0.30,
      "score": 3.0,
      "questionCount": 2,
      "pointsPerSubQuestion": [0.5, 0.5, 0.5],
      "note": "Chỉ có ở lớp 10, 11. Lớp 12 bỏ dạng này."
    }
  },
  "assessmentLevels": {
    "levels": ["nhan_biet", "thong_hieu", "van_dung"],
    "ratioByLevel": {
      "nhan_biet": 0.40,
      "thong_hieu": 0.30,
      "van_dung": 0.30
    }
  },
  "chapterDistribution": [
    {
      "chapterId": 1,
      "chapterName": "Tên chương/chủ đề 1",
      "knowledgeUnits": ["Đơn vị 1", "Đơn vị 2"],
      "ratio": 0.25,
      "score": 2.5,
      "questionDistribution": {
        "multipleChoice": { "nhan_biet": 1, "thong_hieu": 1, "van_dung": 0 },
        "trueFalse": { "nhan_biet": 0, "thong_hieu": 1, "van_dung": 1 },
        "shortAnswer": { "nhan_biet": 0, "thong_hieu": 0, "van_dung": 1 },
        "essay": { "nhan_biet": 0, "thong_hieu": 0, "van_dung": 1 }
      }
    }
  ]
}
```

### 3.2. Giá trị gợi ý theo CV 7991

Đây là preset để điền ban đầu và làm mốc đối chiếu, **không phải dữ liệu do AI
sinh và cũng không phải giá trị khóa cứng trên giao diện**.

| Dạng thức | Tỉ lệ | Điểm | Số câu |
|---|---|---|---|
| TNKQ nhiều lựa chọn | 30% | 3.0đ | 12 câu × 0.25đ |
| Đúng – Sai | 20% | 2.0đ | 2 câu (8 ý) |
| Trả lời ngắn | 20% | 2.0đ | 4 câu × 0.5đ |
| Tự luận | 30% | 3.0đ | Giáo viên nhập |
| **Tổng** | **100%** | **10đ** | |

Nếu môn học không sử dụng Trả lời ngắn, chuyển phần điểm này sang Đúng–Sai theo
chú thích của phụ lục CV 7991.

Với Lớp 12, có thể áp dụng preset riêng không tự luận như một gợi ý sản phẩm.
Preset này phải được ghi rõ là **gợi ý theo định hướng cấu trúc thi tốt nghiệp**,
không được ghi là yêu cầu bắt buộc của CV 7991. Giáo viên có thể bật
`Cho phép tự luận` trong phần Nâng cao.

### 3.3. Ví dụ đối chiếu cấu hình giáo viên nhập

Giáo viên nhập:

| Dạng thức | Số câu | Điểm/câu | Thành tiền |
|---|---:|---:|---:|
| TNKQ nhiều lựa chọn | 12 | 0.25 | 3.0đ |
| Đúng – Sai | 2 | 1.0 | 2.0đ |
| Trả lời ngắn | 4 | 0.25 | 1.0đ |
| Tự luận | 1 | Theo ý/câu | 4.0đ |
| **Tổng** | | | **10.0đ** |

Cấu hình này hợp lệ để tiếp tục vì tổng bằng 10 điểm, nhưng hệ thống hiển thị:

> Có sai lệch với cấu trúc tham khảo CV 7991: Trả lời ngắn thiếu 1.0 điểm;
> Tự luận vượt 1.0 điểm.

Giáo viên có thể quay lại chỉnh hoặc chọn **Xác nhận và tiếp tục**. Sau khi xác
nhận, Ma trận, Bản đặc tả và Đề kiểm tra đều phải tuân theo đúng cấu hình này.

---

## 4. Bộ xương Bản đặc tả (JSON Schema)

> **Bản đặc tả** chi tiết hóa: từng đơn vị kiến thức, yêu cầu cần đạt, số câu hỏi theo từng mức + dạng thức.

### 4.1. Schema

```json
{
  "type": "exam_specification",
  "metadata": {
    "subject": "toan | ly | hoa",
    "grade": "10 | 11 | 12",
    "examType": "giua_hk1 | giua_hk2 | cuoi_hk1 | cuoi_hk2",
    "duration": "45 phút | 60 phút | 90 phút",
    "totalScore": 10.0,
    "matrixRef": "reference_to_exam_matrix_id"
  },
  "chapters": [
    {
      "chapterId": 1,
      "chapterName": "Tên chương/chủ đề",
      "topicCount": 2,
      "knowledgeUnits": [
        {
          "unitId": 1,
          "unitName": "Tên đơn vị kiến thức",
          "content": "Nội dung chi tiết đơn vị kiến thức",
          "durationInWeeks": 8,
          "learningOutcomes": {
            "nhan_biet": [
              "Yêu cầu cần đạt mức Nhận biết 1",
              "Yêu cầu cần đạt mức Nhận biết 2"
            ],
            "thong_hieu": [
              "Yêu cầu cần đạt mức Thông hiểu 1"
            ],
            "van_dung": [
              "Yêu cầu cần đạt mức Vận dụng 1"
            ]
          },
          "questionAllocation": {
            "multipleChoice": {
              "nhan_biet": 2,
              "thong_hieu": 1,
              "van_dung": 0
            },
            "trueFalse": {
              "nhan_biet": 0,
              "thong_hieu": 1,
              "van_dung": 0
            },
            "shortAnswer": {
              "nhan_biet": 0,
              "thong_hieu": 0,
              "van_dung": 1
            },
            "essay": {
              "nhan_biet": 0,
              "thong_hieu": 0,
              "van_dung": 1
            }
          },
          "totalQuestions": 7,
          "totalScore": 2.25
        }
      ],
      "chapterSummary": {
        "totalQuestions": 12,
        "totalScore": 3.5,
        "ratioPercent": 35
      }
    }
  ],
  "grandTotal": {
    "totalQuestions": 30,
    "totalScore": 10.0,
    "byType": {
      "multipleChoice": { "count": 12, "score": 3.0 },
      "trueFalse": { "count": 2, "items": 8, "score": 2.0 },
      "shortAnswer": { "count": 4, "score": 2.0 },
      "essay": { "count": 3, "score": 3.0 }
    },
    "byLevel": {
      "nhan_biet": { "count": 12, "score": 4.0, "ratio": 0.40 },
      "thong_hieu": { "count": 10, "score": 3.0, "ratio": 0.30 },
      "van_dung": { "count": 8, "score": 3.0, "ratio": 0.30 }
    }
  }
}
```

### 4.2. Mẫu Bản đặc tả (định dạng bảng như Công văn 7991)

| STT | Chương/Chủ đề | Đơn vị kiến thức | TNKQ (Biết) | TNKQ (Hiểu) | TNKQ (VD) | Đ-S (Biết) | Đ-S (Hiểu) | Đ-S (VD) | TL ngắn (Biết) | TL ngắn (Hiểu) | TL ngắn (VD) | Tự luận (Biết) | Tự luận (Hiểu) | Tự luận (VD) | Tổng | Điểm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Chương 1 | Đơn vị 1.1 | 2 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 1 | 6 | 2.25 |
| 2 | | Đơn vị 1.2 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0.75 |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| | **Tổng** | | **X** | **X** | **X** | **X** | **X** | **X** | **X** | **X** | **X** | **X** | **X** | **X** | **Total** | **10** |

---

## 5. Ánh xạ sang DTO Java (dự kiến)

```
ExamMatrixDto
 ├─ MetadataDto metadata                    (subject, grade, examType, duration, totalScore)
 ├─ ExamConfigurationDto configuration
 │    ├─ String mode                        (cv7991 | custom)
 │    ├─ boolean confirmedByTeacher
 │    ├─ boolean allowEssayForGrade12
 │    ├─ String complianceStatus            (MATCHED | DEVIATED | INVALID)
 │    └─ List<String> warnings
 ├─ Map<String, QuestionTypeDto> questionTypes
 │    ├─ multipleChoice  (label, ratio, score, pointsPerQuestion, questionCount)
 │    ├─ trueFalse       (label, ratio, score, itemsPerQuestion, scoringRule, questionCount)
 │    ├─ shortAnswer     (label, ratio, score, pointsPerQuestion, questionCount)
 │    └─ essay           (label, ratio, score, questionCount, pointsPerSubQuestion) [lớp 10-11 only]
 ├─ AssessmentLevelsDto assessmentLevels
 │    ├─ List<String> levels
 │    └─ Map<String, Double> ratioByLevel
 └─ List<ChapterDistributionDto> chapterDistribution
      ├─ int chapterId
      ├─ String chapterName
      ├─ double ratio
      ├─ double score
      └─ Map<String, Map<String, Integer>> questionDistribution

ExamSpecificationDto
 ├─ MetadataDto metadata
 ├─ String matrixRef
 ├─ List<ChapterDto> chapters
 │    ├─ int chapterId
 │    ├─ String chapterName
 │    ├─ List<KnowledgeUnitDto> knowledgeUnits
 │    │    ├─ int unitId
 │    │    ├─ String unitName
 │    │    ├─ String content
 │    │    ├─ int durationInWeeks
 │    │    ├─ LearningOutcomesDto learningOutcomes   (nhan_biet, thong_hieu, van_dung)
 │    │    ├─ QuestionAllocationDto questionAllocation
 │    │    ├─ int totalQuestions
 │    │    └─ double totalScore
 │    └─ ChapterSummaryDto chapterSummary
 └─ GrandTotalDto grandTotal
      ├─ int totalQuestions
      ├─ double totalScore
      ├─ Map<String, ByTypeSummary> byType
      └─ Map<String, ByLevelSummary> byLevel

LearningOutcomesDto
 ├─ List<String> nhan_biet
 ├─ List<String> thong_hieu
 └─ List<String> van_dung

QuestionAllocationDto
 ├─ Map<String, Integer> multipleChoice    (nhan_biet → X câu)
 ├─ Map<String, Integer> trueFalse
 ├─ Map<String, Integer> shortAnswer
 └─ Map<String, Integer> essay
```

---

## 6. Pipeline sinh Ma trận + Bản đặc tả

```
Call 0  → Giáo viên cấu hình và xác nhận cấu trúc đề
          Input:  subject + grade + examType + số câu + điểm + tỉ lệ mức độ
          Output: ExamConfigurationDto đã tính tổng + cảnh báo đối chiếu
          Điều kiện: confirmedByTeacher = true

Call 1  → Tạo Ma trận
          Input:  ExamConfigurationDto đã được giáo viên xác nhận
          Output: ExamMatrixDto (questionTypes, assessmentLevels, chapterDistribution)
          Ràng buộc: AI không được thay đổi số câu, điểm và tỉ lệ mức độ
          → publish MATRIX_READY

Call 2  → Tạo Bản đặc tả (dựa vào Ma trận)
          Input:  ExamMatrixDto + chương trình môn học (syllabus)
          Output: ExamSpecificationDto (chapters → knowledgeUnits → learningOutcomes + questionAllocation)
          → publish SPEC_READY

Call 3..N → Tạo đề thi (file riêng)
          Input:  ExamMatrixDto + ExamSpecificationDto
          Output: File đề thi
          → publish EXAM_READY
```

---

## 7. Quy tắc validation

| Kiểm tra | Mô tả |
|---|---|
| Tổng điểm = 10.0 | Ma trận phải cộng đúng 10 điểm |
| Tổng câu = Tổng TNKQ + Đ-S + TL ngắn + Tự luận | Số câu phải khớp |
| Đối chiếu cấu trúc tham khảo | Sai lệch `3-2-2-3` tạo cảnh báo cụ thể, không chặn giáo viên tiếp tục |
| Tổng tỉ lệ mức độ = 100% | Biết + Hiểu + Vận dụng phải cộng đúng 100% |
| Mỗi đơn vị kiến thức phải có câu hỏi | Không được bỏ trống đơn vị nào |
| Cảnh báo mức độ tham khảo | So sánh với `40%-30%-30%`; sai lệch được cảnh báo, không tự sửa |
| Tự luận Lớp 12 | Mặc định 0; chỉ cho nhập khi `allowEssayForGrade12 = true` |
| Giáo viên đã xác nhận | Không gọi AI tạo Ma trận khi `confirmedByTeacher = false` |
| Bảo toàn cấu hình | AI trả về khác số câu/điểm/tỉ lệ đã chốt thì kết quả không hợp lệ |

---

## 8. Ví dụ minh họa

### 8.1. Ma trận — Hoá 11 (Giữa HK2)

Ví dụ này minh họa một cấu hình tùy chỉnh đã được giáo viên xác nhận. Vì phân
bổ `3.5-3.0-1.5-2.0` khác preset `3-2-2-3`, trạng thái đối chiếu của nó là
`DEVIATED`; hệ thống phải lưu cảnh báo cùng Ma trận.

```json
{
  "type": "exam_matrix",
  "metadata": {
    "subject": "hoa",
    "grade": "11",
    "examType": "giua_hk2",
    "duration": "45 phút",
    "totalScore": 10.0
  },
  "configuration": {
    "mode": "cv7991",
    "confirmedByTeacher": true,
    "allowEssayForGrade12": false,
    "complianceStatus": "DEVIATED",
    "warnings": [
      "TNKQ nhiều lựa chọn vượt 0.5 điểm",
      "Đúng-Sai vượt 1.0 điểm",
      "Trả lời ngắn thiếu 0.5 điểm",
      "Tự luận thiếu 1.0 điểm"
    ]
  },
  "questionTypes": {
    "multipleChoice": {
      "label": "Câu trắc nghiệm nhiều phương án lựa chọn",
      "shortLabel": "TNKQ",
      "ratio": 0.35,
      "score": 3.5,
      "pointsPerQuestion": 0.25,
      "questionCount": 14
    },
    "trueFalse": {
      "label": "Câu trắc nghiệm đúng – sai",
      "shortLabel": "Đúng-Sai",
      "ratio": 0.30,
      "score": 3.0,
      "itemsPerQuestion": 4,
      "scoringRule": "Chính xác 1 ý: 0.1đ | 2 ý: 0.25đ | 3 ý: 0.5đ | 4 ý: 1.0đ",
      "questionCount": 3
    },
    "shortAnswer": {
      "label": "Câu trắc nghiệm trả lời ngắn",
      "shortLabel": "Trả lời ngắn",
      "ratio": 0.15,
      "score": 1.5,
      "pointsPerQuestion": 0.25,
      "questionCount": 6
    },
    "essay": {
      "label": "Câu hỏi tự luận",
      "shortLabel": "Tự luận",
      "ratio": 0.20,
      "score": 2.0,
      "questionCount": 2,
      "pointsPerSubQuestion": [0.5, 0.5],
      "note": "Lớp 11 có tự luận"
    }
  },
  "assessmentLevels": {
    "levels": ["nhan_biet", "thong_hieu", "van_dung"],
    "ratioByLevel": {
      "nhan_biet": 0.40,
      "thong_hieu": 0.30,
      "van_dung": 0.30
    }
  },
  "chapterDistribution": [
    {
      "chapterId": 1,
      "chapterName": "Hydrocarbon",
      "ratio": 0.20,
      "score": 2.0
    },
    {
      "chapterId": 2,
      "chapterName": "Dẫn xuất Halogen - Alcohol - Phenol",
      "ratio": 0.40,
      "score": 4.0
    },
    {
      "chapterId": 3,
      "chapterName": "Hợp chất Carbonyl - Carboxylic acid",
      "ratio": 0.40,
      "score": 4.0
    }
  ]
}
```

### 8.2. Bản đặc tả — Hoá 11 (một phần)

```json
{
  "type": "exam_specification",
  "metadata": {
    "subject": "hoa",
    "grade": "11",
    "examType": "giua_hk2",
    "duration": "45 phút",
    "totalScore": 10.0
  },
  "chapters": [
    {
      "chapterId": 2,
      "chapterName": "Dẫn xuất Halogen - Alcohol - Phenol",
      "knowledgeUnits": [
        {
          "unitId": 1,
          "unitName": "Alcohol",
          "learningOutcomes": {
            "nhan_biet": [
              "Nêu được khái niệm alcohol",
              "Nêu được công thức tổng quát của alcohol no, đơn chức, mạch hở",
              "Nêu được khái niệm về bậc của alcohol"
            ],
            "thong_hieu": [
              "Nêu được đặc điểm liên kết và hình dạng phân tử của methanol, ethanol",
              "Trình bày được tính chất vật lí của alcohol",
              "Giải thích được ảnh hưởng của liên kết hydrogen đến nhiệt độ sôi",
              "Trình bày được tính chất hoá học của alcohol"
            ],
            "van_dung": [
              "Viết được công thức cấu tạo, gọi được tên một số alcohol đơn giản (C1-C5)",
              "Thực hiện được các thí nghiệm: đốt cháy ethanol, glycerol tác dụng với Cu(OH)2",
              "Nêu được thái độ, cách ứng xử với việc bảo vệ sức khoẻ liên quan đến rượu bia"
            ]
          },
          "questionAllocation": {
            "multipleChoice": { "nhan_biet": 1, "thong_hieu": 1, "van_dung": 1 },
            "trueFalse": { "nhan_biet": 0, "thong_hieu": 1, "van_dung": 0 },
            "shortAnswer": { "nhan_biet": 0, "thong_hieu": 0, "van_dung": 0 },
            "essay": { "nhan_biet": 0, "thong_hieu": 0, "van_dung": 1 }
          },
          "totalQuestions": 5,
          "totalScore": 1.75
        }
      ]
    }
  ]
}
```

---

## 9. Phân biệt Hệ thống, Giáo viên và AI

| Thành phần | Chủ thể quyết định | Ghi chú |
|---|---|---|
| Cấu trúc JSON schema | Hệ thống | Cố định để parse ổn định |
| Danh sách dạng câu hỏi | Hệ thống | TNKQ, Đ-S, TL ngắn, Tự luận |
| Preset `3-2-2-3` và `40-30-30` | Hệ thống | Gợi ý và mốc cảnh báo theo CV 7991 |
| Số câu, điểm/câu, tổng điểm mỗi dạng | **Giáo viên** | AI không được thay đổi |
| Tỉ lệ Biết/Hiểu/Vận dụng | **Giáo viên** | Tổng bắt buộc bằng 100% |
| Cho phép tự luận ở Lớp 12 | **Giáo viên** | Toggle Nâng cao, mặc định tắt |
| Tính tổng và cảnh báo sai lệch | Hệ thống | Cảnh báo rõ từng dạng, không tự sửa |
| Chương/chủ đề theo lớp | AI đề xuất | Dựa trên syllabus, giáo viên có thể duyệt |
| Đơn vị kiến thức + YCCĐ | AI sinh | Từ chương trình/tài liệu đầu vào |
| Phân bổ câu hỏi theo đơn vị | AI sinh | Phải khớp cấu hình giáo viên đã chốt |
| Nội dung câu hỏi và đáp án | AI sinh | Tạo sau Ma trận và Bản đặc tả |

---

## 10. Nguyên tắc xuyên suốt

`Cấu hình giáo viên xác nhận → Ma trận → Bản đặc tả → Đề kiểm tra`

Ba sản phẩm phía sau phải dùng cùng một phiên bản cấu hình. Nếu giáo viên sửa
số câu, điểm hoặc tỉ lệ sau khi đã sinh Ma trận, hệ thống phải đánh dấu Ma trận,
Bản đặc tả và Đề cũ là cần tạo lại; không được âm thầm ghép cấu hình mới với kết
quả cũ.
