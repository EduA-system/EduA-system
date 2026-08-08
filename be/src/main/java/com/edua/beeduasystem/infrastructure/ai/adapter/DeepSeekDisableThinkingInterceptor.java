package com.edua.beeduasystem.infrastructure.ai.adapter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;

import java.io.IOException;

/**
 * DeepSeek's thinking mode is on by default and has no standard OpenAI request field to turn
 * off; it requires an out-of-band {@code "thinking": {"type": "disabled"}} field in the chat
 * completion body (DeepSeek's {@code extra_body} convention), which Spring AI's fixed
 * {@code ChatCompletionRequest} record has no slot for. This interceptor injects that field
 * into every outgoing DeepSeek request body.
 */
public class DeepSeekDisableThinkingInterceptor implements ClientHttpRequestInterceptor {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution)
            throws IOException {
        JsonNode root = MAPPER.readTree(body);
        byte[] patchedBody = body;
        if (root instanceof ObjectNode objectNode) {
            objectNode.putObject("thinking").put("type", "disabled");
            patchedBody = MAPPER.writeValueAsBytes(objectNode);
        }
        return execution.execute(request, patchedBody);
    }
}
