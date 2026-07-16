# Khung Ma trận & Bản đặc tả Đề kiểm tra định kì — CV 7991/BGDĐT-GDTrH

> Giáo viên là người **chủ động nhập và chốt cấu trúc đề**: số câu, điểm/câu,
> tổng điểm từng dạng, tỉ lệ mức độ nhận thức và mức độ chung của đề
> (**Dễ / Vừa / Khó**).
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
  └─ Hệ thống tự xác định phạm vi SGK theo loại kiểm tra và phân phối chương trình
  └─ Mức độ đề (Dễ / Vừa / Khó)
  └─ Giáo viên nhập số câu + điểm/câu cho từng dạng
  └─ Giáo viên nhập tỉ lệ Biết / Hiểu / Vận dụng
  └─ Hệ thống tính tổng và đối chiếu khung tham khảo CV 7991
  └─ Giáo viên xem cảnh báo và xác nhận cấu hình

Bước 2: Lập Ma trận
  └─ Dùng nguyên cấu trúc và tỉ lệ giáo viên đã xác nhận
  └─ Backend nạp knowledge_json của các bài thuộc phạm vi đã xác định
  └─ Hệ thống tính trọng số chương theo dữ liệu phân phối chương trình
  └─ Hệ thống khóa quota chương × dạng câu hỏi × mức độ nhận thức
  └─ AI phân tích dữ liệu SGK và ánh xạ nội dung vào quota đã khóa

Bước 3: Biên soạn Bản đặc tả
  └─ Liệt kê đơn vị kiến thức theo từng chương
  └─ Gán yêu cầu cần đạt (Biết/Hiểu/Vận dụng)
  └─ Ánh xạ số câu/ý đã khóa vào từng đơn vị kiến thức

Bước 4: Giáo viên xem và xác nhận Ma trận + Bản đặc tả
  └─ Nếu chỉnh cấu hình hoặc phạm vi, hệ thống tạo phiên bản mới và lập lại

Bước 5: Soạn đề thi (file riêng)
  └─ Dựa vào Ma trận + Bản đặc tả + dữ liệu SGK trong phạm vi để tạo đề
  └─ Có thể sinh song song theo chương/quota, sau đó hợp nhất và kiểm tra toàn cục
