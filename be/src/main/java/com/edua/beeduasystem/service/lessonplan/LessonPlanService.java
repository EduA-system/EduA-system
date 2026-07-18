package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.domain.model.lessonplan.Activity5512;
import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;
import com.edua.beeduasystem.domain.model.lessonplan.Materials;
import com.edua.beeduasystem.domain.model.lessonplan.Objectives;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateActivityDetailsRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Sinh giáo án 5512 (đồng bộ, chưa lưu DB):
 * <ul>
 *   <li>Phần I. MỤC TIÊU, II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU — mỗi phần một call.</li>
 *   <li>Phần III. TIẾN TRÌNH DẠY HỌC — DÀN Ý (một call) rồi điền CHI TIẾT bằng 4 call
 *       SONG SONG (mỗi top-level activity một call) trên virtual-thread executor.</li>
 * </ul>
 *
 * <p>Luồng: lấy {@code knowledge_json} của bài → dựng prompt → gọi {@link AiClient}
 * → parse JSON thành DTO → trả về. Lỗi input map 400; lỗi AI/parse map 502 qua
 * {@code GlobalExceptionHandler}.
 */
@Slf4j
@Service
public class LessonPlanService {

    private final TextbookCatalogRepository catalogRepository;
    private final AiClient aiClient;
    private final LessonPlan5512PromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;
    private final ExecutorService executor;
    private final AiSystemPromptService systemPromptService;

    public LessonPlanService(TextbookCatalogRepository catalogRepository,
                             AiClient aiClient,
                             LessonPlan5512PromptBuilder promptBuilder,
                             ObjectMapper objectMapper,
                             @Qualifier("slideSessionExecutor") ExecutorService executor,
                             AiSystemPromptService systemPromptService) {
        this.catalogRepository = catalogRepository;
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.objectMapper = objectMapper;
        this.executor = executor;
        this.systemPromptService = systemPromptService;
    }

    /** Sinh phần I. MỤC TIÊU cho bài đã chọn. */
    public LessonPlan5512 generateObjectives(GenerateLessonPlanRequest request) {
        String knowledge = loadKnowledge(request);
        String prompt = promptBuilder.buildObjectivesPrompt(knowledge, request.userPrompt());
        String raw = generate(AiPromptKey.LESSON_PLAN_OBJECTIVES, prompt, "AI không sinh được mục tiêu giáo án.");

        Objectives objectives = parseJson(raw, Objectives.class, "Kết quả AI không đúng định dạng mục tiêu.");
        return new LessonPlan5512(null, objectives, null, null);
    }

    /** Sinh phần II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU cho bài đã chọn. */
    public LessonPlan5512 generateMaterials(GenerateLessonPlanRequest request) {
        String knowledge = loadKnowledge(request);
        String prompt = promptBuilder.buildMaterialsPrompt(knowledge, request.userPrompt());
        String raw = generate(AiPromptKey.LESSON_PLAN_MATERIALS, prompt, "AI không sinh được thiết bị và học liệu.");

        Materials materials = parseJson(raw, Materials.class, "Kết quả AI không đúng định dạng thiết bị và học liệu.");
        return new LessonPlan5512(null, null, materials, null);
    }

    /** Sinh DÀN Ý (khung) phần III. TIẾN TRÌNH DẠY HỌC — chưa điền a/b/c/d, chưa lưu DB. */
    public LessonPlan5512 generateActivitiesFrame(GenerateLessonPlanRequest request) {
        String knowledge = loadKnowledge(request);
        String prompt = promptBuilder.buildActivitiesFramePrompt(knowledge, request.userPrompt());
        String raw = generate(AiPromptKey.LESSON_PLAN_ACTIVITIES_FRAME, prompt, "AI không sinh được khung tiến trình dạy học.");

        ActivitiesFrame frame = parseJson(raw, ActivitiesFrame.class,
                "Kết quả AI không đúng định dạng tiến trình dạy học.");
        return new LessonPlan5512(null, null, null, frame.activities());
    }

    /** Wrapper chỉ để parse JSON {"activities":[...]} từ call dàn ý. */
    private record ActivitiesFrame(List<Activity5512> activities) {
    }

