package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.domain.model.lessonplan.Activity5512;
import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;
import com.edua.beeduasystem.domain.model.lessonplan.Materials;
import com.edua.beeduasystem.domain.model.lessonplan.Objectives;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.EditLessonSectionResponse;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
    private final LessonPlanEditPromptBuilder editPromptBuilder;
    private final ObjectMapper objectMapper;
    private final ExecutorService executor;
    private final AiSystemPromptService systemPromptService;
    /** Số lần thử tối đa cho mỗi call sinh giáo án (AI + parse). Tối thiểu 1. */
    private final int maxAttempts;
    /** Backoff tuyến tính giữa các lần thử (ms) — lần thử i chờ backoff × i. */
    private final long retryBackoffMs;

    public LessonPlanService(TextbookCatalogRepository catalogRepository,
                             AiClient aiClient,
                             LessonPlan5512PromptBuilder promptBuilder,
                             LessonPlanEditPromptBuilder editPromptBuilder,
                             ObjectMapper objectMapper,
                             @Qualifier("slideSessionExecutor") ExecutorService executor,
                             AiSystemPromptService systemPromptService,
                             @Value("${app.ai.lesson-plan.max-attempts:3}") int maxAttempts,
                             @Value("${app.ai.lesson-plan.retry-backoff-ms:700}") long retryBackoffMs) {
        this.catalogRepository = catalogRepository;
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.editPromptBuilder = editPromptBuilder;
        this.objectMapper = objectMapper;
        this.executor = executor;
        this.systemPromptService = systemPromptService;
        this.maxAttempts = Math.max(1, maxAttempts);
        this.retryBackoffMs = Math.max(0, retryBackoffMs);
    }

    /** Sinh phần I. MỤC TIÊU cho bài đã chọn. */
    public LessonPlan5512 generateObjectives(GenerateLessonPlanRequest request) {
        String knowledge = loadKnowledge(request);
        String prompt = promptBuilder.buildObjectivesPrompt(knowledge, request.userPrompt());
        Objectives objectives = generateAndParse(AiPromptKey.LESSON_PLAN_OBJECTIVES, prompt,
                Objectives.class, "AI không sinh được mục tiêu giáo án.",
                "Kết quả AI không đúng định dạng mục tiêu.");
        return new LessonPlan5512(null, objectives, null, null);
    }

    /** Sinh phần II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU cho bài đã chọn. */
    public LessonPlan5512 generateMaterials(GenerateLessonPlanRequest request) {
        String knowledge = loadKnowledge(request);
        String prompt = promptBuilder.buildMaterialsPrompt(knowledge, request.userPrompt());
        Materials materials = generateAndParse(AiPromptKey.LESSON_PLAN_MATERIALS, prompt,
                Materials.class, "AI không sinh được thiết bị và học liệu.",
                "Kết quả AI không đúng định dạng thiết bị và học liệu.");
        return new LessonPlan5512(null, null, materials, null);
    }

    /** Sinh DÀN Ý (khung) phần III. TIẾN TRÌNH DẠY HỌC — chưa điền a/b/c/d, chưa lưu DB. */
    public LessonPlan5512 generateActivitiesFrame(GenerateLessonPlanRequest request) {
        String knowledge = loadKnowledge(request);
        String prompt = promptBuilder.buildActivitiesFramePrompt(knowledge, request.userPrompt());
        ActivitiesFrame frame = generateAndParse(AiPromptKey.LESSON_PLAN_ACTIVITIES_FRAME, prompt,
                ActivitiesFrame.class, "AI không sinh được khung tiến trình dạy học.",
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

    /** AI tự chọn và viết lại một hoặc nhiều phần trong giáo án hiện tại do frontend trích từ editor. */
    public List<EditLessonSectionResponse> editSection(EditLessonSectionRequest request) {
        validateEditSectionRequest(request);
        Set<String> sectionIds = new HashSet<>();
        for (EditLessonSectionRequest.SectionInput section : request.sections()) {
            sectionIds.add(section.id());
        }

        String prompt = editPromptBuilder.buildPrompt(request);
        EditLessonSectionsAiResponse aiResponse = generateAndParse(AiPromptKey.LESSON_PLAN_EDIT_SECTION, prompt,
                EditLessonSectionsAiResponse.class, "AI không chỉnh sửa được giáo án.",
                "Kết quả AI không đúng định dạng chỉnh sửa giáo án.");

        if (aiResponse == null || aiResponse.edits() == null || aiResponse.edits().isEmpty()) {
            throw new LessonPlanGenerationException("AI không đề xuất chỉnh sửa nào.", null);
        }

        Set<String> seenTargetIds = new HashSet<>();
        List<EditLessonSectionResponse> result = new ArrayList<>(aiResponse.edits().size());
        for (EditLessonSectionResponse edit : aiResponse.edits()) {
            if (edit == null || isBlank(edit.targetId()) || !sectionIds.contains(edit.targetId())) {
                throw new LessonPlanGenerationException("AI chọn phần giáo án không hợp lệ.", null);
            }
            if (!seenTargetIds.add(edit.targetId())) {
                throw new LessonPlanGenerationException("AI chọn trùng lặp một phần giáo án để sửa.", null);
            }
            if (isBlank(edit.content())) {
                throw new LessonPlanGenerationException("AI trả về bản sửa rỗng.", null);
            }
            result.add(new EditLessonSectionResponse(edit.targetId().strip(), edit.content().strip()));
        }
        return result;
    }

    /** Wrapper chỉ để parse JSON {"edits":[...]} từ call chỉnh sửa (một hoặc nhiều phần). */
    private record EditLessonSectionsAiResponse(List<EditLessonSectionResponse> edits) {
    }

    private void validateEditSectionRequest(EditLessonSectionRequest request) {
        if (request == null || isBlank(request.instruction())) {
            throw new IllegalArgumentException("Thiếu yêu cầu chỉnh sửa giáo án.");
        }
        if (request.sections() == null || request.sections().isEmpty()) {
            throw new IllegalArgumentException("Không có phần giáo án nào để chỉnh sửa.");
        }
        Set<String> ids = new HashSet<>();
        for (EditLessonSectionRequest.SectionInput section : request.sections()) {
            if (section == null || isBlank(section.id()) || isBlank(section.heading())) {
                throw new IllegalArgumentException("Danh sách phần giáo án không hợp lệ.");
            }
            if (!ids.add(section.id())) {
                throw new IllegalArgumentException("Danh sách phần giáo án có id trùng lặp.");
            }
        }
    }

    /**
     * Một call AI điền chi tiết cho một hoạt động; merge giữ identity từ frame, lấy nội dung từ AI.
     * Hoạt động 2 (có tiểu hoạt động) rẽ sang {@link #detailActivityWithSubActivities} — mỗi tiểu
     * hoạt động một call riêng, tránh 1 call phải gánh cả N tiểu hoạt động và bị cắt dở giữa chừng.
     *
     * <p>Package-private để {@link GenerateLessonPlanStreamUseCase} tái dùng cho luồng streaming.
     */
    Activity5512 detailOne(Activity5512 frameActivity, String knowledge, String objectivesJson,
                                   String materialsJson, String frameOutlineJson, String userPrompt) {
        List<Activity5512> frameSubs = frameActivity.subActivities();
        if (frameSubs != null && !frameSubs.isEmpty()) {
            return detailActivityWithSubActivities(frameActivity, frameSubs, knowledge,
                    objectivesJson, materialsJson, frameOutlineJson, userPrompt);
        }
        String targetJson = toJson(frameActivity);
        String prompt = promptBuilder.buildActivityDetailPrompt(knowledge, objectivesJson,
                materialsJson, frameOutlineJson, targetJson, frameActivity, userPrompt);
        Activity5512 detail = generateAndParse(AiPromptKey.LESSON_PLAN_ACTIVITY_DETAIL, prompt,
                Activity5512.class, "AI không sinh được nội dung hoạt động.",
                "Kết quả AI không đúng định dạng hoạt động.");
        return mergeDetail(frameActivity, detail);
    }

    /**
     * Hoạt động 2 luôn để trống ở cấp 1 (theo quy ước 5512, không cần gọi AI cho khung chứa) —
     * mỗi tiểu hoạt động là MỘT call AI riêng, chạy song song trên {@code executor}. Một tiểu
     * hoạt động lỗi thì giữ skeleton của riêng nó; chỉ khi TẤT CẢ tiểu hoạt động đều lỗi mới coi
     * Hoạt động 2 là thất bại (ném lỗi để lời gọi ngoài xử lý giống một activity lỗi bình thường).
     */
    private Activity5512 detailActivityWithSubActivities(Activity5512 frameActivity,
            List<Activity5512> frameSubs, String knowledge, String objectivesJson,
            String materialsJson, String frameOutlineJson, String userPrompt) {
        String parentJson = toJson(frameActivity);
        AtomicInteger subFailures = new AtomicInteger();
        List<CompletableFuture<Activity5512>> futures = frameSubs.stream()
                .map(sub -> CompletableFuture
                        .supplyAsync(() -> detailSubActivity(sub, parentJson, knowledge,
                                objectivesJson, materialsJson, frameOutlineJson, userPrompt), executor)
                        .exceptionally(ex -> {
                            log.warn("Soạn chi tiết tiểu hoạt động '{}' (của '{}') thất bại, giữ skeleton:",
                                    sub.name(), frameActivity.name(), ex);
                            subFailures.incrementAndGet();
                            return sub;
                        }))
                .toList();
        List<Activity5512> detailedSubs = futures.stream().map(CompletableFuture::join).toList();
        if (subFailures.get() == frameSubs.size()) {
            throw new LessonPlanGenerationException(
                    "Không soạn được tiểu hoạt động nào của '" + frameActivity.name() + "'.", null);
        }
        return new Activity5512(frameActivity.order(), frameActivity.name(), frameActivity.duration(),
                "", "", "", null, "", detailedSubs);
    }

    private Activity5512 detailSubActivity(Activity5512 sub, String parentActivityJson, String knowledge,
            String objectivesJson, String materialsJson, String frameOutlineJson, String userPrompt) {
        String targetJson = toJson(sub);
        String prompt = promptBuilder.buildSubActivityDetailPrompt(knowledge, objectivesJson,
                materialsJson, frameOutlineJson, parentActivityJson, targetJson, userPrompt);
        Activity5512 detail = generateAndParse(AiPromptKey.LESSON_PLAN_SUB_ACTIVITY_DETAIL, prompt,
                Activity5512.class, "AI không sinh được nội dung tiểu hoạt động.",
                "Kết quả AI không đúng định dạng tiểu hoạt động.");
        return mergeDetail(sub, detail);
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

    /**
     * Gọi AI rồi parse JSON, TỰ THỬ LẠI tối đa {@link #maxAttempts} lần cho CẢ lỗi gọi AI (transient:
     * mạng/429/5xx) LẪN lỗi parse (AI trả JSON sai schema) — vì đa số đều tự khỏi khi gọi lại (re-roll).
     * Prompt giữ NGUYÊN qua các lần (không nhồi "bạn vừa lỗi" để tránh làm lệch output). Lỗi input
     * ({@link IllegalArgumentException} từ {@code loadKnowledge}) xảy ra TRƯỚC hàm này nên không bị thử lại.
     */
    private <T> T generateAndParse(AiPromptKey key, String prompt, Class<T> type,
                                   String aiErrorMessage, String parseErrorMessage) {
        LessonPlanGenerationException last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                String raw = aiClient.generate(systemPromptService.apply(key, prompt));
                return parseJson(raw, type, parseErrorMessage);
            } catch (LessonPlanGenerationException e) {
                last = e;
            } catch (RuntimeException e) {
                last = new LessonPlanGenerationException(aiErrorMessage, e);
            }
            log.warn("Sinh {} thất bại (lần {}/{}): {}", key, attempt, maxAttempts, rootMessage(last));
            if (attempt < maxAttempts) {
                sleepBackoff(attempt);
            }
        }
        throw last;
    }

    /** Backoff tuyến tính giữa các lần thử; giữ interrupt flag và dừng thử lại nếu bị ngắt. */
    private void sleepBackoff(int attempt) {
        if (retryBackoffMs <= 0) {
            return;
        }
        try {
            Thread.sleep(retryBackoffMs * attempt);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new LessonPlanGenerationException("Bị ngắt khi chờ thử lại sinh giáo án.", e);
        }
    }

    /** Lấy thông điệp gốc của chuỗi nguyên nhân để log gọn. */
    private String rootMessage(Throwable error) {
        Throwable root = error;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root.getMessage() != null ? root.getMessage() : root.toString();
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
