package com.edua.beeduasystem.domain.model.lessonplan;

/**
 * Khung giáo án theo Công văn 5512/BGDĐT-GDTrH (Phụ lục IV).
 *
 * <p>Đang xây dựng dần: hiện có {@code title}, phần I. {@link Objectives} (Mục tiêu)
 * và phần II. {@link Materials} (Thiết bị dạy học và học liệu). Mục III. Tiến trình
 * dạy học (activities) sẽ được thêm field ở bước sau.
 */
public record LessonPlan5512(String title, Objectives objectives, Materials equipmentAndMaterials) {
}
