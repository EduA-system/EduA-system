# Trang `/exam-create-new` — Input và hành động hệ thống

Component: `fe/components/dashboard/PracticeExamCreateDashboard.tsx`
Route: `fe/app/exam-create-new/page.tsx` (bọc bởi `RouteGuard`, chỉ Teacher/Moderator)

Đề được tạo **tạm thời**, không lưu database; sau khi tạo xong, kết quả được đưa sang `/exam-edit-new` qua `sessionStorage`.

---

## 1. Input của người dùng

### 1.1. Khối "Thông tin đề"

| Input | State | Kiểu / miền giá trị | Mặc định |
|---|---|---|---|
| Môn học | `subject` | `PHYSICS` \| `CHEMISTRY` \| `MATH` | `PHYSICS` |
| Khối lớp | `grade` | `10` \| `11` \| `12` | `10` |
| Tên bài kiểm tra | `libraryTitle` | chuỗi không rỗng | rỗng |
| Thời lượng (phút) | `duration` (string) → `durationMinutes` (number) | số nguyên 1–90 | `"15"` |
| Độ khó | `difficulty` | `EASY` \| `MEDIUM` \| `HARD` | `MEDIUM` |

- Đổi **môn** hoặc **khối** sẽ gọi `selectBook("")`, reset toàn bộ lựa chọn sách/chương/bài (mục 1.2) vì phạm vi SGK phụ thuộc môn + khối.
- `libraryTitle` chỉ là tên giáo viên đặt để hiển thị trong Thư viện cá nhân và danh sách chọn tài liệu. Giá trị này được truyền qua `sessionStorage` sang trang soạn đề để lưu thành `LibraryContent.title`; **không nằm trong `PracticeExamRequest` và không được gửi tới AI**.

### 1.2. Khối "Phạm vi kiến thức SGK"

| Input | State | Nguồn dữ liệu |
|---|---|---|
| Sách giáo khoa | `bookCode` | `fetchTextbookNames(subject)`, lọc theo `grade` |
| Chương (tick nhiều) | `selectedChapters: string[]` | `fetchTextbookChapters(bookCode)` |
| Bài học (tick nhiều, theo từng chương đã chọn) | `selectedLessons: string[]` (dạng `"chapterCode:lessonCode"`) | `fetchChapterLessons(bookCode, chapter)` cho mỗi chương đã tick |

Hành vi liên động:
- Chọn sách → gọi `fetchTextbookChapters` nạp danh sách chương.
- Tick một chương → gọi `fetchChapterLessons` nạp bài học của (các) chương đang tick; bỏ tick chương → xóa luôn các bài đã chọn thuộc chương đó khỏi `selectedLessons`.
- Tick/bỏ tick một bài → thêm/xóa khỏi `selectedLessons`.

### 1.3. Khối "Cấu trúc câu hỏi và điểm"

Bảng 4 dòng, mỗi dòng ứng với một `TypeKey`: `MULTIPLE_CHOICE`, `TRUE_FALSE`, `SHORT_ANSWER`, `ESSAY`.

| Input mỗi loại câu | State | Ghi chú |
|---|---|---|
| Số câu | `counts[type]` | số nguyên ≥ 0, mặc định `{MC:6, TF:1, SA:1, ESSAY:0}` |
| Điểm (thang 10) | `scores[type]` lưu dạng centi-điểm (điểm × 100) | nhập theo thang điểm 10 (step 0.25), mặc định `{MC:700, TF:200, SA:100, ESSAY:0}` centi-điểm = 7/2/1/0 điểm |

Giá trị dẫn xuất (không phải input trực tiếp, tính từ counts/scores):
- `totalQuestions` = tổng `counts`
- `totalScore` = tổng `scores` (centi-điểm)
- `estimated` (phút) = Σ `counts[type] × TIMES[type][index]`, với `TIMES` là bảng phút/câu cố định theo độ khó:

  | Loại câu | Dễ | Vừa | Khó |
  |---|---|---|---|
  | TN nhiều lựa chọn | 0.75 | 1 | 1.5 |
  | Đúng–sai | 2 | 3 | 4 |
  | Trả lời ngắn | 1.5 | 2.5 | 4 |
  | Tự luận | 4 | 6 | 9 |

- `estimatedBatchCount` = Σ `ceil(counts[type] / BATCH_SIZES[type])`, `BATCH_SIZES = {MC:5, TF:2, SA:3, ESSAY:1}` — chỉ dùng để hiển thị thông báo tiến trình ("AI đang tạo khoảng N nhóm câu..."), không gửi lên backend.

### 1.4. Xác nhận cảnh báo

| Input | State | Khi nào hiện |
|---|---|---|
| Checkbox "Tôi xác nhận tiếp tục" | `confirmed` | Chỉ hiện khi trạng thái khả thi = `WARNING` |

---

## 2. Hệ thống xử lý các input như thế nào

### 2.1. Kiểm tra khả thi thời gian (tính client-side, real-time)

