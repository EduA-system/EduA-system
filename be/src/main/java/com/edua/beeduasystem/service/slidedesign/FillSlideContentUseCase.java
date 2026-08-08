package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillResponse;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentFillSlotResponse;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentSlotRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideContentStyleResponse;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.ImageGenerationClient;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import com.edua.beeduasystem.service.ai.AiSystemPromptService;
import com.edua.beeduasystem.domain.model.ai.AiPromptKey;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

@Slf4j
@Service
public class FillSlideContentUseCase {
    private static final int MAX_JSON_ATTEMPTS = 2;
    private final AiClient aiClient;
    private final SlideDesignPromptBuilder promptBuilder;
    private final ObjectMapper objectMapper;
    private final String modelLabel;
    private final AiSystemPromptService systemPromptService;
    private final ImageGenerationClient imageGenerationClient;
    private final StorageClient storageClient;
    private final ExecutorService imageExecutor;

    @Autowired
    public FillSlideContentUseCase(
            @Qualifier("jsonAiClient") AiClient aiClient,
            SlideDesignPromptBuilder promptBuilder,
            ObjectMapper objectMapper,
            AiSystemPromptService systemPromptService,
            ImageGenerationClient imageGenerationClient,
            StorageClient storageClient,
            @Qualifier("slideSessionExecutor") ExecutorService imageExecutor,
            @Value("${app.ai.openai.default-model:gpt-4o-mini}") String openaiModel,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel) {
        this.aiClient = aiClient;
        this.promptBuilder = promptBuilder;
        this.objectMapper = objectMapper;
        this.systemPromptService = systemPromptService;
        this.imageGenerationClient = imageGenerationClient;
        this.storageClient = storageClient;
        this.imageExecutor = imageExecutor;
        this.modelLabel = openaiModel + " → " + deepseekModel;
    }

    FillSlideContentUseCase(AiClient aiClient, SlideDesignPromptBuilder promptBuilder, ObjectMapper objectMapper,
                            ImageGenerationClient imageGenerationClient, StorageClient storageClient, ExecutorService imageExecutor,
                            String openaiModel, String deepseekModel) {
        this(aiClient, promptBuilder, objectMapper, null, imageGenerationClient, storageClient, imageExecutor, openaiModel, deepseekModel);
    }

    public SlideContentFillResponse execute(SlideContentFillRequest req) {
        List<SlideContentSlotRequest> requested = req.slots() == null ? List.of() : req.slots().stream()
                .filter(slot -> slot != null && slot.id() != null && !slot.id().isBlank())
                .toList();
        if (requested.isEmpty()) throw new IllegalArgumentException("Step 3 needs at least one content slot.");

        String prompt = promptBuilder.buildStep3ContentSlotsPrompt(req);
        log.info("slide-design.slot-fill prompt length={} slots={}", prompt.length(), requested.size());
        long started = System.currentTimeMillis();
        String raw = generateCompleteJson(prompt, requested.size());
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
        Map<Integer, CompletableFuture<String>> imageUrlFutures = new HashMap<>();
        for (SlideContentSlotRequest requestedSlot : requested) {
            RawSlot filled = byId.get(requestedSlot.id());
            if ("image".equalsIgnoreCase(requestedSlot.kind())) {
                String imagePrompt = cleanPrompt(filled == null ? null : filled.imagePrompt());
                int index = result.size();
                result.add(new SlideContentFillSlotResponse(requestedSlot.id(), null, imagePrompt, null, null));
                if (imagePrompt != null) {
                    String size = resolveImageSize(requestedSlot.width(), requestedSlot.height());
                    imageUrlFutures.put(index, CompletableFuture.supplyAsync(
                            () -> tryGenerateImageUrl(requestedSlot.id(), imagePrompt, size), imageExecutor));
                }
                continue;
            }
            result.add(new SlideContentFillSlotResponse(
                    requestedSlot.id(), cleanText(filled == null ? null : filled.text(), requestedSlot.maxChars(), requestedSlot.maxLines()), null,
                    cleanStyle(filled == null ? null : filled.style(), requestedSlot.zone(), palette), null));
        }
        imageUrlFutures.forEach((index, future) -> {
            String imageUrl = future.join();
            if (imageUrl == null) return;
            SlideContentFillSlotResponse slot = result.get(index);
            result.set(index, new SlideContentFillSlotResponse(
                    slot.slotId(), slot.text(), slot.imagePrompt(), slot.style(), imageUrl));
        });
        return new SlideContentFillResponse(result, latencyMs, modelLabel, null);
    }

