# Sinh Outline 2 pha — Outline "xịn", dạy-được-luôn

> Kế hoạch nâng cấp bước **sinh outline** (giai đoạn 1 của luồng tạo slide) từ
> mô hình "1 call ra dàn ý mỏng" sang **2 pha**: pha khung (structure) rồi pha
> đào sâu (expand) từng phần. Mục tiêu: mỗi slide trong outline đã có **nội dung
> chi tiết soạn sẵn**, để giáo viên dùng gần như không phải chỉnh.
>
> Liên quan: [`slide-generation-pipeline.md`](./slide-generation-pipeline.md)
> (giai đoạn 2 — biến outline thành HTML/element). Doc này **chỉ bàn giai đoạn 1**.

---

## 1. Bối cảnh & vấn đề hiện tại

Luồng tạo slide gồm 2 giai đoạn:

1. **Outline** — `GenerateSlideOutlineUseCase` + `SlidePromptBuilder.outlineFromPlanPrompt()`
   → sinh `OutlineDto { parts[] → slides[] }`. Mỗi slide: `id, title, kind,
   pedagogicalRole, layoutHint, content`.
2. **Design** — FE `runDesignPipeline` → BE HTML 3 bước → element editor.

Bước outline hiện tại **sai 3 điểm** so với mục tiêu "deck dạy-được-luôn":

### 1.1. Khung deck cụt — chỉ có thân bài
Prompt ép *"Mỗi PHẦN tương ứng một HOẠT ĐỘNG"* (`SlidePromptBuilder.java:80-82`).
Giáo án 5512 chỉ có các hoạt động hình thành kiến thức / luyện tập → deck sinh ra
**thiếu lớp nghi thức lên lớp**: không bìa/chào, không slide mục tiêu, không tổng
kết/sơ đồ, không BTVN/dặn dò — dù `objectives`, `consolidation`, `homework` có sẵn
trong `InlineLessonPlanDto`. GV phải tự thêm 4–5 slide đầu/cuối.

### 1.2. Mất nội dung trước khi AI thấy
`stripHtmlTags()` cắt cứng **400 ký tự** mỗi hoạt động (`SlidePromptBuilder.java:229`)
*trước* khi đưa vào prompt → hoạt động dài bị mất phần cuối → AI không đủ liệu.

### 1.3. Ràng buộc mâu thuẫn với "dùng luôn"
Prompt *"TUYỆT ĐỐI KHÔNG bịa nội dung ngoài giáo án"* (`:92-93`). Nhưng câu chào,
dẫn dắt, chuyển ý, lời kết **không nằm chữ-cho-chữ** trong giáo án. Cấm cứng → slide
khô, rời rạc.

### 1.4. (Phụ) Hardcode môn Vật lý
`:24, :124, :153, :179` + `needsImage()` + `appendFormulas()` giả định môn Vật lý.
Cần trung lập + nhận `subject` động.

### 1.5. (Phụ) UI không hiển thị content
`OutlineEditor.tsx` chỉ vẽ `title` + nhãn role; `content` đã sinh nhưng bị ẩn hoàn
toàn → GV sửa "mù".

---

## 2. Mục tiêu

- **Outline = bản thiết kế nội dung**, không phải dàn ý. Mỗi slide soạn sẵn nội dung
  chi tiết đủ để trình chiếu.
- **Đủ cung tiết dạy** (deck arc) — xem §3.
- **Trung thành dữ kiện, mượt câu chữ** — số liệu/đáp án/công thức/câu hỏi gốc giữ
  nguyên; câu dẫn/chuyển ý/chào-kết được AI soạn.
- **Môn học trung lập** — bỏ giả định Vật lý.
- **UI giữ nguyên dạng list, thêm "xem chi tiết"** từng slide.

Không thuộc phạm vi doc này: sinh ảnh thật, render LaTeX, giai đoạn design HTML.

---

## 3. Khung một tiết dạy (deck arc mục tiêu)

Deck sinh ra phải bọc nội dung giáo án trong khung nghi thức lên lớp:

