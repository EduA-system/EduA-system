package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.domain.model.lesson.LessonContext;
import com.edua.beeduasystem.domain.model.slide.ContentPlan;
import com.edua.beeduasystem.presentation.dto.slides.InlineLessonPlanDto;
import com.edua.beeduasystem.presentation.dto.slides.SlideItemDto;
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
    void parsesChemistryMoleculeAndPeriodicBlocks() throws Exception {
        var root = MAPPER.readTree("""
                {"blocks":[
                  {"id":"m","kind":"molecule","role":"visual","semanticType":"molecule-3d","priority":"secondary","required":true,"chemicalRequest":"H2O"},
                  {"id":"pt","kind":"periodic","role":"visual","semanticType":"periodic-table","priority":"secondary","required":true,"periodicRequest":"Na va Cl trong bang tuan hoan","mode":"table","elementSymbols":["Na","Cl"],"focus":"lien ket ion"}
                ],"relationships":[]}
                """);

        ContentPlan plan = GenerateSlideOutlineUseCase.parseContentPlan("concept", "fixed", root.path("blocks"), root.path("relationships"));

        assertEquals(2, plan.blocks().size());
        assertInstanceOf(ContentPlan.MoleculeBlock.class, plan.blocks().get(0));
        ContentPlan.PeriodicBlock periodic = assertInstanceOf(ContentPlan.PeriodicBlock.class, plan.blocks().get(1));
        assertEquals(List.of("Na", "Cl"), periodic.elementSymbols());
        assertEquals("table", periodic.mode());
    }

    @Test
    void parsesPhysicsExperimentBlocks() throws Exception {
        var root = MAPPER.readTree("""
                {"blocks":[
                  {"id":"ph","kind":"physics","role":"visual","semanticType":"physics-experiment","priority":"secondary","required":true,"physicsRequest":"con lac don"}
                ],"relationships":[]}
                """);

        ContentPlan plan = GenerateSlideOutlineUseCase.parseContentPlan("experiment", "fixed", root.path("blocks"), root.path("relationships"));

        assertEquals(1, plan.blocks().size());
        ContentPlan.PhysicsBlock physics = assertInstanceOf(ContentPlan.PhysicsBlock.class, plan.blocks().get(0));
        assertEquals("con lac don", physics.physicsRequest());
        assertTrue(MAPPER.writeValueAsString(plan).contains("\"kind\":\"physics\""));
    }

    @Test
    void rejectsPhysicsBlockWithoutRequest() throws Exception {
        var root = MAPPER.readTree("""
                {"blocks":[
                  {"id":"ph","kind":"physics","role":"visual","semanticType":"physics-experiment","priority":"secondary","required":true}
                ],"relationships":[]}
                """);

        assertThrows(IllegalArgumentException.class,
                () -> GenerateSlideOutlineUseCase.parseContentPlan("experiment", "fixed", root.path("blocks"), root.path("relationships")));
    }

    @Test
    void physicsPromptsExposePhysicsBlocksAlongsideChemistryOnes() {
        SlidePromptBuilder builder = new SlidePromptBuilder();
        LessonContext lesson = new LessonContext("id", "Con lac don", 10, "", List.of(), List.of(), List.of(), List.of(), List.of());
        InlineLessonPlanDto plan = new InlineLessonPlanDto("Con lac don", 10, 45, List.of("Hieu"), List.of(), List.of(), "", "");
        SlideItemDto slide = new SlideItemDto("p1s1", "Con lac don", "explain", null, null,
                new ContentPlan("experiment", "fixed", List.of(), List.of()));

        // Cả hai bản prompt song song phải mô tả kind `physics`; sửa thiếu một
        // bản là lỗi ngầm chỉ hiện ở một nhánh sinh slide.
        String partDetail = builder.expandPartPrompt(lesson, plan, "{}", "p1", "Phan 1", "PHYSICS");
        String slideDetail = builder.expandSlidePrompt(lesson, plan, "{}", "p1", "Phan 1", slide, "PHYSICS", "p1: Phan 1");

        for (String prompt : List.of(partDetail, slideDetail)) {
            assertTrue(prompt.contains("- physics:"));
            assertTrue(prompt.contains("physicsRequest"));
            // Mô phỏng chiếm trọn slide (topology `physics-stage` ở frontend), nên
            // block text kèm theo sẽ bị bố cục bỏ — prompt phải nói rõ đừng sinh.
            assertTrue(prompt.contains("block DUY NHẤT của slide"));
        }
        // Chỉ expandSlidePrompt mang khối GIỚI HẠN ĐỘ DÀI; expandPartPrompt
        // không có khối này từ trước, nên đừng đòi nó ở cả hai bản.
        assertTrue(slideDetail.contains("visual, molecule hoặc periodic"));
        assertTrue(slideDetail.contains("Slide có block physics: không kèm block nào khác"));
        assertFalse(partDetail.contains("GIỚI HẠN ĐỘ DÀI"));
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
    void promptsRequireSectionOpenersToHaveIntroText() {
        SlidePromptBuilder builder = new SlidePromptBuilder();
        LessonContext lesson = new LessonContext("id", "Newton", 10, "", List.of(), List.of(), List.of(), List.of(), List.of());
        InlineLessonPlanDto plan = new InlineLessonPlanDto("Newton", 10, 45, List.of(), List.of(), List.of(), "", "");
        SlideItemDto section = new SlideItemDto("p1-section", "Part 1", "explain", null, null,
                new ContentPlan("section", "hidden", List.of(), List.of()));

        String skeleton = builder.partSkeletonPrompt(lesson, plan, null, "Physics", "p1", "Part 1", List.of("c1"), 4, "p1: Part 1");
        String partDetail = builder.expandPartPrompt(lesson, plan, "{}", "p1", "Part 1", "Physics");
        String slideDetail = builder.expandSlidePrompt(lesson, plan, "{}", "p1", "Part 1", section, "Physics", "p1: Part 1");

        assertTrue(skeleton.contains("Section opener rule"));
        assertTrue(partDetail.contains("If slideType is `section`"));
        assertTrue(slideDetail.contains("If slideType is `section`"));
    }

    @Test
    void chemistryPromptsExposeMoleculeAndPeriodicBlocksForEnumSubject() {
        SlidePromptBuilder builder = new SlidePromptBuilder();
        LessonContext lesson = new LessonContext("id", "Bang tuan hoan", 10, "", List.of(), List.of(), List.of(), List.of(), List.of());
        InlineLessonPlanDto plan = new InlineLessonPlanDto("Bang tuan hoan", 10, 45, List.of("Hieu"), List.of(), List.of(), "", "");
        String detail = builder.expandPartPrompt(lesson, plan, "{}", "p1", "Phan 1", "CHEMISTRY");

        assertTrue(detail.contains("giáo viên môn Hoá học"));
        assertTrue(detail.contains("- molecule:"));
        assertTrue(detail.contains("- periodic:"));
        assertTrue(detail.contains("Tuyệt đối không dùng cho môn khác"));
    }

    @Test
    void extractsJsonWhenTheModelAddsProseAroundIt() throws Exception {
        String raw = "Đây là kết quả:\n```json\n{\"lessonTitle\":\"Newton\",\"parts\":[]}\n```\nHoàn tất.";
        var root = MAPPER.readTree(SlidePromptBuilder.stripFences(raw));
        assertEquals("Newton", root.path("lessonTitle").asText());
    }
}
