package com.edua.beeduasystem.presentation.dto.classroom;

import java.util.List;

/**
 * Body cua UC-47 Submit Assignment. Mo rong ngoai SRS goc (chi file): cho phep {@code textContent}
 * (rich text HTML, sanitize server-side) va/hoac {@code files}, phai co it nhat 1 trong 2.
 */
public record SubmitAssignmentRequest(
        String textContent,
        List<SubmissionFileRequest> files
) {
}
