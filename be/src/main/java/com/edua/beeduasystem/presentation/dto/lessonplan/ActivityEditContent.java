package com.edua.beeduasystem.presentation.dto.lessonplan;

import java.util.List;

/**
 * Bản sửa do AI đề xuất cho một mục {@code kind: "activity"} (một Hoạt động cấp 1 — HĐ1/3/4:
 * Khởi động/Luyện tập/Vận dụng). Cùng 4 mục a/b/c/d, dùng {@code organizationText} (văn ngắn)
 * thay vì {@code organization} (4 bước) — đúng quy ước Hoạt động cấp 1, khác tiểu hoạt động HĐ2
 * (xem {@link SubActivityEditContent}).
 *
 * <p>Mỗi field là MẢNG từng câu, không phải 1 chuỗi nối {@code "\n"} — cùng lý do với
 * {@link SubActivityEditContent}/{@code TextEditContent}. */
public record ActivityEditContent(
        List<String> objective,
        List<String> content,
        List<String> product,
        List<String> organizationText
) {
}
