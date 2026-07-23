package com.edua.beeduasystem.infrastructure.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/** Adds a trace id and request lifecycle logs without logging request bodies or knowledge_json. */
@Slf4j
@Component
public class ExamRequestLoggingFilter extends OncePerRequestFilter {
    public static final String MDC_KEY = "examRequestId";
    public static final String HEADER = "X-Exam-Request-ID";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/exams/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String requestId = normalizeRequestId(request.getHeader("X-Client-Request-ID"));
        long started = System.nanoTime();
        MDC.put(MDC_KEY, requestId);
        response.setHeader(HEADER, requestId);
        log.info("EXAM_REQUEST_START method={} path={} remote={}", request.getMethod(), request.getRequestURI(), request.getRemoteAddr());
        try {
            chain.doFilter(request, response);
        } finally {
            log.info("EXAM_REQUEST_END method={} path={} status={} durationMs={}", request.getMethod(),
                    request.getRequestURI(), response.getStatus(), elapsedMs(started));
            MDC.remove(MDC_KEY);
        }
    }

    private static String normalizeRequestId(String candidate) {
        if (candidate != null && candidate.matches("[A-Za-z0-9_-]{8,64}")) return candidate;
        return UUID.randomUUID().toString();
    }

    private static long elapsedMs(long started) {
        return (System.nanoTime() - started) / 1_000_000;
    }
}
