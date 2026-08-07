package com.edua.beeduasystem.presentation.dto.lessonplan;

import java.util.List;

/**
 * Bản sửa do AI đề xuất cho một mục {@code kind: "subActivity"} (tiểu hoạt động của Hoạt động
 * 2 — bảng tổ chức/sản phẩm 2 cột).
 *
 * <p>Field nhiều câu ({@code content}/{@code product}/từng bước {@code organization}) là MẢNG
 * từng câu, KHÔNG phải một chuỗi nối bằng {@code "\n"} — tránh lặp lại đúng lỗi từng gặp ở
 * {@code TextEditContent}: khi phải tự giữ kỷ luật xuống dòng thật bên trong MỘT chuỗi dài,
 * model dễ copy nhầm quy ước {@code <br>}/{@code ‖}/{@code |} từ khối "PHẦN GIÁO ÁN CẦN SỬA" (dữ
 * liệu CŨ gửi kèm làm ngữ cảnh, vẫn ở định dạng pipe-text) thay vì tách câu bằng field mảng —
 * xem lịch sử sửa lỗi live "Không viết lại được phần giáo án nào" → JSON parse OK nhưng field
 * "product" chứa literal "<br>"/"\n" hiện ra thành chữ thô thay vì được diễn giải.
 *
 * <p>{@code objective}/{@code content} là đoạn "Mục tiêu"/"Nội dung" đứng TRƯỚC bảng (mảng rỗng
 * nếu không có). {@code organization} là 4 bước cột "Hoạt động của GV và HS". {@code product} là
 * nội dung cột "Sản phẩm dự kiến".
 */
public record SubActivityEditContent(
        List<String> objective,
        List<String> content,
        Organization organization,
        List<String> product
) {
    /** d) Tổ chức thực hiện — 4 bước chuẩn CV 5512, mỗi bước là MẢNG câu (không phải 1 chuỗi) vì
     * cùng lý do trên. */
    public record Organization(
            List<String> transfer,
            List<String> perform,
            List<String> report,
            List<String> conclude
    ) {
    }
}
