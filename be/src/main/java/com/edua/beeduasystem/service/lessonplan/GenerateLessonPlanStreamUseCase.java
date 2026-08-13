package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.domain.model.lessonplan.Activity5512;
import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;
import com.edua.beeduasystem.domain.model.lessonplan.Materials;
import com.edua.beeduasystem.domain.model.lessonplan.Objectives;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanRequest;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanStreamRequest;
import com.edua.beeduasystem.repository.gateways.LessonPlanStreamPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Sinh giáo án 5512 theo kiểu STREAMING: trả 202 ngay, công việc chạy nền trên
 * virtual-thread executor và đẩy tiến trình về client qua {@link LessonPlanStreamPort}
 * (STOMP, topic {@code /topic/lesson-plan/{sessionId}}).
 *
 * <p>Thứ tự sự kiện: {@code FRAME_READY} (Phần I + II + dàn ý III) → tối đa 4 ×
 * ({@code ACTIVITY_READY} | {@code ACTIVITY_FAILED}) → {@code DONE} (hoặc {@code ERROR}
 * nếu hỏng khung). Khác bản đồng bộ {@link LessonPlanService#generateActivitiesDetails}
 * ở chỗ không chờ đủ 4 hoạt động — phần nào xong đẩy phần đó, né timeout proxy.
 */
@Slf4j
@Service
public class GenerateLessonPlanStreamUseCase {

    private final LessonPlanService lessonPlanService;
    private final LessonPlanAdditionalRequestValidator additionalRequestValidator;
    private final LessonPlanStreamPort stream;
    private final ExecutorService executor;

    public GenerateLessonPlanStreamUseCase(LessonPlanService lessonPlanService,
                                           LessonPlanAdditionalRequestValidator additionalRequestValidator,
                                           LessonPlanStreamPort stream,
                                           @Qualifier("slideSessionExecutor") ExecutorService executor) {
        this.lessonPlanService = lessonPlanService;
        this.additionalRequestValidator = additionalRequestValidator;
        this.stream = stream;
        this.executor = executor;
    }

    /** Kickoff bất đồng bộ: submit lên executor rồi trả về ngay (controller đáp 202). */
    public void start(GenerateLessonPlanStreamRequest req) {
        additionalRequestValidator.validateOrThrow(req.userPrompt());
        executor.submit(() -> run(req));
    }

    private void run(GenerateLessonPlanStreamRequest req) {
        String sessionId = req.sessionId();
        try {
            GenerateLessonPlanRequest base = new GenerateLessonPlanRequest(
                    req.bookId(), req.chapterId(), req.lessonId(), req.userPrompt());

            // --- Bước 1: dựng khung (I + II + dàn ý III) song song trên executor ---
            CompletableFuture<Objectives> objectivesF = CompletableFuture.supplyAsync(
                    () -> lessonPlanService.generateObjectives(base).objectives(), executor);
            CompletableFuture<Materials> materialsF = CompletableFuture.supplyAsync(
                    () -> lessonPlanService.generateMaterials(base).equipmentAndMaterials(), executor);
            CompletableFuture<List<Activity5512>> frameF = CompletableFuture.supplyAsync(
                    () -> lessonPlanService.generateActivitiesFrame(base).activities(), executor);

            // I/II lỗi lẻ vẫn cho đi tiếp (field null); III-skeleton là bắt buộc để có gì mà fill.
            Objectives objectives = joinOrNull(objectivesF, "Phần I (Mục tiêu)", sessionId);
            Materials materials = joinOrNull(materialsF, "Phần II (Thiết bị & học liệu)", sessionId);

            List<Activity5512> frame;
            try {
                frame = frameF.join();
            } catch (RuntimeException e) {
                log.error("Sinh dàn ý Phần III thất bại cho session {}", sessionId, e);
                stream.publishFailed(sessionId, "Không sinh được dàn ý tiến trình dạy học: " + rootMessage(e));
                return;
            }
            if (frame == null || frame.isEmpty()) {
                stream.publishFailed(sessionId, "Dàn ý tiến trình dạy học rỗng — không có hoạt động để soạn.");
                return;
            }

            LessonPlan5512 frameDoc = new LessonPlan5512(null, objectives, materials, frame);
            stream.publishFrameReady(sessionId, frameDoc);

            // --- Bước 2: fan-out điền chi tiết từng hoạt động, xong cái nào đẩy cái đó ---
            String knowledge = lessonPlanService.loadKnowledge(req.bookId(), req.chapterId(), req.lessonId());
            String objectivesJson = lessonPlanService.toJson(objectives);
            String materialsJson = lessonPlanService.toJson(materials);
            String frameJson = lessonPlanService.toJson(frame);

            int total = frame.size();
            AtomicInteger completed = new AtomicInteger();
            for (Activity5512 activity : frame) {
                executor.submit(() -> {
                    String activityId = String.valueOf(activity.order());
                    try {
                        Activity5512 detailed = lessonPlanService.detailOne(
                                activity, knowledge, objectivesJson, materialsJson, frameJson, req.userPrompt());
                        stream.publishActivityReady(sessionId, activityId, detailed);
                    } catch (RuntimeException e) {
                        log.warn("Soạn chi tiết hoạt động '{}' (session {}) thất bại:",
                                activity.name(), sessionId, e);
                        stream.publishActivityFailed(sessionId, activityId, List.of(rootMessage(e)));
                    } finally {
                        if (completed.incrementAndGet() == total) {
                            // Chưa persist DB → lessonPlanId null.
                            stream.publishDone(sessionId, null);
                        }
                    }
                });
            }
        } catch (RuntimeException e) {
            log.error("Sinh giáo án streaming thất bại cho session {}", sessionId, e);
            stream.publishFailed(sessionId, rootMessage(e));
        }
    }

    /** Join future; lỗi thì log + trả null (cho phần I/II không bắt buộc). */
    private <T> T joinOrNull(CompletableFuture<T> future, String label, String sessionId) {
        try {
            return future.join();
        } catch (RuntimeException e) {
            log.warn("{} thất bại cho session {}, gửi null:", label, sessionId, e);
            return null;
        }
    }

    private String rootMessage(Throwable e) {
        Throwable cause = e;
        while (cause.getCause() != null && cause.getCause() != cause) {
            cause = cause.getCause();
        }
        return cause.getMessage() != null ? cause.getMessage() : cause.toString();
    }
}
