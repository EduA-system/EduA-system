package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideHtmlDesignResponse;
import com.edua.beeduasystem.repository.gateways.AiClient;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Slf4j
@Service
public class GenerateSlideHtmlDesignUseCase {

    /** Inner text of Step 2's first debug-legend span ("zone: hero", "struct: header"). */
    private static final Pattern LEGEND_LABEL_TEXT = Pattern.compile(
            "^(zone|struct)\\s*:.*", Pattern.CASE_INSENSITIVE);

    /** Inner text of Step 2's second debug-legend span ("520×160 · max 120 chars · 4 lines"). */
    private static final Pattern LEGEND_METRIC_TEXT = Pattern.compile(
            "^\\d+\\s*[×x]\\s*\\d+\\s*[·•].*", Pattern.CASE_INSENSITIVE);

    private final AiClient aiClient;
    private final SlideDesignPromptBuilder promptBuilder;
    private final String modelLabel;

    public GenerateSlideHtmlDesignUseCase(
            AiClient aiClient,
            SlideDesignPromptBuilder promptBuilder,
            @Value("${app.ai.openai.default-model:gpt-4o-mini}") String openaiModel,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel) {
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.modelLabel = openaiModel + " → " + deepseekModel;
    }

    public SlideHtmlDesignResponse execute(SlideHtmlDesignRequest req) {
        String step = req.step() == null ? "" : req.step().strip().toLowerCase();
        String prompt;
        String stepLabel;
        switch (step) {
            case "bg_deco" -> {
                prompt = promptBuilder.buildStep1BgDecoPrompt(req);
                stepLabel = "step1-bg-deco";
            }
            case "structural" -> {
                if (req.priorHtml() == null || req.priorHtml().isBlank()) {
                    return new SlideHtmlDesignResponse(
                            "",
                            0,
                            modelLabel,
                            "Step 2 (structural) needs priorHtml from step 1");
                }
                prompt = promptBuilder.buildStep2StructZonesPrompt(req);
                stepLabel = "step2-structural";
            }
            case "content_fill" -> {
                if (req.priorHtml() == null || req.priorHtml().isBlank()) {
                    return new SlideHtmlDesignResponse(
                            "",
                            0,
                            modelLabel,
                            "Step 3 (content_fill) needs priorHtml from step 2");
                }
                prompt = promptBuilder.buildStep3ContentFillPrompt(req);
                stepLabel = "step3-content-fill";
            }
            default -> {
                return new SlideHtmlDesignResponse(
                        "",
                        0,
                        modelLabel,
                        "Unknown step '" + step + "' — expected bg_deco | structural | content_fill");
            }
        }
        log.info("slide-design.html step={} prompt length={}", stepLabel, prompt.length());

        long t0 = System.currentTimeMillis();
        String raw = aiClient.generate(prompt);
        long latencyMs = System.currentTimeMillis() - t0;

        String html = SlideHtmlExtractor.extract(raw);
        boolean strippedPreamble = raw != null && raw.length() > html.length() + 8;

        // Step 3: AI was told to APPEND content AFTER each zone/header's two
        // debug legend spans (ZONE: HERO + W×H · max N chars · L lines).
        // The dashed outline frames stay (still useful as layout reference),
        // but the legend TEXT itself is debug chrome — strip via Jsoup DOM
        // removal so the slide shows only real content inside the frames.
        if (step.equals("content_fill")) {
            int before = html.length();
            html = stripDebugLegends(html);
            log.info("slide-design.html step={} legend spans stripped: {} -> {} chars",
                    stepLabel, before, html.length());
        }

        log.info("slide-design.html step={} raw={} extracted={} latency={}ms preambleStripped={}",
                stepLabel, raw == null ? 0 : raw.length(), html.length(), latencyMs, strippedPreamble);

        String warning = null;
        if (html.isBlank()) {
            warning = "AI trả về rỗng";
        } else if (step.equals("bg_deco") && !html.contains("data-layer=\"bg\"")) {
            warning = "Step 1: thiếu data-layer=\"bg\" trên root";
        } else if (step.equals("bg_deco") && !html.contains("data-region=\"header\"")) {
            warning = "Step 1: thiếu header (data-region=\"header\")";
        } else if (step.equals("bg_deco") && !html.contains("data-body-top=")) {
            warning = "Step 1: header thiếu data-body-top (Step 2 sẽ dùng fallback 80px)";
        } else if (step.equals("structural") && !html.contains("data-zone=")) {
            warning = "Step 2: AI không khai báo zone nào (data-zone)";
        } else if (step.equals("structural") && req.priorHtml() != null
                && !html.contains(extractFirstDecorationSignature(req.priorHtml()))) {
            warning = "Step 2: skin step 1 có thể đã bị sửa (decoration không khớp)";
        } else if (step.equals("structural") && req.priorHtml() != null
                && req.priorHtml().contains("data-region=\"header\"")
                && !html.contains("data-region=\"header\"")) {
            warning = "Step 2: header từ Step 1 đã bị xóa";
        } else if (step.equals("content_fill") && req.priorHtml() != null
                && req.priorHtml().contains("data-region=\"header\"")
                && !html.contains("data-region=\"header\"")) {
            warning = "Step 3: header từ Step 1 đã bị xóa";
        } else if (step.equals("content_fill") && req.priorHtml() != null
                && countMatches(html, "data-zone=") < countMatches(req.priorHtml(), "data-zone=")) {
            warning = "Step 3: số lượng zone giảm (AI có thể đã xóa zone của Step 2)";
        } else if (step.equals("content_fill") && !html.contains("data-layer=\"content\"")) {
            warning = "Step 3: AI không emit content nào (thiếu data-layer=\"content\")";
        } else if (step.equals("content_fill") && req.priorHtml() != null
                && req.priorHtml().contains("outline: 2px dashed")
                && !html.contains("outline: 2px dashed")) {
            warning = "Step 3: debug overlay (dashed outline) đã bị xóa";
        } else if (strippedPreamble) {
            warning = "AI có preamble/fence — đã tự strip (xem log để biết)";
        }

        return new SlideHtmlDesignResponse(html, latencyMs, modelLabel, warning);
    }

