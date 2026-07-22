package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillResponse;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillSlotResponse;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentSlotRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentStyleResponse;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class FillSlideContentUseCase {
    private final AiClient aiClient;
    private final SlideDesignPromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;
    private final String modelLabel;
    private final AiSystemPromptService systemPromptService;

    @Autowired
    public FillSlideContentUseCase(
            AiClient aiClient,
            SlideDesignPromptBuilder promptBuilder,
            ObjectMapper objectMapper,
            AiSystemPromptService systemPromptService,
            @Value("${app.ai.openai.default-model:gpt-4o-mini}") String openaiModel,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel) {
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.objectMapper = objectMapper;
        this.systemPromptService = systemPromptService;
        this.modelLabel = openaiModel + " → " + deepseekModel;
    }

    FillSlideContentUseCase(AiClient aiClient, SlideDesignPromptBuilder promptBuilder, ObjectMapper objectMapper,
                            String openaiModel, String deepseekModel) {
        this(aiClient, promptBuilder, objectMapper, null, openaiModel, deepseekModel);
    }

    public SlideContentFillResponse execute(SlideContentFillRequest req) {
        List<SlideContentSlotRequest> requested = req.slots() == null ? List.of() : req.slots().stream()
                .filter(slot -> slot != null && slot.id() != null && !slot.id().isBlank())
                .toList();
        if (requested.isEmpty()) throw new IllegalArgumentException("Step 3 needs at least one content slot.");

        String prompt = promptBuilder.buildStep3ContentSlotsPrompt(req);
        log.info("slide-design.slot-fill prompt length={} slots={}", prompt.length(), requested.size());
        long started = System.currentTimeMillis();
        String raw = aiClient.generate(systemPromptService == null ? prompt : systemPromptService.apply(AiPromptKey.SLIDE_DESIGN_CONTENT_SLOTS, prompt));
        long latencyMs = System.currentTimeMillis() - started;

        RawResponse rawResponse;
        try {
            rawResponse = objectMapper.readValue(stripFence(raw), RawResponse.class);
        } catch (Exception error) {
            throw new IllegalStateException("AI trả về JSON nội dung không hợp lệ cho slide.", error);
        }

        Map<String, RawSlot> byId = new HashMap<>();
        if (rawResponse.slots() != null) {
            for (RawSlot slot : rawResponse.slots()) {
                if (slot != null && slot.slotId() != null && !slot.slotId().isBlank()) byId.putIfAbsent(slot.slotId(), slot);
            }
        }

        Set<String> palette = new HashSet<>();
        if (req.palette() != null) {
            for (String color : req.palette()) if (color != null) palette.add(color.strip().toLowerCase(Locale.ROOT));
        }

        List<SlideContentFillSlotResponse> result = new ArrayList<>();
        for (SlideContentSlotRequest requestedSlot : requested) {
            RawSlot filled = byId.get(requestedSlot.id());
            if ("image".equalsIgnoreCase(requestedSlot.kind())) {
                result.add(new SlideContentFillSlotResponse(
                        requestedSlot.id(), null, cleanPrompt(filled == null ? null : filled.imagePrompt()), null));
                continue;
            }
            result.add(new SlideContentFillSlotResponse(
                    requestedSlot.id(), cleanText(filled == null ? null : filled.text()), null,
                    cleanStyle(filled == null ? null : filled.style(), requestedSlot.zone(), palette)));
        }
        return new SlideContentFillResponse(result, latencyMs, modelLabel, null);
    }

    private static String cleanText(String text) {
        if (text == null || text.isBlank()) return null;
        return text.strip();
    }

    private static String cleanPrompt(String prompt) {
        if (prompt == null || prompt.isBlank()) return null;
        String value = prompt.strip();
        return value.length() > 600 ? value.substring(0, 600).strip() : value;
    }

    private static SlideContentStyleResponse cleanStyle(RawStyle style, String zone, Set<String> palette) {
        if (style == null) return null;
        Integer fontSize = style.fontSize();
        if (fontSize != null) {
            int min = "hero".equals(zone) ? 28 : "formula".equals(zone) ? 14 : "caption".equals(zone) ? 10 : 12;
            int max = "hero".equals(zone) ? 64 : "formula".equals(zone) ? 32 : "caption".equals(zone) ? 20 : 24;
            fontSize = Math.max(min, Math.min(max, fontSize));
        }
        String color = style.color() == null ? null : style.color().strip().toLowerCase(Locale.ROOT);
        if (color != null && !palette.contains(color)) color = null;
        String align = style.align();
        if (align != null && !(align.equals("left") || align.equals("center") || align.equals("right"))) align = null;
        return new SlideContentStyleResponse(fontSize, color, style.bold(), style.italic(), align);
    }

    private static String stripFence(String raw) {
        if (raw == null) return "";
        String value = raw.strip();
        if (value.startsWith("```")) {
            int newline = value.indexOf('\n');
            if (newline >= 0) value = value.substring(newline + 1);
            if (value.endsWith("```")) value = value.substring(0, value.length() - 3);
        }
        return value.strip();
    }

    private record RawResponse(List<RawSlot> slots) {}
    private record RawSlot(String slotId, String text, String imagePrompt, RawStyle style) {}
    private record RawStyle(Integer fontSize, String color, Boolean bold, Boolean italic, String align) {}
}
