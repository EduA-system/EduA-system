package com.edua.beeduasystem.service.practiceexam;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.edua.beeduasystem.presentation.dto.practiceexam.PracticeExamRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.PracticeExamEvent;
import com.edua.beeduasystem.repository.gateways.PracticeExamStreamPort;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PracticeExamServiceTests {

    @Test
    void generateRunsBatchesConcurrentlyWithinConfiguredLimit() {
        TextbookCatalogRepository catalogRepository = mock(TextbookCatalogRepository.class);
        when(catalogRepository.findLessonKnowledge("book-1", "chapter-1", "lesson-1"))
                .thenReturn(Optional.of("{\"summary\":\"Knowledge\",\"learningObjectives\":[\"Objective\"]}"));
        TrackingAiClient aiClient = new TrackingAiClient(75);
        PracticeExamService service = new PracticeExamService(catalogRepository, aiClient, new ObjectMapper(),
                3, 10, 10, 30);

        PracticeExam exam = service.generate(request());

        assertThat(exam.questions()).hasSize(22);
        assertThat(aiClient.calls.get()).isEqualTo(8);
        assertThat(aiClient.maxActive.get()).isGreaterThan(1);
        assertThat(aiClient.maxActive.get()).isLessThanOrEqualTo(3);
        assertThat(exam.questions()).extracting(PracticeExam.Question::order)
                .containsExactlyElementsOf(java.util.stream.IntStream.rangeClosed(1, 22).boxed().toList());
    }

    @Test
    void generateRepairsCommonMalformedLatexInAiResponse() {
        TextbookCatalogRepository catalogRepository = mock(TextbookCatalogRepository.class);
        when(catalogRepository.findLessonKnowledge("book-1", "chapter-1", "lesson-1"))
                .thenReturn(Optional.of("{\"summary\":\"Knowledge\",\"learningObjectives\":[\"Objective\"]}"));
        PracticeExamService service = new PracticeExamService(catalogRepository, new MalformedLatexAiClient(), new ObjectMapper(),
                1, 10, 10, 30);

        PracticeExam exam = service.generate(singleShortAnswerRequest());

        PracticeExam.Question question = exam.questions().getFirst();
        assertThat(question.content()).contains("$\\frac{F}{m}$");
        assertThat(question.explanation()).contains("$$\\frac{1}{2} \\cdot 9,8 \\cdot (3,1)^2 \\approx 47,1 \\text{m}$$");
        assertThat(question.answer().get("value")).isEqualTo("$\\frac{\\Delta v}{\\Delta t}$");
    }

    @Test
    void generateStreamingPublishesPlanReadyThenBatchesThenDone() {
        TextbookCatalogRepository catalogRepository = mock(TextbookCatalogRepository.class);
        when(catalogRepository.findLessonKnowledge("book-1", "chapter-1", "lesson-1"))
                .thenReturn(Optional.of("{\"summary\":\"Knowledge\",\"learningObjectives\":[\"Objective\"]}"));
        TrackingAiClient aiClient = new TrackingAiClient(20);
        PracticeExamService service = new PracticeExamService(catalogRepository, aiClient, new ObjectMapper(),
                3, 10, 10, 30);
        RecordingStreamPort stream = new RecordingStreamPort();

        service.generateStreaming(request(), "session-1", stream);

        assertThat(stream.planReady).hasSize(1);
        assertThat(stream.planReady.get(0).stubs()).extracting(PracticeExamEvent.QuestionStub::order)
                .containsExactlyElementsOf(IntStream.rangeClosed(1, 22).boxed().toList());
        assertThat(stream.failed).isEmpty();
        assertThat(stream.batchFailed).isEmpty();
        int deliveredOrders = stream.batchReady.stream().mapToInt(event -> event.questions().size()).sum();
        assertThat(deliveredOrders).isEqualTo(22);
        assertThat(stream.done).hasSize(1);
    }

    @Test
    void generateStreamingReportsBatchFailedButStillCompletesOtherBatches() {
        TextbookCatalogRepository catalogRepository = mock(TextbookCatalogRepository.class);
        when(catalogRepository.findLessonKnowledge("book-1", "chapter-1", "lesson-1"))
                .thenReturn(Optional.of("{\"summary\":\"Knowledge\",\"learningObjectives\":[\"Objective\"]}"));
        PracticeExamService service = new PracticeExamService(catalogRepository, new PartiallyFailingAiClient(), new ObjectMapper(),
                3, 10, 10, 30);
        RecordingStreamPort stream = new RecordingStreamPort();

        service.generateStreaming(request(), "session-2", stream);

        assertThat(stream.failed).isEmpty();
        assertThat(stream.batchFailed).isNotEmpty();
        assertThat(stream.batchFailed.stream().flatMap(event -> event.orders().stream()).toList())
                .containsExactlyInAnyOrderElementsOf(List.of(21, 22));
        int deliveredOrders = stream.batchReady.stream().mapToInt(event -> event.questions().size()).sum();
        assertThat(deliveredOrders).isEqualTo(20);
        assertThat(stream.done).hasSize(1);
    }

    private static PracticeExamRequest request() {
        return new PracticeExamRequest("De kiem tra", "PHYSICS", 10, 90, "HARD",
                22, 1000, false,
                List.of(
                        new PracticeExamRequest.QuestionType("MULTIPLE_CHOICE", 10, 400, null),
                        new PracticeExamRequest.QuestionType("TRUE_FALSE", 4, 200, 4),
                        new PracticeExamRequest.QuestionType("SHORT_ANSWER", 6, 200, null),
                        new PracticeExamRequest.QuestionType("ESSAY", 2, 200, null)
                ),
                new PracticeExamRequest.KnowledgeScope("book-1",
                        List.of(new PracticeExamRequest.LessonRef("chapter-1", "lesson-1"))), null);
    }

    private static PracticeExamRequest singleShortAnswerRequest() {
        return new PracticeExamRequest("De kiem tra", "PHYSICS", 10, 90, "HARD",
                1, 1000, false,
                List.of(new PracticeExamRequest.QuestionType("SHORT_ANSWER", 1, 1000, null)),
                new PracticeExamRequest.KnowledgeScope("book-1",
                        List.of(new PracticeExamRequest.LessonRef("chapter-1", "lesson-1"))), null);
    }

    private static final class MalformedLatexAiClient implements AiClient {
        @Override
        public String generate(String prompt) {
            return """
                    [{
                      "order": 1,
                      "type": "SHORT_ANSWER",
                      "content": "Tính gia tốc $fracFm$.",
                      "options": null,
                      "answer": {"value": "$fracDelta vDeltat$"},
                      "explanation": "$$frac12 cdot9,8 cdot(3,1)^2 approx47,1 textm$$",
                      "scoreCentiPoints": 1000,
                      "rubric": null,
                      "sourceLessonRefs": [{"bookCode": "book-1", "chapterCode": "chapter-1", "lessonCode": "lesson-1"}]
                    }]
                    """;
        }

        @Override
        public String generate(String prompt, byte[] image, String mimeType) {
            throw new UnsupportedOperationException();
        }
    }

    private static final class TrackingAiClient implements AiClient {
        private static final Pattern COUNT = Pattern.compile("Tạo CHÍNH XÁC (\\d+) câu loại ([A-Z_]+), tổng (\\d+) centi điểm");

        private final long delayMillis;
        private final AtomicInteger active = new AtomicInteger();
        private final AtomicInteger calls = new AtomicInteger();
        private final AtomicInteger maxActive = new AtomicInteger();

        private TrackingAiClient(long delayMillis) {
            this.delayMillis = delayMillis;
        }

        @Override
        public String generate(String prompt) {
            calls.incrementAndGet();
            int now = active.incrementAndGet();
            maxActive.accumulateAndGet(now, Math::max);
            try {
                Thread.sleep(delayMillis);
                Matcher matcher = COUNT.matcher(prompt);
                if (!matcher.find()) throw new IllegalArgumentException("Prompt missing batch instruction");
                int count = Integer.parseInt(matcher.group(1));
                String type = matcher.group(2);
                int score = Integer.parseInt(matcher.group(3));
                return batchJson(type, count, score);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new RuntimeException(exception);
            } finally {
                active.decrementAndGet();
            }
        }

        @Override
        public String generate(String prompt, byte[] image, String mimeType) {
            throw new UnsupportedOperationException();
        }

        private static String batchJson(String type, int count, int batchScore) {
            StringBuilder json = new StringBuilder("[");
            for (int index = 0; index < count; index++) {
                if (index > 0) json.append(',');
                int score = batchScore / count;
                json.append("{\"order\":").append(index + 1)
                        .append(",\"type\":\"").append(type).append("\"")
                        .append(",\"content\":\"Question ").append(index + 1).append("\"")
                        .append(",\"options\":").append(options(type))
                        .append(",\"answer\":{\"value\":\"A\"}")
                        .append(",\"explanation\":\"Explanation\"")
                        .append(",\"scoreCentiPoints\":").append(score)
                        .append(",\"rubric\":").append(rubric(type, score))
                        .append(",\"sourceLessonRefs\":[{\"bookCode\":\"book-1\",\"chapterCode\":\"chapter-1\",\"lessonCode\":\"lesson-1\"}]}");
            }
            return json.append(']').toString();
        }

        private static String options(String type) {
            if (!"MULTIPLE_CHOICE".equals(type) && !"TRUE_FALSE".equals(type)) return "null";
            return "[{\"key\":\"A\",\"content\":\"A\"},{\"key\":\"B\",\"content\":\"B\"},{\"key\":\"C\",\"content\":\"C\"},{\"key\":\"D\",\"content\":\"D\"}]";
        }

        private static String rubric(String type, int score) {
            if (!"ESSAY".equals(type)) return "null";
            return "[{\"criterion\":\"Rubric\",\"scoreCentiPoints\":" + score + "}]";
        }
    }

    /** Như {@link TrackingAiClient} nhưng luôn lỗi cho loại ESSAY — dùng để test BATCH_FAILED. */
    private static final class PartiallyFailingAiClient implements AiClient {
        private static final Pattern COUNT = Pattern.compile("Tạo CHÍNH XÁC (\\d+) câu loại ([A-Z_]+), tổng (\\d+) centi điểm");

        @Override
        public String generate(String prompt) {
            Matcher matcher = COUNT.matcher(prompt);
            if (!matcher.find()) throw new IllegalArgumentException("Prompt missing batch instruction");
            String type = matcher.group(2);
            if ("ESSAY".equals(type)) throw new IllegalStateException("AI provider lỗi giả lập cho ESSAY");
            int count = Integer.parseInt(matcher.group(1));
            int score = Integer.parseInt(matcher.group(3));
            return TrackingAiClient.batchJson(type, count, score);
        }

        @Override
        public String generate(String prompt, byte[] image, String mimeType) {
            throw new UnsupportedOperationException();
        }
    }

    /** Fake port ghi lại mọi sự kiện streaming để assert trong test — dùng list thread-safe vì
     * các batch chạy song song trên nhiều virtual thread. */
    private static final class RecordingStreamPort implements PracticeExamStreamPort {
        final List<PracticeExamEvent.PlanReady> planReady = new java.util.concurrent.CopyOnWriteArrayList<>();
        final List<PracticeExamEvent.BatchReady> batchReady = new java.util.concurrent.CopyOnWriteArrayList<>();
        final List<PracticeExamEvent.BatchFailed> batchFailed = new java.util.concurrent.CopyOnWriteArrayList<>();
        final List<PracticeExamEvent.Done> done = new java.util.concurrent.CopyOnWriteArrayList<>();
        final List<PracticeExamEvent.Error> failed = new java.util.concurrent.CopyOnWriteArrayList<>();

        @Override
        public void publishPlanReady(String sessionId, String title, String instructions, int durationMinutes,
                                     int totalScoreCentiPoints, List<PracticeExamEvent.QuestionStub> stubs) {
            planReady.add(new PracticeExamEvent.PlanReady(sessionId, title, instructions, durationMinutes, totalScoreCentiPoints, stubs));
        }

        @Override
        public void publishBatchReady(String sessionId, List<PracticeExam.Question> questions) {
            batchReady.add(new PracticeExamEvent.BatchReady(sessionId, questions));
        }

        @Override
        public void publishBatchFailed(String sessionId, List<Integer> orders, String reason) {
            batchFailed.add(new PracticeExamEvent.BatchFailed(sessionId, orders, reason));
        }

        @Override
        public void publishDone(String sessionId) {
            done.add(new PracticeExamEvent.Done(sessionId));
        }

        @Override
        public void publishFailed(String sessionId, String message) {
            failed.add(new PracticeExamEvent.Error(sessionId, message));
        }
    }

}
