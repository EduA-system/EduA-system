package com.edua.beeduasystem.service.lessonplan;

import com.edua.beeduasystem.domain.model.lessonplan.LessonPlan5512;
import com.edua.beeduasystem.presentation.dto.lessonplan.GenerateLessonPlanStreamRequest;
import com.edua.beeduasystem.repository.gateways.LessonPlanStreamPort;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GenerateLessonPlanStreamUseCaseTest {
    @Test
    void start_publishesFailureWhenActivitiesFrameIsEmpty() {
        LessonPlanService service = mock(LessonPlanService.class);
        LessonPlanStreamPort stream = mock(LessonPlanStreamPort.class);
        ExecutorService executor = Executors.newFixedThreadPool(4);
        try {
            when(service.generateObjectives(any())).thenReturn(new LessonPlan5512(null, null, null, null));
            when(service.generateMaterials(any())).thenReturn(new LessonPlan5512(null, null, null, null));
            when(service.generateActivitiesFrame(any())).thenReturn(new LessonPlan5512(null, null, null, List.of()));

            new GenerateLessonPlanStreamUseCase(service, stream, executor)
                    .start(new GenerateLessonPlanStreamRequest("s1", "b", "c", "l", null));

            verify(stream, timeout(2000)).publishFailed(eq("s1"), contains("rỗng"));
            verify(stream, never()).publishFrameReady(anyString(), any());
        } finally { executor.shutdownNow(); }
    }
}
