package com.edua.beeduasystem.service.exam;

import com.edua.beeduasystem.domain.exception.ExamAllocationException;
import com.edua.beeduasystem.domain.model.exam.ExamLessonSource;
import com.edua.beeduasystem.domain.model.exam.ExamScope;
import com.edua.beeduasystem.presentation.dto.exam.GenerateExamMatrixRequest;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ExamGenerationServiceTests {
    @Test
    void locksScoresBeforeMergingAiContent() {
        Fixture fixture = fixture(Map.of("recognition", 40, "comprehension", 30, "application", 30));
        var workspace = fixture.service.generate(fixture.request);

        assertThat(workspace.summary().totalScoreCents()).isEqualTo(1000);
        assertThat(workspace.summary().byLevel().get("recognition").scoreCents()).isEqualTo(400);
        assertThat(workspace.summary().byLevel().get("comprehension").scoreCents()).isEqualTo(300);
        assertThat(workspace.chapters()).hasSize(1);
        assertThat(workspace.chapters().getFirst().knowledgeUnits()).hasSize(2);
    }

    @Test
    void rejectsRatioThatCannotBeRepresentedByConfiguredItems() {
        Fixture fixture = fixture(Map.of("recognition", 41, "comprehension", 29, "application", 30));
        assertThatThrownBy(() -> fixture.service.generate(fixture.request)).isInstanceOf(ExamAllocationException.class);
    }

    @Test
    void fallsBackToKnowledgeWhenAiIsIntermittentlyUnavailable() {
        Fixture fixture = fixture(Map.of("recognition", 40, "comprehension", 30, "application", 30));
        when(fixture.aiClient.generate(anyString())).thenThrow(new RuntimeException("temporary provider failure"));

        var workspace = fixture.service.generate(fixture.request);

        assertThat(workspace.chapters().getFirst().knowledgeUnits()).extracting("name")
                .containsExactly("Lesson 1", "Lesson 2");
        assertThat(workspace.summary().totalScoreCents()).isEqualTo(1000);
    }

    private Fixture fixture(Map<String, Integer> ratios) {
        ExamScopeService scopeService = mock(ExamScopeService.class);
        AiClient aiClient = mock(AiClient.class);
        List<ExamLessonSource> sources = List.of(
                source("L1", "Lesson 1"), source("L2", "Lesson 2"));
        ExamScope scope = new ExamScope("ESTIMATED_BY_ORDER", 1, 1, "PHYSICS", 11, "GIUA_HK1", "token", true,
                sources.stream().map(source -> new ExamScope.LessonRef(source.bookCode(), source.bookName(), source.chapterCode(),
                        source.chapterName(), source.lessonCode(), source.lessonName())).toList());
        when(scopeService.preview("PHYSICS", 11, "GIUA_HK1")).thenReturn(scope);
        when(scopeService.loadConfirmedSources(scope)).thenReturn(sources);
        when(aiClient.generate(anyString())).thenReturn("""
                [
                  {"bookCode":"B","chapterCode":"C","lessonCode":"L1","name":"Unit 1","content":"Content 1","learningOutcomes":{"recognition":["Nêu được"],"comprehension":["Giải thích được"],"application":["Vận dụng được"]}},
                  {"bookCode":"B","chapterCode":"C","lessonCode":"L2","name":"Unit 2","content":"Content 2","learningOutcomes":{"recognition":["Nêu được"],"comprehension":["Giải thích được"],"application":["Vận dụng được"]}}
                ]
                """);
        ExamGenerationService service = new ExamGenerationService(scopeService, aiClient, new ObjectMapper());
        GenerateExamMatrixRequest request = new GenerateExamMatrixRequest("PHYSICS", "Vật lí", 11, "GIUA_HK1", "Giữa HK1",
                "token", true, configuration(ratios));
        return new Fixture(service, request, aiClient);
    }

    private GenerateExamMatrixRequest.Configuration configuration(Map<String, Integer> ratios) {
        Map<String, GenerateExamMatrixRequest.QuestionType> types = new LinkedHashMap<>();
        types.put("multipleChoice", type("TNKQ", 12, null, 25, 300, List.of()));
        types.put("trueFalse", type("Đúng–Sai", 2, 4, 100, 200, List.of()));
        types.put("shortAnswer", type("Trả lời ngắn", 4, null, 50, 200, List.of()));
        types.put("essay", type("Tự luận", 2, null, null, 300, List.of(List.of(75, 75), List.of(75, 75))));
        return new GenerateExamMatrixRequest.Configuration("cv7991", "MEDIUM", true, false, types, ratios);
    }

    private GenerateExamMatrixRequest.QuestionType type(String label, int count, Integer items, Integer points,
                                                         int score, List<List<Integer>> parts) {
        return new GenerateExamMatrixRequest.QuestionType(label, count, items, points, score, parts);
    }

    private ExamLessonSource source(String code, String name) {
        return new ExamLessonSource("PHYSICS", 11, "B", "Book", null, 0, "C", "Chapter", 0, code, name, 0,
                "{\"learningObjectives\":[\"One\",\"Two\"],\"summary\":\"Summary\"}");
    }

    private record Fixture(ExamGenerationService service, GenerateExamMatrixRequest request, AiClient aiClient) {}
}