    /**
     * Pick a short signature from the prior HTML's decoration layer so we can
     * cheaply check whether Step 2 left it intact. Returns the first
     * data-layer="deco" snippet or an empty string when none is found.
     */
    private static String extractFirstDecorationSignature(String priorHtml) {
        int idx = priorHtml.indexOf("data-layer=\"deco\"");
        if (idx < 0) return "";
        int end = Math.min(priorHtml.length(), idx + 48);
        return priorHtml.substring(idx, end);
    }

    /**
     * Parse the slide HTML, walk every header placeholder and every body zone,
     * and remove the two debug-legend &lt;span&gt; children Step 2 emitted
     * (matched by their inner text, not by style). Content children stay
     * untouched. The dashed outline lives on the parent div's inline style
     * and is preserved.
     */
    private static String stripDebugLegends(String html) {
        if (html == null || html.isEmpty()) return html;
        Document doc = Jsoup.parseBodyFragment(html);
        doc.outputSettings()
                .prettyPrint(false)
                .syntax(Document.OutputSettings.Syntax.html);

        Elements containers = doc.select("[data-region=header], [data-layer=zone]");
        for (Element container : containers) {
            for (Element child : container.children()) {
                if (!"span".equalsIgnoreCase(child.tagName())) continue;
                String text = child.text().trim();
                if (text.isEmpty()) continue;
                if (LEGEND_LABEL_TEXT.matcher(text).matches()
                        || LEGEND_METRIC_TEXT.matcher(text).matches()) {
                    child.remove();
                }
            }
        }
        return doc.body().html();
    }

    private static int countMatches(String haystack, String needle) {
        if (haystack == null || needle == null || needle.isEmpty()) return 0;
        int count = 0;
        int idx = 0;
        while ((idx = haystack.indexOf(needle, idx)) != -1) {
            count++;
            idx += needle.length();
        }
        return count;
    }
}
