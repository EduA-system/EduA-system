package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.domain.model.slide.ContentPlan;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SlideContentPlanParsingTests {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Test
    void parsesAndSerializesEveryBlockSubtypeAndRelationships() throws Exception {
        var root = MAPPER.readTree("""
                {"blocks":[
                  {"id":"t","kind":"text","role":"body","semanticType":"explanation","priority":"primary","required":true,"text":"Nội dung"},
                  {"id":"v","kind":"visual","role":"visual","semanticType":"diagram","priority":"secondary","required":true,"description":"Sơ đồ","requirement":"required"},
                  {"id":"c","kind":"comparison","role":"body","semanticType":"comparison","priority":"primary","required":true,"items":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"criteria":[{"id":"speed","label":"Tốc độ"}],"values":[["Nhanh","Chậm"]],"preferredPresentation":"auto"},
                  {"id":"tb","kind":"table","role":"body","semanticType":"data-table","priority":"primary","required":true,"columns":[{"id":"x","label":"X"}],"rows":[{"id":"r1","cells":["1"]}]},
                  {"id":"s","kind":"sequence","role":"body","semanticType":"process","priority":"primary","required":true,"steps":[{"id":"s1","label":"Bước 1","text":"Làm"}]},
                  {"id":"f","kind":"formula","role":"formula","semanticType":"formula","priority":"primary","required":true,"expression":"F=ma","explanation":"Newton"},
                  {"id":"q","kind":"quiz","role":"body","semanticType":"quiz","priority":"primary","required":true,"question":"Đúng?","choices":["Có","Không"],"answer":"Có"}
                ],"relationships":[
                  {"type":"illustrates","visualBlockId":"v","targetBlockId":"t"},
                  {"type":"supports","supportingBlockId":"f","targetBlockId":"t"},
                  {"type":"follows","beforeBlockId":"s","afterBlockId":"q"}
                ]}
                """);

        ContentPlan plan = GenerateSlideOutlineUseCase.parseContentPlan("concept", "fixed", root.path("blocks"), root.path("relationships"));

        assertEquals(7, plan.blocks().size());
        assertInstanceOf(ContentPlan.TextBlock.class, plan.blocks().get(0));
        assertInstanceOf(ContentPlan.VisualBlock.class, plan.blocks().get(1));
        assertInstanceOf(ContentPlan.ComparisonBlock.class, plan.blocks().get(2));
        assertInstanceOf(ContentPlan.TableBlock.class, plan.blocks().get(3));
        assertInstanceOf(ContentPlan.SequenceBlock.class, plan.blocks().get(4));
        assertInstanceOf(ContentPlan.FormulaBlock.class, plan.blocks().get(5));
        assertInstanceOf(ContentPlan.QuizBlock.class, plan.blocks().get(6));
        String json = MAPPER.writeValueAsString(plan);
        for (String kind : List.of("text", "visual", "comparison", "table", "sequence", "formula", "quiz")) {
            assertTrue(json.contains("\"kind\":\"" + kind + "\""));
        }
    }

    @Test
    void rejectsDuplicateIdsInvalidReferencesAndCellCounts() throws Exception {
        var missing = MAPPER.readTree("{}");
        assertThrows(IllegalArgumentException.class, () -> GenerateSlideOutlineUseCase.parseContentPlan("concept", "fixed", missing.path("blocks"), missing.path("relationships")));

        var duplicate = MAPPER.readTree("""
                {"blocks":[
                  {"id":"x","kind":"text","role":"body","semanticType":"note","priority":"primary","required":true,"text":"A"},
                  {"id":"x","kind":"text","role":"body","semanticType":"note","priority":"primary","required":true,"text":"B"}
                ],"relationships":[]}
                """);
        assertThrows(IllegalArgumentException.class, () -> GenerateSlideOutlineUseCase.parseContentPlan("concept", "fixed", duplicate.path("blocks"), duplicate.path("relationships")));

        var reference = MAPPER.readTree("""
                {"blocks":[{"id":"x","kind":"text","role":"body","semanticType":"note","priority":"primary","required":true,"text":"A"}],
                 "relationships":[{"type":"supports","supportingBlockId":"x","targetBlockId":"missing"}]}
                """);
        assertThrows(IllegalArgumentException.class, () -> GenerateSlideOutlineUseCase.parseContentPlan("concept", "fixed", reference.path("blocks"), reference.path("relationships")));

        var table = MAPPER.readTree("""
                {"blocks":[{"id":"tb","kind":"table","role":"body","semanticType":"data-table","priority":"primary","required":true,
                 "columns":[{"id":"a","label":"A"},{"id":"b","label":"B"}],"rows":[{"id":"r","cells":["1"]}]}],"relationships":[]}
                """);
        assertThrows(IllegalArgumentException.class, () -> GenerateSlideOutlineUseCase.parseContentPlan("table", "fixed", table.path("blocks"), table.path("relationships")));
    }

    @Test
    void outlinePromptsRequestSemanticsWithoutDesignMeasurements() {
        SlidePromptBuilder builder = new SlidePromptBuilder();
        LessonContext lesson = new LessonContext("id", "Newton", 10, "", List.of(), List.of(), List.of(), List.of(), List.of());
        InlineLessonPlanDto plan = new InlineLessonPlanDto("Newton", 10, 45, List.of("Hiểu"), List.of(), List.of(), "", "");
        String structure = builder.outlineStructurePrompt(lesson, plan, null, "ignored style", "Vật lý");
        String detail = builder.expandPartPrompt(lesson, plan, "{}", "p1", "Phần 1", "Vật lý");

        assertTrue(structure.contains("slideType"));
        assertTrue(detail.contains("relationships"));
        assertFalse(structure.contains("fontSize"));
        assertFalse(detail.contains("data-bbox"));
        assertFalse(detail.contains("width"));
        assertTrue(structure.contains("\"contentPlan\""));
        assertTrue(detail.contains("\"contentPlan\""));
    }

    @Test
    void extractsJsonWhenTheModelAddsProseAroundIt() throws Exception {
        String raw = "Đây là kết quả:\n```json\n{\"lessonTitle\":\"Newton\",\"parts\":[]}\n```\nHoàn tất.";
        var root = MAPPER.readTree(SlidePromptBuilder.stripFences(raw));
        assertEquals("Newton", root.path("lessonTitle").asText());
    }

    @Test
    void stripsFencesOnlyWhenPresentAndHandlesNullInput() {
        assertEquals("{\"a\":1}", SlidePromptBuilder.stripFences("```json\n{\"a\":1}\n```"));
        assertEquals("{\"a\":1}", SlidePromptBuilder.stripFences("  {\"a\":1}  "));
        assertEquals("", SlidePromptBuilder.stripFences(null));
        assertEquals("không phải JSON", SlidePromptBuilder.stripFences("không phải JSON"));
    }
}
