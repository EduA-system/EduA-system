package com.edua.beeduasystem.service.physicssimulation;

import com.edua.beeduasystem.domain.exception.PhysicsSimulationEditException;
import com.edua.beeduasystem.presentation.dto.physicssimulation.PhysicsSimulationEditRequest;
import com.edua.beeduasystem.presentation.dto.physicssimulation.PhysicsSimulationEditResponse;
import com.edua.beeduasystem.presentation.dto.physicssimulation.PhysicsSimulationParamSchemaEntry;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PhysicsSimulationServiceTest {
    private AiClient aiClient;
    private PhysicsSimulationService service;

    @BeforeEach
    void setUp() {
        aiClient = mock(AiClient.class);
        service = new PhysicsSimulationService(aiClient, new PhysicsSimulationPromptBuilder(), new ObjectMapper(), 1);
    }

    private PhysicsSimulationEditRequest request(String instruction) {
        List<PhysicsSimulationParamSchemaEntry> schema = List.of(
                new PhysicsSimulationParamSchemaEntry("v0", "Vận tốc ban đầu", 0.0, 50.0, 1.0, "m/s", null),
                new PhysicsSimulationParamSchemaEntry("angle", "Góc bắn", 0.0, 90.0, 1.0, "độ", null));
        Map<String, Double> currentValues = Map.of("v0", 10.0, "angle", 45.0);
        return new PhysicsSimulationEditRequest(instruction, "Chuyển động ném xiên", schema, currentValues);
    }

    @Test
    void appliesValidPatchWithinBounds() {
        when(aiClient.generate(anyString()))
                .thenReturn("```json\n{\"params\":{\"v0\":25},\"explanation\":\"Tăng vận tốc ban đầu lên 25 m/s.\"}\n```");

        PhysicsSimulationEditResponse result = service.edit(request("tăng vận tốc ban đầu lên 25"));

        assertEquals(Map.of("v0", 25.0), result.params());
        assertEquals("Tăng vận tốc ban đầu lên 25 m/s.", result.explanation());
    }

    @Test
    void rejectsUnknownParamKey() {
        when(aiClient.generate(anyString())).thenReturn("{\"params\":{\"mass\":5},\"explanation\":\"...\"}");
        assertThrows(PhysicsSimulationEditException.class, () -> service.edit(request("đổi khối lượng")));
    }

    @Test
    void rejectsOutOfBoundsValue() {
        when(aiClient.generate(anyString())).thenReturn("{\"params\":{\"v0\":999},\"explanation\":\"...\"}");
        assertThrows(PhysicsSimulationEditException.class, () -> service.edit(request("tăng vận tốc thật mạnh")));
    }

    @Test
    void acceptsEmptyPatchAsValidNoOpResponse() {
        when(aiClient.generate(anyString()))
                .thenReturn("{\"params\":{},\"explanation\":\"Yêu cầu không liên quan tới tham số hiện có.\"}");

        PhysicsSimulationEditResponse result = service.edit(request("thêm vật thứ hai"));

        assertTrue(result.params().isEmpty());
        assertEquals("Yêu cầu không liên quan tới tham số hiện có.", result.explanation());
    }

    @Test
    void rejectsInvalidJson() {
        when(aiClient.generate(anyString())).thenReturn("not json");
        assertThrows(PhysicsSimulationEditException.class, () -> service.edit(request("tăng vận tốc")));
    }

    @Test
    void rejectsBlankInstruction() {
        assertThrows(PhysicsSimulationEditException.class, () -> service.edit(request(" ")));
    }
}
