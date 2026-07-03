package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.presentation.dto.slides.InlineActivityDto;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import org.springframework.stereotype.Service;

import java.util.List;

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
                NHIỆM VỤ: Thiết kế KHUNG slide bọc trọn một tiết dạy, bám ĐÚNG cấu trúc giáo án ở trên —
                KHÔNG dùng khung mẫu cố định, KHÔNG bịa thêm phần mà giáo án không có dữ liệu.

                CẤU TRÚC BẮT BUỘC của deck (theo đúng thứ tự sau):
                1. Bìa / Chào hỏi — LUÔN có, đúng 1 phần, 1 slide. Tên bài, lớp, lời chào.
                   role: hook, layoutHint: title.
                2. Mục tiêu bài học — CHỈ thêm nếu có dữ liệu ở mục MỤC TIÊU bên trên. Đúng 1 phần, 1 slide.
                   role: explain, layoutHint: bullets.
                3. THÂN BÀI — bám 1-1 vào danh sách CÁC HOẠT ĐỘNG bên trên:
                   - Mỗi "HĐ i" trong CÁC HOẠT ĐỘNG = ĐÚNG MỘT phần thân bài, giữ NGUYÊN thứ tự đã cho.
                     KHÔNG gộp 2 hoạt động vào 1 phần, KHÔNG tách 1 hoạt động thành nhiều phần,
                     KHÔNG thêm bất kỳ phần thân bài nào ngoài danh sách hoạt động đã cho — TUYỆT ĐỐI không tự
                     bịa các phần như "Khởi động", "Luyện tập", "Vận dụng"... nếu giáo án không có hoạt động
                     tương ứng. Nếu giáo án chỉ có 3 hoạt động thì thân bài chỉ có ĐÚNG 3 phần, không hơn.
                   - `part.title` phải phản ánh ĐÚNG tên/nội dung thật của hoạt động đó (dựa trên tên và mục
                     tiêu của HĐ), không dùng nhãn chung chung khi giáo án đã có tên hoạt động cụ thể.
                   - Slide ĐẦU TIÊN của MỖI phần thân bài LUÔN LUÔN là một "slide mở đầu phần" (chuyển ý):
                     nêu ngắn gọn tên/mục đích của hoạt động sắp học (dựa trên mục tiêu của HĐ đó), đúng 1 slide,
                     role: hook, layoutHint: title, brief phải ghi rõ đây là slide mở đầu — KHÔNG chứa nội dung
                     chi tiết (số liệu, câu hỏi, bảng...) của hoạt động, chỉ dẫn nhập.
                     SAU slide mở đầu này mới đến các slide NỘI DUNG CHI TIẾT của hoạt động (số lượng theo QUY
                     TẮC SỐ LƯỢNG SLIDE bên dưới), với `pedagogicalRole` chọn theo ĐÚNG bản chất từng slide,
                     KHÔNG cố định theo vị trí trong phần:
                       hook = dẫn nhập/gợi mở thêm; explain = giảng khái niệm; derive = suy luận công thức;
                       demonstrate = minh hoạ/thí nghiệm; practice = luyện tập/bài tập; recap = chốt ý.
                4. Tổng kết / Dặn dò — CHỈ thêm nếu có dữ liệu Củng cố và/hoặc BTVN ở trên (bỏ hẳn phần này nếu
                   KHÔNG có cả hai). Đúng 1 phần, gồm: 1 slide "Tổng kết" nếu có Củng cố (role: recap,
                   layoutHint: bullets) và/hoặc 1 slide "Dặn dò / BTVN" nếu có BTVN (role: recap,
                   layoutHint: bullets). Có dữ liệu nào thì tạo slide đó, không có thì bỏ, không tự thêm lời
                   chào/cảm ơn thành một slide riêng.

                QUY TẮC SỐ LƯỢNG SLIDE (quan trọng — tránh slide rỗng):
                - Slide mở đầu phần (mục 3) luôn đúng 1 slide, KHÔNG tính vào "lượng dữ liệu" của quy tắc dưới đây.
                - Số slide NỘI DUNG còn lại trong mỗi phần thân bài phải bám LƯỢNG DỮ LIỆU THẬT của hoạt động đó
                  (dựa trên phần trích GV/HS ở trên), KHÔNG cố cho đủ 2-4 slide.
                - Hoạt động mỏng (chỉ vài câu/một kết luận) → slide mở đầu + đúng 1 slide nội dung. Hoạt động dày
                  (nhiều thí nghiệm/nhiều ý) → tách nhiều slide nội dung sau slide mở đầu.
                - Hoạt động THÍ NGHIỆM/THỰC HÀNH có nhiều bước rõ rệt (dụng cụ, tiến hành, bảng số liệu/kết quả,
                  câu hỏi phân tích/kết luận...) hầu như KHÔNG BAO GIỜ vừa đủ trong 1 slide nội dung — tách thành
                  2-3 slide nội dung riêng theo từng cụm dữ kiện (vd: 1 slide dụng cụ + các bước tiến hành, 1 slide
                  bảng số liệu/kết quả quan sát, 1 slide câu hỏi phân tích/kết luận rút ra), miễn là giáo án có đủ
                  dữ kiện cho từng cụm đó — không bịa thêm cụm nào giáo án không có.
                - TUYỆT ĐỐI không tạo slide mà giáo án không có dữ liệu để soạn (vd slide "Ví dụ minh họa" khi
                  hoạt động không nêu ví dụ nào), và TUYỆT ĐỐI không tạo phần thân bài nào không ứng với một
                  hoạt động thật trong giáo án.
                - Nếu 2 hoạt động liền kề có vẻ gần giống nhau (vd đều liên quan "ứng dụng"/"vận dụng"), VẪN giữ
                  NGUYÊN là 2 phần riêng biệt (vì là 2 hoạt động khác nhau trong giáo án), nhưng PHẢI phân vai rõ
                  theo đúng mục tiêu riêng của từng hoạt động — không để 2 phần lặp cùng nội dung.

                CHỈ tạo khung — KHÔNG soạn nội dung chi tiết ở bước này. Mỗi slide trả về:
                - `id`: mã ngắn duy nhất (vd p1s1). PHẢI duy nhất trên toàn deck.
                - `title`: tiêu đề ngắn gọn.
                - `pedagogicalRole`: hook | explain | derive | demonstrate | practice | recap.
                - `layoutHint`: title | bullets | formula | image-focus | comparison | worked-example.
                - `brief`: MỘT dòng nêu GÓC RIÊNG của slide này (để bước sau soạn chi tiết). Brief các slide phải
                  khác nhau rõ, không chồng lấn. Với slide mở đầu phần, brief phải ghi rõ đây là "slide mở đầu
                  phần — dẫn vào HĐ ...".

                TRẢ LỜI ĐÚNG ĐỊNH DẠNG JSON sau, KHÔNG markdown fence, KHÔNG text ngoài JSON:
                {
                  "lessonTitle": "tên bài học",
                  "parts": [
                    {
                      "id": "p1",
                      "title": "Bìa",
                      "slides": [
                        {"id": "p1s1", "title": "Chào mừng", "pedagogicalRole": "hook", "layoutHint": "title", "brief": "Slide bìa: tên bài, lớp, lời chào"}
                      ]
                    },
                    {
                      "id": "p3",
                      "title": "Tên hoạt động lấy đúng từ HĐ 1 trong giáo án",
                      "slides": [
                        {"id": "p3s1", "title": "Vào bài: <tên HĐ 1>", "pedagogicalRole": "hook", "layoutHint": "title", "brief": "Slide mở đầu phần — dẫn vào HĐ 1, nêu mục đích hoạt động"},
                        {"id": "p3s2", "title": "<góc nội dung 1 của HĐ 1>", "pedagogicalRole": "explain", "layoutHint": "bullets", "brief": "<góc riêng của slide này, khác slide mở đầu>"}
                      ]
                    }
                  ]
                }
                """);
        return sb.toString();
    }

    /**
     * PHA 2 — đào sâu MỘT phần. Nhận toàn bộ giáo án (KHÔNG cắt) + toàn bộ khung (giữ mạch, tránh trùng)
     * và soạn content hiển thị + dữ kiện bắt buộc + thời lượng cho các slide thuộc phần đích.
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
                  KHÔNG đưa nhãn điều phối lớp học như "GV", "HS", "Gợi mở", "Thảo luận nhóm", "Hãy quan sát",
                  "Giơ bìa ABCD", trừ khi chính câu đó là nội dung cần chiếu cho học sinh.
                - `requiredFacts`: mảng các dữ kiện/câu hỏi/đáp án/công thức bắt buộc không được mất khi dàn thành slide.
                  Chỉ đưa dữ kiện quan trọng có trong giáo án hoặc đã khai báo ở `aiNote`.
                - `quizItems`: mảng câu hỏi luyện tập/trắc nghiệm/phiếu học tập nếu slide có hoạt động hỏi-đáp.
                  Mỗi item: {"question": "...", "choices": ["A. ..."], "answer": "...", "explanation": "..."}.
                  Nếu không có quiz/câu hỏi cấu trúc → để [].
                - `durationMinutes`: thời lượng (số nguyên phút) cho slide.
                - `visual`: đặc tả phần trực quan slide CẦN có, dạng {"type": "...", "spec": "..."}:
                  + type ∈ image | formula | table | none.
                  + image → spec mô tả ảnh/hiện tượng/thí nghiệm cần vẽ. formula → spec là công thức (mô tả hoặc LaTeX).
                    table → spec mô tả bảng (cột/hàng). none → không cần trực quan (spec để "").
                - `aiNote`: nếu content có phần BỔ SUNG ngoài giáo án (ví dụ, liên hệ thực tế, diễn giải tự thêm),
                  ghi MỘT câu nêu rõ phần nào là AI thêm để giáo viên duyệt. Nếu bám 100% giáo án → để chuỗi rỗng "".
                - KHÔNG sinh script/lời thoại giáo viên/speaker notes. Chỉ sinh dữ liệu liên quan trực tiếp tới slide trình chiếu.

                NGUYÊN TẮC NỘI DUNG:
                - DỮ KIỆN GỐC (số liệu, đáp án, công thức, câu hỏi trong giáo án) phải GIỮ NGUYÊN VĂN, không bịa, không sai lệch.
                - Câu hỏi, phiếu học tập, bài trắc nghiệm phải được giữ trong `quizItems` hoặc `requiredFacts`,
                  không được thay bằng câu chung chung như "làm bài tập sau".
                - ĐƯỢC PHÉP bổ sung ví dụ/diễn giải ngắn để hiển thị trên slide — NHƯNG phải ĐÚNG KHOA HỌC,
                  tuyệt đối không thêm thông tin sai. Mọi phần bổ sung phải khai báo trong `aiNote`.
                - THỜI LƯỢNG: tổng `durationMinutes` của các slide trong phần này phải XẤP XỈ số phút của hoạt động
                  tương ứng trong giáo án ở trên. Phần khung (bìa, mục tiêu, dặn dò, tổng kết) để 1 phút/slide.
                - KHÔNG trùng nội dung với slide/phần khác trong khung — bám đúng GÓC của phần mình.
                - SLIDE MỞ ĐẦU PHẦN: nếu slide đầu tiên của phần này có `pedagogicalRole` là "hook" và phần này
                  có NHIỀU slide (tức đây là phần thân bài dựa trên một hoạt động giáo án, có slide mở đầu +
                  slide nội dung), slide đầu tiên đó CHỈ là slide dẫn nhập/chuyển ý — 1-2 câu nêu tên và mục
                  đích của hoạt động sắp học. TUYỆT ĐỐI KHÔNG liệt kê số liệu, câu hỏi, bảng, hay bất kỳ nội
                  dung chi tiết nào đã thuộc về các slide SAU trong CÙNG phần — nội dung chi tiết đó chỉ được
                  viết đúng vào slide của nó, tránh lặp/trùng giữa slide mở đầu và slide nội dung.

                QUAN TRỌNG: KHÔNG đổi, KHÔNG thêm, KHÔNG bớt slide. Trả về ĐÚNG các `id` slide có trong phần đích.

                TRẢ LỜI ĐÚNG ĐỊNH DẠNG JSON sau, KHÔNG markdown fence, KHÔNG text ngoài JSON:
                {
                  "slides": [
                    {"id": "p1s1", "content": "Nội dung hiển thị…", "durationMinutes": 3,
                     "requiredFacts": ["Dữ kiện bắt buộc 1"],
                     "quizItems": [{"question": "Câu hỏi?", "choices": ["A. ...", "B. ..."], "answer": "A", "explanation": "Giải thích ngắn"}],
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
            sb.append("CÁC HOẠT ĐỘNG (đúng thứ tự trong giáo án — mỗi HĐ ứng với ĐÚNG MỘT phần thân bài, ")
                    .append("không gộp/không tách):\n");
            List<InlineActivityDto> activities = plan.activities();
            for (int i = 0; i < activities.size(); i++) {
                InlineActivityDto a = activities.get(i);
                sb.append("HĐ ").append(i + 1).append(": ").append(a.name())
                        .append(" (").append(a.durationMinutes()).append(" phút)\n");
                if (a.goal() != null && !a.goal().isBlank()) {
                    sb.append("  - Mục tiêu: ").append(a.goal()).append("\n");
                }
                // 800 ký tự (không phải 160) — Phase 1 dùng đúng đoạn trích này để QUYẾT ĐỊNH
                // số slide của hoạt động (xem QUY TẮC SỐ LƯỢNG SLIDE bên dưới). Cắt quá ngắn khiến
                // một hoạt động thí nghiệm nhiều bước/nhiều dữ kiện bị nhìn nhầm là "mỏng" và chỉ
                // tách đúng 1 slide nội dung dù giáo án thực tế có đủ dữ liệu cho 2-3 slide.
                String teacherSnippet = snippet(a.teacherActions(), 800);
                if (!teacherSnippet.isEmpty()) {
                    sb.append("  - GV (trích): ").append(teacherSnippet).append("\n");
                }
                String studentSnippet = snippet(a.studentActions(), 800);
                if (!studentSnippet.isEmpty()) {
                    sb.append("  - HS (trích): ").append(studentSnippet).append("\n");
                }
            }
        }
        if (plan.consolidation() != null && !plan.consolidation().isBlank()) {
            sb.append("Có phần Củng cố.\n");
        }
        if (plan.homework() != null && !plan.homework().isBlank()) {
            sb.append("Có phần BTVN.\n");
        }
    }

    private static String snippet(String html, int maxLen) {
        String text = stripHtml(html);
        if (text.isEmpty()) return "";
        return text.length() <= maxLen ? text : text.substring(0, maxLen).trim() + "…";
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