```
[Bìa / Chào hỏi]                     ← tên bài, môn, lớp, GV, lời chào
[Mục tiêu bài học]                   ← từ objectives
(Kiểm tra bài cũ)                    ← optional, xem §6 Q3
[Khởi động / Đặt vấn đề]             ← hoạt động khởi động (5512 HĐ1)
[Thân bài: các hoạt động]           ← hình thành kiến thức, mỗi HĐ → 1 phần, 2-4 slide
[Luyện tập]                          ← bài tập áp dụng
[Tổng kết / Sơ đồ]                   ← từ consolidation
[Vận dụng + BTVN]                    ← từ homework
[Dặn dò / Cảm ơn]                    ← lời kết, dặn chuẩn bị bài sau
```

Phần "thân bài" giữ logic hiện tại (1 hoạt động = 1 phần). Phần đầu/cuối là **slide
khung** AI điền từ field giáo án sẵn có. Slide khung nào không có dữ liệu (vd kiểm
tra bài cũ) → bỏ hoặc AI tự soạn nhẹ tùy quyết định ở §6.

---

## 4. Cấu trúc dữ liệu slide chi tiết (mới)

Mở rộng `SlideItemDto` / `SlideItem`. Field cũ giữ nguyên để tương thích ngược;
thêm field cho nội dung chi tiết. **`content` nâng từ blob mỏng → nội dung hiển thị
đầy đủ**; thêm `speakerNotes` + `durationMinutes`.

| Field | Kiểu | Ý nghĩa | Trạng thái |
|-------|------|---------|-----------|
| `id` | string | id slide | cũ |
| `title` | string | tiêu đề slide | cũ |
| `kind` | string | alias tương thích ngược | cũ |
| `pedagogicalRole` | string | hook/explain/derive/demonstrate/practice/recap (+ mới: `greeting`/`objectives`/`closing`?) | cũ, mở rộng |
| `layoutHint` | string | title/bullets/formula/... | cũ |
| **`content`** | string | **Nội dung HIỂN THỊ trên slide** — text có `\n`, bullet, công thức. Đủ chi tiết để render thẳng. | nâng cấp |
| **`speakerNotes`** | string? | **Lời giảng GV nói** khi đứng slide. Cô đọng nhưng đủ kịch bản. | mới (xem §6 Q1) |
| **`durationMinutes`** | int? | thời lượng dự kiến (từ `durationMinutes` của hoạt động) | mới, optional |

> **Quyết định mở (§6 Q1):** giữ `content` là text hay tách `blocks[]` có kiểu.
> Bản 2-pha đầu tiên dùng **`content` là text chi tiết** (nhẹ, không vỡ schema);
> nâng lên `blocks[]` sau nếu cần render cấu trúc hơn.

---

## 5. Kiến trúc 2 pha

Lý do không dùng 1 call: deck 15–20 slide × content chi tiết + lời giảng = quá nhiều
token → dễ cụt giữa chừng / model làm nông để dàn đều. Tách 2 pha cho vừa **mạch
toàn cục** vừa **độ sâu**.

### Pha 1 — Khung (structure), 1 call
- **Input:** `LessonContext` + `InlineLessonPlanDto` đầy đủ (objectives, activities,
  consolidation, homework) + `userPrompt` + `styleHint` + `subject`.
- **Nhiệm vụ:** sinh **cấu trúc toàn deck** theo arc §3: các phần + danh sách slide,
  mỗi slide chỉ có `title`, `pedagogicalRole`, `layoutHint`, và **1 dòng `brief`**
  mô tả slide này sẽ chứa gì (chưa soạn nội dung đầy đủ).
- **Mục đích:** đảm bảo arc đầy đủ, phân bổ hợp lý, không trùng — *trước* khi tốn
  token soạn chi tiết. Nhẹ → ít cụt.
- **Output:** JSON `{ lessonTitle, parts[] → slides[] { id, title, pedagogicalRole,
  layoutHint, brief } }`.

### Pha 2 — Đào sâu (expand), N call (1 call / phần)
- **Input mỗi call:** khung pha 1 (toàn bộ, để giữ mạch + tránh trùng) + **nội dung
  giáo án của riêng phần đang làm** (không cắt 400 ký tự) + danh sách slide của phần.
- **Nhiệm vụ:** với từng slide trong phần, soạn `content` (hiển thị) + `speakerNotes`
  (lời giảng) + `durationMinutes`.
- **Vì sao theo PHẦN, không theo slide:** gom theo phần giữ mạch nội bộ phần tốt hơn,
  ít call hơn, vẫn đủ hẹp để model làm sâu.
