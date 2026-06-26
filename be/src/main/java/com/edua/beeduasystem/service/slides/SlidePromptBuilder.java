package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.domain.model.slide.SlideItem;
import com.edua.beeduasystem.domain.model.slide.SlideMetadata;
import com.edua.beeduasystem.domain.model.slide.SlideOutline;
import com.edua.beeduasystem.domain.model.slide.SlidePart;
import com.edua.beeduasystem.presentation.dto.slides.InlineActivityDto;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class SlidePromptBuilder {

    public String outlineFromPlanPrompt(
            LessonContext lesson,
            InlineLessonPlanDto plan,
            String userPrompt,
            String styleHint) {
        StringBuilder sb = new StringBuilder();
        sb.append("Bạn là giáo viên Vật lý THPT Việt Nam. Hãy chuyển GIÁO ÁN sau thành ĐỀ CƯƠNG SLIDE (outline) để chuẩn bị bài giảng PowerPoint.\n\n");
        sb.append("BÀI HỌC: ").append(lesson.title()).append(" (Vật lý ").append(lesson.grade()).append(")\n");
        if (lesson.summary() != null && !lesson.summary().isBlank()) {
            sb.append("TÓM TẮT: ").append(lesson.summary()).append("\n");
        }
        sb.append("\n");

        sb.append("GIÁO ÁN ĐÃ ĐƯỢC GIÁO VIÊN DUYỆT:\n");
        if (plan != null) {
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
                        sb.append("  - GV: ").append(stripHtmlTags(a.teacherActions())).append("\n");
                    }
                    if (a.studentActions() != null && !a.studentActions().isBlank()) {
                        sb.append("  - HS: ").append(stripHtmlTags(a.studentActions())).append("\n");
                    }
                }
            }
            if (plan.consolidation() != null && !plan.consolidation().isBlank()) {
                sb.append("Củng cố: ").append(stripHtmlTags(plan.consolidation())).append("\n");
            }
            if (plan.homework() != null && !plan.homework().isBlank()) {
                sb.append("BTVN: ").append(stripHtmlTags(plan.homework())).append("\n");
            }
        }
        sb.append("\n");

        if (userPrompt != null && !userPrompt.isBlank()) {
            sb.append("YÊU CẦU THÊM TỪ GIÁO VIÊN: ").append(userPrompt).append("\n\n");
        }
        if (styleHint != null && !styleHint.isBlank()) {
            sb.append("PHONG CÁCH THIẾT KẾ SLIDE: ").append(styleHint).append("\n\n");
        }

        appendOutlineInstruction(sb);
        return sb.toString();
    }

    private void appendOutlineInstruction(StringBuilder sb) {
        sb.append("""
                NHIỆM VỤ: Lập đề cương slide cho bài giảng dựa TRỰC TIẾP trên giáo án ở trên.
                Mỗi PHẦN của đề cương nên tương ứng với một HOẠT ĐỘNG trong giáo án.
                Mỗi phần có 2-4 SLIDES, AI tự quyết số lượng phù hợp với lượng nội dung của hoạt động đó.
                Mỗi slide là một màn 16:9 độc lập, nội dung súc tích.

                Với mỗi slide, hãy trả về:
                - `pedagogicalRole`: hook | explain | derive | demonstrate | practice | recap.
                - `layoutHint`: title | bullets | formula | image-focus | comparison | worked-example.
                - `kind`: alias tương thích ngược (intro/concept/formula/example/summary) suy ra từ role nếu có.

                TRẢ LỜI ĐÚNG ĐỊNH DẠNG JSON sau, KHÔNG markdown fence, KHÔNG text ngoài JSON:
                {
                  "lessonTitle": "tên bài học",
                  "parts": [
                    {
                      "id": "p1",
                      "title": "Tên phần (= tên hoạt động trong giáo án)",
                      "slides": [
                        {"id": "p1s1", "title": "Tên slide 1", "pedagogicalRole": "hook", "layoutHint": "title", "kind": "intro"},
                        {"id": "p1s2", "title": "Tên slide 2", "pedagogicalRole": "explain", "layoutHint": "bullets", "kind": "concept"}
                      ]
                    }
                  ]
                }
                """);
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

        appendLessonContext(sb, lesson, slide);

        if (userPrompt != null && !userPrompt.isBlank()) {
            sb.append("\nYÊU CẦU THÊM: ").append(userPrompt).append("\n");
        }
        if (styleHint != null && !styleHint.isBlank()) {
            sb.append("\nPHONG CÁCH THIẾT KẾ: ").append(styleHint).append("\n");
        }

        boolean needsImage = needsImage(slide);

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

    private static String stripHtmlTags(String html) {
        if (html == null) return "";
        String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        return text.length() > 400 ? text.substring(0, 400) + "..." : text;
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
