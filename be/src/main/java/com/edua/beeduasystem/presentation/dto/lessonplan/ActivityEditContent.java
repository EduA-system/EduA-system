package com.edua.beeduasystem.presentation.dto.lessonplan;

/**
 * Bản sửa do AI đề xuất cho một mục {@code kind: "activity"} (một Hoạt động cấp 1 — HĐ1/3/4:
 * Khởi động/Luyện tập/Vận dụng). Cùng 4 field a/b/c/d của {@code Activity5512}, dùng
 * {@code organizationText} (văn ngắn) thay vì {@code organization} (4 bước) — đúng quy ước của
 * Hoạt động cấp 1, khác tiểu hoạt động HĐ2 (xem {@link SubActivityEditContent}).
 */
public record ActivityEditContent(
        String objective,
        String content,
        String product,
        String organizationText
) {
}
