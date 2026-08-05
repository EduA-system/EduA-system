# Slide Outline — Lỗi & Đề xuất giải quyết

> Phân tích dựa trên outline mẫu `outline-ten-bai-day-dai-cuong-ve-polymer.json` và pipeline sinh outline trong
> `be/.../service/slides/GenerateSlideOutlineUseCase.java` + `SlidePromptBuilder.java`.
> Pipeline: content-map → deck-blueprint → part-skeleton (song song mỗi phần) → expand-slide (mỗi slide 1 call độc lập).

## Lỗi nghiêm trọng (phải sửa)

| # | Lỗi | Biểu hiện trong outline | Nguyên nhân trong code | Cách giải quyết đề xuất | Ưu tiên |
|---|-----|-------------------------|------------------------|-------------------------|---------|
| 1 | Trùng lặp nội dung giữa các slide/phần | Định nghĩa "Polymer là hợp chất phân tử khối lớn…" lặp ~6–7 lần (p1-section, p1s1, p2-section, p3-section, p3s1, p6-section, p6s1) | Bước expand chỉ nhét skeleton **của đúng phần đó** (`partSkeletonJson = List.of(skeleton)`, `GenerateSlideOutlineUseCase.java:170`; gắn vào "KHUNG CỦA PART" `SlidePromptBuilder.java:323`). Mỗi slide soạn **mù**, không thấy nội dung slide/phần khác | Cho bước expand thấy skeleton **toàn deck** (tái dùng `expandPartPrompt` đã có sẵn "KHUNG TOÀN DECK" `SlidePromptBuilder.java:258`), hoặc truyền tóm tắt nội dung các slide đã sinh vào prompt | Cao |
| 2 | Quiz trùng khít nguyên văn | `p1s4` (2 câu MCQ) ≡ `p6s2` giống hệt câu hỏi, phương án, đáp án | Hai slide quiz độc lập cùng rút "giữ nguyên văn câu hỏi/đáp án từ giáo án" (`SlidePromptBuilder.java:358`) từ cùng nguồn, không tầng nào chống trùng | Thêm pass hợp nhất cuối nhìn toàn deck để loại quiz trùng; hoặc gán mỗi quiz một tập câu hỏi riêng ở bước blueprint/skeleton | Cao |
| 3 | Đáp án mâu thuẫn cho cùng câu hỏi | `p2s5.b1` → đáp án **B (Mắt xích)**; `p5s1.b1` cùng câu hỏi → **A (Monome)** | Hai call expand khác nhau tự đoán đáp án MCQ gần giống nhau; không có soát nhất quán xuyên slide | Pass soát cuối kiểm tra câu hỏi trùng/đáp án lệch; hoặc chuẩn hóa đáp án về nguồn giáo án | Cao |
| 4 | Text tiếng Anh lẫn trong bài tiếng Việt | `p3-section.b1` cả đoạn tiếng Anh; `p2s5` explanation tiếng Anh | Không có guard "output phải tiếng Việt"; các instruction lại là tiếng Anh (`CONTENT_MAP_INSTRUCTION:21`, `DECK_BLUEPRINT_INSTRUCTION:15`) → model echo ngôn ngữ chỉ dẫn khi nguồn mỏng | Thêm ràng buộc ngôn ngữ đầu ra tiếng Việt trong prompt expand; cân nhắc Việt hóa các instruction; thêm validation phát hiện text ngoại ngữ | Cao |

## Lỗi cấu trúc / chất lượng (nên sửa)

