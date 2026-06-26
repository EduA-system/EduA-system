package com.edua.beeduasystem.presentation.dto.lessonplan;

/**
 * Khung giáo án theo Công văn 5512/BGDĐT-GDTrH (Phụ lục IV).
 *
 * <p>Đang xây dựng dần: hiện có {@code title} + phần I. {@link Objectives} (Mục tiêu).
 * Các mục II. Thiết bị + học liệu và III. Tiến trình dạy học (activities) sẽ được
 * thêm field ở bước sau.
 */
public record LessonPlan5512Dto(String title, Objectives objectives) {
}