- **Song song:** chạy các phần đồng thời có giới hạn (giống `runPool`
  `SLIDE_CONCURRENCY=4` ở FE) để bù tốc độ.
- **Ghép:** merge content pha 2 vào khung pha 1 theo `slide.id` → `OutlineDto` hoàn
  chỉnh trả về FE.

### Sơ đồ
```
Pha 1 (1 call)  ──►  khung deck đầy đủ (title + brief mỗi slide)
                         │
                         ├─ phần A ─► call expand A ─┐
                         ├─ phần B ─► call expand B ─┤ (song song, ≤4)
                         └─ phần C ─► call expand C ─┘
                                         │
                                    merge theo id
                                         ▼
                              OutlineDto chi tiết → FE
```

---

## 6. Quyết định cần chốt

| # | Câu hỏi | Khuyến nghị |
|---|---------|-------------|
| Q1 | `content` là **text chi tiết** hay tách **`blocks[]` có kiểu**? | Text trước (nhẹ), nâng cấp sau |
| Q2 | Có thêm **`speakerNotes`** (lời giảng) không? | **Có** — đây là thứ làm deck "dùng luôn" |
| Q3 | Slide **kiểm tra bài cũ** — AI tự nghĩ câu hỏi, hay bỏ nếu giáo án không nêu? | Bỏ nếu không có (tránh bịa) |
| Q4 | Bản đầu chạy **2 pha** ngay, hay 1 call rồi nâng? | 2 pha (đang thử theo yêu cầu) |
| Q5 | Pha 2 expand theo **phần** hay theo **slide**? | Theo phần |

---

## 7. Thay đổi cần làm (phác thảo, chưa code)

### Backend
- `SlidePromptBuilder`:
  - `outlineFromPlanPrompt` → tách thành **2 prompt**: `outlineStructurePrompt`
    (pha 1) + `expandPartPrompt` (pha 2).
  - Bỏ giả định "Vật lý" → "giáo viên THPT" + chèn `subject` động.
  - Bỏ rule "1 phần = 1 hoạt động" cứng → mô tả arc §3 + cho slide khung.
  - Nới ràng buộc nội dung: tách "dữ kiện giữ nguyên" vs "câu chữ được soạn".
  - Bỏ giới hạn 400 ký tự `stripHtmlTags` (pha 2 chỉ đưa 1 phần nên không lo dài).
  - Thêm few-shot 1 slide mẫu cho chất lượng đồng đều.
- `GenerateSlideOutlineUseCase`:
  - Điều phối 2 pha: call pha 1 → parse khung → loop/song song call pha 2 từng phần
    → merge → `OutlineDto`.
  - Fallback giữ nguyên nếu pha nào lỗi.
- DTO: thêm `speakerNotes`, `durationMinutes` vào `SlideItemDto` (constructor cũ
  giữ để không vỡ chỗ gọi khác).
- `SlideMetadata.normalize`: bổ sung role mới nếu thêm (`greeting`/`objectives`/
  `closing`) — hoặc map về role hiện có.

### Frontend
- `lib/api/slides.ts`: thêm `speakerNotes`, `durationMinutes` vào type `SlideItem`.
- `OutlineEditor.tsx`: giữ list như cũ, thêm **nút/khu "xem chi tiết"** mỗi slide
  (accordion) hiển thị `content` + `speakerNotes` + thời lượng; cho sửa.
- `run-design-pipeline.ts` `slideOutlineText()`: đã đưa `slide.content` vào; cân nhắc
  đưa thêm `speakerNotes` vào context cho design (hoặc giữ notes chỉ cho GV xem).

---

## 8. Tiêu chí "outline xịn" (để kiểm thử)

- [ ] Deck có đủ arc §3 (bìa → mục tiêu → ... → dặn dò).
- [ ] Mỗi slide content có nội dung thật, ≤ 4–5 bullet, 1 ý chính/slide, không nhồi.
- [ ] Có `speakerNotes` mạch lạc (nếu chọn Q2 = Có).
- [ ] Dữ kiện (số liệu/đáp án/công thức/câu hỏi gốc) khớp giáo án, không sai lệch.
- [ ] Không trùng nội dung giữa các slide/phần.
- [ ] Không còn chữ "Vật lý" hardcode; chạy đúng với môn bất kỳ.
- [ ] UI "xem chi tiết" hiển thị + sửa được content/notes.
