package com.edua.beeduasystem.infrastructure.security;

import com.edua.beeduasystem.domain.model.auth.AccessTokenClaims;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Rate limit theo userId (SEC-07): {@code standard} req/phút cho endpoint thường,
 * {@code ai} req/phút cho endpoint AI (path chứa /generate hoặc /ai-edit). In-memory (Bucket4j).
 * Chạy sau JwtAuthenticationFilter nên đã có SecurityContext; request chưa auth thì bỏ qua.
 * Không phải Spring bean (tránh auto-register vào servlet chain) — khởi tạo trong SecurityConfig.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private final int standardPerMinute;
    private final int aiPerMinute;
    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();

    public RateLimitFilter(int standardPerMinute, int aiPerMinute) {
        this.standardPerMinute = standardPerMinute;
        this.aiPerMinute = aiPerMinute;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AccessTokenClaims claims)) {
            chain.doFilter(request, response);
            return;
        }

        boolean ai = isAiEndpoint(request.getRequestURI());
        String key = claims.userId() + (ai ? ":ai" : ":std");
        int limit = ai ? aiPerMinute : standardPerMinute;
        Bucket bucket = buckets.computeIfAbsent(key, k -> newBucket(limit));

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(429);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("{\"message\":\"Rate limit exceeded. Try again later.\"}");
        }
    }

    private static boolean isAiEndpoint(String uri) {
        return uri.contains("/generate") || uri.contains("/ai-edit");
    }

    private static Bucket newBucket(int perMinute) {
        Bandwidth limit = Bandwidth.builder()
                .capacity(perMinute)
                .refillGreedy(perMinute, Duration.ofMinutes(1))
                .build();
        return Bucket.builder().addLimit(limit).build();
    }
}
