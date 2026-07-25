package com.edua.beeduasystem.service.library;

import com.edua.beeduasystem.domain.exception.ResourceNotFoundException;
import com.edua.beeduasystem.domain.model.library.HubContentReport;
import com.edua.beeduasystem.domain.model.library.LibraryContentStatus;
import com.edua.beeduasystem.repository.repositories.HubContentReportRepository;
import com.edua.beeduasystem.repository.repositories.LibraryContentRepository;
import com.edua.beeduasystem.service.auth.CurrentUserProvider;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

/**
 * Báo cáo nội dung vi phạm trên Community Hub. Chỉ ghi nhận báo cáo (WBS không định nghĩa
 * luồng xử lý/review cho tính năng này — xem ITER3_CODE_CHECKLIST.md).
 */
@Service
public class HubContentReportService {

    private final HubContentReportRepository reportRepository;
    private final LibraryContentRepository contentRepository;
    private final CurrentUserProvider currentUser;

    public HubContentReportService(HubContentReportRepository reportRepository,
                                   LibraryContentRepository contentRepository,
                                   CurrentUserProvider currentUser) {
        this.reportRepository = reportRepository;
        this.contentRepository = contentRepository;
        this.currentUser = currentUser;
    }

    public void create(UUID contentId, String rawReason) {
        if (rawReason == null || rawReason.isBlank()) {
            throw new IllegalArgumentException("Report reason is required.");
        }
        var content = contentRepository.findActiveById(contentId)
                .orElseThrow(() -> new ResourceNotFoundException("Content not found."));
        if (content.status() != LibraryContentStatus.APPROVED) {
            throw new ResourceNotFoundException("Content not found.");
        }
        reportRepository.save(new HubContentReport(UUID.randomUUID(), contentId, currentUser.requireUserId(), rawReason.trim(), Instant.now()));
    }
}
