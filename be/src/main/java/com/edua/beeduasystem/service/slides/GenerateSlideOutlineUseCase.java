package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.domain.model.slide.ContentPlan;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineResponse;
import com.edua.beeduasystem.presentation.dto.slides.OutlineDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.edua.beeduasystem.presentation.dto.slides.RetryOutlinePartRequest;
import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.OutlineStreamPort;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;

@Slf4j
@Service
public class GenerateSlideOutlineUseCase {

    private static final ObjectMapper LENIENT_MAPPER = new ObjectMapper()
            .configure(JsonParser.Feature.ALLOW_BACKSLASH_ESCAPING_ANY_CHARACTER, true);

    /** Số phần expand chạy song song tối đa (khớp SLIDE_CONCURRENCY=4 ở FE). */
    private static final int EXPAND_CONCURRENCY = 4;
    private static final int CONTENT_MAP_CONCURRENCY = 3;

    private final AiClient aiClient;
    private final SlidePromptBuilder promptBuilder;
    private final OutlineStreamPort outlineStream;
    private final ExecutorService executor;
    private final LessonContentChunker chunker;

    @Autowired
    public GenerateSlideOutlineUseCase(
            AiClient aiClient,
            SlidePromptBuilder promptBuilder,
            OutlineStreamPort outlineStream,
            @Qualifier("slideSessionExecutor") ExecutorService executor,
            LessonContentChunker chunker) {
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.outlineStream = outlineStream;
        this.executor = executor;
        this.chunker = chunker;
    }

    GenerateSlideOutlineUseCase(AiClient aiClient, SlidePromptBuilder promptBuilder,
                                OutlineStreamPort outlineStream, ExecutorService executor) {
        this(aiClient, promptBuilder, outlineStream, executor, new LessonContentChunker());
    }

    public GenerateOutlineResponse execute(GenerateOutlineRequest req) {
        validateSource(req);
        LessonContext lesson = SlideLessonContextFactory.fromOutlineRequest(req);
        String sessionId = UUID.randomUUID().toString();
        String topic = "/topic/slides/" + sessionId;
        String outlineTopic = "/topic/outline/" + sessionId;

        // PHA 1 — khung (sync, 1 call nhẹ).
        List<LessonContentChunker.Chunk> chunks = chunksFor(req);
        log.info("slide outline source length={} chunks={}",
                req.lessonContent() == null ? 0 : req.lessonContent().length(), chunks.size());
        ParsedSkeleton skeleton = createSkeleton(lesson, req, chunks);
        GenerateOutlineResponse response =
                new GenerateOutlineResponse(sessionId, topic, outlineTopic, skeleton.outline());

        // PHA 2 — expand từng phần (nền, stream qua STOMP). Trả response pha 1 trước.
        startExpansion(sessionId, lesson, req, skeleton);
        return response;
    }

    private ParsedSkeleton createSkeleton(
            LessonContext lesson, GenerateOutlineRequest req, List<LessonContentChunker.Chunk> chunks) {
        if (chunks.size() <= 1) {
            String prompt = promptBuilder.outlineStructurePrompt(
                    lesson, req.plan(), req.userPrompt(), req.styleHint(), req.subject());
            if (!chunks.isEmpty()) {
                prompt += promptBuilder.sourceRoutingInstruction(List.of(chunks.getFirst().id()));
                prompt = withLessonSource(prompt, chunks.getFirst().contextualText());
            }
            return generateSkeletonWithRetry(lesson, prompt, chunkIds(chunks), !chunks.isEmpty(), "outline");
        }

        List<JsonNode> maps = createContentMaps(lesson, chunks);
        String mapsJson;
        try {
            mapsJson = LENIENT_MAPPER.writeValueAsString(maps);
        } catch (Exception e) {
            throw new SlideAiResponseException("Không thể chuẩn bị content-map để hợp nhất outline.", e);
        }
        List<String> ids = chunkIds(chunks);
        String mergePrompt = promptBuilder.mergedOutlinePrompt(
                lesson, req.plan(), req.userPrompt(), req.styleHint(), req.subject(), mapsJson, ids);
        return generateSkeletonWithRetry(lesson, mergePrompt, ids, true, "merge-outline");
    }