    /**
     * Điền CHI TIẾT phần III bằng 4 call AI SONG SONG (mỗi top-level activity một call) trên
     * virtual-thread executor. Mỗi call thấy đủ ngữ cảnh I/II + dàn ý → bám sát & nhất quán.
     * Một hoạt động lỗi thì giữ skeleton của nó, không kéo sập cả pipeline.
     */
    public LessonPlan5512 generateActivitiesDetails(GenerateActivityDetailsRequest request) {
        String knowledge = loadKnowledge(request.bookId(), request.chapterId(), request.lessonId());
        List<Activity5512> frame = request.activities();
        if (frame == null || frame.isEmpty()) {
            throw new IllegalArgumentException("Thiếu dàn ý hoạt động (activities) để soạn chi tiết.");
        }

        try {
            String objectivesJson = toJson(request.objectives());
            String materialsJson = toJson(request.equipmentAndMaterials());
            String frameOutlineJson = toJson(frame);
            String userPrompt = request.userPrompt();

            AtomicInteger failures = new AtomicInteger();
            List<CompletableFuture<Activity5512>> futures = frame.stream()
                    .map(activity -> CompletableFuture
                            .supplyAsync(() -> detailOne(activity, knowledge, objectivesJson,
                                    materialsJson, frameOutlineJson, userPrompt), executor)
                            .exceptionally(ex -> {
                                log.warn("Soạn chi tiết hoạt động '{}' thất bại, giữ skeleton:",
                                        activity.name(), ex);
                                failures.incrementAndGet();
                                return activity;
                            }))
                    .toList();

            List<Activity5512> detailed = futures.stream().map(CompletableFuture::join).toList();
            if (failures.get() == frame.size()) {
                // Tất cả hoạt động đều lỗi → không phải "thành công một phần" mà là hỏng hệ thống
                // (AI lỗi/giới hạn, parse sai…). Báo 502 để FE thấy thay vì im lặng trả skeleton.
                throw new LessonPlanGenerationException(
                        "Không soạn được chi tiết tiến trình dạy học (mọi hoạt động đều lỗi). Xem log BE.", null);
            }
            return new LessonPlan5512(null, null, null, detailed);
        } catch (LessonPlanGenerationException e) {
            throw e;
        } catch (RuntimeException e) {
            // Lỗi không lường trước (NPE, serialize…) — log đủ stack + surface message thật cho FE.
            log.error("generateActivitiesDetails lỗi không lường trước", e);
            throw new LessonPlanGenerationException("Lỗi soạn chi tiết Phần III: " + e, e);
        }
    }

    /**
     * Một call AI điền chi tiết cho một hoạt động; merge giữ identity từ frame, lấy nội dung từ AI.
     *
     * <p>Package-private để {@link GenerateLessonPlanStreamUseCase} tái dùng cho luồng streaming.
     */
    Activity5512 detailOne(Activity5512 frameActivity, String knowledge, String objectivesJson,
                                   String materialsJson, String frameOutlineJson, String userPrompt) {
        String targetJson = toJson(frameActivity);
        String prompt = promptBuilder.buildActivityDetailPrompt(knowledge, objectivesJson,
                materialsJson, frameOutlineJson, targetJson, frameActivity, userPrompt);
        String raw = generate(AiPromptKey.LESSON_PLAN_ACTIVITY_DETAIL, prompt, "AI không sinh được nội dung hoạt động.");
        Activity5512 detail = parseJson(raw, Activity5512.class,
                "Kết quả AI không đúng định dạng hoạt động.");
        return mergeDetail(frameActivity, detail);
    }

    /** Giữ order/name/duration của frame; lấy a/b/c/d + organization(Text) từ AI; zip tiểu hoạt động. */
    private Activity5512 mergeDetail(Activity5512 frame, Activity5512 detail) {
        return new Activity5512(
                frame.order(), frame.name(), frame.duration(),
                detail.objective(), detail.content(), detail.product(),
                detail.organization(), detail.organizationText(),
                mergeSubs(frame.subActivities(), detail.subActivities()));
    }

    /** Zip tiểu hoạt động theo index: identity (order/name/duration) theo frame, nội dung theo AI. */
    private List<Activity5512> mergeSubs(List<Activity5512> frameSubs, List<Activity5512> detailSubs) {
        if (frameSubs == null || frameSubs.isEmpty()) {
            return detailSubs == null ? List.of() : detailSubs;
        }
        List<Activity5512> merged = new ArrayList<>(frameSubs.size());
        for (int i = 0; i < frameSubs.size(); i++) {
            Activity5512 fs = frameSubs.get(i);
            Activity5512 ds = (detailSubs != null && i < detailSubs.size()) ? detailSubs.get(i) : null;
            merged.add(ds == null ? fs : mergeDetail(fs, ds));
        }
        return merged;
    }

