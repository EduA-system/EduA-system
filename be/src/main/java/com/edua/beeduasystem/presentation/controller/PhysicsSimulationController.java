package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.presentation.dto.physicssimulation.PhysicsSimulationEditRequest;
import com.edua.beeduasystem.presentation.dto.physicssimulation.PhysicsSimulationEditResponse;
import com.edua.beeduasystem.service.physicssimulation.PhysicsSimulationService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/physics-simulations")
@PreAuthorize("hasRole('TEACHER')")
public class PhysicsSimulationController {
    private final PhysicsSimulationService service;

    public PhysicsSimulationController(PhysicsSimulationService service) {
        this.service = service;
    }

    @PostMapping("/ai-edit")
    public PhysicsSimulationEditResponse aiEdit(@Valid @RequestBody PhysicsSimulationEditRequest request) {
        return service.edit(request);
    }
}
