package com.edua.beeduasystem.service.practiceexam;

import com.edua.beeduasystem.domain.model.practiceexam.PracticeExam;
import com.edua.beeduasystem.presentation.dto.practiceexam.PracticeExamRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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
                        List.of(new PracticeExamRequest.LessonRef("chapter-1", "lesson-1"))));
    }

    private static PracticeExamRequest singleShortAnswerRequest() {
        return new PracticeExamRequest("De kiem tra", "PHYSICS", 10, 90, "HARD",
                1, 1000, false,
                List.of(new PracticeExamRequest.QuestionType("SHORT_ANSWER", 1, 1000, null)),
                new PracticeExamRequest.KnowledgeScope("book-1",
                        List.of(new PracticeExamRequest.LessonRef("chapter-1", "lesson-1"))));
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

        private String batchJson(String type, int count, int batchScore) {
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

        private String options(String type) {
            if (!"MULTIPLE_CHOICE".equals(type) && !"TRUE_FALSE".equals(type)) return "null";
            return "[{\"key\":\"A\",\"content\":\"A\"},{\"key\":\"B\",\"content\":\"B\"},{\"key\":\"C\",\"content\":\"C\"},{\"key\":\"D\",\"content\":\"D\"}]";
        }

        private String rubric(String type, int score) {
            if (!"ESSAY".equals(type)) return "null";
            return "[{\"criterion\":\"Rubric\",\"scoreCentiPoints\":" + score + "}]";
        }
    }

}
