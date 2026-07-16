# Quy chuẩn chữ cho slide

## Phạm vi

Quy chuẩn này áp dụng cho slide EDUA trên canvas chuẩn **960 × 540 px** (tỷ lệ 16:9). Mục tiêu là giữ khả năng đọc tốt khi trình chiếu và tạo tính nhất quán giữa các layout.

## Thang kích thước chữ chuẩn

| Thành phần | Cỡ chữ | Ghi chú |
| --- | ---: | --- |
| Header: môn học, chủ đề, section label | 12px | Luôn cố định trong toàn bộ deck. |
| Footer: số trang, thông tin ngắn | 12px | Không dùng cho nội dung chính. |
| Eyebrow / số thứ tự / nhãn nhỏ | 14px | Có thể viết hoa hoặc tăng letter-spacing nhẹ. |
| Chú thích ảnh, nguồn, ghi chú | 14px | Không nhỏ hơn mức này khi trình chiếu. |
| Nội dung chính | 20px | Mức mặc định cho đoạn văn và bullet. |
| Nội dung dày hoặc bố cục ba cột | 18px | Chỉ dùng khi 20px không đủ chỗ. |
| Tiêu đề mục / heading trong thân slide | 26px | Dùng để chia phần trong slide. |
| Tiêu đề slide dài (2–3 dòng) | 32–36px | Ưu tiên rút gọn nội dung trước khi giảm font. |
| Tiêu đề slide | 40px | Mức mặc định cho vùng `hero`. |
| Công thức chính | 32px | Diễn giải công thức dùng 18px hoặc 20px. |

## Quy tắc áp dụng

1. Một slide chỉ nên có tối đa ba cấp cỡ chữ chính: tiêu đề, nội dung và chú thích.
2. Nội dung chính mặc định là 20px; chỉ giảm xuống 18px cho layout dày hoặc nhiều cột.
3. Không dùng chữ dưới 14px trong phần nội dung hiển thị cho người học. Mức 12px chỉ dành cho header và footer.
4. Tiêu đề dùng 40px. Khi tiêu đề dài, ưu tiên viết lại ngắn hơn; chỉ dùng 32–36px khi cần hiển thị 2–3 dòng.
5. Không tự giảm font dưới ngưỡng tối thiểu để nhét thêm nội dung. Nếu vẫn tràn, cần rút gọn nội dung hoặc đổi layout.
6. Giữ cùng font family, line-height và quy tắc in đậm cho cùng một vai trò nội dung trên toàn bộ deck.

## Ánh xạ vào vùng layout hiện tại

| Vùng layout | Cỡ chữ mặc định | Cỡ nhỏ nhất khi fit nội dung |
| --- | ---: | ---: |
| `hero` | 40px | 32px |
| `body` | 20px | 18px |
| `caption` | 14px | 14px |
| `formula` | 32px | 24px |
| `header` | 12px | 12px |

Các giá trị này là mục tiêu cho đợt cập nhật tiếp theo. Khi triển khai, cần đồng bộ placeholder ở Bước 2, style do AI trả về ở Bước 3, cơ chế fit nội dung và các preset của slide editor.