```
allowedOverrunMinutes = durationMinutes < 30 ? 5 : 10
maximumEstimatedMinutes = durationMinutes + allowedOverrunMinutes
hasValidDuration = durationMinutes là số nguyên, 0 < durationMinutes <= 90

status =
  !hasValidDuration || estimated > maximumEstimatedMinutes  → INFEASIBLE (Không khả thi)
  estimated > durationMinutes                                → WARNING (Cần xác nhận)
  còn lại                                                     → FEASIBLE (Khả thi)
```

- `INFEASIBLE`: không cho tạo đề.
- `WARNING`: cho tạo đề nhưng bắt buộc tick `confirmed`; giá trị này được gửi lên backend qua `teacherConfirmedWarning`.
- `FEASIBLE`: tạo bình thường.

### 2.2. Điều kiện bật nút "Tạo đề bằng AI" (`canGenerate`)

Tất cả phải đúng:
1. `hasValidDuration`
2. `totalScore === 1000` (đúng 10 điểm)
3. `totalQuestions > 0`
4. `hasValidScoreDistribution`: với mỗi loại câu, `counts[type] === 0` phải khớp với `scores[type] === 0` (không được có câu mà 0 điểm, hoặc có điểm mà 0 câu)
5. `libraryTitle.trim().length > 0` (đã đặt tên bài kiểm tra để lưu/nhận biết)
6. `selectedLessons.length > 0` (đã chọn ít nhất 1 bài)
7. `status !== "INFEASIBLE"`
8. Nếu `status === "WARNING"` thì phải `confirmed === true`

Panel bên phải hiển thị checklist trực quan cho điều kiện 2, 6 và việc đã chọn sách hay chưa.

### 2.3. Khi bấm "Tạo đề bằng AI" (`generate()`)

1. Khóa toàn bộ form (`loading = true`), disable mọi input.
2. Build `PracticeExamRequest` từ các input cấu hình AI và gửi `POST /api/practice-exams/generate-stream` (`startPracticeExamStream`, service `practiceExamService.ts`). `libraryTitle` không thuộc request này:

   ```ts
   {
     title: `Kiểm tra ${durationMinutes} phút`,
     subject, grade, durationMinutes, difficulty,
     totalQuestionCount: totalQuestions,
     totalScoreCentiPoints: 1000,
     teacherConfirmedWarning: confirmed,
     questionTypes: [
       { type, questionCount: counts[type], totalScoreCentiPoints: scores[type],
         itemsPerQuestion: type === "TRUE_FALSE" ? 4 : undefined }
       // với mỗi type trong MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY
     ],
     knowledgeScope: {
       bookCode,
       lessonRefs: selectedLessons.map(id => {
         const [chapterCode, lessonCode] = id.split(":");
         return { chapterCode, lessonCode };
       }),
     },
   }
   ```

   Ghi chú: `TRUE_FALSE` luôn cố định 4 ý (`itemsPerQuestion: 4`) — không phải input người dùng.

3. Frontend tạo `sessionId`, gọi endpoint khởi tạo stream, rồi lưu `{sessionId, request, display}` vào `sessionStorage["edua:practiceExamSession"]`. `display` chứa `{libraryTitle, subject, grade, duration, difficulty}`; trang `/exam-edit-new` dùng `sessionId` để nhận đề qua STOMP.
4. Sau khi đề được tạo, nút **Lưu vào thư viện** ở `/exam-edit-new` lưu `libraryTitle` làm `LibraryContent.title`; vì thế danh sách chọn tài liệu hiển thị tên giáo viên đã đặt.
5. Nếu request lỗi: bắt `Error`, hiển thị message trong banner đỏ đầu trang; `loading = false` để mở khóa form lại.

### 2.4. Các lệnh gọi API phụ trợ (nạp dữ liệu, không phải hành động submit)

| Trigger | Gọi | Mục đích |
|---|---|---|
| Đổi `subject` | `fetchTextbookNames(subject)` | Nạp danh sách sách theo môn |
| Đổi `bookCode` | `fetchTextbookChapters(bookCode)` | Nạp danh sách chương của sách |
| Đổi `selectedChapters` (khi đã có `bookCode`) | `fetchChapterLessons(bookCode, chapter)` cho từng chương đã chọn | Nạp danh sách bài của các chương đã tick |

Lỗi ở bất kỳ lệnh nào trong 3 lệnh trên đều set `error` (thông báo "Không tải được SGK/chương/bài học.") hiển thị ở banner đầu trang, không chặn các phần khác của form.

---

## 3. Ghi chú khác

- Có sẵn endpoint `POST /api/practice-exams/validate-configuration` (`validatePracticeExam`) trong `practiceExamService.ts` nhưng **không được gọi** ở trang này — mọi kiểm tra khả thi hiện tại đều tính hoàn toàn ở client (mục 2.1), không hỏi backend.
- Đề sinh ra không được lưu DB ở bước này; việc lưu (nếu có) diễn ra ở trang `/exam-edit-new` hoặc bước sau đó.
