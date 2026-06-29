package com.edua.beeduasystem.domain.model.lessonplan;

import java.util.List;

/**
 * Khung giáo án theo Công văn 5512/BGDĐT-GDTrH (Phụ lục IV).
 *
 * <p>Gồm {@code title}, phần I. {@link Objectives} (Mục tiêu), phần II. {@link Materials}
 * (Thiết bị dạy học và học liệu) và phần III. Tiến trình dạy học — danh sách
 * {@link Activity5512}. Mỗi phần được sinh độc lập nên các field còn lại có thể {@code null}.
 */
public record LessonPlan5512(
        String title,
        Objectives objectives,
        Materials equipmentAndMaterials,
        List<Activity5512> activities
) {
}