    /** Sinh ảnh thật + upload R2; mọi lỗi (API, storage) chỉ log và trả null — không chặn slide. */
    private String tryGenerateImageUrl(String slotId, String prompt, String size) {
        try {
            byte[] png = imageGenerationClient.generatePng(prompt, size);
            String key = "slide-images/" + UUID.randomUUID() + ".png";
            return storageClient.store(key, png, "image/png");
        } catch (Exception error) {
            log.warn("slide-design.image-gen failed slotId={} error={}", slotId, error.getMessage());
            return null;
        }
    }

    /**
     * Map bbox thật của slot (từ layout engine FE) sang 1 trong 3 size cố định mà OpenAI
     * Images API chấp nhận, chọn theo tỉ lệ khung gần nhất — tránh ép mọi ảnh về vuông rồi bị
     * crop/méo khi hiển thị trong khung chữ nhật. Ngưỡng 1.15 chừa biên cho khung gần-vuông.
     */
    private static String resolveImageSize(Integer width, Integer height) {
        if (width == null || height == null || width <= 0 || height <= 0) return "1024x1024";
        double ratio = (double) width / height;
        if (ratio >= 1.15) return "1536x1024";
        if (ratio <= 1 / 1.15) return "1024x1536";
        return "1024x1024";
    }

    private String generateCompleteJson(String prompt, int requestedSlotCount) {
        Exception lastError = null;
        for (int attempt = 1; attempt <= MAX_JSON_ATTEMPTS; attempt++) {
            String attemptPrompt = attempt == 1 ? prompt : prompt + "\n\nRetry: your previous response was incomplete or invalid JSON. Return a shorter, complete JSON object only. Keep every requested slot concise and close all JSON brackets.";
            String raw = aiClient.generate(systemPromptService == null
                    ? attemptPrompt
                    : systemPromptService.apply(AiPromptKey.SLIDE_DESIGN_CONTENT_SLOTS, attemptPrompt));
            try {
                objectMapper.readValue(stripFence(raw), RawResponse.class);
                return raw;
            } catch (Exception error) {
                lastError = error;
                log.warn("slide-design.slot-fill invalid JSON attempt={}/{} slots={} responseChars={} error={}",
                        attempt, MAX_JSON_ATTEMPTS, requestedSlotCount, raw == null ? 0 : raw.length(), error.getMessage());
            }
        }
        throw new IllegalStateException("AI returned invalid slide-content JSON after " + MAX_JSON_ATTEMPTS + " attempts.", lastError);
    }

    private static String cleanText(String text, int maxChars, int maxLines) {
        if (text == null || text.isBlank()) return null;
        String value = text.strip().replace("\r\n", "\n").replace('\r', '\n');
        int lineBudget = maxLines > 0 ? maxLines : 4;
        int characterBudget = maxChars > 0 ? maxChars : 160;
        if (lineBudget > 0) {
            String[] lines = value.split("\\n");
            StringBuilder limited = new StringBuilder();
            for (int index = 0; index < lines.length && index < lineBudget; index++) {
                if (limited.length() > 0) limited.append('\n');
                limited.append(lines[index].strip());
            }
            value = limited.toString().strip();
        }
        if (value.length() > characterBudget) value = value.substring(0, characterBudget).strip();
        return value.isEmpty() ? null : value;
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
