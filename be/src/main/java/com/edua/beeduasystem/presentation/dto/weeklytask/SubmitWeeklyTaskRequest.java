package com.edua.beeduasystem.presentation.dto.weeklytask;

import java.util.UUID;

/** Teacher nộp giáo án cho Weekly Task (UC-84) — đúng 1 trong 2: {@code libraryContentId} hoặc {@code documentUrl}+{@code documentName}. */
public record SubmitWeeklyTaskRequest(
        UUID libraryContentId,
        String documentUrl,
        String documentName
) {
}
