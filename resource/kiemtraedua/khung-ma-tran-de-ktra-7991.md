# Khung Ma trận & Bản đặc tả Đề kiểm tra định kì — CV 7991/BGDĐT-GDTrH

> Bộ xương **cố định** sẽ được hardcode trong DTO + prompt + export.
> AI chỉ điền **nội dung** vào các ô dựa trên môn học, lớp và chương trình đã chọn.
>
> Nguồn: Công văn 7991/BGDĐT-GDTrH ngày 17/12/2024 + các đề mẫu thực tế.

---

## 1. Quy trình chuẩn hóa đề kiểm tra

```
Bước 1: Chọn thông tin
  └─ Môn học (Toán / Lý / Hoá)
  └─ Lớp (10 / 11 / 12)
  └─ Loại kiểm tra (Giữa HK1 / Giữa HK2 / Cuối HK1 / Cuối HK2)

Bước 2: Lập Ma trận
  └─ Xác định dạng thức câu hỏi + tỉ lệ điểm
  └─ Xác định mức độ đánh giá
  └─ Phân bổ điểm theo chương/chủ đề

Bước 3: Biên soạn Bản đặc tả
  └─ Liệt kê đơn vị kiến thức theo từng chương
  └─ Gán yêu cầu cần đạt (Biết/Hiểu/Vận dụng/Vận dụng cao)
  └─ Xác định số câu hỏi theo từng mức + dạng thức

Bước 4: Soạn đề thi (file riêng)
  └─ Dựa vào Ma trận + Bản đặc tả để tạo đề
```

---

## 2. Quy tắc phân biệt Lớp 10-11 vs Lớp 12

| Tiêu chí | Lớp 10, 11 | Lớp 12 |
|---|---|---|
| Dạng thức câu hỏi | 4 dạng (có Tự luận) | 3 dạng (KHÔNG tự luận) |
| Lý do | Chưa thi THPT quốc gia | Làm quen format thi THPT |
| Tự luận | ✅ Có (~20-30%) | ❌ Không có |

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
    "basic": ["nhan_biet", "thong_hieu", "van_dung"],
    "advanced": ["nhan_biet", "thong_hieu", "van_dung", "van_dung_cao"],
    "ratioByLevel": {
      "nhan_biet": 0.40,
      "thong_hieu": 0.30,
      "van_dung": 0.20,
      "van_dung_cao": 0.10
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

### 3.2. Giá trị hardcode theo lớp

#### Lớp 10, 11 (có tự luận)

| Dạng thức | Tỉ lệ | Điểm | Số câu |
|---|---|---|---|
| TNKQ nhiều lựa chọn | 30% | 3.0đ | 12 câu × 0.25đ |
| Đúng – Sai | 20% | 2.0đ | 2 câu (8 ý) |
| Trả lời ngắn | 20% | 2.0đ | 4 câu × 0.5đ |
| Tự luận | 30% | 3.0đ | 2-3 câu |
| **Tổng** | **100%** | **10đ** | |

#### Lớp 12 (không tự luận)

| Dạng thức | Tỉ lệ | Điểm | Số câu |
|---|---|---|---|
| TNKQ nhiều lựa chọn | 45% | 4.5đ | 18 câu × 0.25đ |
| Đúng – Sai | 30% | 3.0đ | 3 câu (12 ý) |
| Trả lời ngắn | 25% | 2.5đ | 5 câu × 0.5đ |
| Tự luận | ❌ | 0đ | Không có |
| **Tổng** | **100%** | **10đ** | |

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
            ],
            "van_dung_cao": []
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
      "nhan_biet": { "count": 12, "score": 3.0, "ratio": 0.30 },
      "thong_hieu": { "count": 10, "score": 3.0, "ratio": 0.30 },
      "van_dung": { "count": 6, "score": 2.5, "ratio": 0.25 },
      "van_dung_cao": { "count": 2, "score": 1.5, "ratio": 0.15 }
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
 │    │    ├─ LearningOutcomesDto learningOutcomes   (nhan_biet, thong_hieu, van_dung, van_dung_cao)
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
 ├─ List<String> van_dung
 └─ List<String> van_dung_cao

QuestionAllocationDto
 ├─ Map<String, Integer> multipleChoice    (nhan_biet → X câu)
 ├─ Map<String, Integer> trueFalse
 ├─ Map<String, Integer> shortAnswer
 └─ Map<String, Integer> essay
```

---

## 6. Pipeline sinh Ma trận + Bản đặc tả

```
Call 1  → Tạo Ma trận
          Input:  subject + grade + examType
          Output: ExamMatrixDto (questionTypes, assessmentLevels, chapterDistribution)
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
| Tỉ lệ ± 5% | Tỉ lệ thực tế mỗi dạng so với yêu cầu CV 7991 không lệch quá 5% |
| Mỗi đơn vị kiến thức phải có câu hỏi | Không được bỏ trống đơn vị nào |
| Mức độ phân bổ đúng | Nhận biết ≥ 30%, Thông hiểu ≥ 20%, Vận dụng ≥ 15% |
| Lớp 12 không có tự luận | Essay count = 0 khi grade = 12 |
| Lớp 10-11 phải có tự luận | Essay count > 0 khi grade = 10 hoặc 11 |

---

## 8. Ví dụ minh họa

### 8.1. Ma trận — Hoá 11 (Giữa HK2)

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
              "Thực hiện được các thí nghiệm: đốt cháy ethanol, glycerol tác dụng với Cu(OH)2"
            ],
            "van_dung_cao": [
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

## 9. Phân biệt Hardcode vs AI sinh

| Thành phần | Hardcode? | Ghi chú |
|---|---|---|
| Cấu trúc JSON schema | ✅ Cố định | Để parse ổn định |
| 4 dạng thức câu hỏi | ✅ Cố định | TNKQ, Đ-S, TL ngắn, Tự luận |
| Tỉ lệ điểm theo lớp 10-11 vs 12 | ✅ Cố định | Theo quy tắc trên |
| Quy tắc chấm Đúng-Sai | ✅ Cố định | 0.1 / 0.25 / 0.5 / 1.0 |
| Validation rules | ✅ Cố định | Tổng = 10đ, tỉ lệ ±5% |
| Chương/trường môn theo lớp | ❌ AI sinh | Từ syllabus chương trình |
| Đơn vị kiến thức + YCCĐ | ❌ AI sinh | Từ sách giáo khoa |
| Phân bổ câu hỏi theo đơn vị | ❌ AI sinh | Dựa vào trọng tâm kiến thức |
| Ma trận mẫu minh họa | ❌ AI sinh | Để user tham khảo |
