package com.edua.beeduasystem.infrastructure.messaging;

import com.edua.beeduasystem.repository.gateways.AiDiagnosticsListener;
import com.edua.beeduasystem.repository.gateways.SlideStreamPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SlideAiDiagnosticsBridge implements AiDiagnosticsListener {

    private final SlideStreamPort slideStream;
    private final ThreadLocal<TaskContext> taskContext = new ThreadLocal<>();

    public void runInContext(String sessionId, String partId, Runnable task) {
        taskContext.set(new TaskContext(sessionId, partId));
        try {
            task.run();
        } finally {
            taskContext.remove();
        }
    }

    @Override
    public void onProviderAttempt(String provider) {
        TaskContext ctx = taskContext.get();
        if (ctx == null) {
            return;
        }
        slideStream.publishLog(
                ctx.sessionId(),
                "info",
                provider,
                "Đang gọi " + provider + "…",
                ctx.partId());
    }

    @Override
    public void onProviderFailed(String provider, String message) {
        TaskContext ctx = taskContext.get();
        if (ctx == null) {
            return;
        }
        slideStream.publishLog(ctx.sessionId(), "warn", provider, message, ctx.partId());
    }

    @Override
    public void onProviderSucceeded(String provider) {
        TaskContext ctx = taskContext.get();
        if (ctx == null) {
            return;
        }
        slideStream.publishLog(
                ctx.sessionId(),
                "info",
                provider,
                provider + " thành công",
                ctx.partId());
    }

    private record TaskContext(String sessionId, String partId) {
    }
}
