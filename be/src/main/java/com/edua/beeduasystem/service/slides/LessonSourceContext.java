package com.edua.beeduasystem.service.slides;

import com.edua.beeduasystem.presentation.dto.slides.GenerateOutlineRequest;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

/** Session-scoped lesson snapshot. Chapters are AI-generated from the source, never copied from headings. */
final class LessonSourceContext {

    record Activity(String id, String title, String goal, List<String> chunkIds, int slideBudget) { }

    private final String snapshotId;
    private final List<LessonContentChunker.Chunk> chunks;
    private final List<Activity> activities;

    private LessonSourceContext(String snapshotId, List<LessonContentChunker.Chunk> chunks, List<Activity> activities) {
        this.snapshotId = snapshotId;
        this.chunks = List.copyOf(chunks);
        this.activities = List.copyOf(activities);
    }

    static LessonSourceContext from(GenerateOutlineRequest request, LessonContentChunker chunker) {
        String source = request.lessonContent() == null ? "" : request.lessonContent();
        List<LessonContentChunker.Chunk> chunks = source.isBlank() ? List.of() : chunker.chunk(source);
        return new LessonSourceContext(snapshotId(request, source), chunks, List.of());
    }

    LessonSourceContext withActivities(List<Activity> chapters) {
        return new LessonSourceContext(snapshotId, chunks, chapters);
    }

    String snapshotId() { return snapshotId; }
    List<Activity> activities() { return activities; }
    List<LessonContentChunker.Chunk> chunks() { return chunks; }

    String readSource(List<String> ids) {
        return chunks.stream().filter(chunk -> ids.contains(chunk.id()))
                .map(chunk -> "CHUNK " + chunk.id() + ":\n" + chunk.contextualText())
                .reduce("", (left, right) -> left.isEmpty() ? right : left + "\n\n" + right);
    }

    private static String snapshotId(GenerateOutlineRequest request, String source) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((request.libraryContentId() + "\n" + request.lessonId() + "\n" + source).getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (int i = 0; i < 8; i++) hex.append(String.format("%02x", digest[i]));
            return "lesson-" + hex;
        } catch (Exception ignored) { return "lesson-inline"; }
    }
}