    private List<JsonNode> createContentMaps(LessonContext lesson, List<LessonContentChunker.Chunk> chunks) {
        Semaphore gate = new Semaphore(CONTENT_MAP_CONCURRENCY);
        List<CompletableFuture<JsonNode>> futures = chunks.stream().map(chunk ->
                CompletableFuture.supplyAsync(() -> {
                    boolean acquired = false;
                    try {
                        gate.acquire();
                        acquired = true;
                        return generateContentMapWithRetry(lesson, chunk);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        throw new CompletionException(e);
                    } finally {
                        if (acquired) gate.release();
                    }
                }, executor)).toList();
        try {
            List<JsonNode> result = new ArrayList<>(chunks.size());
            for (CompletableFuture<JsonNode> future : futures) result.add(future.join());
            return result;
        } catch (CompletionException e) {
            Throwable cause = e.getCause();
            if (cause instanceof RuntimeException runtime) throw runtime;
            throw new SlideAiResponseException("Không thể tạo content-map.", cause);
        }
    }

    private JsonNode generateContentMapWithRetry(LessonContext lesson, LessonContentChunker.Chunk chunk) {
        String originalPrompt = promptBuilder.contentMapPrompt(lesson, chunk);
        String prompt = originalPrompt;
        Exception first = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                log.info("content-map chunk={} heading={} attempt={} promptLength={}",
                        chunk.id(), headingLabel(chunk), attempt, prompt.length());
                JsonNode root = LENIENT_MAPPER.readTree(SlidePromptBuilder.stripFences(aiClient.generate(prompt)));
                validateContentMap(root, chunk.id());
                return root;
            } catch (Exception e) {
                if (attempt == 1) {
                    first = e;
                    prompt = promptBuilder.strictJsonRetryPrompt(originalPrompt, "content-map " + chunk.id());
                } else {
                    throw new SlideAiResponseException("AI trả content-map không hợp lệ cho " + chunk.id()
                            + " (heading: " + headingLabel(chunk) + ") sau 2 lần thử: " + e.getMessage(), first);
                }
            }
        }
        throw new IllegalStateException("Unreachable");
    }

    private static void validateContentMap(JsonNode root, String chunkId) {
        if (root == null || !root.isObject()) throw new IllegalArgumentException("Cần một JSON object");
        if (!chunkId.equals(requiredText(root, "chunkId"))) throw new IllegalArgumentException("Sai chunkId");
        JsonNode units = root.path("contentUnits");
        if (!units.isArray()) throw new IllegalArgumentException("contentUnits phải là array");
        for (JsonNode unit : units) {
            requiredText(unit, "title");
            requiredText(unit, "summary");
        }
        for (String field : List.of("requiredFacts", "formulas", "questionsAndAnswers", "suggestedSlideRoles")) {
            stringList(root.path(field));
        }
        for (String role : stringList(root.path("suggestedSlideRoles"))) {
            if (!List.of("hook", "explain", "derive", "demonstrate", "practice", "recap").contains(role)) {
                throw new IllegalArgumentException("suggestedSlideRoles chứa giá trị không hợp lệ: " + role);
            }
        }
    }

    private ParsedSkeleton generateSkeletonWithRetry(
            LessonContext lesson, String originalPrompt, List<String> allowedIds, boolean requireCoverage, String phase) {
        String prompt = originalPrompt;
        Exception first = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                log.info("slide {} attempt={} promptLength={} chunks={}", phase, attempt, prompt.length(), allowedIds.size());
                return parseSkeleton(lesson, aiClient.generate(prompt), allowedIds, requireCoverage);
            } catch (Exception e) {
                if (attempt == 1) {
                    first = e;
                    prompt = promptBuilder.strictJsonRetryPrompt(originalPrompt, phase);
                } else {
                    throw new SlideAiResponseException("AI trả JSON không hợp lệ ở pha " + phase
                            + " sau 2 lần thử: " + e.getMessage(), first);
                }
            }
        }
        throw new IllegalStateException("Unreachable");
    }

    /** Re-runs only one failed part and publishes the result to the existing session topic. */
    public void retryPart(RetryOutlinePartRequest request) {
        if (request.sessionId() == null || request.sessionId().isBlank()
                || request.generationRequest() == null || request.outline() == null
                || request.outline().parts() == null
                || request.partId() == null || request.partId().isBlank()) {
            throw new IllegalArgumentException("Thiếu dữ liệu để thử lại phần đề cương.");
        }
        validateSource(request.generationRequest());
        PartDto part = request.outline().parts().stream()
                .filter(candidate -> request.partId().equals(candidate.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy phần cần thử lại."));
        LessonContext lesson = SlideLessonContextFactory.fromOutlineRequest(request.generationRequest());
        selectChunks(part, chunksFor(request.generationRequest()));
        String skeletonJson;
        try {
            skeletonJson = new ObjectMapper().writeValueAsString(request.outline());
        } catch (Exception e) {
            throw new IllegalArgumentException("Đề cương không thể đọc để thử lại.", e);
        }

        if (!expandPart(request.sessionId(), lesson, request.generationRequest(), skeletonJson, part)) {
            throw new SlideAiResponseException("AI không thể soạn lại part " + part.id() + " sau 2 lần thử.", null);
        }
    }

    private void startExpansion(
            String sessionId, LessonContext lesson, GenerateOutlineRequest req, ParsedSkeleton skeleton) {
        List<PartDto> parts = skeleton.outline().parts();
        if (skeleton.fallback() || parts.isEmpty()) {
            // Pha 1 lỗi (đã fallback) hoặc không có phần → không expand, báo xong ngay để FE thôi loading.
            outlineStream.publishDone(sessionId, 0);
            return;
        }

        AtomicInteger remaining = new AtomicInteger(parts.size());
        AtomicInteger failures = new AtomicInteger(0);
        Semaphore gate = new Semaphore(EXPAND_CONCURRENCY);

        for (PartDto part : parts) {
            executor.submit(() -> {
                try {
                    gate.acquire();
                    try {
                        if (!expandPart(sessionId, lesson, req, skeleton.skeletonJson(), part)) {
                            failures.incrementAndGet();
                        }
                    } finally {
                        gate.release();
                    }
                } catch (Exception e) {
                    failures.incrementAndGet();
                    log.warn("Expand part {} could not acquire execution slot: {}", part.id(), e.getMessage());
                    outlineStream.publishPartError(sessionId, part.id(), e.getMessage());
                } finally {
                    if (remaining.decrementAndGet() == 0) {
                        outlineStream.publishDone(sessionId, failures.get());
                    }
                }
            });
        }
    }

    /** Merge strictly validated semantic content into the phase-1 skeleton. */
    private List<SlideItemDto> mergeExpanded(PartDto part, String raw) {
        java.util.Map<String, JsonNode> byId = new java.util.HashMap<>();
        try {
            JsonNode root = LENIENT_MAPPER.readTree(SlidePromptBuilder.stripFences(raw));
            if (!root.path("slides").isArray()) throw new IllegalArgumentException("Expanded response needs slides[]");
            for (JsonNode s : root.path("slides")) {
                String id = requiredText(s, "id");
                if (byId.putIfAbsent(id, s) != null) throw new IllegalArgumentException("Duplicate expanded slide id: " + id);
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("Expand parse failed for part " + part.id() + ": " + e.getMessage(), e);
        }

        List<SlideItemDto> result = new ArrayList<>();
        for (SlideItemDto s : part.slides()) {
            JsonNode node = byId.get(s.id());
            if (node == null) throw new IllegalArgumentException("Expanded response is missing slide " + s.id());
            JsonNode semantic = semanticNode(node);
            ContentPlan contentPlan = parseContentPlan(
                    s.contentPlan().slideType(), s.contentPlan().headerMode(), semantic.path("blocks"), semantic.path("relationships"));
            result.add(new SlideItemDto(
                    s.id(), s.title(), s.pedagogicalRole(),
                    intOrNull(node, "durationMinutes"),
                    textOrNull(node, "aiNote"),
                    contentPlan
            ));
        }
        return result;
    }

    private ParsedSkeleton parseSkeleton(
            LessonContext lesson, String raw, List<String> allowedChunkIds, boolean requireCoverage) {
        try {
            String json = SlidePromptBuilder.stripFences(raw);
            JsonNode root = LENIENT_MAPPER.readTree(json);
            String lessonTitle = root.path("lessonTitle").asText(lesson.title());
            List<PartDto> parts = new ArrayList<>();
            java.util.Set<String> slideIds = new java.util.HashSet<>();
            java.util.Set<String> referencedChunkIds = new java.util.LinkedHashSet<>();
            for (JsonNode p : root.path("parts")) {
                List<SlideItemDto> slides = new ArrayList<>();
                for (JsonNode s : p.path("slides")) {
                    String id = requiredText(s, "id");
                    if (!slideIds.add(id)) throw new IllegalArgumentException("Duplicate slide id: " + id);
                    String title = requiredText(s, "title");
                    String pedagogicalRole = requiredText(s, "pedagogicalRole");
                    JsonNode semantic = semanticNode(s);
                    String slideType = normalizeSkeletonSlideType(
                            requiredText(semantic, "slideType"), pedagogicalRole, title);
                    String headerMode = requiredText(semantic, "headerMode");
                    slides.add(new SlideItemDto(
                            id,
                            title,
                            pedagogicalRole,
                            null,
                            null,
                            new ContentPlan(slideType, headerMode, List.of(), List.of())
                    ));
                }
                List<String> sourceChunkIds = p.path("sourceChunkIds").isArray()
                        ? stringList(p.path("sourceChunkIds")) : null;
                if (sourceChunkIds != null) {
                    for (String id : sourceChunkIds) {
                        if (!allowedChunkIds.contains(id)) throw new IllegalArgumentException("Unknown sourceChunkId: " + id);
                        referencedChunkIds.add(id);
                    }
                } else if (requireCoverage) {
                    throw new IllegalArgumentException("sourceChunkIds is required for part " + requiredText(p, "id"));
                }
                parts.add(new PartDto(requiredText(p, "id"), requiredText(p, "title"), slides, sourceChunkIds));
            }
            if (requireCoverage && !referencedChunkIds.containsAll(allowedChunkIds)) {
                List<String> missing = allowedChunkIds.stream().filter(id -> !referencedChunkIds.contains(id)).toList();
                throw new IllegalArgumentException("Outline omitted source chunks: " + missing);
            }
            boolean hasSlides = parts.stream().anyMatch(p -> !p.slides().isEmpty());
            if (!parts.isEmpty() && hasSlides) {
                return new ParsedSkeleton(new OutlineDto(lesson.id(), lessonTitle, parts), json, false);
            }
            throw new IllegalArgumentException("parts[] must contain at least one slide");
        } catch (Exception e) {
            log.warn("Outline structure parse failed: {}", e.getMessage());
            throw new IllegalArgumentException("AI trả về khung semantic không hợp lệ: " + e.getMessage(), e);
        }
    }

    private boolean expandPart(String sessionId, LessonContext lesson, GenerateOutlineRequest req, String skeletonJson, PartDto part) {
        try {
            List<LessonContentChunker.Chunk> chunks = chunksFor(req);
            List<LessonContentChunker.Chunk> selected = selectChunks(part, chunks);
            String source = selected.stream()
                    .map(chunk -> "CHUNK " + chunk.id() + ":\n" + chunk.contextualText())
                    .reduce("", (left, right) -> left.isEmpty() ? right : left + "\n\n" + right);
            String prompt = withLessonSource(promptBuilder.expandPartPrompt(
                    lesson, selected.isEmpty() ? req.plan() : null,
                    skeletonJson, part.id(), part.title(), req.subject()), source);
            List<SlideItemDto> filled = null;
            Exception first = null;
            String originalPrompt = prompt;
            for (int attempt = 1; attempt <= 2; attempt++) {
                try {
                    log.info("expand part={} chunks={} attempt={} promptLength={}", part.id(), chunkIds(selected), attempt, prompt.length());
                    filled = mergeExpanded(part, aiClient.generate(prompt));
                    break;
                } catch (Exception e) {
                    if (attempt == 1) {
                        first = e;
                        prompt = promptBuilder.strictJsonRetryPrompt(originalPrompt, "expand part " + part.id());
                    } else {
                        throw new SlideAiResponseException("AI trả JSON không hợp lệ ở pha expand part " + part.id()
                                + " sau 2 lần thử: " + e.getMessage(), first);
                    }
                }
            }
            outlineStream.publishPartReady(sessionId, part.id(), filled);
            return true;
        } catch (Exception e) {
            log.warn("Expand part {} failed: {}", part.id(), e.getMessage());
            outlineStream.publishPartError(sessionId, part.id(), e.getMessage());
            return false;
        }
    }

    /** Semantic fields may be emitted directly or under the public contentPlan envelope. */
    private static JsonNode semanticNode(JsonNode slideNode) {
        JsonNode contentPlan = slideNode.path("contentPlan");
        return contentPlan.isObject() ? contentPlan : slideNode;
    }

    /** Repairs the common case where the model puts a pedagogical role in the layout taxonomy. */
    static String normalizeSkeletonSlideType(String slideType, String pedagogicalRole, String title) {
        if (!"practice".equals(slideType)) return slideType;

        String normalizedTitle = java.text.Normalizer.normalize(
                        title == null ? "" : title, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(java.util.Locale.ROOT);
        String repaired = normalizedTitle.contains("trac nghiem") || normalizedTitle.contains("quiz")
                ? "quiz"
                : "exercise";
        log.warn("Normalized invalid skeleton slideType=practice to {} for pedagogicalRole={} title={}",
                repaired, pedagogicalRole, title);
        return repaired;
    }

    private static void validateSource(GenerateOutlineRequest req) {
        if ((req.lessonContent() == null || req.lessonContent().isBlank()) && req.plan() == null) {
            throw new IllegalArgumentException("Cần có nội dung giáo án hoặc kế hoạch bài dạy để tạo slide.");
        }
    }

    private List<LessonContentChunker.Chunk> chunksFor(GenerateOutlineRequest req) {
        if (req.lessonContent() == null || req.lessonContent().isBlank()) return List.of();
        return chunker.chunk(req.lessonContent());
    }

    private static List<String> chunkIds(List<LessonContentChunker.Chunk> chunks) {
        return chunks.stream().map(LessonContentChunker.Chunk::id).toList();
    }

    private static String headingLabel(LessonContentChunker.Chunk chunk) {
        return chunk.headingPath().isEmpty() ? "(đầu tài liệu)" : String.join(" > ", chunk.headingPath());
    }

    static List<LessonContentChunker.Chunk> selectChunks(
            PartDto part, List<LessonContentChunker.Chunk> chunks) {
        if (chunks.isEmpty()) return List.of();
        if (chunks.size() == 1) return chunks;
        if (part.sourceChunkIds() != null && !part.sourceChunkIds().isEmpty()) {
            java.util.Map<String, LessonContentChunker.Chunk> byId = new java.util.HashMap<>();
            chunks.forEach(chunk -> byId.put(chunk.id(), chunk));
            List<LessonContentChunker.Chunk> selected = new ArrayList<>();
            for (String id : part.sourceChunkIds()) {
                LessonContentChunker.Chunk chunk = byId.get(id);
                if (chunk == null) throw new IllegalArgumentException("Part " + part.id() + " tham chiếu chunk không tồn tại: " + id);
                selected.add(chunk);
            }
            return selected;
        }
        java.util.Set<String> titleTokens = tokens(part.title());
        return chunks.stream()
                .sorted(java.util.Comparator
                        .comparingInt((LessonContentChunker.Chunk chunk) -> overlap(titleTokens, tokens(headingLabel(chunk))))
                        .reversed()
                        .thenComparing(LessonContentChunker.Chunk::id))
                .limit(2)
                .toList();
    }

    private static java.util.Set<String> tokens(String value) {
        java.util.Set<String> result = new java.util.HashSet<>();
        if (value == null) return result;
        for (String token : java.text.Normalizer.normalize(value, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toLowerCase(java.util.Locale.ROOT).split("[^a-z0-9]+")) {
            if (token.length() > 1) result.add(token);
        }
        return result;
    }

    private static int overlap(java.util.Set<String> left, java.util.Set<String> right) {
        int score = 0;
        for (String token : left) if (right.contains(token)) score++;
        return score;
    }

    private static String withLessonSource(String prompt, String lessonContent) {
        if (lessonContent == null || lessonContent.isBlank()) return prompt;
        return prompt + "\n\nVĂN BẢN GIÁO ÁN GỐC (nguồn chuẩn, không dùng fixture; giữ nguyên dữ kiện, hoạt động, câu hỏi, đáp án và công thức):\n"
                + lessonContent.trim();
    }

    private static String textOrNull(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull()) return null;
        String text = value.asText();
        return text == null || text.isBlank() ? null : text;
    }

    private static List<String> stringList(JsonNode node) {
        if (node == null || !node.isArray()) throw new IllegalArgumentException("Expected string array");
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (!item.isTextual() || item.asText().isBlank()) throw new IllegalArgumentException("String array contains invalid value");
            values.add(item.asText());
        }
        return values;
    }

    private static List<ContentPlan.Label> labels(JsonNode node) {
        if (!node.isArray()) throw new IllegalArgumentException("Expected label array");
        List<ContentPlan.Label> items = new ArrayList<>();
        for (JsonNode item : node) {
            items.add(new ContentPlan.Label(requiredText(item, "id"), requiredText(item, "label")));
        }
        return items;
    }

    static ContentPlan parseContentPlan(String slideType, String headerMode, JsonNode blocksNode, JsonNode relationshipsNode) {
        if (!blocksNode.isArray() || blocksNode.isEmpty()) throw new IllegalArgumentException("contentPlan blocks[] is required");
        if (!relationshipsNode.isArray()) throw new IllegalArgumentException("contentPlan relationships[] is required");
        List<ContentPlan.Block> blocks = new ArrayList<>();
        for (JsonNode node : blocksNode) blocks.add(parseBlock(node));
        List<ContentPlan.Relationship> relationships = new ArrayList<>();
        for (JsonNode node : relationshipsNode) {
            String type = requiredText(node, "type");
            relationships.add(new ContentPlan.Relationship(type,
                    textOrNull(node, "visualBlockId"), textOrNull(node, "supportingBlockId"),
                    textOrNull(node, "targetBlockId"), textOrNull(node, "beforeBlockId"), textOrNull(node, "afterBlockId")));
        }
        return new ContentPlan(slideType, headerMode, blocks, relationships);
    }

    private static ContentPlan.Block parseBlock(JsonNode node) {
        String id = requiredText(node, "id");
        String kind = requiredText(node, "kind");
        String role = requiredText(node, "role");
        String semanticType = requiredText(node, "semanticType");
        String priority = requiredText(node, "priority");
        if (!(priority.equals("primary") || priority.equals("secondary") || priority.equals("supporting"))) throw new IllegalArgumentException("Invalid priority");
        if (!node.path("required").isBoolean()) throw new IllegalArgumentException("Block required must be boolean");
        boolean required = node.path("required").asBoolean();
        String groupId = textOrNull(node, "groupId");
        return switch (kind) {
            case "text" -> new ContentPlan.TextBlock(id, kind, role, semanticType, priority, required, groupId, requiredText(node, "text"));
            case "visual" -> new ContentPlan.VisualBlock(id, kind, role, semanticType, priority, required, groupId,
                    requiredText(node, "description"), requiredText(node, "requirement"), textOrNull(node, "preferredAspectRatio"), textOrNull(node, "illustratesBlockId"));
            case "comparison" -> {
                List<ContentPlan.Label> items = labels(node.path("items"));
                List<ContentPlan.Label> criteria = labels(node.path("criteria"));
                if (!node.path("values").isArray()) throw new IllegalArgumentException("Comparison values[] is required");
                List<List<String>> values = new ArrayList<>();
                for (JsonNode row : node.path("values")) values.add(stringList(row));
                yield new ContentPlan.ComparisonBlock(id, kind, role, semanticType, priority, required, groupId,
                        items, criteria, values, requiredText(node, "preferredPresentation"));
            }
            case "table" -> {
                List<ContentPlan.TableRow> rows = new ArrayList<>();
                if (!node.path("rows").isArray()) throw new IllegalArgumentException("Table rows[] is required");
                for (JsonNode row : node.path("rows")) rows.add(new ContentPlan.TableRow(requiredText(row, "id"), stringList(row.path("cells"))));
                yield new ContentPlan.TableBlock(id, kind, role, semanticType, priority, required, groupId, labels(node.path("columns")), rows);
            }
            case "sequence" -> {
                if (!node.path("steps").isArray() || node.path("steps").isEmpty()) throw new IllegalArgumentException("Sequence steps[] is required");
                List<ContentPlan.Step> steps = new ArrayList<>();
                for (JsonNode step : node.path("steps")) steps.add(new ContentPlan.Step(requiredText(step, "id"), textOrNull(step, "label"), requiredText(step, "text")));
                yield new ContentPlan.SequenceBlock(id, kind, role, semanticType, priority, required, groupId, steps);
            }
            case "formula" -> new ContentPlan.FormulaBlock(id, kind, role, semanticType, priority, required, groupId,
                    requiredText(node, "expression"), textOrNull(node, "explanation"));
            case "quiz" -> new ContentPlan.QuizBlock(id, kind, role, semanticType, priority, required, groupId,
                    requiredText(node, "question"), node.path("choices").isMissingNode() ? List.of() : stringList(node.path("choices")),
                    textOrNull(node, "answer"), textOrNull(node, "explanation"));
            default -> throw new IllegalArgumentException("Unknown block kind: " + kind);
        };
    }

    private static String requiredText(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (!value.isTextual() || value.asText().isBlank()) throw new IllegalArgumentException(fieldName + " is required");
        return value.asText();
    }

    private static Integer intOrNull(JsonNode node, String fieldName) {
        JsonNode value = node.path(fieldName);
        if (value.isMissingNode() || value.isNull() || !value.canConvertToInt()) return null;
        return value.asInt();
    }

    /** Khung pha 1 đã parse + chuỗi JSON gốc (chứa brief) để làm context cho pha 2. */
    private record ParsedSkeleton(OutlineDto outline, String skeletonJson, boolean fallback) {
    }
}
