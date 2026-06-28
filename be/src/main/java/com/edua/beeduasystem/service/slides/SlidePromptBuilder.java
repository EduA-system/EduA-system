package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.domain.model.slide.SlideItem;
import com.edua.beeduasystem.domain.model.slide.SlideMetadata;
import com.edua.beeduasystem.domain.model.slide.SlideOutline;
import com.edua.beeduasystem.domain.model.slide.SlidePart;
import com.edua.beeduasystem.domain.model.slide.SlideVisual;
import com.edua.beeduasystem.presentation.dto.slides.InlineActivityDto;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class SlidePromptBuilder {

    /** Persona trung lập môn học cho prompt outline. */
    private static String teacherPersona(String subject) {
        String s = subject == null ? "" : subject.trim();
        return s.isEmpty() ? "giáo viên THPT Việt Nam" : "giáo viên môn " + s + " THPT Việt Nam";
    }

    /**
     * PHA 1 — sinh KHUNG deck (structure). 1 call nhẹ: chỉ title + role + layoutHint + brief mỗi slide,
     * CHƯA soạn nội dung đầy đủ. Mục đích đảm bảo deck có đủ cung tiết dạy trước khi tốn token soạn sâu.
     */
    public String outlineStructurePrompt(
            LessonContext lesson,
            InlineLessonPlanDto plan,
            String userPrompt,
            String styleHint,
            String subject) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là ").append(teacherPersona(subject))
                .append(". Hãy lập KHUNG (structure) cho một bộ slide bài giảng dựa trên GIÁO ÁN sau.\n\n");
        sb.append("BÀI HỌC: ").append(lesson.title()).append(" (lớp ").append(lesson.grade()).append(")\n");
        if (lesson.summary() != null && !lesson.summary().isBlank()) {
            sb.append("TÓM TẮT: ").append(lesson.summary()).append("\n");
        }
        sb.append("\n");

        appendPlanSummary(sb, plan);
        sb.append("\n");

        if (userPrompt != null && !userPrompt.isBlank()) {
            sb.append("YÊU CẦU THÊM TỪ GIÁO VIÊN: ").append(userPrompt).append("\n\n");
        }
        if (styleHint != null && !styleHint.isBlank()) {
            sb.append("PHONG CÁCH THIẾT KẾ SLIDE: ").append(styleHint).append("\n\n");
        }

        sb.append("""
                NHIỆM VỤ: Thiết kế KHUNG slide bọc trọn một tiết dạy, theo cung sau (bỏ phần nào KHÔNG có dữ liệu trong giáo án):
                1. Bìa / Chào hỏi  — tên bài, lớp, lời chào.                role: hook
                2. Mục tiêu bài học — từ phần Mục tiêu.                       role: explain
                3. Khởi động / Đặt vấn đề — từ hoạt động khởi động (nếu có). role: hook
                4. THÂN BÀI — mỗi HOẠT ĐỘNG hình thành kiến thức = MỘT phần.
                5. Luyện tập — bài tập áp dụng (nếu có).                      role: practice
                6. Tổng kết / Sơ đồ — từ phần Củng cố (nếu có).              role: recap
                7. Vận dụng + BTVN — từ phần BTVN (nếu có).                  role: recap
                8. Dặn dò / Cảm ơn — lời kết, dặn chuẩn bị bài sau.          role: recap

                QUY TẮC SỐ LƯỢNG SLIDE (quan trọng — tránh slide rỗng):
                - Số slide mỗi phần phải bám LƯỢNG DỮ LIỆU THẬT trong hoạt động giáo án, KHÔNG cố cho đủ 2-4 slide.
                - Hoạt động mỏng (chỉ vài câu/một kết luận) → đúng 1 slide. Hoạt động dày (nhiều thí nghiệm/ý) → tách nhiều slide.
                - TUYỆT ĐỐI không tạo slide mà giáo án không có dữ liệu để soạn (vd slide "Ví dụ minh họa" khi hoạt động không nêu ví dụ nào).
                - Phần Ứng dụng và phần Vận dụng/BTVN nếu dựa trên cùng dữ liệu thì phải PHÂN VAI rõ:
                  Ứng dụng = giảng/phân tích ví dụ; Vận dụng = giao việc/bài tập cho HS. Không để hai phần lặp cùng nội dung.

                CHỈ tạo khung — KHÔNG soạn nội dung chi tiết ở bước này. Mỗi slide trả về:
                - `id`: mã ngắn duy nhất (vd p1s1). PHẢI duy nhất trên toàn deck.
                - `title`: tiêu đề ngắn gọn.
                - `pedagogicalRole`: hook | explain | derive | demonstrate | practice | recap.
                - `layoutHint`: title | bullets | formula | image-focus | comparison | worked-example.
                - `brief`: MỘT dòng nêu GÓC RIÊNG của slide này (để bước sau soạn chi tiết). Brief các slide phải khác nhau rõ, không chồng lấn.

                TRẢ LỜI ĐÚNG ĐỊNH DẠNG JSON sau, KHÔNG markdown fence, KHÔNG text ngoài JSON:
                {
                  "lessonTitle": "tên bài học",
                  "parts": [
                    {
                      "id": "p1",
                      "title": "Tên phần",
                      "slides": [
                        {"id": "p1s1", "title": "Tên slide", "pedagogicalRole": "hook", "layoutHint": "title", "brief": "Slide bìa: tên bài, lớp, lời chào"}
                      ]
                    }
                  ]
                }
                """);
        return sb.toString();
    }

    /**
     * PHA 2 — đào sâu MỘT phần. Nhận toàn bộ giáo án (KHÔNG cắt) + toàn bộ khung (giữ mạch, tránh trùng)
     * và soạn content hiển thị + lời giảng + thời lượng cho các slide thuộc phần đích.
     */
    public String expandPartPrompt(
            LessonContext lesson,
            InlineLessonPlanDto plan,
            String fullSkeletonJson,
            String targetPartId,
            String targetPartTitle,
            String subject) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là ").append(teacherPersona(subject))
                .append(". Hãy SOẠN NỘI DUNG CHI TIẾT cho các slide thuộc MỘT phần của bộ slide.\n\n");
        sb.append("BÀI HỌC: ").append(lesson.title()).append(" (lớp ").append(lesson.grade()).append(")\n\n");

        sb.append("GIÁO ÁN ĐÃ DUYỆT (dữ kiện gốc — bám sát, KHÔNG cắt bớt):\n");
        appendPlanFull(sb, plan);
        sb.append("\n");

        sb.append("KHUNG TOÀN DECK (để giữ mạch và KHÔNG trùng nội dung giữa các phần):\n");
        sb.append(fullSkeletonJson).append("\n\n");

        sb.append("PHẦN CẦN SOẠN: id=\"").append(targetPartId).append("\"");
        if (targetPartTitle != null && !targetPartTitle.isBlank()) {
            sb.append(" — ").append(targetPartTitle);
        }
        sb.append("\n\n");

        sb.append("""
                NHIỆM VỤ: Soạn NỘI DUNG HOÀN CHỈNH cho các slide thuộc phần có id ở trên. Nội dung này là
                NGUỒN SỰ THẬT — sẽ được dàn thẳng lên slide, nên phải CHÍN, đủ để trình chiếu ngay, KHÔNG phải tóm tắt.
                Với mỗi slide:
                - `content`: nội dung hiển thị trên slide. Text thuần, xuống dòng (\\n) phân ý, gạch đầu dòng "- ".
                  Tối đa 4-5 ý/slide, 1 ý chính/slide, súc tích nhưng đầy đủ, không nhồi.
                - `durationMinutes`: thời lượng (số nguyên phút) cho slide.
                - `visual`: đặc tả phần trực quan slide CẦN có, dạng {"type": "...", "spec": "..."}:
                  + type ∈ image | formula | table | none.
                  + image → spec mô tả ảnh/hiện tượng/thí nghiệm cần vẽ. formula → spec là công thức (mô tả hoặc LaTeX).
                    table → spec mô tả bảng (cột/hàng). none → không cần trực quan (spec để "").
                - `aiNote`: nếu content có phần BỔ SUNG ngoài giáo án (ví dụ, liên hệ thực tế, diễn giải tự thêm),
                  ghi MỘT câu nêu rõ phần nào là AI thêm để giáo viên duyệt. Nếu bám 100% giáo án → để chuỗi rỗng "".

                NGUYÊN TẮC NỘI DUNG:
                - DỮ KIỆN GỐC (số liệu, đáp án, công thức, câu hỏi trong giáo án) phải GIỮ NGUYÊN VĂN, không bịa, không sai lệch.
                - ĐƯỢC PHÉP bổ sung ví dụ/diễn giải/lời giảng cho slide đủ chất — NHƯNG phải ĐÚNG KHOA HỌC,
                  tuyệt đối không thêm thông tin sai. Mọi phần bổ sung phải khai báo trong `aiNote`.
                - THỜI LƯỢNG: tổng `durationMinutes` của các slide trong phần này phải XẤP XỈ số phút của hoạt động
                  tương ứng trong giáo án ở trên. Phần khung (bìa, mục tiêu, dặn dò, tổng kết) để 1 phút/slide.
                - KHÔNG trùng nội dung với slide/phần khác trong khung — bám đúng GÓC của phần mình.

                QUAN TRỌNG: KHÔNG đổi, KHÔNG thêm, KHÔNG bớt slide. Trả về ĐÚNG các `id` slide có trong phần đích.

                TRẢ LỜI ĐÚNG ĐỊNH DẠNG JSON sau, KHÔNG markdown fence, KHÔNG text ngoài JSON:
                {
                  "slides": [
                    {"id": "p1s1", "content": "Nội dung hiển thị…", "durationMinutes": 3,
                     "visual": {"type": "image", "spec": "Mô tả ảnh cần vẽ"}, "aiNote": ""}
                  ]
                }
                """);
        return sb.toString();
    }

    private void appendPlanSummary(StringBuilder sb, InlineLessonPlanDto plan) {
        if (plan == null) return;
        if (plan.objectives() != null && !plan.objectives().isEmpty()) {
            sb.append("MỤC TIÊU:\n");
            plan.objectives().forEach(o -> sb.append("- ").append(o).append("\n"));
        }
        if (plan.activities() != null && !plan.activities().isEmpty()) {
            sb.append("CÁC HOẠT ĐỘNG (tóm tắt):\n");
            List<InlineActivityDto> activities = plan.activities();
            for (int i = 0; i < activities.size(); i++) {
                InlineActivityDto a = activities.get(i);
                sb.append("- HĐ ").append(i + 1).append(": ").append(a.name())
                        .append(" (").append(a.durationMinutes()).append(" phút)");
                if (a.goal() != null && !a.goal().isBlank()) {
                    sb.append(" — ").append(a.goal());
                }
                sb.append("\n");
            }
        }
        if (plan.consolidation() != null && !plan.consolidation().isBlank()) {
            sb.append("Có phần Củng cố.\n");
        }
        if (plan.homework() != null && !plan.homework().isBlank()) {
            sb.append("Có phần BTVN.\n");
        }
    }

    private void appendPlanFull(StringBuilder sb, InlineLessonPlanDto plan) {
        if (plan == null) return;
        if (plan.objectives() != null && !plan.objectives().isEmpty()) {
            sb.append("Mục tiêu:\n");
            plan.objectives().forEach(o -> sb.append("- ").append(o).append("\n"));
        }
        if (plan.teachingMethods() != null && !plan.teachingMethods().isEmpty()) {
            sb.append("Phương pháp: ").append(String.join(", ", plan.teachingMethods())).append("\n");
        }
        if (plan.activities() != null) {
            sb.append("\nTiến trình các hoạt động:\n");
            List<InlineActivityDto> activities = plan.activities();
            for (int i = 0; i < activities.size(); i++) {
                InlineActivityDto a = activities.get(i);
                sb.append("HOẠT ĐỘNG ").append(i + 1).append(": ").append(a.name())
                        .append(" (").append(a.durationMinutes()).append(" phút)\n");
                if (a.goal() != null && !a.goal().isBlank()) {
                    sb.append("  - Mục tiêu: ").append(a.goal()).append("\n");
                }
                if (a.teacherActions() != null && !a.teacherActions().isBlank()) {
                    sb.append("  - GV: ").append(stripHtml(a.teacherActions())).append("\n");
                }
                if (a.studentActions() != null && !a.studentActions().isBlank()) {
                    sb.append("  - HS: ").append(stripHtml(a.studentActions())).append("\n");
                }
            }
        }
        if (plan.consolidation() != null && !plan.consolidation().isBlank()) {
            sb.append("Củng cố: ").append(stripHtml(plan.consolidation())).append("\n");
        }
        if (plan.homework() != null && !plan.homework().isBlank()) {
            sb.append("BTVN: ").append(stripHtml(plan.homework())).append("\n");
        }
    }

    public String slidePrompt(
            LessonContext lesson,
            SlideOutline outline,
            SlidePart section,
            SlideItem slide,
            String userPrompt,
            String styleHint) {
        StringBuilder sb = new StringBuilder();
        String role = slide.pedagogicalRole();
        String layout = slide.layoutHint();

        sb.append("Bạn là giáo viên Vật lý THPT Việt Nam đang thiết kế MỘT slide cho editor kiểu Canva.\n");
        sb.append("BÀI HỌC: ").append(lesson.title()).append("\n");
        sb.append("PHẦN: ").append(section.title()).append("\n");
        sb.append("SLIDE: ").append(slide.title()).append("\n");
        sb.append("VAI TRÒ SƯ PHẠM: ").append(role).append("\n");
        if (layout != null) {
            sb.append("GỢI Ý BỐ CỤC: ").append(layout).append("\n");
        }
        sb.append("\n");

        boolean hasAuthoredContent = slide.content() != null && !slide.content().isBlank();
        if (hasAuthoredContent) {
            appendAuthoredContent(sb, slide);
        } else {
            appendLessonContext(sb, lesson, slide);
        }

        if (userPrompt != null && !userPrompt.isBlank()) {
            sb.append("\nYÊU CẦU THÊM: ").append(userPrompt).append("\n");
        }
        if (styleHint != null && !styleHint.isBlank()) {
            sb.append("\nPHONG CÁCH THIẾT KẾ: ").append(styleHint).append("\n");
        }

        boolean needsImage = needsImage(slide);

        if (hasAuthoredContent) {
            sb.append("""

                LƯU Ý QUAN TRỌNG: Nội dung slide ĐÃ ĐƯỢC SOẠN SẴN ở mục "NỘI DUNG ĐÃ CHỐT" trên.
                Nhiệm vụ của bạn CHỈ là DÀN nội dung đó thành element đẹp, KHÔNG soạn lại, KHÔNG thêm/bớt/đổi dữ kiện,
                KHÔNG tự nghĩ ví dụ mới. Giữ đúng câu chữ và số liệu trong nội dung đã chốt.
                Nếu có "PHẦN TRỰC QUAN" thì dựng đúng loại element tương ứng (image → imagePrompt dịch từ mô tả;
                formula → latex; table → bố cục bảng bằng text/shape).
                """);
        }

        sb.append("""

                NHIỆM VỤ: Tạo MỘT SLIDE 16:9 dưới dạng JSON cây element (giống Canva).
                Khung canvas: 960×540 px, gốc toạ độ (0,0) ở góc trên bên trái. Padding tối thiểu 40 px từ mép.

                LOẠI ELEMENT HỖ TRỢ (field `type`):
                - "text": rich text block. Field bắt buộc: html (chỉ dùng <p>, <strong>, <em>, <br>, <ul>, <ol>, <li>),
                  fontSize (16-48), color (hex), align ("left"|"center"|"right").
                - "image": ảnh minh họa. Field bắt buộc: imagePrompt (mô tả tiếng Anh, cụ thể, rõ hiện tượng vật lý).
                  KHÔNG đặt src — frontend sẽ hiển thị placeholder.
                  fit: "cover" hoặc "contain".
                - "latex": công thức toán. Field bắt buộc: tex (KaTeX, không có dấu \\( \\) hay \\[ \\]).
                - "shape": hình nền/khối trang trí. Field: shape ("rect"|"ellipse"|"line"),
                  fill (hex), stroke (hex), strokeWidth, borderRadius.

                MỌI ELEMENT đều phải có: id (string ngắn), x, y, width, height (px), zIndex (int, càng lớn càng trên).
                Có thể thêm rotation (độ, mặc định 0).

                QUY TẮC NỘI DUNG:
                1. Slide phải có tiêu đề: 1 text element với fontSize 28-36, đặt ở y=40, x=40, width=880, height ~60.
                2. Giới hạn theo vai trò:
                   - hook/title: tiêu đề lớn + tối đa 1 text block dẫn nhập + (optional) 1 image.
                   - explain/bullets: tối đa 4 bullet (1 text element chứa <ul>) + (optional) 1 image cạnh phải.
                   - derive/formula: 1-2 latex element + 1 text chú thích ngắn.
                   - practice/worked-example: 1 text đề bài + 1 text các bước giải.
                   - recap/bullets: tối đa 5 bullet trong 1 text element.
                3. Không overlap nặng giữa các element. Sắp xếp lưới gọn gàng (left-half / right-half hoặc full-width).
                4. Tiếng Việt, súc tích, phù hợp học sinh THPT.

                """);

        if (needsImage) {
            sb.append("""
                ẢNH MINH HỌA (BẮT BUỘC cho slide này): bao gồm ÍT NHẤT 1 element type="image".
                imagePrompt PHẢI bằng tiếng Anh, mô tả cụ thể hiện tượng vật lý/thí nghiệm cần thấy.

                """);
        }

        sb.append("""
                FORMAT OUTPUT: CHỈ trả về JSON hợp lệ, KHÔNG markdown fence, KHÔNG text ngoài JSON:
                {
                  "background": { "type": "color", "value": "#ffffff" },
                  "elements": [
                    { "type": "text", "id": "t1", "x": 40, "y": 40, "width": 880, "height": 60,
                      "zIndex": 2, "html": "<p>Tiêu đề slide</p>", "fontSize": 32, "color": "#0f172a", "align": "left" }
                  ]
                }
                """);

        return sb.toString();
    }

    /** Pha 3 layout-only: in nội dung đã chốt ở outline để dàn trang trung thành. */
    private void appendAuthoredContent(StringBuilder sb, SlideItem slide) {
        sb.append("NỘI DUNG ĐÃ CHỐT (dàn đúng nội dung này, KHÔNG soạn lại):\n");
        sb.append(slide.content()).append("\n");
        SlideVisual visual = slide.visual();
        if (visual != null && visual.type() != null && !"none".equalsIgnoreCase(visual.type())
                && visual.spec() != null && !visual.spec().isBlank()) {
            sb.append("\nPHẦN TRỰC QUAN (").append(visual.type()).append("): ")
                    .append(visual.spec()).append("\n");
        }
        sb.append("\n");
    }

    private void appendLessonContext(StringBuilder sb, LessonContext lesson, SlideItem slide) {
        String role = slide.pedagogicalRole();
        if (lesson.summary() != null && !lesson.summary().isBlank()) {
            sb.append("BỐI CẢNH BÀI HỌC: ").append(lesson.summary()).append("\n");
        }
        if (!lesson.learningObjectives().isEmpty()) {
            sb.append("MỤC TIÊU:\n");
            lesson.learningObjectives().forEach(o -> sb.append("- ").append(o).append("\n"));
        }
        if ("derive".equals(role) || "formula".equals(slide.layoutHint())) {
            appendFormulas(sb, lesson);
        }
    }

    private void appendFormulas(StringBuilder sb, LessonContext lesson) {
        if (!lesson.formulas().isEmpty()) {
            sb.append("CÔNG THỨC:\n");
            lesson.formulas().forEach(f -> sb.append("- ").append(f.latex()).append(" — ").append(f.meaning()).append("\n"));
        }
    }

    private boolean needsImage(SlideItem slide) {
        String role = slide.pedagogicalRole();
        String layout = slide.layoutHint();
        return Set.of("hook", "explain", "demonstrate", "practice").contains(role)
                || Set.of("image-focus", "comparison").contains(layout);
    }

    private static String stripHtml(String html) {
        if (html == null) return "";
        return html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
    }

    public static String stripFences(String raw) {
        if (raw == null) return "";
        String s = raw.strip();
        if (s.startsWith("```")) {
            int newline = s.indexOf('\n');
            if (newline >= 0) s = s.substring(newline + 1);
            if (s.endsWith("```")) s = s.substring(0, s.length() - 3);
        }
        return s.strip();
    }
}
