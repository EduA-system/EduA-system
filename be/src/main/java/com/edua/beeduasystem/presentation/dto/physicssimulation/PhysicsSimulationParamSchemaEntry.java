package com.edua.beeduasystem.presentation.dto.physicssimulation;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PhysicsSimulationParamSchemaEntry(
        @NotBlank String key,
        @NotBlank String label,
        @NotNull Double min,
        @NotNull Double max,
        Double step,
        String unit,
        String description) {
}
