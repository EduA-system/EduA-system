package com.edua.beeduasystem.service.exam;

import com.edua.beeduasystem.domain.exception.ExamAllocationException;
import com.edua.beeduasystem.domain.exception.ExamGenerationException;
import com.edua.beeduasystem.domain.model.exam.ExamLessonSource;
import com.edua.beeduasystem.domain.model.exam.ExamMatrixWorkspace;
import com.edua.beeduasystem.domain.model.exam.ExamScope;
import com.edua.beeduasystem.presentation.dto.exam.GenerateExamMatrixRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ExamGenerationService {
    private static final List<String> TYPES = List.of("multipleChoice", "trueFalse", "shortAnswer", "essay");
    private static final List<String> LEVELS = List.of("recognition", "comprehension", "application");
    private static final Map<String, Integer> REFERENCE_SCORES = Map.of(
            "multipleChoice", 300, "trueFalse", 200, "shortAnswer", 200, "essay", 300);

    private final ExamScopeService scopeService;
    private final AiClient aiClient;
    private final ObjectMapper objectMapper;

    public ExamGenerationService(ExamScopeService scopeService, AiClient aiClient, ObjectMapper objectMapper) {
        this.scopeService = scopeService;
        this.aiClient = aiClient;
        this.objectMapper = objectMapper;
    }

    public ExamMatrixWorkspace generate(GenerateExamMatrixRequest request) {
        long started = System.nanoTime();
        log.info("EXAM_GENERATION_START subject={} grade={} examType={} difficulty={}",
                request == null ? null : request.subject(), request == null ? null : request.grade(),
                request == null ? null : request.examType(), request == null || request.configuration() == null
                        ? null : request.configuration().difficulty());
        validateBaseRequest(request);
        ExamScope scope = scopeService.preview(request.subject(), request.grade(), request.examType());
        if (!scope.token().equals(request.scopeToken())) {
            throw new IllegalArgumentException("Phạm vi SGK đã thay đổi. Vui lòng xem và xác nhận lại.");
        }
        List<ExamLessonSource> sources = scopeService.loadConfirmedSources(scope);
        log.info("EXAM_KNOWLEDGE_LOADED sources={} missingKnowledge={}", sources.size(),
                sources.stream().filter(source -> source.knowledgeJson() == null || source.knowledgeJson().isBlank()).count());
        if (sources.stream().anyMatch(source -> source.knowledgeJson() == null || source.knowledgeJson().isBlank())) {
            throw new IllegalArgumentException("Phạm vi có bài chưa có knowledge_json; chưa thể tạo Ma trận.");
        }

        ConfigData config = normalizeConfiguration(request.configuration());
        log.info("EXAM_CONFIG_VALID totalScoreCents={} ratios={} typeCounts={}",
                config.types().values().stream().mapToInt(TypeData::scoreCents).sum(), config.ratios(),
                config.types().entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, entry -> entry.getValue().questionCount())));
        if (request.grade() == 12 && !config.allowEssayForGrade12() && config.types().get("essay").scoreCents() > 0) {
            throw new IllegalArgumentException("Tự luận lớp 12 chỉ được dùng khi đã bật tùy chọn Cho phép tự luận.");
        }
        List<MutableItem> items = buildItems(config);
        log.info("EXAM_ITEMS_BUILT itemCount={} scoreCents={}", items.size(), items.stream().mapToInt(MutableItem::scoreCents).sum());
        if (items.size() > 100) {
            throw new IllegalArgumentException("Tổng số câu/ý không được vượt quá 100 trong một đề.");
        }
        assignLevels(items, config.ratios());
        log.info("EXAM_LEVEL_QUOTA_READY scores={}", LEVELS.stream().collect(Collectors.toMap(level -> level,
                level -> items.stream().filter(item -> level.equals(item.level())).mapToInt(MutableItem::scoreCents).sum())));
        List<ChapterData> chapterData = buildChapterData(sources);
        assignChapters(items, chapterData);
        log.info("EXAM_CHAPTER_QUOTA_READY chapters={} weights={}", chapterData.size(), chapterData.stream()
                .collect(Collectors.toMap(ChapterData::id, ChapterData::weight)));

        List<UnitProposal> proposals = generateProposalsReliably(sources);
        log.info("EXAM_CONTENT_READY unitProposals={}", proposals.size());

        List<ExamMatrixWorkspace.Chapter> chapters = assembleChapters(chapterData, proposals, items);
        List<ExamMatrixWorkspace.AssessmentItem> responseItems = items.stream()
                .sorted(Comparator.comparing(MutableItem::id))
                .map(item -> new ExamMatrixWorkspace.AssessmentItem(item.id(), item.type(), item.questionCode(),
                        item.itemCode(), item.scoreCents(), item.level())).toList();
        ExamMatrixWorkspace.Configuration responseConfig = responseConfiguration(config);
        ExamMatrixWorkspace workspace = new ExamMatrixWorkspace(1,
                new ExamMatrixWorkspace.Metadata(request.subject(), request.subjectLabel(), request.grade(),
                        request.examType(), request.examTypeLabel()),
                responseConfig, scope, responseItems, chapters, summarize(config, items));
        log.info("EXAM_GENERATION_SUCCESS chapters={} units={} assessmentItems={} durationMs={}", chapters.size(),
                chapters.stream().mapToInt(chapter -> chapter.knowledgeUnits().size()).sum(), responseItems.size(), elapsedMs(started));
        return workspace;
    }

    private void validateBaseRequest(GenerateExamMatrixRequest request) {
        if (request == null || request.configuration() == null) throw new IllegalArgumentException("Thiếu cấu hình đề.");
        if (!Boolean.TRUE.equals(request.scopeConfirmed())) throw new IllegalArgumentException("Giáo viên chưa xác nhận phạm vi SGK ước lượng.");
        if (!Boolean.TRUE.equals(request.configuration().confirmedByTeacher())) throw new IllegalArgumentException("Giáo viên chưa xác nhận cấu hình đề.");
        if (request.scopeToken() == null || request.scopeToken().isBlank()) throw new IllegalArgumentException("Thiếu token phạm vi SGK.");
    }

    private ConfigData normalizeConfiguration(GenerateExamMatrixRequest.Configuration source) {
        if (!List.of("EASY", "MEDIUM", "HARD").contains(source.difficulty())) {
            throw new IllegalArgumentException("Mức độ chung của đề không hợp lệ.");
        }
        if (source.questionTypes() == null || !source.questionTypes().keySet().containsAll(TYPES)) {
            throw new IllegalArgumentException("Thiếu cấu hình dạng câu hỏi.");
        }
        Map<String, TypeData> types = new LinkedHashMap<>();
        int total = 0;
        for (String key : TYPES) {
            GenerateExamMatrixRequest.QuestionType value = source.questionTypes().get(key);
            int count = nonNegative(value.questionCount(), "Số câu " + key);
            int score = nonNegative(value.scoreCents(), "Điểm " + key);
            int itemsPerQuestion = key.equals("trueFalse") ? defaultPositive(value.itemsPerQuestion(), 4) : 1;
            int points = value.pointsPerQuestionCents() == null ? 0 : nonNegative(value.pointsPerQuestionCents(), "Điểm/câu " + key);
            List<List<Integer>> essayParts = value.essayPartPointsCents() == null ? List.of() : value.essayPartPointsCents();
            if (key.equals("essay")) {
                if (essayParts.size() != count) throw new IllegalArgumentException("Số cấu hình câu Tự luận không khớp số câu.");
                int essayTotal = essayParts.stream().flatMap(List::stream).mapToInt(Integer::intValue).sum();
                if (essayTotal != score || essayParts.stream().anyMatch(parts -> parts.isEmpty() || parts.stream().anyMatch(p -> p == null || p <= 0))) {
                    throw new IllegalArgumentException("Điểm từng ý Tự luận phải dương và cộng đúng tổng điểm Tự luận.");
                }
            } else if (count * points != score) {
                throw new IllegalArgumentException("Số câu × điểm/câu của " + value.label() + " không khớp tổng điểm.");
            }
            if (key.equals("trueFalse") && score % (Math.max(1, count) * itemsPerQuestion) != 0 && score > 0) {
                throw new ExamAllocationException("Điểm Đúng–Sai không thể chia đều cho các ý ở đơn vị 0,01 điểm.");
            }
            total += score;
            types.put(key, new TypeData(value.label(), count, itemsPerQuestion, points, score, essayParts));
        }
        if (total != 1000) throw new IllegalArgumentException("Tổng điểm toàn đề phải bằng 10,00 điểm.");
        Map<String, Integer> ratios = source.assessmentRatios();
        if (ratios == null || LEVELS.stream().anyMatch(level -> ratios.get(level) == null || ratios.get(level) < 0)
                || LEVELS.stream().mapToInt(ratios::get).sum() != 100) {
            throw new IllegalArgumentException("Tổng tỉ lệ Biết/Hiểu/Vận dụng phải bằng 100%.");
        }
        return new ConfigData(source.mode() == null ? "cv7991" : source.mode(), source.difficulty(),
                Boolean.TRUE.equals(source.allowEssayForGrade12()), types, Map.copyOf(ratios));
    }

    private List<MutableItem> buildItems(ConfigData config) {
        List<MutableItem> result = new ArrayList<>();
        for (var entry : config.types().entrySet()) {
            String type = entry.getKey();
            TypeData data = entry.getValue();
            if (type.equals("essay")) {
                for (int q = 0; q < data.essayParts().size(); q++) {
                    List<Integer> parts = data.essayParts().get(q);
                    for (int p = 0; p < parts.size(); p++) {
                        result.add(new MutableItem(type + "-q" + (q + 1) + "-p" + (p + 1), type,
                                "TL" + (q + 1), String.valueOf((char) ('a' + p)), parts.get(p)));
                    }
                }
            } else if (type.equals("trueFalse")) {
                int itemScore = data.questionCount() == 0 ? 0 : data.scoreCents() / (data.questionCount() * data.itemsPerQuestion());
                for (int q = 0; q < data.questionCount(); q++) {
                    for (int p = 0; p < data.itemsPerQuestion(); p++) {
                        result.add(new MutableItem(type + "-q" + (q + 1) + "-p" + (p + 1), type,
                                "ĐS" + (q + 1), String.valueOf((char) ('a' + p)), itemScore));
                    }
                }
            } else {
                String prefix = type.equals("multipleChoice") ? "TN" : "TLN";
                for (int q = 0; q < data.questionCount(); q++) {
                    result.add(new MutableItem(type + "-q" + (q + 1), type, prefix + (q + 1), "", data.pointsPerQuestionCents()));
                }
            }
        }
        return result;
    }

    private void assignLevels(List<MutableItem> items, Map<String, Integer> ratios) {
        int recognition = exactTarget(ratios.get("recognition"));
        int comprehension = exactTarget(ratios.get("comprehension"));
        List<MutableItem> ordered = items.stream().sorted(Comparator.comparingInt(MutableItem::scoreCents).reversed()
                .thenComparing(MutableItem::id)).toList();
        if (!findLevelAssignment(ordered, 0, recognition, comprehension, new HashSet<>())) {
            throw new ExamAllocationException("Không tồn tại cách phân bổ câu/ý thỏa đúng tỉ lệ nhận thức đã chọn.");
        }
    }

    private boolean findLevelAssignment(List<MutableItem> items, int index, int recognitionLeft,
                                        int comprehensionLeft, Set<String> failed) {
        if (recognitionLeft < 0 || comprehensionLeft < 0) return false;
        if (index == items.size()) return recognitionLeft == 0 && comprehensionLeft == 0;
        String state = index + ":" + recognitionLeft + ":" + comprehensionLeft;
        if (failed.contains(state)) return false;
        MutableItem item = items.get(index);
        item.level = "recognition";
        if (findLevelAssignment(items, index + 1, recognitionLeft - item.scoreCents(), comprehensionLeft, failed)) return true;
        item.level = "comprehension";
        if (findLevelAssignment(items, index + 1, recognitionLeft, comprehensionLeft - item.scoreCents(), failed)) return true;
        item.level = "application";
        if (findLevelAssignment(items, index + 1, recognitionLeft, comprehensionLeft, failed)) return true;
        failed.add(state);
        return false;
    }

    private int exactTarget(int ratio) {
        if ((1000 * ratio) % 100 != 0) throw new ExamAllocationException("Tỉ lệ nhận thức không biểu diễn được ở đơn vị 0,01 điểm.");
        return 1000 * ratio / 100;
    }

    private List<ChapterData> buildChapterData(List<ExamLessonSource> sources) {
        Map<String, List<ExamLessonSource>> grouped = sources.stream().collect(Collectors.groupingBy(
                source -> source.bookCode() + "\u0000" + source.chapterCode(), LinkedHashMap::new, Collectors.toList()));
        List<ChapterData> result = new ArrayList<>();
        for (List<ExamLessonSource> lessons : grouped.values()) {
            double weight = lessons.stream().mapToInt(this::learningObjectiveCount).sum();
            String source = "LEARNING_OUTCOMES";
            boolean fallback = false;
            if (weight <= 0) {
                weight = lessons.size();
                source = "LESSON_COUNT";
                fallback = true;
            }
            ExamLessonSource first = lessons.getFirst();
            result.add(new ChapterData(first.bookCode() + ":" + first.chapterCode(), first.bookCode(),
                    first.chapterCode(), first.chapterName(), weight, source, fallback, lessons));
        }
        return result;
    }

    private int learningObjectiveCount(ExamLessonSource source) {
        try {
            JsonNode node = knowledgeNode(source);
            JsonNode objectives = node.path("learningObjectives");
            return objectives.isArray() ? objectives.size() : 0;
        } catch (Exception ignored) {
            return 0;
        }
    }

    private void assignChapters(List<MutableItem> items, List<ChapterData> chapters) {
        double totalWeight = chapters.stream().mapToDouble(ChapterData::weight).sum();
        Map<String, Integer> assignedScores = new HashMap<>();
        for (MutableItem item : items.stream().sorted(Comparator.comparingInt(MutableItem::scoreCents).reversed()
                .thenComparing(MutableItem::id)).toList()) {
            ChapterData selected = chapters.stream().max(Comparator
                    .comparingDouble((ChapterData chapter) -> chapter.weight() / totalWeight * 1000
                            - assignedScores.getOrDefault(chapter.id(), 0))
                    .thenComparing(ChapterData::id, Comparator.reverseOrder())).orElseThrow();
            item.chapterId = selected.id();
            assignedScores.merge(selected.id(), item.scoreCents(), Integer::sum);
        }
    }

    private List<UnitProposal> generateProposals(List<ExamLessonSource> sources, String correction) {
        String prompt = buildPrompt(sources, correction);
        String raw = null;
        try {
            long started = System.nanoTime();
            log.info("EXAM_AI_CALL_START promptChars={} correction={}", prompt.length(), correction != null);
            raw = aiClient.generate(prompt);
            log.info("EXAM_AI_CALL_RETURNED outputChars={} durationMs={}", raw == null ? 0 : raw.length(), elapsedMs(started));
            String json = stripFence(raw);
            List<UnitProposal> parsed = objectMapper.readValue(json,
                    objectMapper.getTypeFactory().constructCollectionType(List.class, UnitProposal.class));
            log.info("EXAM_AI_PARSE_SUCCESS proposals={}", parsed.size());
            return parsed;
        } catch (Exception e) {
            log.error("EXAM_AI_CALL_OR_PARSE_FAILED rawPreview={}", preview(raw), e);
            throw new ExamGenerationException("Không sinh được nội dung Ma trận và Bản đặc tả.", e);
        }
    }

    /**
     * AI output can intermittently be fenced, truncated or contain null level arrays. Retry the complete
     * generate/parse/validate cycle once; if providers remain unstable, derive a safe editable draft from
     * the already-confirmed knowledge_json instead of failing the whole teacher workflow.
     */
    private List<UnitProposal> generateProposalsReliably(List<ExamLessonSource> sources) {
        String correction = null;
        for (int attempt = 0; attempt < 2; attempt++) {
            try {
                log.info("EXAM_AI_ATTEMPT number={}", attempt + 1);
                List<UnitProposal> proposals = generateProposals(sources, correction);
                validateProposals(proposals, sources);
                log.info("EXAM_AI_VALIDATE_SUCCESS attempt={}", attempt + 1);
                return proposals;
            } catch (RuntimeException failure) {
                correction = failure.getMessage();
                log.warn("EXAM_AI_ATTEMPT_FAILED attempt={} message={}", attempt + 1, failure.getMessage(), failure);
            }
        }
        // The draft remains in scope and keeps all locked numbers. Teachers can still edit its YCCĐ.
        log.error("EXAM_AI_FALLBACK_ACTIVATED sources={} lastError={}", sources.size(), correction);
        return fallbackProposals(sources);
    }

    private List<UnitProposal> fallbackProposals(List<ExamLessonSource> sources) {
        return sources.stream().map(source -> {
            String summary = "Nội dung của " + source.lessonName();
            List<String> objectives = new ArrayList<>();
            try {
                JsonNode knowledge = knowledgeNode(source);
                summary = knowledge.path("summary").asText(summary);
                knowledge.path("learningObjectives").forEach(node -> {
                    if (!node.asText("").isBlank()) objectives.add(node.asText());
                });
            } catch (Exception ignored) {
                // The existence of knowledge_json was already checked; retain the lesson-title fallback.
            }
            String base = objectives.isEmpty() ? source.lessonName() : objectives.getFirst();
            Map<String, List<String>> outcomes = new LinkedHashMap<>();
            outcomes.put("recognition", List.of("Nêu được kiến thức cơ bản về " + source.lessonName() + "."));
            outcomes.put("comprehension", List.of("Giải thích được " + lowercaseFirst(base)));
            outcomes.put("application", List.of("Vận dụng được kiến thức của " + source.lessonName() + " để giải quyết nhiệm vụ học tập."));
            return new UnitProposal(source.bookCode(), source.chapterCode(), source.lessonCode(),
                    source.lessonName(), summary, objectMapper.valueToTree(outcomes));
        }).toList();
    }

    private String buildPrompt(List<ExamLessonSource> sources, String correction) {
        List<Map<String, Object>> context = sources.stream().map(source -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("bookCode", source.bookCode());
            item.put("chapterCode", source.chapterCode());
            item.put("chapterName", source.chapterName());
            item.put("lessonCode", source.lessonCode());
            item.put("lessonName", source.lessonName());
            try {
                JsonNode knowledge = knowledgeNode(source);
                item.put("summary", knowledge.path("summary").asText(""));
                item.put("learningObjectives", knowledge.path("learningObjectives"));
                List<String> headings = new ArrayList<>();
                knowledge.path("sections").forEach(section -> headings.add(section.path("heading").asText("")));
                item.put("sectionHeadings", headings);
            } catch (Exception ignored) {
                item.put("summary", "");
            }
            return item;
        }).toList();
        try {
            return """
                    Bạn là chuyên gia xây dựng bản đặc tả đề kiểm tra phổ thông Việt Nam.
                    Trả về DUY NHẤT JSON array. Với MỖI lessonCode đầu vào phải có đúng một object theo schema:
                    {"bookCode":"...","chapterCode":"...","lessonCode":"...","name":"tên đơn vị kiến thức","content":"mô tả ngắn","learningOutcomes":{"recognition":["..."],"comprehension":["..."],"application":["..."]}}
                    Chỉ dùng kiến thức đầu vào, không thêm bài, không trả số câu/điểm/quota.
                    Yêu cầu cần đạt viết bằng tiếng Việt, dùng động từ đo lường được và đúng mức nhận thức.
                    """ + (correction == null ? "" : "\nKết quả trước sai: " + correction + ". Hãy sửa đúng đủ mã.\n")
                    + "\nDỮ LIỆU SGK:\n" + objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            throw new ExamGenerationException("Không dựng được prompt tạo Ma trận.", e);
        }
    }

    private JsonNode knowledgeNode(ExamLessonSource source) throws Exception {
        JsonNode root = objectMapper.readTree(source.knowledgeJson());
        return root.has(source.lessonCode()) ? root.get(source.lessonCode()) : root;
    }

    private void validateProposals(List<UnitProposal> proposals, List<ExamLessonSource> sources) {
        if (proposals == null) throw new IllegalArgumentException("AI không trả danh sách đơn vị kiến thức.");
        Set<String> expected = sources.stream().map(this::sourceKey).collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> actual = proposals.stream().map(this::proposalKey).collect(Collectors.toSet());
        if (actual.size() != proposals.size() || !actual.equals(expected)) {
            throw new IllegalArgumentException("Danh sách lessonCode AI trả về không khớp phạm vi đã khóa.");
        }
        if (proposals.stream().anyMatch(p -> blank(p.name()) || p.learningOutcomes() == null)) {
            throw new IllegalArgumentException("AI thiếu tên đơn vị hoặc Yêu cầu cần đạt.");
        }
    }

    private List<ExamMatrixWorkspace.Chapter> assembleChapters(List<ChapterData> chapterData,
                                                               List<UnitProposal> proposals,
                                                               List<MutableItem> items) {
        Map<String, UnitProposal> proposalBySource = proposals.stream().collect(Collectors.toMap(this::proposalKey, p -> p));
        double totalWeight = chapterData.stream().mapToDouble(ChapterData::weight).sum();
        List<ExamMatrixWorkspace.Chapter> result = new ArrayList<>();
        for (ChapterData chapter : chapterData) {
            List<MutableItem> chapterItems = items.stream().filter(item -> chapter.id().equals(item.chapterId)).toList();
            List<Map<String, Map<String, List<String>>>> allocations = new ArrayList<>();
            for (int i = 0; i < chapter.lessons().size(); i++) allocations.add(emptyAllocation());
            AtomicInteger cursor = new AtomicInteger();
            for (MutableItem item : chapterItems.stream().sorted(Comparator.comparing(MutableItem::id)).toList()) {
                int unitIndex = cursor.getAndIncrement() % chapter.lessons().size();
                allocations.get(unitIndex).get(item.type()).get(item.level()).add(item.id());
            }
            List<ExamMatrixWorkspace.KnowledgeUnit> units = new ArrayList<>();
            for (int i = 0; i < chapter.lessons().size(); i++) {
                ExamLessonSource source = chapter.lessons().get(i);
                UnitProposal proposal = proposalBySource.get(sourceKey(source));
                units.add(new ExamMatrixWorkspace.KnowledgeUnit(
                        chapter.id() + ":" + source.lessonCode(), source.lessonCode(), proposal.name(),
                        proposal.content() == null ? "" : proposal.content(), normalizeOutcomes(proposal.learningOutcomes()), allocations.get(i)));
            }
            result.add(new ExamMatrixWorkspace.Chapter(chapter.id(), chapter.bookCode(), chapter.chapterCode(),
                    chapter.name(), new ExamMatrixWorkspace.AllocationTrace(chapter.weightSource(), chapter.weight(),
                    chapter.weight() / totalWeight, chapter.fallback()), units));
        }
        return result;
    }

    private Map<String, Map<String, List<String>>> emptyAllocation() {
        Map<String, Map<String, List<String>>> result = new LinkedHashMap<>();
        for (String type : TYPES) {
            Map<String, List<String>> levels = new LinkedHashMap<>();
            for (String level : LEVELS) levels.put(level, new ArrayList<>());
            result.put(type, levels);
        }
        return result;
    }

    private Map<String, List<String>> normalizeOutcomes(JsonNode source) {
        Map<String, List<String>> result = new LinkedHashMap<>();
        for (String level : LEVELS) {
            JsonNode value = source == null ? null : source.get(level);
            if (value == null || value.isNull()) {
                result.put(level, List.of());
            } else if (value.isArray()) {
                List<String> values = new ArrayList<>();
                value.forEach(node -> { if (!node.asText("").isBlank()) values.add(node.asText()); });
                result.put(level, List.copyOf(values));
            } else {
                String text = value.asText("").trim();
                result.put(level, text.isEmpty() ? List.of() : List.of(text));
            }
        }
        return result;
    }

    private ExamMatrixWorkspace.Configuration responseConfiguration(ConfigData config) {
        List<String> warnings = new ArrayList<>();
        Map<String, ExamMatrixWorkspace.QuestionType> types = new LinkedHashMap<>();
        for (var entry : config.types().entrySet()) {
            TypeData value = entry.getValue();
            int difference = value.scoreCents() - REFERENCE_SCORES.get(entry.getKey());
            if (difference != 0) warnings.add(value.label() + (difference > 0 ? " vượt " : " thiếu ")
                    + String.format(java.util.Locale.ROOT, "%.2f điểm", Math.abs(difference) / 100.0));
            types.put(entry.getKey(), new ExamMatrixWorkspace.QuestionType(value.label(), value.questionCount(),
                    entry.getKey().equals("trueFalse") ? value.itemsPerQuestion() : null,
                    entry.getKey().equals("essay") ? null : value.pointsPerQuestionCents(), value.scoreCents(), value.essayParts()));
        }
        return new ExamMatrixWorkspace.Configuration(config.mode(), config.difficulty(), true, config.allowEssayForGrade12(),
                warnings.isEmpty() ? "MATCHED" : "DEVIATED", warnings, types, config.ratios());
    }

    private ExamMatrixWorkspace.Summary summarize(ConfigData config, List<MutableItem> items) {
        Map<String, ExamMatrixWorkspace.Totals> byType = new LinkedHashMap<>();
        for (String type : TYPES) {
            TypeData data = config.types().get(type);
            byType.put(type, new ExamMatrixWorkspace.Totals(data.questionCount(), data.scoreCents(), data.scoreCents() / 10));
        }
        Map<String, ExamMatrixWorkspace.Totals> byLevel = new LinkedHashMap<>();
        for (String level : LEVELS) {
            List<MutableItem> selected = items.stream().filter(item -> level.equals(item.level())).toList();
            int score = selected.stream().mapToInt(MutableItem::scoreCents).sum();
            byLevel.put(level, new ExamMatrixWorkspace.Totals(selected.size(), score, score / 10));
        }
        int blocks = config.types().values().stream().mapToInt(TypeData::questionCount).sum();
        return new ExamMatrixWorkspace.Summary(blocks, items.size(), 1000, byType, byLevel);
    }

    private String sourceKey(ExamLessonSource source) { return source.bookCode() + ":" + source.chapterCode() + ":" + source.lessonCode(); }
    private String proposalKey(UnitProposal proposal) { return proposal.bookCode() + ":" + proposal.chapterCode() + ":" + proposal.lessonCode(); }
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String lowercaseFirst(String value) {
        if (value == null || value.isBlank()) return "nội dung bài học.";
        String trimmed = value.trim();
        return Character.toLowerCase(trimmed.charAt(0)) + trimmed.substring(1)
                + (trimmed.endsWith(".") ? "" : ".");
    }
    private static int nonNegative(Integer value, String label) {
        if (value == null || value < 0) throw new IllegalArgumentException(label + " phải là số không âm.");
        return value;
    }
    private static int defaultPositive(Integer value, int fallback) { return value == null || value <= 0 ? fallback : value; }
    private static String stripFence(String raw) {
        if (raw == null) return "";
        String value = raw.trim();
        if (value.startsWith("```")) {
            int newline = value.indexOf('\n');
            value = newline >= 0 ? value.substring(newline + 1) : value.substring(3);
            if (value.endsWith("```")) value = value.substring(0, value.length() - 3);
        }
        return value.trim();
    }

    private static String preview(String raw) {
        if (raw == null) return "<null>";
        String singleLine = raw.replaceAll("\\s+", " ").trim();
        return singleLine.length() <= 2000 ? singleLine : singleLine.substring(0, 2000) + "…";
    }

    private static long elapsedMs(long started) {
        return (System.nanoTime() - started) / 1_000_000;
    }

    private record ConfigData(String mode, String difficulty, boolean allowEssayForGrade12,
                              Map<String, TypeData> types, Map<String, Integer> ratios) {}
    private record TypeData(String label, int questionCount, int itemsPerQuestion, int pointsPerQuestionCents,
                            int scoreCents, List<List<Integer>> essayParts) {}
    private record ChapterData(String id, String bookCode, String chapterCode, String name, double weight,
                               String weightSource, boolean fallback, List<ExamLessonSource> lessons) {}
    private static final class MutableItem {
        private final String id; private final String type; private final String questionCode; private final String itemCode; private final int scoreCents;
        private String level; private String chapterId;
        private MutableItem(String id, String type, String questionCode, String itemCode, int scoreCents) {
            this.id = id; this.type = type; this.questionCode = questionCode; this.itemCode = itemCode; this.scoreCents = scoreCents;
        }
        String id() { return id; } String type() { return type; } String questionCode() { return questionCode; }
        String itemCode() { return itemCode; } int scoreCents() { return scoreCents; } String level() { return level; }
    }
    private record UnitProposal(String bookCode, String chapterCode, String lessonCode, String name,
                                String content, JsonNode learningOutcomes) {}
}
