package com.edua.beeduasystem.service.practiceexam;

import com.edua.beeduasystem.presentation.dto.practiceexam.GeneratePracticeExamStreamRequest;
import com.edua.beeduasystem.repository.gateways.PracticeExamStreamPort;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutorService;

/**
 * Sinh đề kiểm tra theo kiểu STREAMING: trả 202 ngay, công việc chạy nền trên
 * virtual-thread executor và đẩy tiến trình về client qua {@link PracticeExamStreamPort}
 * (STOMP, topic {@code /topic/practice-exam/{sessionId}}).
 *
 * <p>Khác {@link com.edua.beeduasystem.service.lessonplan.GenerateLessonPlanStreamUseCase}:
 * không tự viết lại orchestration — toàn bộ logic chia batch/concurrency/timeout/retry đã có
 * sẵn trong {@link PracticeExamService#generateStreaming}, use case này chỉ submit lên executor
 * rồi trả về ngay.
 */
@Slf4j
@Service
public class GeneratePracticeExamStreamUseCase {

    private final PracticeExamService practiceExamService;
    private final PracticeExamStreamPort stream;
    private final ExecutorService executor;

    public GeneratePracticeExamStreamUseCase(PracticeExamService practiceExamService,
                                              PracticeExamStreamPort stream,
                                              @Qualifier("slideSessionExecutor") ExecutorService executor) {
        this.practiceExamService = practiceExamService;
        this.stream = stream;
        this.executor = executor;
    }

    /** Kickoff bất đồng bộ: submit lên executor rồi trả về ngay (controller đáp 202). */
    public void start(GeneratePracticeExamStreamRequest req) {
        executor.submit(() -> {
            try {
                practiceExamService.generateStreaming(req.request(), req.sessionId(), stream);
            } catch (RuntimeException e) {
                log.error("Sinh đề kiểm tra streaming thất bại cho session {}", req.sessionId(), e);
                stream.publishFailed(req.sessionId(), "Lỗi hệ thống khi tạo đề. Vui lòng thử lại.");
            }
        });
    }
}
