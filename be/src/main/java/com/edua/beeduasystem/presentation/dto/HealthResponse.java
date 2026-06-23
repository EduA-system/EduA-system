package com.edua.beeduasystem.presentation.dto;

import com.edua.beeduasystem.domain.model.ApplicationHealth;

public record HealthResponse(String status, String service) {

    public static HealthResponse from(ApplicationHealth health) {
        return new HealthResponse(health.status(), health.service());
    }
}
