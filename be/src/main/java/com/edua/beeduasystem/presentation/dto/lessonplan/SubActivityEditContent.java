package com.edua.beeduasystem.presentation.dto.lessonplan;

import com.edua.beeduasystem.domain.model.lessonplan.Activity5512;

/**
 * Bản sửa do AI đề xuất cho một mục {@code kind: "subActivity"} (tiểu hoạt động của Hoạt động
 * 2 — bảng tổ chức/sản phẩm 2 cột). Tái dùng {@link Activity5512.Organization} — cùng shape mà
 * luồng SINH giáo án gốc đã dùng ổn định — thay vì tự mã hoá bảng bằng ký tự "‖"/"|"/"<br>"
 * trong một chuỗi (xem lịch sử: cách cũ chỉ đúng ~1/3 lần với model gpt-4o-mini).
 *
 * <p>{@code objective}/{@code content} là đoạn "Mục tiêu"/"Nội dung" đứng TRƯỚC bảng (rỗng nếu
 * không có). {@code organization} là 4 bước cột "Hoạt động của GV và HS". {@code product} là
 * nội dung cột "Sản phẩm dự kiến".
 */
public record SubActivityEditContent(
        String objective,
        String content,
        Activity5512.Organization organization,
        String product
) {
}
