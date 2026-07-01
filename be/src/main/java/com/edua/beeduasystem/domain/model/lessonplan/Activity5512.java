package com.edua.beeduasystem.domain.model.lessonplan;

import java.util.List;

/**
 * Một hoạt động trong phần III. Tiến trình dạy học của giáo án 5512
 * (Mở đầu / Hình thành kiến thức / Luyện tập / Vận dụng), theo
 * {@code resource/khung-giao-an-5512.md} mục 3.
 *
 * <p>Cùng một record dùng cho cả hai bước của pipeline:
 * <ul>
 *   <li><b>Call 1 (dàn ý / khung)</b>: chỉ điền {@code order}, {@code name},
 *       {@code duration} và {@code subActivities} (skeleton cho Hoạt động 2);
 *       4 ô a/b/c/d ({@code objective}, {@code content}, {@code product},
 *       {@code organization}/{@code organizationText}) để {@code null}.</li>
 *   <li><b>Call 2..N+1 (song song, bước sau)</b>: đắp đầy 4 ô a/b/c/d cho từng hoạt động.</li>
 * </ul>
 *
 * <p>Mục d) Tổ chức thực hiện có hai dạng theo bài mẫu (Bài 19 KNTT):
 * <ul>
 *   <li><b>Hoạt động cấp 1 (HĐ1/HĐ3/HĐ4)</b>: d) là văn ngắn 1–2 dòng → dùng
 *       {@code organizationText}; {@code organization} để {@code null}.</li>
 *   <li><b>Tiểu hoạt động của HĐ2</b>: d) là cấu trúc 4 bước trong cột "Hoạt động
 *       của GV và HS" của bảng 2 cột → dùng {@code organization};
 *       {@code organizationText} để {@code null}.</li>
 * </ul>
 */
public record Activity5512(
        int order,
        String name,
        String duration,                  // ví dụ "5 phút"
        String objective,                 // a) Mục tiêu — null ở frame
        String content,                   // b) Nội dung — null ở frame
        String product,                   // c) Sản phẩm — null ở frame
        Organization organization,        // d) Tổ chức thực hiện (4 bước) — chỉ cho tiểu HĐ2; null ở frame
        String organizationText,          // d) Tổ chức thực hiện (văn ngắn) — cho HĐ1/3/4; null ở frame
        List<Activity5512> subActivities  // tiểu hoạt động (HĐ2); rỗng nếu không có
) {

    /** d) Tổ chức thực hiện — 4 bước chuẩn CV 5512 (chỉ dùng cho tiểu hoạt động HĐ2). */
    public record Organization(
            String transfer,  // Giao nhiệm vụ học tập
            String perform,   // Thực hiện nhiệm vụ
            String report,    // Báo cáo, thảo luận
            String conclude   // Kết luận, nhận định (+ đánh giá)
    ) {
    }
}
