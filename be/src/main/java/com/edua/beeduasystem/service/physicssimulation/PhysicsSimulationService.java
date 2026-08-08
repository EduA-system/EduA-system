package com.edua.beeduasystem.service.physicssimulation;

import com.edua.beeduasystem.domain.exception.PhysicsSimulationEditException;
import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.edua.beeduasystem.presentation.dto.physicssimulation.PhysicsSimulationEditRequest;
import com.edua.beeduasystem.presentation.dto.physicssimulation.PhysicsSimulationEditResponse;
import com.edua.beeduasystem.presentation.dto.physicssimulation.PhysicsSimulationParamSchemaEntry;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.Collectors;

@Service
public class PhysicsSimulationService {
    private final AiClient aiClient;
    private final PhysicsSimulationPromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;
    private final long aiTimeoutSeconds;
    private final AiSystemPromptService systemPromptService;

    @Autowired
    public PhysicsSimulationService(
            @Qualifier("jsonAiClient") AiClient aiClient,
            PhysicsSimulationPromptBuilder promptBuilder,
            ObjectMapper objectMapper,
            @Value("${app.ai.physics-simulation.timeout-seconds:10}") long aiTimeoutSeconds,
            AiSystemPromptService systemPromptService) {
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.objectMapper = objectMapper;
        this.aiTimeoutSeconds = aiTimeoutSeconds;
        this.systemPromptService = systemPromptService;
    }

    PhysicsSimulationService(AiClient aiClient, PhysicsSimulationPromptBuilder promptBuilder, ObjectMapper objectMapper, long aiTimeoutSeconds) {
        this(aiClient, promptBuilder, objectMapper, aiTimeoutSeconds, null);
    }

    public PhysicsSimulationEditResponse edit(PhysicsSimulationEditRequest request) {
        if (request.instruction() == null || request.instruction().isBlank()) {
            throw new PhysicsSimulationEditException("Hãy nhập yêu cầu chỉnh sửa.");
        }
        RawEdit raw;
        try {
            raw = objectMapper.readValue(extractJson(generateWithTimeout(request)), RawEdit.class);
        } catch (PhysicsSimulationEditException e) {
            throw e;
        } catch (Exception e) {
            throw new PhysicsSimulationEditException("AI không trả về chỉnh sửa hợp lệ.");
        }
        return validate(raw, request.paramSchema());
    }

    private String generateWithTimeout(PhysicsSimulationEditRequest request) {
        var executor = Executors.newVirtualThreadPerTaskExecutor();
        try {
            Future<String> task = executor.submit(() -> aiClient.generate(systemPromptService == null
                    ? promptBuilder.build(request)
                    : systemPromptService.apply(AiPromptKey.PHYSICS_SIMULATION_EDIT, promptBuilder.build(request))));
            try {
                return task.get(aiTimeoutSeconds, TimeUnit.SECONDS);
            } catch (TimeoutException e) {
                task.cancel(true);
                throw new PhysicsSimulationEditException("AI phản hồi quá lâu. Vui lòng thử lại sau.");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new PhysicsSimulationEditException("Yêu cầu chỉnh sửa đã bị gián đoạn.");
            } catch (ExecutionException e) {
                throw new PhysicsSimulationEditException("Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.");
            }
        } finally {
            executor.shutdownNow();
        }
    }

    private PhysicsSimulationEditResponse validate(RawEdit raw, List<PhysicsSimulationParamSchemaEntry> schema) {
        if (raw == null || raw.params == null) {
            throw new PhysicsSimulationEditException("AI không trả về tham số cần thay đổi.");
        }
        Map<String, PhysicsSimulationParamSchemaEntry> byKey = schema.stream()
                .collect(Collectors.toMap(PhysicsSimulationParamSchemaEntry::key, entry -> entry));
        Map<String, Double> validated = new LinkedHashMap<>();
        for (Map.Entry<String, Double> entry : raw.params.entrySet()) {
            String key = entry.getKey();
            Double value = entry.getValue();
            PhysicsSimulationParamSchemaEntry def = byKey.get(key);
            if (def == null) {
                throw new PhysicsSimulationEditException("AI trả về tham số không hợp lệ: " + key + ".");
            }
            if (value == null || value.isNaN() || value.isInfinite()) {
                throw new PhysicsSimulationEditException("Giá trị tham số " + def.label() + " không hợp lệ.");
            }
            if (value < def.min() || value > def.max()) {
                throw new PhysicsSimulationEditException("Giá trị " + def.label() + " (" + value
                        + ") vượt giới hạn cho phép [" + def.min() + " – " + def.max()
                        + (def.unit() != null ? " " + def.unit() : "") + "].");
            }
            validated.put(key, value);
        }
        String explanation = raw.explanation == null ? "" : raw.explanation.strip();
        return new PhysicsSimulationEditResponse(validated, explanation);
    }

    private static String extractJson(String response) {
        if (response == null) throw new PhysicsSimulationEditException("AI không trả về dữ liệu.");
        String text = response.strip().replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        int start = text.indexOf('{'), end = text.lastIndexOf('}');
        if (start < 0 || end <= start) throw new PhysicsSimulationEditException("AI không trả về JSON hợp lệ.");
        return text.substring(start, end + 1);
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record RawEdit(Map<String, Double> params, String explanation) {
    }
}
