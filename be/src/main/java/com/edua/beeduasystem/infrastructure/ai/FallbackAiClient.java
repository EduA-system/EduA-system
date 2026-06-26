package com.edua.beeduasystem.infrastructure.ai;

import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.AiDiagnosticsListener;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

@Slf4j
public class FallbackAiClient implements AiClient {

    private final List<AiClient> clients;
    private final AiDiagnosticsListener diagnostics;

    public FallbackAiClient(List<AiClient> clients) {
        this(clients, AiDiagnosticsListener.NO_OP);
    }

    public FallbackAiClient(List<AiClient> clients, AiDiagnosticsListener diagnostics) {
        this.clients = clients;
        this.diagnostics = diagnostics;
    }

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
            String provider = client.getClass().getSimpleName();
            diagnostics.onProviderAttempt(provider);
            try {
                String result = operation.apply(client);
                diagnostics.onProviderSucceeded(provider);
                return result;
            } catch (Exception e) {
                log.warn("AI provider {} failed: {}", provider, e.getMessage());
                diagnostics.onProviderFailed(provider, e.getMessage());
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