| # | Lỗi | Biểu hiện trong outline | Nguyên nhân trong code | Cách giải quyết đề xuất | Ưu tiên |
|---|-----|-------------------------|------------------------|-------------------------|---------|
| 5 | Ép cứng số phần/slide bất kể nguồn | 6 phần / ~35 slide dựng từ **chỉ 2 chunk** (c1, c2) → chồng lấn tất yếu | `parseDeckBlueprint` ép 4–6 phần (`:265`) và tổng 20–30 slide (`:292`) không phụ thuộc số chunk | Nới ràng buộc theo số chunk/khối lượng nguồn thực (vd giới hạn số phần ≤ f(số chunk)) | Trung bình |
| 6 | Thứ tự sư phạm ngược | Phần 2 (tính chất/ứng dụng) đứng trước Phần 3 (phân loại/tổng hợp) | Thứ tự phần do LLM blueprint tự quyết; code chỉ validate số lượng/budget/coverage/id, **không ràng buộc trình tự** (`:270–293`) | Thêm hướng dẫn/kiểm tra trình tự sư phạm chuẩn (khái niệm → phân loại → tổng hợp → tính chất → phản ứng → ứng dụng → tổng kết) | Trung bình |
| 7 | Nội dung phản ứng bị tách đôi & lặp | `p2s2` (tính chất hóa học) chồng gần hết với cả Phần 4 (phản ứng hóa học) | Blueprint chia facet chỉ bằng 1 dòng `learningGoal` (`SlidePromptBuilder.java:70–74`), không đủ tách nội dung thật | Gộp chủ đề phản ứng về một phần ở blueprint; siết luật "distinct facet" bằng ví dụ cụ thể | Trung bình |
| 8 | Hai phần tổng kết + kiểm tra chồng nhau | Phần 5 và Phần 6 đều summary + quiz (p5s5, p6-section, p6s1 đều tổng kết) | Cùng nguyên nhân #5/#7: nhiều phần chia trên nguồn ít | Gộp thành một phần kết duy nhất ở blueprint | Trung bình |

## Lỗi nhỏ

| # | Lỗi | Biểu hiện trong outline | Nguyên nhân trong code | Cách giải quyết đề xuất | Ưu tiên |
|---|-----|-------------------------|------------------------|-------------------------|---------|
| 9 | Thời lượng đồng đều 3 phút | Mọi slide `durationMinutes: 3`, kể cả section divider lẫn quiz 5 câu | Template ví dụ hardcode `"durationMinutes":3` (`SlidePromptBuilder.java:377`) → model copy y nguyên | Bỏ số cứng trong template, hoặc phân bổ thời lượng theo slideType/số block | Thấp |
| 10 | Quiz mang pedagogicalRole "other" | `p1s4`, `p5s3` role = `other` thay vì `practice` | `normalizePedagogicalRole` dồn nhãn lạ về `"other"` (`:821`); không ép quiz→practice | Ép role theo slideType (quiz/exercise → practice) ở bước chuẩn hóa skeleton | Thấp |
| 11 | Định dạng đáp án không nhất quán | Chỗ `"C"`, chỗ `"B. Tơ tằm"`, `"A. Monome"` | Không chuẩn hóa format `answer` sau khi parse quiz block | Chuẩn hóa `answer` về một dạng (chỉ nhãn A/B/C/D hoặc full) khi parse | Thấp |
| 12 | Nghi ngờ tính đúng công thức/cân bằng | `p4s2` thủy phân nylon-6,6 / PMMA; bảng `p3s2` | AI tự sinh, không có kiểm chứng hóa học | Ngoài phạm vi sửa code — cần GV hóa rà soát nội dung trước khi xuất slide | Thấp |

## Nguyên nhân gốc (root cause)

Lỗi lớn nhất (#1–#3) **không nằm ở một prompt cụ thể** mà ở quyết định kiến trúc: chia nhỏ tối đa (per-part, per-slide) để prompt ngắn và cô lập lỗi (comment `GenerateSlideOutlineUseCase.java:172`, `SlidePromptBuilder.java:305`). Cái giá là **không call nào từng thấy toàn bộ deck đã sinh**, nên trùng lặp và mâu thuẫn giữa các slide là mù về mặt hệ thống. Cơ chế chống trùng duy nhất là câu "distinct facet" trong blueprint, chạy trên `learningGoal` 1 dòng chứ không trên nội dung thật.

## Hai hướng xử lý

| Hướng | Nội dung | Đánh trúng lỗi | Rủi ro |
|-------|----------|----------------|--------|
| **Rẻ, khu trú** | (b) expand thấy skeleton toàn deck; (c) guard ngôn ngữ tiếng Việt; (d) ép role quiz; (a) nới ràng buộc 4–6 phần/20–30 slide theo số chunk | #1, #4, #10, #5 (một phần) | Thấp |
| **Đắt, trị gốc** | Thêm **một pass hợp nhất/soát cuối** nhìn toàn deck: gỡ định nghĩa lặp, quiz trùng, mâu thuẫn đáp án | #1, #2, #3, #7, #8 | Trung bình (thêm 1 call LLM/độ trễ) |

Khuyến nghị: bắt đầu bằng nhóm rẻ (b)+(c)+(d) vì đánh trúng phần lớn lỗi nghiêm trọng với rủi ro thấp; sau đó cân nhắc pass soát cuối cho #2/#3.
