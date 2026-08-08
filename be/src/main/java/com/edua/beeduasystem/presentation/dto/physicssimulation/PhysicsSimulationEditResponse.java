package com.edua.beeduasystem.presentation.dto.physicssimulation;

import java.util.Map;

public record PhysicsSimulationEditResponse(Map<String, Double> params, String explanation) {
}