```

### 1.1. Nguyên tắc xác định phạm vi kiến thức SGK

Giáo viên **không phải chọn thủ công từng sách, chương hoặc bài**. Giáo viên chỉ
chọn môn, lớp và loại kiểm tra; hệ thống tự ánh xạ các lựa chọn đó sang phạm vi
SGK tương ứng:

| Loại kiểm tra | Phạm vi kiến thức |
|---|---|
| Giữa HK1 | Từ đầu năm đến khoảng tuần 8–9, tương đương khoảng 40–50% nội dung học kỳ I |
| Cuối HK1 | Toàn bộ nội dung thuộc học kỳ I |
| Giữa HK2 | Từ đầu học kỳ II đến khoảng tuần 26–27, tương đương khoảng 40–50% nội dung học kỳ II |
| Cuối HK2 | Toàn bộ nội dung thuộc học kỳ II |

Phạm vi phải được xác định bằng dữ liệu phân phối chương trình do hệ thống quản
lý, gồm tối thiểu môn, lớp, sách, bài học, học kỳ và tuần dạy. Không giao hoàn
toàn cho AI tự ước lượng “40–50%” từ toàn bộ cuốn sách vì kết quả có thể thay
đổi giữa các lần sinh.

Nếu chưa có dữ liệu tuần dạy, hệ thống có thể tạm xác định phạm vi theo
`sort_order` của chương/bài, nhưng phải đánh dấu đây là phạm vi ước lượng để
giáo viên biết và xác nhận trước khi lập Ma trận.

Sau khi xác định phạm vi, backend dùng mã sách, mã chương và mã bài nội bộ để
đọc `lessons.knowledge_json` qua
`TextbookCatalogRepository.findLessonKnowledge(...)`. Nội dung SGK đầy đủ không
cần trả xuống frontend. AI chỉ nhận `knowledge_json` của các bài nằm trong phạm
vi đã chốt để:

- nhận diện chương/chủ đề và đơn vị kiến thức;
- trích xuất yêu cầu cần đạt;
- phân loại nội dung theo Nhận biết, Thông hiểu và Vận dụng;
- lập Ma trận, Bản đặc tả và sinh câu hỏi bám sát SGK.

Mức độ chung `EASY`, `MEDIUM`, `HARD` chỉ điều chỉnh cách viết câu hỏi, độ nhiễu,
số bước suy luận và mức độ liên kết kiến thức. Mức độ chung **không được mở rộng
hoặc thu hẹp phạm vi bài học** đã xác định từ loại kiểm tra.

### 1.2. Nguồn dữ liệu SGK runtime

Nguồn dữ liệu chính thức của chức năng tạo đề là PostgreSQL cloud được cấu hình
qua `DB_URL`, không phải các file seed trong repository.

Trạng thái dữ liệu runtime đã được xác nhận ngày 16/07/2026:

- có đủ Vật lí, Hóa học và Toán lớp 10–12;
- có 12 sách và 277 bài học;
- `lessons.knowledge_json` của các bài là JSON object có nội dung, không phải
  `null` hoặc object rỗng; kích thước trung bình khoảng 9–15 KB/bài;
- API `/api/textbooks` trả catalog đầy đủ của 12 sách.

Dữ liệu seed trong repository hiện chưa đủ để dựng lại toàn bộ database
runtime:

- `be/src/main/resources/physics-textbooks.json` chỉ chứa 3 sách Vật lí;
- `be/src/main/resources/lessons/10.json`, `11.json`, `12.json` chỉ chứa dữ liệu
  Vật lí;
- `TextbookCatalogImporter` bỏ qua import khi bảng `textbooks` đã có dữ liệu.

Vì vậy, khi lập kế hoạch hoặc triển khai chức năng tạo đề, **không được suy luận
độ phủ dữ liệu runtime từ các file seed local**. Backend phải lấy catalog và
`knowledge_json` từ PostgreSQL thông qua `TextbookCatalogRepository`.

`knowledge_json` chỉ được đọc nội bộ tại backend để xác định phạm vi, lập Ma
trận, Bản đặc tả và sinh câu hỏi. Không tạo endpoint public trả toàn bộ
`knowledge_json` xuống frontend. API nghiệp vụ tạo Ma trận/Bản đặc tả chỉ trả
dữ liệu đầu ra đã được chuẩn hóa cùng các mã tham chiếu sách/chương/bài cần
thiết.

---

## 2. Nguyên tắc cấu hình và trường hợp Lớp 12

### 2.1. Giáo viên quyết định cấu trúc

- Không hardcode cấu trúc khác nhau theo lớp như một quy định bắt buộc của CV 7991.
- Khi bật chế độ **Theo CV 7991**, hệ thống điền sẵn cấu trúc tham khảo
  `3-2-2-3 điểm` và mức độ `40%-30%-30%`.
- Giáo viên được sửa số câu, điểm/câu và tỉ lệ. Hệ thống không chặn nếu tổng
  vẫn hợp lệ, nhưng phải chỉ rõ phần sai lệch so với cấu trúc tham khảo.
- AI chỉ phân bổ nội dung theo cấu hình cuối cùng do giáo viên xác nhận.

### 2.2. Mức độ chung của đề

Giáo viên bắt buộc chọn một trong ba mức:

| Giá trị | Nhãn hiển thị | Cách AI sử dụng |
|---|---|---|
| `EASY` | Dễ | Câu hỏi trực tiếp, dữ kiện rõ, ít bước suy luận, bám sát yêu cầu cần đạt cơ bản |
| `MEDIUM` | Vừa | Cân bằng câu trực tiếp và câu cần liên hệ, suy luận; đây là giá trị mặc định |
| `HARD` | Khó | Tăng độ phức tạp của dữ kiện, ngữ cảnh và số bước suy luận nhưng không vượt chương trình |

Mức độ chung của đề **không thay thế** ba mức độ nhận thức `Biết – Hiểu – Vận
dụng` và không tự động sửa tỉ lệ của chúng. Ví dụ, đề `HARD` vẫn có thể giữ tỉ
lệ `40%-30%-30%`; AI làm câu hỏi khó hơn trong phạm vi từng mức nhận thức bằng
cách điều chỉnh ngữ cảnh, độ nhiễu, số bước xử lý và mức độ liên kết kiến thức.

AI không được vì lựa chọn `HARD` mà đưa kiến thức ngoài chương trình, cũng không
được vì lựa chọn `EASY` mà đổi câu Vận dụng thành câu Biết.

### 2.3. Khóa mềm Tự luận đối với Lớp 12

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
    "totalScore": 10.0,
    "knowledgeScope": {
      "resolution": "CURRICULUM | ESTIMATED_BY_ORDER",
      "scopeVersion": 1,
      "semester": 1,
      "fromWeek": 1,
      "toWeek": 9,
      "bookCodes": ["LI10"],
      "lessonRefs": [
        { "bookCode": "LI10", "chapterCode": "C1", "lessonCode": "b1" }
      ],
      "confirmedByTeacher": true
    }
  },
  "configuration": {
    "configurationVersion": 1,
    "mode": "cv7991 | custom",
    "difficulty": "EASY | MEDIUM | HARD",
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
      "planningScorePerItem": 0.25,
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
      "subQuestionPointsByQuestion": [
        [0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5]
      ],
      "note": "Lớp 12 mặc định không có tự luận; chỉ sử dụng khi allowEssayForGrade12 = true."
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
  "allocationMetadata": {
    "allocationPlanVersion": 1,
    "method": "LARGEST_REMAINDER_WITH_CONSTRAINTS",
    "algorithmVersion": "1.0"
  },
  "chapterDistribution": [
    {
      "chapterId": 1,
      "chapterName": "Tên chương/chủ đề 1",
      "knowledgeUnits": ["Đơn vị 1", "Đơn vị 2"],
      "ratio": 0.25,
      "score": 2.5,
      "allocationTrace": {
        "weightSource": "CURRICULUM_PERIODS | CURRICULUM_WEEKS | LEARNING_OUTCOMES | LESSON_COUNT | EQUAL",
        "rawWeight": 5.0,
        "normalizedWeight": 0.25,
        "fallbackUsed": false
      },
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

### 3.2. Nguyên tắc phân bổ deterministic

Mọi con số trong Ma trận phải do backend tính và khóa trước khi gọi AI. AI chỉ
được ánh xạ chương, đơn vị kiến thức và yêu cầu cần đạt vào quota đã khóa; AI
không được tự tăng, giảm hoặc chuyển quota giữa các ô.

Đơn vị phân bổ chuẩn là `chương × dạng câu hỏi × mức độ nhận thức`. Với từng
dạng câu hỏi, cần phân biệt:

- TNKQ nhiều lựa chọn và Trả lời ngắn: phân bổ theo câu;
- Đúng–Sai: lưu cả số câu (`questionBlock`) và số ý (`assessmentItem`); mức độ
  nhận thức có thể được gán ở cấp ý;
- Tự luận: lưu số câu và điểm từng ý; mức độ nhận thức có thể được gán ở cấp ý.

Tỉ lệ Nhận biết/Thông hiểu/Vận dụng được bảo toàn và kiểm tra **theo điểm**.
Tỉ lệ số câu theo mức độ có thể khác vì điểm của các dạng câu hỏi không bằng
nhau.

Với dạng Đúng–Sai có quy tắc chấm lũy tiến, backend dùng `planningScore` cố
định cho từng ý để lập Ma trận (mặc định chia đều điểm tối đa của câu cho các
ý). `planningScore` chỉ dùng để phân bổ tỉ lệ mức độ; điểm thực tế của học sinh
vẫn tính theo `scoringRule`. Không dùng điểm thực tế lũy tiến để tính quota.

Thứ tự chọn dữ liệu để tính trọng số chương:

1. Số tiết thực dạy trong phân phối chương trình;
2. Số tuần dạy;
3. Số yêu cầu cần đạt hoặc đơn vị kiến thức;
4. Số bài;
5. Chia đều nếu không có các dữ liệu trên.

Backend dùng Largest Remainder Method để tạo quota nguyên sơ bộ, sau đó chạy bộ
điều chỉnh ràng buộc để đồng thời bảo toàn tổng theo chương, dạng câu hỏi, mức
độ và điểm. Không chạy Largest Remainder độc lập cho từng chiều vì có thể đúng
tổng hàng nhưng sai tổng cột. Nếu không tồn tại phương án thỏa tất cả ràng buộc,
hệ thống phải báo cấu hình không khả thi để giáo viên điều chỉnh, không giao AI
tự sửa.

Mỗi lần phân bổ phải lưu ít nhất `weightSource`, `rawWeight`,
`normalizedWeight`, `fallbackUsed`, thuật toán/phiên bản thuật toán và các bước
điều chỉnh quota để có thể giải thích và tái lập kết quả.

### 3.3. Giá trị gợi ý theo CV 7991

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

### 3.4. Ví dụ đối chiếu cấu hình giáo viên nhập

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
          "durationInPeriods": 8,
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
          "totalQuestionBlocks": 6,
          "totalAssessmentItems": 11,
          "totalScore": 3.75
        }
      ],
      "chapterSummary": {
        "totalQuestionBlocks": 6,
        "totalAssessmentItems": 11,
        "totalScore": 3.75,
        "ratioPercent": 37.5
      }
    }
  ],
  "grandTotal": {
    "totalQuestionBlocks": 20,
    "totalAssessmentItems": 30,
    "totalScore": 10.0,
    "byType": {
      "multipleChoice": { "count": 12, "score": 3.0 },
      "trueFalse": { "count": 2, "items": 8, "score": 2.0 },
      "shortAnswer": { "count": 4, "score": 2.0 },
      "essay": { "count": 2, "items": 6, "score": 3.0 }
    },
    "byLevel": {
      "nhan_biet": { "itemCount": 12, "score": 4.0, "ratio": 0.40 },
      "thong_hieu": { "itemCount": 9, "score": 3.0, "ratio": 0.30 },
      "van_dung": { "itemCount": 9, "score": 3.0, "ratio": 0.30 }
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
 │    └─ KnowledgeScopeDto knowledgeScope
 │         ├─ ScopeResolution resolution    (CURRICULUM | ESTIMATED_BY_ORDER)
 │         ├─ int scopeVersion
 │         ├─ int semester
 │         ├─ int fromWeek
 │         ├─ int toWeek
 │         ├─ List<String> bookCodes
 │         ├─ List<LessonRefDto> lessonRefs (bookCode, chapterCode, lessonCode)
 │         └─ boolean confirmedByTeacher
 ├─ ExamConfigurationDto configuration
 │    ├─ int configurationVersion
 │    ├─ String mode                        (cv7991 | custom)
 │    ├─ ExamDifficulty difficulty          (EASY | MEDIUM | HARD)
 │    ├─ boolean confirmedByTeacher
 │    ├─ boolean allowEssayForGrade12
 │    ├─ String complianceStatus            (MATCHED | DEVIATED | INVALID)
 │    └─ List<String> warnings
 ├─ Map<String, QuestionTypeDto> questionTypes
 │    ├─ multipleChoice  (label, ratio, score, pointsPerQuestion, questionCount)
 │    ├─ trueFalse       (label, ratio, score, itemsPerQuestion, planningScorePerItem,
 │    │                    scoringRule, questionCount)
 │    ├─ shortAnswer     (label, ratio, score, pointsPerQuestion, questionCount)
 │    └─ essay           (label, ratio, score, questionCount, subQuestionPointsByQuestion)
 │                        [Lớp 12 mặc định 0; dùng khi allowEssayForGrade12 = true]
 ├─ AssessmentLevelsDto assessmentLevels
 │    ├─ List<String> levels
 │    └─ Map<String, Double> ratioByLevel
 ├─ AllocationMetadataDto allocationMetadata
 │    ├─ int allocationPlanVersion
 │    ├─ String method
 │    └─ String algorithmVersion
 └─ List<ChapterDistributionDto> chapterDistribution
      ├─ int chapterId
      ├─ String chapterName
      ├─ double ratio
      ├─ double score
      ├─ AllocationTraceDto allocationTrace
      │    ├─ WeightSource weightSource
      │    ├─ double rawWeight
      │    ├─ double normalizedWeight
      │    └─ boolean fallbackUsed
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
 │    │    ├─ int durationInPeriods
 │    │    ├─ LearningOutcomesDto learningOutcomes   (nhan_biet, thong_hieu, van_dung)
 │    │    ├─ QuestionAllocationDto questionAllocation
 │    │    ├─ int totalQuestionBlocks
 │    │    ├─ int totalAssessmentItems
 │    │    └─ double totalScore
 │    └─ ChapterSummaryDto chapterSummary
 └─ GrandTotalDto grandTotal
      ├─ int totalQuestionBlocks
      ├─ int totalAssessmentItems
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
Call 0  → Giáo viên chọn thông tin và cấu hình đề
          Input:  subject + grade + examType + difficulty
                  + số câu + điểm + tỉ lệ mức độ
          Output: ExamConfigurationDto đã tính tổng + cảnh báo đối chiếu
          Điều kiện: confirmedByTeacher = true

Call 1  → Hệ thống xác định phạm vi kiến thức
          Input:  subject + grade + examType
          Xử lý:  ExamScopeResolver ánh xạ theo phân phối chương trình
                   → bookCode/chapterCode/lessonCode
                   → TextbookCatalogRepository.findLessonKnowledge(...)
          Output: KnowledgeScopeDto + ExamKnowledgeContext từ knowledge_json
          Lưu ý:  Nếu chỉ suy ra theo sort_order, đánh dấu ESTIMATED_BY_ORDER
                   và yêu cầu giáo viên xác nhận phạm vi ước lượng

Call 2A → Tính trọng số và khóa quota (không dùng AI)
          Input:  ExamConfigurationDto đã được giáo viên xác nhận
                  + KnowledgeScopeDto + ExamKnowledgeContext
          Xử lý:  Chọn nguồn trọng số theo thứ tự ưu tiên
                   → Largest Remainder tạo quota sơ bộ
                   → điều chỉnh ràng buộc chương × dạng × mức độ × điểm
          Output: AllocationPlan đã khóa + AllocationTrace
          Ràng buộc: Tổng theo dạng, mức độ và điểm phải khớp cấu hình
                     Nếu không có phương án khả thi, trả lỗi để giáo viên điều chỉnh

Call 2B → Hoàn thiện nội dung Ma trận
          Input:  AllocationPlan đã khóa + KnowledgeScopeDto + ExamKnowledgeContext
          Xử lý:  AI đề xuất chương/chủ đề, đơn vị kiến thức và ánh xạ vào quota
          Output: ExamMatrixDto (questionTypes, assessmentLevels, chapterDistribution)
          Ràng buộc: AI không được thay đổi difficulty, quota, số câu, điểm và tỉ lệ
                     AI không được dùng kiến thức ngoài KnowledgeScopeDto
          → publish MATRIX_READY

Call 3  → Tạo Bản đặc tả (dựa vào Ma trận)
          Input:  ExamMatrixDto + ExamKnowledgeContext
          Output: ExamSpecificationDto (chapters → knowledgeUnits → learningOutcomes + questionAllocation)
          Ràng buộc: questionAllocation phải khớp tuyệt đối AllocationPlan
          → publish SPEC_READY

Call 4  → Giáo viên xác nhận Ma trận + Bản đặc tả
          Input:  ExamMatrixDto + ExamSpecificationDto
          Output: Phiên bản Ma trận và Bản đặc tả đã xác nhận

Call 5..N → Tạo đề thi song song (file riêng)
          Input:  ExamMatrixDto + ExamSpecificationDto + ExamKnowledgeContext
          Xử lý:  Mỗi tác vụ nhận chapter context + quota bất biến
                   → sinh câu hỏi theo chương/quota
                   → hợp nhất và kiểm tra toàn cục
          Output: File đề thi + đáp án + hướng dẫn chấm
          Ràng buộc: difficulty chỉ điều chỉnh độ phức tạp câu hỏi;
                     không thay đổi phạm vi SGK hoặc quota đã khóa
          → publish EXAM_READY
```

