package com.edua.beeduasystem.presentation.dto.lessonplan;

import java.util.List;

/**
 * Bản sửa do AI đề xuất cho một mục {@code kind: "text"} (nội dung tự do, không có field cố
 * định — vd "I. MỤC TIÊU", đoạn mở đầu Hoạt động 2, câu hỏi trắc nghiệm rời...).
 *
 * <p>{@code lines}: mỗi phần tử là MỘT đoạn/dòng độc lập (đoạn văn, một câu hỏi, một phương án
 * trắc nghiệm, một bullet, một công thức khối...) — dùng mảng thay vì một chuỗi nối bằng
 * {@code "\n"} để AI không phải tự giữ kỷ luật xuống dòng thật, ranh giới phần tử mảng JSON đã
 * tự phân tách rõ ràng.
 */
public record TextEditContent(
        List<String> lines
) {
}
