package com.edua.beeduasystem.service.exam;

import com.edua.beeduasystem.domain.model.exam.ExamLessonSource;
import com.edua.beeduasystem.domain.model.exam.ExamScope;
import com.edua.beeduasystem.repository.repositories.TextbookCatalogRepository;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

@Service
@Slf4j
public class ExamScopeService {
    private static final int SCOPE_VERSION = 1;
    private final TextbookCatalogRepository catalogRepository;

    public ExamScopeService(TextbookCatalogRepository catalogRepository) {
        this.catalogRepository = catalogRepository;
    }

    public ExamScope preview(String subject, Integer grade, String examType) {
        long started = System.nanoTime();
        log.info("EXAM_SCOPE_START subject={} grade={} examType={}", subject, grade, examType);
        String normalizedSubject = requireSubject(subject);
        int normalizedGrade = requireGrade(grade);
        String normalizedExamType = requireExamType(examType);
        List<ExamLessonSource> all = catalogRepository.findExamLessonSources(normalizedSubject, normalizedGrade);
        log.info("EXAM_SCOPE_CATALOG_LOADED subject={} grade={} lessonCount={}", normalizedSubject, normalizedGrade, all.size());
        if (all.isEmpty()) {
            throw new IllegalArgumentException("Không tìm thấy dữ liệu SGK cho môn và lớp đã chọn.");
        }

        int semester = normalizedExamType.endsWith("HK1") ? 1 : 2;
        boolean hasVolumes = all.stream().anyMatch(source -> source.volume() != null);
        List<ExamLessonSource> semesterLessons;
        if (hasVolumes) {
            semesterLessons = all.stream().filter(source -> Integer.valueOf(semester).equals(source.volume())).toList();
        } else {
            int boundary = ceilHalf(all.size());
            semesterLessons = semester == 1 ? all.subList(0, boundary) : all.subList(boundary, all.size());
        }
        if (semesterLessons.isEmpty()) {
            throw new IllegalArgumentException("Không xác định được nội dung học kỳ từ catalog SGK hiện tại.");
        }
        List<ExamLessonSource> selected = normalizedExamType.startsWith("GIUA_")
                ? semesterLessons.subList(0, ceilHalf(semesterLessons.size()))
                : semesterLessons;

        List<ExamScope.LessonRef> refs = selected.stream().map(source -> new ExamScope.LessonRef(
                source.bookCode(), source.bookName(), source.chapterCode(), source.chapterName(),
                source.lessonCode(), source.lessonName())).toList();
        ExamScope scope = new ExamScope("ESTIMATED_BY_ORDER", SCOPE_VERSION, semester, normalizedSubject,
                normalizedGrade, normalizedExamType, token(normalizedSubject, normalizedGrade, normalizedExamType, refs),
                true, refs);
        log.info("EXAM_SCOPE_READY semester={} selectedLessons={} tokenPrefix={} durationMs={}", semester,
                refs.size(), scope.token().substring(0, 12), elapsedMs(started));
        return scope;
    }

    public List<ExamLessonSource> loadConfirmedSources(ExamScope scope) {
        List<ExamLessonSource> all = catalogRepository.findExamLessonSources(scope.subject(), scope.grade());
        var allowed = scope.lessons().stream()
                .map(ref -> ref.bookCode() + "\u0000" + ref.chapterCode() + "\u0000" + ref.lessonCode())
                .collect(java.util.stream.Collectors.toSet());
        List<ExamLessonSource> confirmed = all.stream().filter(source -> allowed.contains(
                source.bookCode() + "\u0000" + source.chapterCode() + "\u0000" + source.lessonCode())).toList();
        log.info("EXAM_SCOPE_CONFIRMED_SOURCES expected={} loaded={}", allowed.size(), confirmed.size());
        return confirmed;
    }

    private static int ceilHalf(int value) {
        return (value + 1) / 2;
    }

    private static long elapsedMs(long started) {
        return (System.nanoTime() - started) / 1_000_000;
    }

    private static String requireSubject(String value) {
        if (value == null) throw new IllegalArgumentException("Thiếu môn học.");
        String normalized = value.trim().toUpperCase();
        if (!List.of("PHYSICS", "CHEMISTRY", "MATH").contains(normalized)) {
            throw new IllegalArgumentException("Môn học không hợp lệ.");
        }
        return normalized;
    }

    private static int requireGrade(Integer grade) {
        if (grade == null || grade < 10 || grade > 12) throw new IllegalArgumentException("Lớp không hợp lệ.");
        return grade;
    }

    private static String requireExamType(String value) {
        if (value == null) throw new IllegalArgumentException("Thiếu loại kiểm tra.");
        String normalized = value.trim().toUpperCase();
        if (!List.of("GIUA_HK1", "CUOI_HK1", "GIUA_HK2", "CUOI_HK2").contains(normalized)) {
            throw new IllegalArgumentException("Loại kiểm tra không hợp lệ.");
        }
        return normalized;
    }

    private static String token(String subject, int grade, String examType, List<ExamScope.LessonRef> refs) {
        String raw = SCOPE_VERSION + "|" + subject + "|" + grade + "|" + examType + "|" + refs.stream()
                .map(ref -> ref.bookCode() + "/" + ref.chapterCode() + "/" + ref.lessonCode())
                .collect(java.util.stream.Collectors.joining("|"));
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
