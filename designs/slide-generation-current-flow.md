# Luồng tạo slide hiện tại sau dynamic-layout cutover

## Outline hai pha

Pha 1 gọi AI để tạo khung gồm title, pedagogical role, slide type, header mode và brief. Pha 2 soạn `blocks` cùng `relationships` semantic. Backend parse nghiêm discriminated union, ID, reference và kích thước bảng; không chuyển đổi response schema cũ.

Outline editor chỉnh trực tiếp block có cấu trúc. Người dùng có thể thêm/xóa/kéo đổi thứ tự block, sửa form theo subtype và quản lý relationship bằng select. Nút xác nhận bị khóa nếu plan không hợp lệ.

## Ba bước thiết kế

### Bước 1 — skin deck

AI hiện có chỉ tạo skin chung. Frontend lấy background, palette và `bodyTop`; iframe converter chỉ còn được dùng ở bước này.

### Bước 2 — layout động

`runStructuralStep()` tạo một `runNonce`, gọi `slideToLayoutInput()` và `generateSlideLayout()` cho từng slide. Không có request backend/AI ở bước này.

Renderer chuyển thẳng structures/slots thành `SlideElement[]`. Context lưu `layoutResultsBySlide` và `contentSlotsBySlide`; không còn `structuralHtmlBySlide`.

### Bước 3 — điền nội dung

Frontend gửi slot kèm source block/part và source text chính xác. Backend yêu cầu AI trả nội dung cho từng slot, validate palette/alignment/font bounds nhưng giữ nguyên toàn bộ text, kể cả dài hơn `maxChars`.

`applyContentSlots()` cập nhật placeholder theo `contentSlot`. Với text, nó đo chiều cao thật và tăng box nếu cần. Không có truncation, shrink font, overflow error hoặc re-layout.

## State và debug

`SlideDesignContext` giữ skin HTML/background, `bodyTop`, `deckSeed`, layout result, content slot và slide semantic. Mỗi result lưu family/topology/seed/score/warnings.

Trang template preview và thư viện fixed-template đã bị xóa. Visual QA dùng fixture gallery của engine.

