package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;
import com.edua.beeduasystem.presentation.dto.slides.PartDto;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/** In-memory state only; a browser can retry a part while its generation session is alive. */
@Service
class OutlineGenerationSessionStore {
    private static final Duration TTL = Duration.ofMinutes(30);
    private final Map<String, Session> sessions = new ConcurrentHashMap<>();

    void create(String sessionId, GenerateOutlineRequest request, LessonSourceContext source, Map<String, PartDto> parts) {
        purgeExpired();
        sessions.put(sessionId, new Session(request, source, new ConcurrentHashMap<>(parts), Instant.now().plus(TTL), false));
    }

    Optional<Session> find(String sessionId) {
        Session value = sessions.get(sessionId);
        if (value == null || value.expiresAt().isBefore(Instant.now())) {
            sessions.remove(sessionId);
            return Optional.empty();
        }
        return Optional.of(value);
    }

    private void purgeExpired() { sessions.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(Instant.now())); }

    static final class Session {
        private final GenerateOutlineRequest request;
        private final LessonSourceContext source;
        private final Map<String, PartDto> parts;
        private final Instant expiresAt;
        private volatile boolean started;

        Session(GenerateOutlineRequest request, LessonSourceContext source, Map<String, PartDto> parts, Instant expiresAt, boolean started) {
            this.request = request; this.source = source; this.parts = parts; this.expiresAt = expiresAt; this.started = started;
        }
        GenerateOutlineRequest request() { return request; }
        LessonSourceContext source() { return source; }
        Map<String, PartDto> parts() { return parts; }
        Instant expiresAt() { return expiresAt; }
        synchronized boolean startOnce() { if (started) return false; started = true; return true; }
    }
}
