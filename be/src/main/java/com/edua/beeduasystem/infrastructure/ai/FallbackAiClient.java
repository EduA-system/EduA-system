package com.edua.beeduasystem.infrastructure.ai;

import com.edua.beeduasystem.repository.AiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
@RequiredArgsConstructor
public class FallbackAiClient implements AiClient {

    private final List<AiClient> clients;

    @Override
    public String generate(String prompt) {
        return execute(client -> client.generate(prompt));
    }

    @Override
    public String generate(String prompt, byte[] image, String mimeType) {
        return execute(client -> client.generate(prompt, image, mimeType));
    }

    private String execute(AiOperation operation) {
        Exception lastException = null;
        for (AiClient client : clients) {
            try {
                return operation.apply(client);
            } catch (Exception e) {
                log.warn("AI provider {} failed: {}", client.getClass().getSimpleName(), e.getMessage());
                lastException = e;
            }
        }
        throw new RuntimeException("All AI providers failed", lastException);
    }

    @FunctionalInterface
    private interface AiOperation {
        String apply(AiClient client) throws Exception;
    }
}
