package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.domain.model.lessonplan.Activity5512;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Kiểm chứng {@link LessonPlanService#detailOne} khi Hoạt động 2 (có tiểu hoạt động) fan-out
 * thành N call AI song song, một call cho mỗi tiểu hoạt động — thay vì một call duy nhất phải
 * gánh cả N tiểu hoạt động và dễ bị AI bỏ dở giữa chừng.
 *
 * <p>Dùng executor CHẠY ĐỒNG BỘ (cùng thread gọi) thay vì virtual-thread thật, để test tất định
 * (deterministic) và dễ debug hơn — logic fan-out/merge/ngưỡng lỗi không phụ thuộc việc các call
 * có thực sự chạy song song hay không.
 */
@ExtendWith(MockitoExtension.class)
class LessonPlanServiceActivityDetailTest {

    @Mock private TextbookCatalogRepository catalogRepository;
    @Mock private AiClient aiClient;
    @Mock private AiSystemPromptService systemPromptService;

    private LessonPlanService service() {
        return new LessonPlanService(
                catalogRepository, aiClient, new LessonPlan5512PromptBuilder(), new LessonPlanEditPromptBuilder(),
                new ObjectMapper(), sameThreadExecutor(), systemPromptService, 1, 0L);
    }

    /** Executor chạy task ngay trên thread gọi — tránh Mockito mock bị gọi từ nhiều thread. */
    private static ExecutorService sameThreadExecutor() {
        return new AbstractExecutorService() {
            @Override public void execute(Runnable command) {
                command.run();
            }

            @Override public void shutdown() {
            }

            @Override public List<Runnable> shutdownNow() {
                return List.of();
            }

            @Override public boolean isShutdown() {
                return false;
            }

            @Override public boolean isTerminated() {
                return false;
            }

            @Override public boolean awaitTermination(long timeout, TimeUnit unit) {
                return true;
            }
        };
    }

    private void stubSystemPrompt() {
        when(systemPromptService.apply(any(AiPromptKey.class), anyString()))
                .thenAnswer(invocation -> invocation.getArgument(1));
    }

    private Activity5512 frameActivityWithSubs(List<Activity5512> subs) {
        return new Activity5512(2, "Hoạt động 2: Hình thành kiến thức mới", "25 phút",
                null, null, null, null, null, subs);
    }

    private Activity5512 frameSub(int order, String name) {
        return new Activity5512(order, name, "10 phút", null, null, null, null, null, List.of());
    }

    private String subDetailJson(String label) {
        return """
                {"objective":"objective-%s","content":"content-%s","product":"product-%s",
                 "organization":{"transfer":"t-%s","perform":"p-%s","report":"r-%s","conclude":"c-%s"},
                 "organizationText":null,"subActivities":[]}
                """.formatted(label, label, label, label, label, label, label);
    }

    /**
     * Prompt của mỗi tiểu hoạt động luôn chứa TÊN CỦA MỌI tiểu hoạt động anh em (qua block
     * "HOẠT ĐỘNG 2 (cha, ...)" — xem {@code buildSubActivityDetailPrompt}), nên không thể phân
     * biệt call nào đang soạn tiểu hoạt động nào chỉ bằng {@code prompt.contains(name)}. Chỉ có
     * block DỮ LIỆU "TIỂU HOẠT ĐỘNG CẦN SOẠN" ở cuối prompt là DUY NHẤT đúng target của call đó
     * — tìm bằng marker "==={label}" mà {@code appendBlock} sinh ra (KHÔNG dùng
     * {@code indexOf("TIỂU HOẠT ĐỘNG CẦN SOẠN")} trực tiếp: cụm này cũng xuất hiện sớm hơn,
     * trong câu chỉ thị nền "...trong khối "TIỂU HOẠT ĐỘNG CẦN SOẠN"...").
     */
    private String targetSectionOf(String prompt) {
        return prompt.substring(prompt.indexOf("===TIỂU HOẠT ĐỘNG CẦN SOẠN"));
    }

    @Test
    void detailOneFansOutOneAiCallPerSubActivity() {
        stubSystemPrompt();
        Activity5512 sub1 = frameSub(1, "Tiểu hoạt động 1: Các loại hạt");
        Activity5512 sub2 = frameSub(2, "Tiểu hoạt động 2: Kích thước và khối lượng");
        Activity5512 sub3 = frameSub(3, "Tiểu hoạt động 3: Điện tích hạt nhân");
        Activity5512 frame = frameActivityWithSubs(List.of(sub1, sub2, sub3));

        when(aiClient.generate(anyString())).thenAnswer(invocation -> {
            String target = targetSectionOf(invocation.getArgument(0));
            if (target.contains(sub1.name())) return subDetailJson("sub1");
            if (target.contains(sub2.name())) return subDetailJson("sub2");
            if (target.contains(sub3.name())) return subDetailJson("sub3");
            throw new IllegalStateException("Prompt không khớp tiểu hoạt động nào: " + target);
        });

        Activity5512 result = service().detailOne(frame, "{}", "{}", "{}", "{}", null);

        assertEquals(3, result.subActivities().size());
        for (Activity5512 detailedSub : result.subActivities()) {
            assertNotNull(detailedSub.organization());
            assertNotNull(detailedSub.organization().transfer());
        }
        verify(aiClient, times(3)).generate(anyString());
    }

    @Test
    void detailOneKeepsSkeletonForOnlyTheFailedSubActivity() {
        stubSystemPrompt();
        Activity5512 sub1 = frameSub(1, "Tiểu hoạt động 1: Các loại hạt");
        Activity5512 sub2 = frameSub(2, "Tiểu hoạt động 2: Kích thước và khối lượng");
        Activity5512 frame = frameActivityWithSubs(List.of(sub1, sub2));

        when(aiClient.generate(anyString())).thenAnswer(invocation -> {
            String target = targetSectionOf(invocation.getArgument(0));
            if (target.contains(sub1.name())) return subDetailJson("sub1");
            if (target.contains(sub2.name())) throw new RuntimeException("AI lỗi");
            throw new IllegalStateException("Prompt không khớp tiểu hoạt động nào: " + target);
        });

        Activity5512 result = service().detailOne(frame, "{}", "{}", "{}", "{}", null);

        assertEquals(2, result.subActivities().size());
        Activity5512 detailedSub1 = result.subActivities().get(0);
        Activity5512 skeletonSub2 = result.subActivities().get(1);
        assertNotNull(detailedSub1.organization());
        assertNull(skeletonSub2.organization());
        assertNull(skeletonSub2.objective());
    }

    @Test
    void detailOneThrowsWhenEverySubActivityFails() {
        stubSystemPrompt();
        Activity5512 sub1 = frameSub(1, "Tiểu hoạt động 1: Các loại hạt");
        Activity5512 sub2 = frameSub(2, "Tiểu hoạt động 2: Kích thước và khối lượng");
        Activity5512 frame = frameActivityWithSubs(List.of(sub1, sub2));

        when(aiClient.generate(anyString())).thenThrow(new RuntimeException("AI lỗi"));

        assertThrows(LessonPlanGenerationException.class,
                () -> service().detailOne(frame, "{}", "{}", "{}", "{}", null));
    }

    @Test
    void detailOneUsesSingleCallForTopLevelActivityWithoutSubActivities() {
        stubSystemPrompt();
        Activity5512 frame = new Activity5512(1, "Hoạt động 1: Khởi động/Xác định vấn đề", "5 phút",
                null, null, null, null, null, List.of());
        when(aiClient.generate(anyString())).thenReturn("""
                {"objective":"obj","content":"content","product":"product",
                 "organization":null,"organizationText":"to-chuc","subActivities":[]}
                """);

        Activity5512 result = service().detailOne(frame, "{}", "{}", "{}", "{}", null);

        assertEquals("to-chuc", result.organizationText());
        assertEquals(0, result.subActivities().size());
        verify(aiClient, times(1)).generate(anyString());
    }

    /**
     * Tái hiện lỗi thật: AI copy đúng ví dụ công thức trong prompt (vd "220\,\text{V}") nhưng
     * không tự escape "\," thành "\\," trong JSON, khiến Jackson báo
     * "Unrecognized character escape ','". {@code repairLatexEscapes} phải tự vá được, không
     * cần AI trả JSON hợp lệ ngay từ đầu — xem `LessonPlanService.repairLatexEscapes`.
     */
    @Test
    void detailOneRepairsUnescapedLatexThinSpaceInAiJson() {
        stubSystemPrompt();
        Activity5512 frame = new Activity5512(1, "Hoạt động 1: Khởi động/Xác định vấn đề", "5 phút",
                null, null, null, null, null, List.of());
        when(aiClient.generate(anyString())).thenReturn("""
                {"objective":"obj","content":"content","product":"$$U = 220\\,\\text{V}$$",
                 "organization":null,"organizationText":"to-chuc","subActivities":[]}
                """);

        Activity5512 result = service().detailOne(frame, "{}", "{}", "{}", "{}", null);

        assertEquals("$$U = 220\\,\\text{V}$$", result.product());
    }
}
