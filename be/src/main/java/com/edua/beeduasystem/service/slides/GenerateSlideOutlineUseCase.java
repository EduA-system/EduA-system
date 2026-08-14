package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.domain.model.slide.ContentPlan;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineResponse;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import com.edua.beeduasystem.presentation.dto.slides.OutlineDto;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import com.edua.beeduasystem.presentation.dto.slides.RetryOutlinePartRequest;
import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.OutlineStreamPort;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
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
    private static final java.util.Set<String> PEDAGOGICAL_ROLES = java.util.Set.of(
            "hook", "explain", "derive", "demonstrate", "practice", "recap", "other");

    private final AiClient aiClient;
    private final SlidePromptBuilder promptBuilder;
    private final OutlineStreamPort outlineStream;
    private final ExecutorService executor;
    private final LessonContentChunker chunker;
    private final OutlineGenerationSessionStore sessions;
    private final AiSystemPromptService systemPromptService;

    @Autowired
    public GenerateSlideOutlineUseCase(
            @Qualifier("jsonAiClient") AiClient aiClient,
            SlidePromptBuilder promptBuilder,
            OutlineStreamPort outlineStream,
            @Qualifier("slideSessionExecutor") ExecutorService executor,
            LessonContentChunker chunker,
            OutlineGenerationSessionStore sessions,
            AiSystemPromptService systemPromptService) {
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.outlineStream = outlineStream;
        this.executor = executor;
        this.chunker = chunker;
        this.sessions = sessions;
        this.systemPromptService = systemPromptService;
    }

    GenerateSlideOutlineUseCase(AiClient aiClient, SlidePromptBuilder promptBuilder,
                                OutlineStreamPort outlineStream, ExecutorService executor) {
        this(aiClient, promptBuilder, outlineStream, executor, new LessonContentChunker(), new OutlineGenerationSessionStore(), null);
    }

    public GenerateOutlineResponse execute(GenerateOutlineRequest req) {
        validateSource(req);
        LessonContext lesson = SlideLessonContextFactory.fromOutlineRequest(req);
        String sessionId = UUID.randomUUID().toString();
        String topic = "/topic/slides/" + sessionId;
        String outlineTopic = "/topic/outline/" + sessionId;
        LessonSourceContext source = LessonSourceContext.from(req, chunker);
        List<JsonNode> contentMaps = createContentMaps(lesson, source.chunks());
        source = source.withActivities(createDeckBlueprint(lesson, req, contentMaps, chunkIds(source.chunks())));
        List<PartDto> placeholders = manifestParts(source);
        Map<String, PartDto> parts = new java.util.LinkedHashMap<>();
        placeholders.forEach(part -> parts.put(part.id(), part));
        sessions.create(sessionId, req, source, parts);
        log.info("slide outline manifest session={} snapshot={} chunks={} parts={}", sessionId,
                source.snapshotId(), source.chunks().size(), placeholders.size());
        return new GenerateOutlineResponse(sessionId, topic, outlineTopic,
                new OutlineDto(lesson.id(), lesson.title(), placeholders));
    }

    /** Starts only after the client subscribed to the session topic. */
    public void start(String sessionId) {
        OutlineGenerationSessionStore.Session session = sessions.find(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Phiên tạo outline đã hết hạn. Hãy tạo lại."));
        if (!session.startOnce()) return;
        LessonContext lesson = SlideLessonContextFactory.fromOutlineRequest(session.request());
        List<PartDto> placeholders = new ArrayList<>(session.parts().values());
        AtomicInteger remaining = new AtomicInteger(placeholders.size());
        AtomicInteger failures = new AtomicInteger();
        for (PartDto placeholder : placeholders) {
            executor.submit(() -> {
                try {
                    if (!generateAndExpandPart(sessionId, lesson, session, placeholder.id())) {
                        failures.incrementAndGet();
                    }
                } catch (Exception e) {
                    failures.incrementAndGet();
                    log.warn("Outline part {} failed: {}", placeholder.id(), e.getMessage());
                    outlineStream.publishPartError(sessionId, placeholder.id(), e.getMessage());
                } finally {
                    if (remaining.decrementAndGet() == 0) {
                        consolidateDeck(sessionId, lesson, session);
                        outlineStream.publishDone(sessionId, failures.get());
                    }
                }
            });
        }
    }

    /**
     * Runs once after every part has finished expanding. Each part/slide above was generated by an
     * independent parallel AI call that never saw the rest of the deck, so cross-slide duplication and
     * contradictions (repeated definitions, duplicate quizzes, the same question answered two ways) are
     * invisible to any single call. This pass is the only point that sees the whole deck at once.
     * Best-effort: any failure here is swallowed and logged — it must never fail deck generation.
     */
    void consolidateDeck(String sessionId, LessonContext lesson, OutlineGenerationSessionStore.Session session) {
        try {
            List<PartDto> parts = new ArrayList<>(session.parts().values());
            if (parts.stream().allMatch(part -> part.slides().isEmpty())) return;
            String deckJson = LENIENT_MAPPER.writeValueAsString(new OutlineDto(lesson.id(), lesson.title(), parts));
            String sourceText = session.source().readSource(chunkIds(session.source().chunks()));
            String prompt = promptBuilder.consolidateDeckPrompt(lesson, session.request().subject(), deckJson, sourceText);
            String raw = generate(AiPromptKey.SLIDE_OUTLINE_CONSOLIDATE, prompt);
            java.util.Map<String, JsonNode> patches = parseConsolidationPatches(raw);
            if (patches.isEmpty()) return;

            java.util.Set<String> touchedParts = new java.util.LinkedHashSet<>();
            for (PartDto part : parts) {
                for (SlideItemDto slide : part.slides()) {
                    JsonNode patch = patches.get(slide.id());
                    if (patch == null) continue;
                    try {
                        SlideItemDto patched = applyConsolidationPatch(slide, patch);
                        updateSessionSlide(session, part.id(), patched);
                        outlineStream.publishSlideReady(sessionId, part.id(), patched);
                        touchedParts.add(part.id());
                    } catch (Exception e) {
                        log.warn("Consolidation patch for slide {} rejected: {}", slide.id(), e.getMessage());
                    }
                }
            }
            for (String partId : touchedParts) {
                PartDto updated = session.parts().get(partId);
                if (updated != null) outlineStream.publishPartReady(sessionId, partId, updated.slides());
            }
        } catch (Exception e) {
            log.warn("Deck consolidation skipped for session {}: {}", sessionId, e.getMessage());
        }
    }

    private static java.util.Map<String, JsonNode> parseConsolidationPatches(String raw) throws Exception {
        JsonNode root = LENIENT_MAPPER.readTree(stripAndRepair(raw));
        JsonNode slides = root.path("slides");
        java.util.Map<String, JsonNode> patches = new java.util.LinkedHashMap<>();
        if (!slides.isArray()) return patches;
        for (JsonNode node : slides) {
            String id = textOrNull(node, "id");
            if (id != null) patches.put(id, node);
        }
        return patches;
    }

    private static SlideItemDto applyConsolidationPatch(SlideItemDto original, JsonNode patch) {
        JsonNode semantic = semanticNode(patch);
        ContentPlan contentPlan = parseContentPlan(
                original.contentPlan().slideType(), original.contentPlan().headerMode(),
                semantic.path("blocks"), semantic.path("relationships"));
        validateContentPlanMatchesSlideType(contentPlan);
        return new SlideItemDto(
                original.id(), original.title(), original.pedagogicalRole(),
                original.durationMinutes(), original.aiNote(), contentPlan);
    }

    public void retrySessionPart(String sessionId, String partId) {
        OutlineGenerationSessionStore.Session session = sessions.find(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Phiên tạo outline đã hết hạn. Hãy tạo lại."));
        if (!session.parts().containsKey(partId)) throw new IllegalArgumentException("Không tìm thấy phần cần thử lại.");
        LessonContext lesson = SlideLessonContextFactory.fromOutlineRequest(session.request());
        executor.submit(() -> {
            try { generateAndExpandPart(sessionId, lesson, session, partId); }
            catch (Exception e) { outlineStream.publishPartError(sessionId, partId, e.getMessage()); }
        });
    }

    public void retrySessionSlide(String sessionId, String partId, String slideId) {
        OutlineGenerationSessionStore.Session session = sessions.find(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Phiên tạo outline đã hết hạn. Hãy tạo lại."));
        if (partId == null || partId.isBlank() || slideId == null || slideId.isBlank()) {
            throw new IllegalArgumentException("Thiếu part hoặc slide cần thử lại.");
        }
        PartDto part = session.parts().get(partId);
        if (part == null) throw new IllegalArgumentException("Không tìm thấy phần cần thử lại.");
        SlideItemDto target = findSlide(part, slideId);
        LessonContext lesson = SlideLessonContextFactory.fromOutlineRequest(session.request());
        executor.submit(() -> {
            try {
                retrySingleSlide(sessionId, lesson, session, partId, target);
            } catch (Exception e) {
                log.warn("Retry outline slide {} in part {} failed: {}", slideId, partId, e.getMessage());
                outlineStream.publishSlideError(sessionId, partId, slideId, e.getMessage());
            }
        });
    }

    private List<PartDto> manifestParts(LessonSourceContext source) {
        List<PartDto> parts = new ArrayList<>();
        for (LessonSourceContext.Activity activity : source.activities()) {
            parts.add(new PartDto(activity.id(), activity.title(), List.of(), activity.chunkIds()));
        }
        return parts;
    }

    private boolean generateAndExpandPart(String sessionId, LessonContext lesson, OutlineGenerationSessionStore.Session session, String partId) {
        PartDto placeholder = session.parts().get(partId);
        PartDto skeleton = placeholder.slides().isEmpty()
                ? generatePartSkeleton(lesson, session.request(), session.source(), placeholder)
                : placeholder;
        session.parts().put(partId, skeleton);
        outlineStream.publishPartSkeletonReady(sessionId, skeleton);
        String partSkeletonJson;
        try { partSkeletonJson = LENIENT_MAPPER.writeValueAsString(new OutlineDto(lesson.id(), lesson.title(), List.of(skeleton))); }
        catch (Exception e) { throw new IllegalStateException("Không thể chuẩn bị khung part.", e); }
        // expandPart has already published the detailed cause to the client when it fails.
        // Return the outcome so the caller can count failures without overwriting that cause.
        return expandPart(sessionId, lesson, session.request(), partSkeletonJson, skeleton, session);
    }

    private PartDto generatePartSkeleton(LessonContext lesson, GenerateOutlineRequest req,
                                          LessonSourceContext source, PartDto placeholder) {
        List<String> ids = placeholder.sourceChunkIds() == null ? List.of() : placeholder.sourceChunkIds();
        String learningGoal = source.activities().stream().filter(chapter -> chapter.id().equals(placeholder.id()))
                .findFirst().map(LessonSourceContext.Activity::goal).orElse("");
        String prompt = promptBuilder.partSkeletonPrompt(lesson, req.plan(), req.userPrompt(), req.subject(),
                placeholder.id(), placeholder.title(), ids, slideBudget(placeholder.id(), source),
                deckOutline(source))
                + "\nCHAPTER TEACHING GOAL: " + learningGoal;
        prompt = withLessonSource(prompt, source.readSource(ids));
        ParsedSkeleton parsed = generateSkeletonWithRetry(lesson, prompt, ids, !ids.isEmpty(), "part-skeleton " + placeholder.id());
        if (parsed.outline().parts().size() != 1) throw new IllegalArgumentException("Part skeleton phải chỉ có một part");
        PartDto result = parsed.outline().parts().getFirst();
        if (!placeholder.id().equals(result.id())) throw new IllegalArgumentException("Part skeleton trả sai id");
        return ensureOpeningSlide(result);
    }

    /** Adds a deterministic transition slide when the AI skeleton starts directly with lesson content. */
    static PartDto ensureOpeningSlide(PartDto part) {
        if (part.slides() == null || part.slides().isEmpty()) {
            throw new IllegalArgumentException("Part phải có ít nhất một slide");
        }
        String firstType = part.slides().getFirst().contentPlan().slideType();
        if ("intro".equals(firstType) || "section".equals(firstType)) return part;

        java.util.Set<String> ids = new java.util.HashSet<>();
        part.slides().forEach(slide -> ids.add(slide.id()));
        String id = part.id() + "-section";
        int suffix = 2;
        while (!ids.add(id)) id = part.id() + "-section-" + suffix++;

        List<SlideItemDto> slides = new ArrayList<>(part.slides().size() + 1);
        slides.add(new SlideItemDto(
                id,
                part.title(),
                "explain",
                null,
                null,
                new ContentPlan("section", "hidden", List.of(), List.of())
        ));
        slides.addAll(part.slides());
        return new PartDto(part.id(), part.title(), slides, part.sourceChunkIds());
    }

    private static int slideBudget(String partId, LessonSourceContext source) {
        return source.activities().stream().filter(chapter -> chapter.id().equals(partId))
                .findFirst().map(LessonSourceContext.Activity::slideBudget).orElse(4);
    }

    /** Ordered summary of every chapter's title/goal so a part-skeleton call can see its siblings' scope. */
    private static String deckOutline(LessonSourceContext source) {
        StringBuilder sb = new StringBuilder();
        for (LessonSourceContext.Activity chapter : source.activities()) {
            sb.append(chapter.id()).append(": ").append(chapter.title());
            if (chapter.goal() != null && !chapter.goal().isBlank()) {
                sb.append(" — ").append(chapter.goal());
            }
            sb.append("\n");
        }
        return sb.toString();
    }

    private List<LessonSourceContext.Activity> createDeckBlueprint(
            LessonContext lesson, GenerateOutlineRequest request, List<JsonNode> maps, List<String> allowedChunkIds) {
        String mapsJson;
        try { mapsJson = LENIENT_MAPPER.writeValueAsString(maps); }
        catch (Exception e) { throw new SlideAiResponseException("Không thể chuẩn bị knowledge map cho deck.", e); }
        String originalPrompt = promptBuilder.deckBlueprintPrompt(lesson, request.subject(), request.userPrompt(), mapsJson, allowedChunkIds);
        String prompt = originalPrompt;
        Exception first = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            String raw = null;
            try {
                log.info("slide deck-blueprint attempt={} promptLength={} chunks={}", attempt, prompt.length(), allowedChunkIds.size());
                raw = generate(AiPromptKey.SLIDE_OUTLINE_DECK_BLUEPRINT, prompt);
                log.info("slide deck-blueprint attempt={} responseLength={}", attempt, raw == null ? 0 : raw.length());
                return parseDeckBlueprint(raw, allowedChunkIds);
            } catch (Exception e) {
                logRawOnFailure("deck-blueprint", attempt, raw);
                if (attempt == 1) { first = e; prompt = promptBuilder.strictJsonRetryPrompt(originalPrompt, "deck-blueprint"); }
                else throw new SlideAiResponseException("AI không thể lập kịch bản deck sau 2 lần thử: " + e.getMessage(), first);
            }
        }
        throw new IllegalStateException("Unreachable");
    }

    private static List<LessonSourceContext.Activity> parseDeckBlueprint(String raw, List<String> allowedChunkIds) throws Exception {
        JsonNode chapters = LENIENT_MAPPER.readTree(stripAndRepair(raw)).path("chapters");
        if (!chapters.isArray() || chapters.size() < 4 || chapters.size() > 6) throw new IllegalArgumentException("chapters phải có 4 đến 6 phần");
        List<LessonSourceContext.Activity> result = new ArrayList<>();
        java.util.Set<String> ids = new java.util.HashSet<>();
        java.util.Set<String> covered = new java.util.HashSet<>();
        int total = 0;
        for (JsonNode chapter : chapters) {
            String id = requiredText(chapter, "id");
            if (!ids.add(id) || !id.matches("p[1-6]")) throw new IllegalArgumentException("chapter id không hợp lệ: " + id);
            String title = requiredText(chapter, "title");
            String normalizedTitle = java.text.Normalizer.normalize(title, java.text.Normalizer.Form.NFD)
                    .replaceAll("\\p{M}", "").toUpperCase(java.util.Locale.ROOT);
            if (normalizedTitle.startsWith("HOAT DONG") || normalizedTitle.startsWith("TEN BAI DAY")
                    || normalizedTitle.startsWith("TIEN TRINH DAY HOC")) {
                throw new IllegalArgumentException("chapter title không được là heading giáo án");
            }
            String goal = requiredText(chapter, "learningGoal");
            int budget = chapter.path("slideBudget").asInt(0);
            if (budget < 2 || budget > 10) throw new IllegalArgumentException("slideBudget phải từ 2 đến 10");
            List<String> chunkIds = stringList(chapter.path("sourceChunkIds"));
            if (!allowedChunkIds.isEmpty() && chunkIds.isEmpty()) throw new IllegalArgumentException("chapter cần sourceChunkIds");
            for (String chunkId : chunkIds) {
                if (!allowedChunkIds.contains(chunkId)) throw new IllegalArgumentException("sourceChunkId không hợp lệ: " + chunkId);
                covered.add(chunkId);
            }
            total += budget;
            result.add(new LessonSourceContext.Activity(id, title, goal, chunkIds, budget));
        }
        if (total < 20 || total > 30) throw new IllegalArgumentException("Tổng số slide phải từ 20 đến 30");
        if (!covered.containsAll(allowedChunkIds)) throw new IllegalArgumentException("Deck blueprint bỏ sót source chunk");
        return result;
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
        String originalPrompt = promptBuilder.semanticIndexPrompt(lesson, chunk);
        String prompt = originalPrompt;
        Exception first = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            String raw = null;
            try {
                log.info("content-map chunk={} heading={} attempt={} promptLength={}",
                        chunk.id(), headingLabel(chunk), attempt, prompt.length());
                raw = generate(AiPromptKey.SLIDE_OUTLINE_CONTENT_MAP, prompt);
                log.info("content-map chunk={} attempt={} responseLength={}", chunk.id(), attempt, raw == null ? 0 : raw.length());
                JsonNode root = LENIENT_MAPPER.readTree(stripAndRepair(raw));
                normalizeContentMapSuggestedRoles(root);
                validateContentMap(root, chunk.id());
                return root;
            } catch (Exception e) {
                logRawOnFailure("content-map " + chunk.id(), attempt, raw);
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
            if (!PEDAGOGICAL_ROLES.contains(role)) {
                throw new IllegalArgumentException("suggestedSlideRoles chứa giá trị không hợp lệ: " + role);
            }
        }
    }

    /** Content-map roles are advisory only; preserve the map when an AI uses a non-standard label. */
    static void normalizeContentMapSuggestedRoles(JsonNode root) {
        if (!(root instanceof com.fasterxml.jackson.databind.node.ObjectNode objectRoot)) return;
        List<String> roles = stringList(objectRoot.path("suggestedSlideRoles"));
        com.fasterxml.jackson.databind.node.ArrayNode normalized = objectRoot.putArray("suggestedSlideRoles");
        for (String role : roles) normalized.add(normalizePedagogicalRole(role));
    }

    private ParsedSkeleton generateSkeletonWithRetry(
            LessonContext lesson, String originalPrompt, List<String> allowedIds, boolean requireCoverage, String phase) {
        String prompt = originalPrompt;
        Exception first = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            String raw = null;
            try {
                log.info("slide {} attempt={} promptLength={} chunks={}", phase, attempt, prompt.length(), allowedIds.size());
                raw = generate(keyForPhase(phase), prompt);
                log.info("slide {} attempt={} responseLength={}", phase, attempt, raw == null ? 0 : raw.length());
                return parseSkeleton(lesson, raw, allowedIds, requireCoverage);
            } catch (Exception e) {
                logRawOnFailure(phase, attempt, raw);
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
            JsonNode root = LENIENT_MAPPER.readTree(stripAndRepair(raw));
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

    ParsedSkeleton parseSkeleton(
            LessonContext lesson, String raw, List<String> allowedChunkIds, boolean requireCoverage) {
        try {
            String json = stripAndRepair(raw);
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
                    String pedagogicalRole = normalizePedagogicalRole(requiredText(s, "pedagogicalRole"));
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
        return expandPart(sessionId, lesson, req, skeletonJson, part, null);
    }

    private boolean expandPart(String sessionId, LessonContext lesson, GenerateOutlineRequest req, String skeletonJson,
                               PartDto part, OutlineGenerationSessionStore.Session session) {
        try {
            List<LessonContentChunker.Chunk> chunks = chunksFor(req);
            List<LessonContentChunker.Chunk> selected = selectChunks(part, chunks);
            String source = selected.stream()
                    .map(chunk -> "CHUNK " + chunk.id() + ":\n" + chunk.contextualText())
                    .reduce("", (left, right) -> left.isEmpty() ? right : left + "\n\n" + right);
            String deckOutline = session == null ? "" : deckOutline(session.source());
            List<SlideItemDto> filled = new ArrayList<>();
            int failures = 0;
            for (SlideItemDto slide : part.slides()) {
                try {
                    SlideItemDto expanded = expandSingleSlideWithRetry(
                            lesson, req, skeletonJson, part, slide, source,
                            selected.isEmpty() ? req.plan() : null, chunkIds(selected), deckOutline);
                    filled.add(expanded);
                    if (session != null) updateSessionSlide(session, part.id(), expanded);
                    outlineStream.publishSlideReady(sessionId, part.id(), expanded);
                } catch (Exception e) {
                    failures++;
                    filled.add(slide);
                    log.warn("Expand slide {} in part {} failed: {}", slide.id(), part.id(), e.getMessage());
                    outlineStream.publishSlideError(sessionId, part.id(), slide.id(), e.getMessage());
                }
            }
            if (session != null) updateSessionPart(session, new PartDto(part.id(), part.title(), filled, part.sourceChunkIds()));
            outlineStream.publishPartReady(sessionId, part.id(), filled);
            return failures == 0;
        } catch (Exception e) {
            log.warn("Expand part {} failed: {}", part.id(), e.getMessage());
            outlineStream.publishPartError(sessionId, part.id(), e.getMessage());
            return false;
        }
    }

    private void retrySingleSlide(String sessionId, LessonContext lesson, OutlineGenerationSessionStore.Session session,
                                  String partId, SlideItemDto target) {
        PartDto part = session.parts().get(partId);
        if (part == null) throw new IllegalArgumentException("Không tìm thấy phần cần thử lại.");
        String skeletonJson;
        try {
            skeletonJson = LENIENT_MAPPER.writeValueAsString(new OutlineDto(lesson.id(), lesson.title(), List.of(part)));
        } catch (Exception e) {
            throw new IllegalStateException("Không thể chuẩn bị khung slide.", e);
        }
        List<LessonContentChunker.Chunk> selected = selectChunks(part, chunksFor(session.request()));
        String source = selected.stream()
                .map(chunk -> "CHUNK " + chunk.id() + ":\n" + chunk.contextualText())
                .reduce("", (left, right) -> left.isEmpty() ? right : left + "\n\n" + right);
        SlideItemDto expanded = expandSingleSlideWithRetry(
                lesson, session.request(), skeletonJson, part, target, source,
                selected.isEmpty() ? session.request().plan() : null, chunkIds(selected), deckOutline(session.source()));
        List<SlideItemDto> replacement = List.of(expanded);
        replaceSessionSlide(session, partId, target.id(), replacement);
        replacement.forEach(slide -> outlineStream.publishSlideReady(sessionId, partId, slide));
        PartDto updated = session.parts().get(partId);
        outlineStream.publishPartReady(sessionId, partId, updated == null ? replacement : updated.slides());
    }

    private static SlideItemDto findSlide(PartDto part, String slideId) {
        return part.slides().stream()
                .filter(slide -> slideId.equals(slide.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy slide cần thử lại."));
    }

    private static void updateSessionSlide(OutlineGenerationSessionStore.Session session, String partId, SlideItemDto slide) {
        session.parts().computeIfPresent(partId, (id, part) -> {
            List<SlideItemDto> slides = new ArrayList<>(part.slides());
            for (int index = 0; index < slides.size(); index++) {
                if (slides.get(index).id().equals(slide.id())) {
                    slides.set(index, slide);
                    return new PartDto(part.id(), part.title(), slides, part.sourceChunkIds());
                }
            }
            return part;
        });
    }

    private static void updateSessionPart(OutlineGenerationSessionStore.Session session, PartDto part) {
        session.parts().put(part.id(), part);
    }

    private static void replaceSessionSlide(
            OutlineGenerationSessionStore.Session session,
            String partId,
            String slideId,
            List<SlideItemDto> replacement) {
        session.parts().computeIfPresent(partId, (id, part) -> {
            List<SlideItemDto> slides = new ArrayList<>();
            boolean replaced = false;
            for (SlideItemDto slide : part.slides()) {
                if (slide.id().equals(slideId)) {
                    slides.addAll(replacement);
                    replaced = true;
                } else {
                    slides.add(slide);
                }
            }
            return replaced ? new PartDto(part.id(), part.title(), slides, part.sourceChunkIds()) : part;
        });
    }

    private List<SlideItemDto> expandSlidesOneByOne(
            LessonContext lesson,
            GenerateOutlineRequest req,
            String skeletonJson,
            PartDto part,
            String source,
            InlineLessonPlanDto plan,
            List<String> selectedChunkIds) {
        List<SlideItemDto> result = new ArrayList<>(part.slides().size());
        for (SlideItemDto slide : part.slides()) {
            result.add(expandSingleSlideWithRetry(lesson, req, skeletonJson, part, slide, source, plan, selectedChunkIds, ""));
        }
        return result;
    }

    private SlideItemDto expandSingleSlideWithRetry(
            LessonContext lesson,
            GenerateOutlineRequest req,
            String skeletonJson,
            PartDto part,
            SlideItemDto slide,
            String source,
            InlineLessonPlanDto plan,
            List<String> selectedChunkIds,
            String deckOutline) {
        String originalPrompt = withLessonSource(promptBuilder.expandSlidePrompt(
                lesson, plan, skeletonJson, part.id(), part.title(), slide, req.subject(), deckOutline), source);
        String prompt = originalPrompt;
        Exception first = null;
        for (int attempt = 1; attempt <= 2; attempt++) {
            String raw = null;
            try {
                log.info("expand slide={} part={} chunks={} attempt={} promptLength={}",
                        slide.id(), part.id(), selectedChunkIds, attempt, prompt.length());
                raw = generate(AiPromptKey.SLIDE_OUTLINE_EXPAND_PART, prompt);
                log.info("expand slide={} part={} attempt={} responseLength={}", slide.id(), part.id(), attempt, raw == null ? 0 : raw.length());
                return parseExpandedSlide(slide, raw);
            } catch (Exception e) {
                logRawOnFailure("expand slide " + slide.id(), attempt, raw);
                if (attempt == 1) {
                    first = e;
                    prompt = promptBuilder.strictJsonRetryPrompt(originalPrompt, "expand slide " + slide.id());
                } else {
                    throw new SlideAiResponseException("AI trả JSON không hợp lệ ở pha expand slide " + slide.id()
                            + " sau 2 lần thử: " + e.getMessage(), first);
                }
            }
        }
        throw new IllegalStateException("Unreachable");
    }

    static SlideItemDto parseExpandedSlide(SlideItemDto skeleton, String raw) {
        try {
            JsonNode root = LENIENT_MAPPER.readTree(stripAndRepair(raw));
            JsonNode node;
            if (root.path("slide").isObject()) {
                node = root.path("slide");
            } else if (root.path("slides").isArray() && root.path("slides").size() == 1) {
                node = root.path("slides").get(0);
            } else {
                node = root;
            }
            String id = requiredText(node, "id");
            if (!skeleton.id().equals(id)) throw new IllegalArgumentException("Expanded slide trả sai id: " + id);
            JsonNode semantic = semanticNode(node);
            ContentPlan contentPlan = parseContentPlan(
                    skeleton.contentPlan().slideType(),
                    skeleton.contentPlan().headerMode(),
                    semantic.path("blocks"),
                    semantic.path("relationships"));
            validateContentPlanMatchesSlideType(contentPlan);
            return new SlideItemDto(
                    skeleton.id(),
                    skeleton.title(),
                    skeleton.pedagogicalRole(),
                    intOrNull(node, "durationMinutes"),
                    textOrNull(node, "aiNote"),
                    contentPlan
            );
        } catch (Exception e) {
            throw new IllegalArgumentException("Expand parse failed for slide " + skeleton.id() + ": " + e.getMessage(), e);
        }
    }

    private String generate(AiPromptKey key, String prompt) {
        return aiClient.generate(systemPromptService == null ? prompt : systemPromptService.apply(key, prompt));
    }

    /** Dumps the raw AI response whenever parsing/validation fails, so truncation or malformed JSON is visible in logs. */
    private static void logRawOnFailure(String phase, int attempt, String raw) {
        if (raw == null) return; // generate() itself threw; nothing to show.
        log.warn("{} attempt={} raw AI response ({} chars) that failed to parse:\n{}", phase, attempt, raw.length(), raw);
    }

    /** Strips markdown fences, then repairs the common case of the model omitting trailing '}'/']'. */
    private static String stripAndRepair(String raw) {
        return closeUnbalancedJson(SlidePromptBuilder.stripFences(raw));
    }

    /** Appends any structural closers ('}', ']') left unmatched outside of string literals. */
    static String closeUnbalancedJson(String json) {
        if (json == null || json.isBlank()) return json;
        StringBuilder openStack = new StringBuilder();
        boolean inString = false;
        boolean escape = false;
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (escape) { escape = false; continue; }
            if (inString) {
                if (c == '\\') escape = true;
                else if (c == '"') inString = false;
                continue;
            }
            if (c == '"') { inString = true; continue; }
            if (c == '{' || c == '[') openStack.append(c);
            else if (c == '}' && openStack.length() > 0 && openStack.charAt(openStack.length() - 1) == '{') openStack.deleteCharAt(openStack.length() - 1);
            else if (c == ']' && openStack.length() > 0 && openStack.charAt(openStack.length() - 1) == '[') openStack.deleteCharAt(openStack.length() - 1);
        }
        if (openStack.isEmpty() && !inString) return json;
        StringBuilder repaired = new StringBuilder(json);
        if (inString) repaired.append('"');
        for (int i = openStack.length() - 1; i >= 0; i--) {
            repaired.append(openStack.charAt(i) == '{' ? '}' : ']');
        }
        return repaired.toString();
    }

    private static AiPromptKey keyForPhase(String phase) {
        if (phase.startsWith("part-skeleton")) return AiPromptKey.SLIDE_OUTLINE_PART_SKELETON;
        if (phase.startsWith("merge-outline")) return AiPromptKey.SLIDE_OUTLINE_MERGED;
        return AiPromptKey.SLIDE_OUTLINE_STRUCTURE;
    }

    /** Pedagogical roles are metadata; preserve known roles and safely bucket every other AI label. */
    static String normalizePedagogicalRole(String role) {
        return PEDAGOGICAL_ROLES.contains(role) ? role : "other";
    }

    /** Semantic fields may be emitted directly or under the public contentPlan envelope. */
    private static JsonNode semanticNode(JsonNode slideNode) {
        JsonNode contentPlan = slideNode.path("contentPlan");
        return contentPlan.isObject() ? contentPlan : slideNode;
    }

    /** Repairs the common case where the model puts a pedagogical role in the layout taxonomy. */
    static String normalizeSkeletonSlideType(String slideType, String pedagogicalRole, String title) {
        String normalizedTitle = java.text.Normalizer.normalize(
                        title == null ? "" : title, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(java.util.Locale.ROOT);
        if ("concept".equals(slideType)
                && (normalizedTitle.contains("phan biet") || normalizedTitle.contains("so sanh")
                || normalizedTitle.contains("khac nhau") || normalizedTitle.contains("doi chieu"))) {
            log.warn("Normalized concept slideType to comparison for title={}", title);
            return "comparison";
        }
        if (!"practice".equals(slideType)) return slideType;

        String repaired = normalizedTitle.contains("trac nghiem") || normalizedTitle.contains("quiz")
                ? "quiz"
                : "exercise";
        log.warn("Normalized invalid skeleton slideType=practice to {} for pedagogicalRole={} title={}",
                repaired, pedagogicalRole, title);
        return repaired;
    }

    private static void validateContentPlanMatchesSlideType(ContentPlan contentPlan) {
        if ("comparison".equals(contentPlan.slideType())
                && contentPlan.blocks().stream().noneMatch(ContentPlan.ComparisonBlock.class::isInstance)) {
            throw new IllegalArgumentException("Comparison slide must contain a comparison block");
        }
        if ("table".equals(contentPlan.slideType())
                && contentPlan.blocks().stream().noneMatch(ContentPlan.TableBlock.class::isInstance)) {
            throw new IllegalArgumentException("Table slide must contain a table block");
        }
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

    /**
     * ContentPlan requires values[criteriaIndex][itemIndex], but the model frequently emits the matrix
     * the other way round (one row per item). Transposing that case is lossless and saves an expand retry;
     * any other shape is passed through untouched so ContentPlan still rejects it.
     */
    static List<List<String>> orientComparisonValues(List<List<String>> values, int itemCount, int criteriaCount) {
        if (values.size() == criteriaCount && values.stream().allMatch(row -> row.size() == itemCount)) return values;
        if (values.size() != itemCount || values.stream().anyMatch(row -> row.size() != criteriaCount)) return values;
        List<List<String>> transposed = new ArrayList<>(criteriaCount);
        for (int criterion = 0; criterion < criteriaCount; criterion++) {
            List<String> row = new ArrayList<>(itemCount);
            for (int item = 0; item < itemCount; item++) row.add(values.get(item).get(criterion));
            transposed.add(row);
        }
        log.warn("Transposed comparison values from {} item rows to {} criteria rows", itemCount, criteriaCount);
        return transposed;
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
            case "molecule" -> new ContentPlan.MoleculeBlock(id, kind, role, semanticType, priority, required, groupId,
                    requiredText(node, "chemicalRequest"));
            case "periodic" -> new ContentPlan.PeriodicBlock(id, kind, role, semanticType, priority, required, groupId,
                    requiredText(node, "periodicRequest"), textOrNull(node, "mode"),
                    node.path("elementSymbols").isMissingNode() ? List.of() : stringList(node.path("elementSymbols")),
                    textOrNull(node, "focus"));
            case "physics" -> new ContentPlan.PhysicsBlock(id, kind, role, semanticType, priority, required, groupId,
                    requiredText(node, "physicsRequest"));
            case "comparison" -> {
                List<ContentPlan.Label> items = labels(node.path("items"));
                List<ContentPlan.Label> criteria = labels(node.path("criteria"));
                if (!node.path("values").isArray()) throw new IllegalArgumentException("Comparison values[] is required");
                List<List<String>> values = new ArrayList<>();
                for (JsonNode row : node.path("values")) values.add(stringList(row));
                yield new ContentPlan.ComparisonBlock(id, kind, role, semanticType, priority, required, groupId,
                        items, criteria, orientComparisonValues(values, items.size(), criteria.size()),
                        requiredText(node, "preferredPresentation"));
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
    record ParsedSkeleton(OutlineDto outline, String skeletonJson, boolean fallback) {
    }
}
