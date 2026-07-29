package com.edua.beeduasystem.domain.model.classroom;

/**
 * Trang thai nop bai cua 1 hoc sinh cho 1 class resource. {@code NOT_APPLICABLE}/{@code NOT_SUBMITTED}
 * dung khi chua co du lieu nop bai (resource khong bat submission, hoac hoc sinh chua nop);
 * {@code ON_TIME}/{@code LATE} tinh va luu 1 lan tai thoi diem submit (UC-47), so voi
 * {@code ClassResource.deadline()}.
 */
public enum SubmissionStatus {
    NOT_APPLICABLE,
    NOT_SUBMITTED,
    ON_TIME,
    LATE
}
