package com.edua.beeduasystem.service.blog;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

/**
 * Làm sạch HTML bài blog trước khi lưu (chống XSS). Allowlist khớp output của editor lesson-plan
 * (TipTap 3 — xem {@code fe/components/LessonEditor/editorConfig.ts}): heading, list, bảng, ảnh,
 * sub/sup, và node công thức (giữ {@code data-latex}/{@code data-type} để FE render KaTeX).
 */
@Component
public class BlogContentSanitizer {

    private final Safelist safelist = Safelist.relaxed()
            // Tiptap dùng <s> cho strike + sub/sup + ảnh chèn từ /api/uploads.
            .addTags("s", "sub", "sup", "figure", "figcaption")
            // Cho phép class (ParagraphClass, mc-option…) và style (text-align/color/font-size/highlight).
            .addAttributes(":all", "class", "style")
            // Node công thức của editor: <span data-type="inline-math" data-latex="…">, <div data-type="block-math" …>.
            .addAttributes("span", "data-type", "data-latex")
            .addAttributes("div", "data-type", "data-latex")
            // Link mở tab mới.
            .addAttributes("a", "target", "rel")
            // Ảnh: URL công khai R2 (http/https) hoặc data URI.
            .addProtocols("img", "src", "http", "https", "data");

    /** Trả HTML đã lọc; {@code null} → chuỗi rỗng. */
    public String sanitize(String html) {
        if (html == null) {
            return "";
        }
        return Jsoup.clean(html, safelist);
    }

    /** Rỗng về mặt nội dung: không còn chữ và không có ảnh/công thức sau khi lọc. */
    public boolean isEmpty(String sanitizedHtml) {
        if (sanitizedHtml == null || sanitizedHtml.isBlank()) {
            return true;
        }
        boolean hasText = !Jsoup.parse(sanitizedHtml).text().isBlank();
        boolean hasMedia = sanitizedHtml.contains("<img") || sanitizedHtml.contains("data-latex");
        return !hasText && !hasMedia;
    }
}
