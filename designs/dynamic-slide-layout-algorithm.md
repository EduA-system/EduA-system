# Thuật toán layout slide động

## Mục tiêu

Engine thuần TypeScript trong `fe/lib/slide-layout/` biến nội dung semantic thành geometry editor 960×540. Nó không phụ thuộc DOM, HTML, AI hoặc thư viện template.

## Pipeline

1. Adapter thêm hero block từ `SlideItem.title`, lấy `bodyTop` từ skin Bước 1 và tính density.
2. FNV-1a tạo seed 32-bit; Mulberry32 tạo chuỗi random deterministic.
3. Engine sinh 12 candidate cho mỗi slide.
4. Candidate thay orientation, tỷ lệ split, topology hợp lệ và jitter nhỏ; không đổi thứ tự semantic.
5. Validator hard-reject rectangle ngoài content bounds, kích thước không hợp lệ hoặc thiếu block bắt buộc.
6. Score gồm readability, content fit, visual balance, space coverage, semantic match và variety.
7. Candidate điểm cao nhất thắng. Nếu toàn bộ candidate chính bị reject, engine dùng lưới fallback tính theo số block, không dùng template.

## Family

- `intro`, `section`: hero trái hoặc giữa, header ẩn.
- `concept`, `summary`: stack/cards/columns theo demand.
- `text-image`, `experiment`: split text/visual; experiment giữ mỗi phía ít nhất 30% bề rộng nội dung.
- `comparison`: table khi có criteria chung và cell đủ chỗ, nếu không dùng panel.
- `table`: grid thật, mỗi header/cell là slot riêng.
- `process`: ngang hoặc dọc nhưng giữ nguyên thứ tự step.
- `formula`: spotlight hoặc split formula/explanation.
- `exercise`, `quiz`: question card/stack với slot question, choices, answer.

Table-grid được renderer mở thành shape nền, border và line elements. Slot trở thành text/image placeholder có `contentSlot = slot.id`. Header chỉ materialize khi `headerMode=fixed`.

## Determinism và biến thể

Seed thực tế được lưu trong `SlideLayoutResult` để debug/tái hiện. Chạy lại Bước 2 tạo nonce mới nên toàn deck có biến thể mới; dùng lại nonce cho output byte-for-byte ổn định.

Random không được bỏ block required, đảo step, đổi cell mapping hoặc biến đổi nội dung nguồn.

## Kiểm thử

Property-style tests chạy mọi family qua nhiều nonce và kiểm tra finite/non-negative/inside bounds. Test chuyên biệt kiểm tra selection table/panel, mapping cell, thứ tự process, tỷ lệ experiment, header mode, renderer và deterministic seed.

Gallery tại `/slide-layout-gallery` hiển thị mọi family ở density sparse/normal/dense với seed cố định.

