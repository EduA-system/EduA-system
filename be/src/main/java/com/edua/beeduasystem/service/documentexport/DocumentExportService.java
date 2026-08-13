package com.edua.beeduasystem.service.documentexport;

import com.edua.beeduasystem.repository.gateways.DocumentPdfRenderer;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import com.edua.beeduasystem.service.blog.BlogContentSanitizer;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.jsoup.parser.Parser;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DocumentExportService {

    private static final String PDF_CONTENT_TYPE = "application/pdf";
    private static final Pattern FRACTION_PATTERN = Pattern.compile("\\\\frac\\s*\\{([^{}]+)}\\s*\\{([^{}]+)}");
    private static final Pattern SQRT_PATTERN = Pattern.compile("\\\\sqrt\\s*\\{([^{}]+)}");
    private static final Pattern OVERLINE_PATTERN = Pattern.compile("\\\\overline\\s*\\{([^{}]+)}");
    private static final Pattern TEXT_PATTERN = Pattern.compile("\\\\text\\s*\\{([^{}]+)}");
    private static final Pattern BARE_BRACED_COMMAND_PATTERN = Pattern.compile("(?<!\\\\)\\b(frac|sqrt|overline|text)\\s*\\{");
    private static final Pattern BARE_DELTA_PATTERN = Pattern.compile("(?<!\\\\)\\bDelta\\b");
    private static final Pattern RAW_LATEX_PATTERN = Pattern.compile(
            "(?<![A-Za-z])(?:\\\\)?(?:frac|sqrt|overline|Delta|delta|cdot|times|pm|mp|leq|geq)\\s*(?:\\{|[A-Za-z])");
    private static final Pattern SUPERSCRIPT_GROUP_PATTERN = Pattern.compile("\\^\\{([^{}]+)}");
    private static final Pattern SUBSCRIPT_GROUP_PATTERN = Pattern.compile("_\\{([^{}]+)}");
    private static final Pattern SUPERSCRIPT_CHAR_PATTERN = Pattern.compile("\\^([A-Za-z0-9+\\-=()])");
    private static final Pattern SUBSCRIPT_CHAR_PATTERN = Pattern.compile("_([A-Za-z0-9+\\-=()])");
    private static final Map<String, String> LATEX_SYMBOLS = latexSymbols();
    private static final Map<Character, Character> SUPERSCRIPT_CHARS = Map.ofEntries(
            Map.entry('0', '⁰'), Map.entry('1', '¹'), Map.entry('2', '²'), Map.entry('3', '³'), Map.entry('4', '⁴'),
            Map.entry('5', '⁵'), Map.entry('6', '⁶'), Map.entry('7', '⁷'), Map.entry('8', '⁸'), Map.entry('9', '⁹'),
            Map.entry('+', '⁺'), Map.entry('-', '⁻'), Map.entry('=', '⁼'), Map.entry('(', '⁽'), Map.entry(')', '⁾'),
            Map.entry('n', 'ⁿ'), Map.entry('i', 'ⁱ')
    );
    private static final Map<Character, Character> SUBSCRIPT_CHARS = Map.ofEntries(
            Map.entry('0', '₀'), Map.entry('1', '₁'), Map.entry('2', '₂'), Map.entry('3', '₃'), Map.entry('4', '₄'),
            Map.entry('5', '₅'), Map.entry('6', '₆'), Map.entry('7', '₇'), Map.entry('8', '₈'), Map.entry('9', '₉'),
            Map.entry('+', '₊'), Map.entry('-', '₋'), Map.entry('=', '₌'), Map.entry('(', '₍'), Map.entry(')', '₎'),
            Map.entry('a', 'ₐ'), Map.entry('e', 'ₑ'), Map.entry('h', 'ₕ'), Map.entry('i', 'ᵢ'), Map.entry('j', 'ⱼ'),
            Map.entry('k', 'ₖ'), Map.entry('l', 'ₗ'), Map.entry('m', 'ₘ'), Map.entry('n', 'ₙ'), Map.entry('o', 'ₒ'),
            Map.entry('p', 'ₚ'), Map.entry('r', 'ᵣ'), Map.entry('s', 'ₛ'), Map.entry('t', 'ₜ'), Map.entry('u', 'ᵤ'),
            Map.entry('v', 'ᵥ'), Map.entry('x', 'ₓ')
    );

    private final CurrentUserProvider currentUserProvider;
    private final BlogContentSanitizer sanitizer;
    private final DocumentPdfRenderer pdfRenderer;
    private final StorageClient storageClient;

    public DocumentExportService(
            CurrentUserProvider currentUserProvider,
            BlogContentSanitizer sanitizer,
            DocumentPdfRenderer pdfRenderer,
            StorageClient storageClient
    ) {
        this.currentUserProvider = currentUserProvider;
        this.sanitizer = sanitizer;
        this.pdfRenderer = pdfRenderer;
        this.storageClient = storageClient;
    }

    public DocumentExportResult exportPdf(
            String rawType,
            String rawTitle,
            String rawDocumentHtml,
            Integer marginLeft,
            Integer marginRight
    ) {
        ExportType type = parseType(rawType);
        String title = requiredTitle(rawTitle);
        String sanitized = sanitizer.sanitize(rawDocumentHtml);
        if (sanitizer.isEmpty(sanitized)) {
            throw new IllegalArgumentException("Document content is required.");
        }

        String printableHtml = buildPrintableHtml(title, sanitized, cleanMargin(marginLeft), cleanMargin(marginRight));
        byte[] pdf;
        try {
            pdf = pdfRenderer.render(printableHtml);
        } catch (RuntimeException e) {
            throw new DocumentExportException("Không thể tạo nội dung PDF từ tài liệu hiện tại.", e);
        }

        String fileName = fileName(type, title);
        UUID userId = currentUserProvider.requireUserId();
        String key = "exports/pdf/%s/%s/%s-%s".formatted(
                userId,
                LocalDate.now(),
                UUID.randomUUID(),
                fileName
        );
        try {
            String downloadUrl = storageClient.store(key, pdf, PDF_CONTENT_TYPE);
            return new DocumentExportResult(fileName, downloadUrl);
        } catch (RuntimeException e) {
            throw new DocumentExportException("Không thể tải PDF lên kho lưu trữ.", e);
        }
    }

    private static String buildPrintableHtml(String title, String sanitizedHtml, int marginLeft, int marginRight) {
        Document fragment = Jsoup.parseBodyFragment(sanitizedHtml);
        normalizeMathNodes(fragment);
        String body = fragment.body().html();
        return """
                <!doctype html>
                <html lang="vi">
                <head>
                  <meta charset="utf-8" />
                  <title>%s</title>
                  <style>
                    @page { size: A4; margin: 18mm; }
                    * { box-sizing: border-box; }
                    body {
                      margin: 0;
                      color: #111;
                      font-family: "Times New Roman", "DejaVu Serif", serif;
                      font-size: 12pt;
                      line-height: 1.45;
                    }
                    .document-page {
                      padding-left: %dpx;
                      padding-right: %dpx;
                    }
                    .document-page, .document-page * { color: #111 !important; }
                    h1 { font-size: 16pt; text-align: center; margin: 0 0 6pt; }
                    h2 { font-size: 14pt; margin: 18pt 0 8pt; }
                    h3 { font-size: 12pt; margin: 14pt 0 6pt; }
                    p { margin: 0 0 6pt; }
                    ul, ol { margin: 0 0 8pt; padding-left: 20pt; }
                    li { margin-bottom: 3pt; }
                    table { width: 100%%; border-collapse: collapse; margin: 8pt 0; page-break-inside: avoid; }
                    th, td { border: 1px solid #333; padding: 6pt; vertical-align: top; }
                    th { text-align: center; font-weight: 700; }
                    img { max-width: 100%%; height: auto; }
                    .document-meta { text-align: center; color: #444; margin-bottom: 16pt; }
                    .mc-option { margin: 2pt 0; }
                    .math-inline { font-family: "Times New Roman", "DejaVu Serif", serif; }
                    .math-block { margin: 8pt 0; text-align: center; font-family: "Times New Roman", "DejaVu Serif", serif; }
                  </style>
                </head>
                <body><div class="document-page">%s</div></body>
                </html>
                """.formatted(escapeXml(title), marginLeft, marginRight, body);
    }

    private static void normalizeMathNodes(Document document) {
        for (Element element : document.select("[data-latex]")) {
            String latex = element.attr("data-latex");
            if ("block-math".equals(element.attr("data-type"))) {
                Element replacement = new Element("div").addClass("math-block");
                replacement.text(latexToPdfText(latex));
                element.replaceWith(replacement);
            } else {
                Element replacement = new Element("span").addClass("math-inline");
                replacement.text(latexToPdfText(latex));
                element.replaceWith(replacement);
            }
        }
        normalizeRawLatexTextNodes(document);
    }

    /** Các tài liệu cũ có thể lưu LaTex như text thường thay vì node TipTap math; vẫn chuyển được khi xuất. */
    private static void normalizeRawLatexTextNodes(Document document) {
        for (Element element : document.getAllElements()) {
            for (TextNode textNode : List.copyOf(element.textNodes())) {
                String text = textNode.getWholeText();
                if (RAW_LATEX_PATTERN.matcher(text).find()) {
                    textNode.text(latexToPdfText(text));
                }
            }
        }
    }

    private static String latexToPdfText(String latex) {
        if (latex == null || latex.isBlank()) {
            return "";
        }
        String value = normalizeBareLatexCommands(latex.trim());
        for (int pass = 0; pass < 8; pass++) {
            String previous = value;
            value = replacePattern(value, TEXT_PATTERN, match -> match.group(1));
            value = replacePattern(value, OVERLINE_PATTERN, match -> overline(match.group(1)));
            value = replacePattern(value, SQRT_PATTERN, match -> "√(" + match.group(1) + ")");
            value = replacePattern(value, FRACTION_PATTERN, match -> "(" + match.group(1) + ")/(" + match.group(2) + ")");
            if (value.equals(previous)) {
                break;
            }
        }
        value = replacePattern(value, SUPERSCRIPT_GROUP_PATTERN, match -> toScript(match.group(1), SUPERSCRIPT_CHARS));
        value = replacePattern(value, SUBSCRIPT_GROUP_PATTERN, match -> toScript(match.group(1), SUBSCRIPT_CHARS));
        value = replacePattern(value, SUPERSCRIPT_CHAR_PATTERN, match -> toScript(match.group(1), SUPERSCRIPT_CHARS));
        value = replacePattern(value, SUBSCRIPT_CHAR_PATTERN, match -> toScript(match.group(1), SUBSCRIPT_CHARS));
        for (Map.Entry<String, String> entry : LATEX_SYMBOLS.entrySet()) {
            value = value.replace(entry.getKey(), entry.getValue());
        }
        return value
                .replace("\\left", "")
                .replace("\\right", "")
                .replace("\\,", " ")
                .replace("\\;", " ")
                .replace("\\:", " ")
                .replace("\\!", "")
                .replaceAll("\\\\([A-Za-z]+)", "$1")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private static String normalizeBareLatexCommands(String value) {
        String normalized = replacePattern(value, BARE_BRACED_COMMAND_PATTERN, match -> "\\" + match.group(1) + "{");
        return replacePattern(normalized, BARE_DELTA_PATTERN, match -> "\\Delta");
    }

    private static String overline(String value) {
        StringBuilder result = new StringBuilder(value.length() * 2);
        for (char c : value.toCharArray()) {
            result.append(c);
            if (!Character.isWhitespace(c)) {
                result.append('\u0305');
            }
        }
        return result.toString();
    }

    private static String replacePattern(String value, Pattern pattern, MatchReplacement replacement) {
        Matcher matcher = pattern.matcher(value);
        StringBuffer result = new StringBuffer();
        while (matcher.find()) {
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement.replace(matcher)));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    private static String toScript(String value, Map<Character, Character> scriptChars) {
        StringBuilder result = new StringBuilder();
        for (char c : value.toCharArray()) {
            result.append(scriptChars.getOrDefault(c, c));
        }
        return result.toString();
    }

    private static Map<String, String> latexSymbols() {
        Map<String, String> symbols = new HashMap<>();
        symbols.put("\\alpha", "α");
        symbols.put("\\beta", "β");
        symbols.put("\\gamma", "γ");
        symbols.put("\\delta", "δ");
        symbols.put("\\epsilon", "ε");
        symbols.put("\\varepsilon", "ε");
        symbols.put("\\zeta", "ζ");
        symbols.put("\\eta", "η");
        symbols.put("\\theta", "θ");
        symbols.put("\\vartheta", "ϑ");
        symbols.put("\\lambda", "λ");
        symbols.put("\\mu", "μ");
        symbols.put("\\nu", "ν");
        symbols.put("\\xi", "ξ");
        symbols.put("\\pi", "π");
        symbols.put("\\rho", "ρ");
        symbols.put("\\sigma", "σ");
        symbols.put("\\tau", "τ");
        symbols.put("\\varphi", "φ");
        symbols.put("\\phi", "φ");
        symbols.put("\\omega", "ω");
        symbols.put("\\Delta", "Δ");
        symbols.put("\\Omega", "Ω");
        symbols.put("\\Sigma", "Σ");
        symbols.put("\\Pi", "Π");
        symbols.put("\\times", "×");
        symbols.put("\\cdot", "·");
        symbols.put("\\leq", "≤");
        symbols.put("\\le", "≤");
        symbols.put("\\geq", "≥");
        symbols.put("\\ge", "≥");
        symbols.put("\\neq", "≠");
        symbols.put("\\approx", "≈");
        symbols.put("\\sim", "∼");
        symbols.put("\\pm", "±");
        symbols.put("\\mp", "∓");
        symbols.put("\\infty", "∞");
        symbols.put("\\rightarrow", "→");
        symbols.put("\\to", "→");
        symbols.put("\\leftarrow", "←");
        return symbols;
    }

    private interface MatchReplacement {
        String replace(Matcher matcher);
    }

    private static ExportType parseType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            throw new IllegalArgumentException("Type is required.");
        }
        try {
            ExportType type = ExportType.valueOf(rawType.trim().toUpperCase(Locale.ROOT));
            if (type == ExportType.LESSON_PLAN || type == ExportType.TEST) {
                return type;
            }
        } catch (IllegalArgumentException ignored) {
        }
        throw new IllegalArgumentException("Invalid export type.");
    }

    private static String requiredTitle(String rawTitle) {
        if (rawTitle == null || rawTitle.isBlank()) {
            throw new IllegalArgumentException("Title is required.");
        }
        String title = rawTitle.trim();
        if (title.length() > 160) {
            return title.substring(0, 160).trim();
        }
        return title;
    }

    private static int cleanMargin(Integer value) {
        if (value == null) {
            return 80;
        }
        return Math.max(24, Math.min(value, 160));
    }

    private static String fileName(ExportType type, String title) {
        String prefix = type == ExportType.LESSON_PLAN ? "giao-an" : "de-kiem-tra";
        return prefix + "-" + slug(title) + ".pdf";
    }

    private static String slug(String value) {
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replace('đ', 'd')
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        return normalized.isBlank() ? "tai-lieu" : normalized;
    }

    private static String escapeXml(String value) {
        return Parser.unescapeEntities(value, false)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private enum ExportType {
        LESSON_PLAN,
        TEST
    }
}
