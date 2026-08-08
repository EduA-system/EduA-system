package com.edua.beeduasystem.presentation.dto.physicssimulation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

public record PhysicsSimulationEditRequest(
        @NotBlank(message = "Hãy nhập yêu cầu chỉnh sửa.")
        @Size(max = 500, message = "Yêu cầu không được quá 500 ký tự.")
        String instruction,

        @NotBlank(message = "Thiếu tên thí nghiệm.")
        String presetTitle,

        @NotEmpty(message = "Thiếu danh sách tham số.")
        @Valid
        List<PhysicsSimulationParamSchemaEntry> paramSchema,

        @NotEmpty(message = "Thiếu giá trị tham số hiện tại.")
        Map<String, Double> currentValues) {
}
