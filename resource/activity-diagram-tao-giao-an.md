# Workflow — Quy trình tạo giáo án (5512)

Sơ đồ mô tả các bước chính khi giáo viên tạo một giáo án theo Công văn 5512
trong EDUA System.

```mermaid
flowchart TD
    start([Bắt đầu]) --> choose[/"Chọn Sách → Chương → Bài học"/]
    choose --> request["Yêu cầu hệ thống tạo giáo án"]
    request --> gen["AI sinh khung giáo án"]

    gen --> p1["Phần I — Mục tiêu"]
    gen --> p2["Phần II — Thiết bị & học liệu"]
    gen --> p3["Phần III — Dàn ý các hoạt động dạy học"]

    p1 --> detail["AI soạn chi tiết từng hoạt động dạy học"]
    p2 --> detail
    p3 --> detail

    detail --> show["Hiển thị giáo án trong trình soạn thảo"]
    show --> edit{"Giáo viên chỉnh sửa?"}
    edit -- "Có" --> editing["Sửa nội dung trực tiếp"] --> done
    edit -- "Không" --> done["Hoàn tất giáo án"]
    done --> stop([Kết thúc])
```

## Tóm tắt các bước

1. **Chọn bài học** — giáo viên chọn Sách → Chương → Bài.
2. **Yêu cầu tạo** — gửi yêu cầu sinh giáo án.
3. **Sinh khung** — AI tạo Phần I (Mục tiêu), Phần II (Thiết bị & học liệu),
   Phần III (dàn ý các hoạt động).
4. **Soạn chi tiết** — AI điền chi tiết cho từng hoạt động dạy học.
5. **Hiển thị & chỉnh sửa** — giáo án hiện trong trình soạn thảo, giáo viên có thể
   sửa trực tiếp trước khi hoàn tất.
