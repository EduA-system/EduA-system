package com.edua.beeduasystem.domain.model.library;

import java.time.Instant;
import java.util.UUID;

/** Báo cáo vi phạm trên một content Community Hub đang APPROVED. */
public record HubContentReport(
        UUID id,
        UUID libraryContentId,
        UUID reporterId,
        String reason,
        Instant createdAt
) {
}
