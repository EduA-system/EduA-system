package com.edua.beeduasystem.repository.repositories;

import com.edua.beeduasystem.domain.model.library.HubContentReport;

/** Truy cập báo cáo vi phạm Community Hub. Service phụ thuộc interface này; JPA impl ở {@code infrastructure/persistence}. */
public interface HubContentReportRepository {

    HubContentReport save(HubContentReport report);
}