    /** Serialize ngữ cảnh sang JSON để nhúng vào prompt; null → chuỗi rỗng. Package-private cho use case streaming. */
    String toJson(Object value) {
        if (value == null) {
            return "";
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return String.valueOf(value);
        }
    }

    /** Validate request và lấy nội dung SGK số hóa của bài. */
    private String loadKnowledge(GenerateLessonPlanRequest request) {
        return loadKnowledge(request.bookId(), request.chapterId(), request.lessonId());
    }

    /** Validate ids và lấy nội dung SGK số hóa của bài. Package-private cho use case streaming. */
    String loadKnowledge(String bookId, String chapterId, String lessonId) {
        if (isBlank(bookId) || isBlank(chapterId) || isBlank(lessonId)) {
            throw new IllegalArgumentException("Thiếu bookId/chapterId/lessonId.");
        }
        return catalogRepository
                .findLessonKnowledge(bookId, chapterId, lessonId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Bài học chưa có nội dung số hóa (knowledge_json) để sinh giáo án."));
    }

    /** Gọi AI, bọc lỗi runtime thành {@link LessonPlanGenerationException} (→ 502). */
    private String generate(AiPromptKey key, String prompt, String errorMessage) {
        try {
            return aiClient.generate(systemPromptService.apply(key, prompt));
        } catch (RuntimeException e) {
            throw new LessonPlanGenerationException(errorMessage, e);
        }
    }

    /** Parse output AI thành DTO; lỗi định dạng map 502 với thông điệp riêng từng phần. */
    private <T> T parseJson(String raw, Class<T> type, String errorMessage) {
        String json = stripJsonFence(raw);
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            String repaired = repairLatexEscapes(json);
            if (!repaired.equals(json)) {
                try {
                    return objectMapper.readValue(repaired, type);
                } catch (Exception repairedError) {
                    e.addSuppressed(repairedError);
                }
            }
            log.warn("Parse {} thất bại. Output AI: {}", type.getSimpleName(), raw);
            throw new LessonPlanGenerationException(errorMessage, e);
        }
    }

    /** Bỏ rào ```json ... ``` nếu model bọc output trong code fence. */
    private String stripJsonFence(String raw) {
        if (raw == null) {
            return "";
        }
        String trimmed = raw.trim();
        if (trimmed.startsWith("```")) {
            int firstNewline = trimmed.indexOf('\n');
            if (firstNewline >= 0) {
                trimmed = trimmed.substring(firstNewline + 1);
            }
            if (trimmed.endsWith("```")) {
                trimmed = trimmed.substring(0, trimmed.length() - 3);
            }
        }
        return trimmed.trim();
    }

    /**
     * AI đôi khi trả LaTeX trong JSON với backslash chưa escape, ví dụ {@code \(},
     * {@code \omega}, {@code \frac}. JSON chuẩn yêu cầu {@code \\(}, {@code \\omega}.
     * Chỉ sửa bên trong JSON string và ưu tiên các lệnh/delimiter LaTeX hay gặp để không
     * đụng tới escape JSON hợp lệ như {@code \n} dùng cho xuống dòng.
     */
    private String repairLatexEscapes(String json) {
        if (json == null || json.indexOf('\\') < 0) {
            return json;
        }
        String[] latexEscapes = {
                "\\(", "\\)", "\\[", "\\]",
                "\\frac", "\\sqrt", "\\text", "\\cos", "\\sin", "\\tan",
                "\\omega", "\\Omega", "\\varphi", "\\phi", "\\pi", "\\Delta",
                "\\theta", "\\alpha", "\\beta", "\\gamma", "\\times", "\\cdot",
                "\\left", "\\right", "\\mathrm", "\\mathbf"
        };

        StringBuilder out = new StringBuilder(json.length() + 16);
        boolean inString = false;
        for (int i = 0; i < json.length(); i++) {
            char ch = json.charAt(i);
            if (ch == '"' && !isEscaped(json, i)) {
                inString = !inString;
                out.append(ch);
                continue;
            }
            if (inString && ch == '\\' && !isEscaped(json, i)) {
                String remaining = json.substring(i);
                boolean latex = false;
                for (String escape : latexEscapes) {
                    if (remaining.startsWith(escape)) {
                        latex = true;
                        break;
                    }
                }
                if (latex) {
                    out.append("\\\\");
                    continue;
                }
            }
            out.append(ch);
        }
        return out.toString();
    }

    private boolean isEscaped(String value, int index) {
        int count = 0;
        for (int i = index - 1; i >= 0 && value.charAt(i) == '\\'; i--) {
            count++;
        }
        return count % 2 == 1;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
