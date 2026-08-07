package com.edua.beeduasystem.infrastructure.ai;

import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.AiDiagnosticsListener;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
public class FallbackAiClient implements AiClient {

    private static final Pattern HTTP_STATUS_IN_MESSAGE = Pattern.compile("(?<!\\d)([45]\\d{2})(?!\\d)");

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
                log.info("AI call succeeded provider={}", provider);
                return result;
            } catch (Exception e) {
                log.warn("AI call failed provider={} httpStatus={} detail={}", provider,
                        httpStatus(e), rootMessage(e));
                diagnostics.onProviderFailed(provider, e.getMessage());
                lastException = e;
            }
        }
        throw new RuntimeException("All AI providers failed", lastException);
    }

    private static String httpStatus(Throwable error) {
        for (Throwable current = error; current != null; current = current.getCause()) {
            if (current instanceof RestClientResponseException responseException) {
                return String.valueOf(responseException.getStatusCode().value());
            }
            String message = current.getMessage();
            if (message != null) {
                Matcher match = HTTP_STATUS_IN_MESSAGE.matcher(message);
                if (match.find()) return match.group(1);
            }
        }
        return "n/a";
    }

    private static String rootMessage(Throwable error) {
        Throwable root = error;
        while (root.getCause() != null) root = root.getCause();
        String message = root.getMessage();
        return message == null || message.isBlank() ? root.getClass().getSimpleName() : message;
    }

    @FunctionalInterface
    private interface AiOperation {
        String apply(AiClient client) throws Exception;
    }
}
