package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.HealthResponse;
import com.edua.beeduasystem.service.HealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "Basic service health endpoints")
public class HealthController {

    private final HealthService healthService;

    public HealthController(HealthService healthService) {
        this.healthService = healthService;
    }

    @GetMapping
    @Operation(
            summary = "Get application health",
            description = "Returns a simple health payload for local verification.",
            responses = {
                    @ApiResponse(
                            responseCode = "200",
                            description = "Service is available",
                            content = @Content(schema = @Schema(implementation = HealthResponse.class))
                    )
            }
    )
    public HealthResponse health() {
        return HealthResponse.from(healthService.getHealth());
    }
}