---

## 7. Quy tắc validation

| Kiểm tra | Mô tả |
|---|---|
| Tổng điểm = 10.0 | Ma trận phải cộng đúng 10 điểm |
| Tổng khối câu hỏi | `totalQuestionBlocks` phải bằng tổng số câu của các dạng |
| Tổng ý đánh giá | `totalAssessmentItems` phải bằng tổng câu đơn + ý Đúng–Sai + ý Tự luận |
| Đối chiếu cấu trúc tham khảo | Sai lệch `3-2-2-3` tạo cảnh báo cụ thể, không chặn giáo viên tiếp tục |
| Tổng tỉ lệ mức độ = 100% | Biết + Hiểu + Vận dụng phải cộng đúng 100% |
| Mức độ đề hợp lệ | `difficulty` bắt buộc thuộc `EASY`, `MEDIUM`, `HARD` |
| Phủ đơn vị kiến thức đã chọn | Mỗi đơn vị được chọn vào Bản đặc tả phải có ít nhất một câu hoặc một ý; đơn vị không được chọn phải được ghi nhận là không đánh giá trong phiên bản đề |
| Cảnh báo mức độ tham khảo | So sánh với `40%-30%-30%`; sai lệch được cảnh báo, không tự sửa |
| Tự luận Lớp 12 | Mặc định 0; chỉ cho nhập khi `allowEssayForGrade12 = true` |
| Giáo viên đã xác nhận | Không gọi AI tạo Ma trận khi `confirmedByTeacher = false` |
| Tỉ lệ mức độ theo điểm | Điểm Nhận biết + Thông hiểu + Vận dụng phải khớp tỉ lệ đã xác nhận; không chỉ kiểm tra theo số câu |
| Điểm quy hoạch Đúng–Sai | Tổng `planningScore` của các ý phải bằng điểm tối đa của khối câu hỏi; `scoringRule` chỉ dùng khi chấm bài |
| Quota khả thi | Không gọi AI nếu không tồn tại phân bổ nguyên thỏa tổng theo chương, dạng, mức độ và điểm |
| Bảo toàn cấu hình | AI trả về khác quota/số câu/điểm/tỉ lệ đã chốt thì kết quả không hợp lệ |
| Tái lập phân bổ | Phải lưu nguồn trọng số, trọng số chuẩn hóa, thuật toán và các bước điều chỉnh quota |
| Phạm vi theo loại đề | Danh sách bài phải thuộc đúng học kỳ và mốc tuần của loại kiểm tra |
| Xác nhận phạm vi ước lượng | Không tạo Ma trận nếu phạm vi `ESTIMATED_BY_ORDER` chưa được giáo viên xác nhận |
| Không vượt phạm vi SGK | Ma trận, Bản đặc tả và câu hỏi chỉ được dùng các bài trong `KnowledgeScopeDto` |
| Mức độ không đổi phạm vi | `EASY`, `MEDIUM`, `HARD` không được thêm hoặc loại bài khỏi phạm vi đã chốt |
| Nội dung SGK tồn tại | Mọi bài trong phạm vi phải có `knowledge_json`; thiếu dữ liệu phải báo lỗi hoặc yêu cầu điều chỉnh phạm vi |

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
    "difficulty": "MEDIUM",
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
      "planningScorePerItem": 0.25,
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
      "subQuestionPointsByQuestion": [
        [0.5, 0.5],
        [0.5, 0.5]
      ],
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
          "totalQuestionBlocks": 5,
          "totalAssessmentItems": 9,
          "totalScore": 2.75
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
| Mức độ đề Dễ/Vừa/Khó | **Giáo viên** | Mặc định `MEDIUM`; định hướng cách AI viết câu hỏi |
| Cho phép tự luận ở Lớp 12 | **Giáo viên** | Toggle Nâng cao, mặc định tắt |
| Môn, lớp, loại kiểm tra | **Giáo viên** | Đầu vào để hệ thống xác định phạm vi SGK |
| Phạm vi sách/chương/bài | Hệ thống | Ánh xạ từ phân phối chương trình; giáo viên chỉ xác nhận nếu là phạm vi ước lượng |
| Đọc `knowledge_json` | Hệ thống backend | Thực hiện nội bộ qua repository, không trả toàn bộ nội dung SGK xuống frontend |
| Tính tổng và cảnh báo sai lệch | Hệ thống | Cảnh báo rõ từng dạng, không tự sửa |
| Tính trọng số chương | Hệ thống backend | Theo thứ tự số tiết → số tuần → YCCĐ/đơn vị → số bài → chia đều; lưu nguồn đã dùng |
| Khóa quota chương × dạng × mức độ | Hệ thống backend | Largest Remainder kết hợp bộ điều chỉnh ràng buộc; không dùng AI |
| Chương/chủ đề theo loại đề | AI đề xuất | Chỉ từ `knowledge_json` trong phạm vi hệ thống đã xác định |
| Đơn vị kiến thức + YCCĐ | AI sinh | Từ `knowledge_json` của các bài thuộc phạm vi |
| Ánh xạ quota vào đơn vị kiến thức | AI đề xuất | Không được tăng, giảm hoặc chuyển quota đã khóa |
| Nội dung câu hỏi và đáp án | AI sinh | Bám sát dữ liệu SGK; mức độ chung không làm thay đổi phạm vi |

---

## 10. Nguyên tắc xuyên suốt

`Thông tin + cấu hình giáo viên → Phạm vi SGK → Trọng số → Quota đã khóa → Ma trận → Bản đặc tả → Giáo viên xác nhận → Đề kiểm tra`

Ma trận, Bản đặc tả và Đề kiểm tra phải dùng cùng một `configurationVersion`,
`scopeVersion` và phiên bản AllocationPlan. Nếu giáo viên sửa loại đề, mức độ
đề, số câu, điểm, tỉ lệ hoặc xác nhận lại phạm vi, hệ thống phải tạo phiên bản
mới và đánh dấu Ma trận, Bản đặc tả, Đề cũ là cần tạo lại; không được âm thầm
ghép phạm vi, cấu hình hoặc quota mới với kết quả cũ.
