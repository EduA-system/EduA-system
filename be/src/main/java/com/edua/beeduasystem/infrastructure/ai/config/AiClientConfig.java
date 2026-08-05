package com.edua.beeduasystem.infrastructure.ai.config;

import com.edua.beeduasystem.infrastructure.ai.FallbackAiClient;
import com.edua.beeduasystem.infrastructure.ai.adapter.DeepSeekAdapter;
import com.edua.beeduasystem.infrastructure.ai.adapter.OpenAiAdapter;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.AiDiagnosticsListener;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.openai.api.ResponseFormat;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.List;

@Configuration
public class AiClientConfig {

    @Bean
    @Primary
    public AiClient aiClient(
            @Value("${app.ai.openai.api-key}") String openaiApiKey,
            @Value("${app.ai.openai.base-url:https://api.openai.com}") String openaiBaseUrl,
            @Value("${app.ai.openai.default-model:gpt-4o-mini}") String openaiModel,
            @Value("${app.ai.deepseek.api-key}") String deepseekApiKey,
            @Value("${app.ai.deepseek.base-url:https://api.deepseek.com}") String deepseekBaseUrl,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel,
            @Autowired(required = false) AiDiagnosticsListener diagnostics
    ) {
        // OpenAI (primary, vision-capable).
        var openaiApi = OpenAiApi.builder()
                .baseUrl(openaiBaseUrl)
                .apiKey(openaiApiKey)
                .build();
        var openaiChatModel = OpenAiChatModel.builder()
                .openAiApi(openaiApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(openaiModel)
                        .maxTokens(8192)
                        .build())
                .build();

        var deepseekApi = OpenAiApi.builder()
                .baseUrl(deepseekBaseUrl)
                .apiKey(deepseekApiKey)
                .build();
        var deepseekChatModel = OpenAiChatModel.builder()
                .openAiApi(deepseekApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(deepseekModel)
                        .maxTokens(8192)
                        .build())
                .build();

        return new FallbackAiClient(List.of(
                new OpenAiAdapter(openaiChatModel),
                new DeepSeekAdapter(deepseekChatModel)
        ), diagnostics != null ? diagnostics : AiDiagnosticsListener.NO_OP);
    }

    /**
     * Same providers/fallback order as the primary client, but forces the OpenAI-compatible
     * "json_object" response format so the API rejects/repairs syntactically invalid JSON itself
     * instead of returning free-form text that may omit closing brackets. Only safe for callers
     * whose prompt always instructs the model to return JSON (OpenAI requires the word "json"
     * somewhere in the messages when this mode is on) — do NOT use this for HTML-generating prompts.
     */
    @Bean("jsonAiClient")
    public AiClient jsonAiClient(
            @Value("${app.ai.openai.api-key}") String openaiApiKey,
            @Value("${app.ai.openai.base-url:https://api.openai.com}") String openaiBaseUrl,
            @Value("${app.ai.openai.default-model:gpt-4o-mini}") String openaiModel,
            @Value("${app.ai.deepseek.api-key}") String deepseekApiKey,
            @Value("${app.ai.deepseek.base-url:https://api.deepseek.com}") String deepseekBaseUrl,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel,
            @Autowired(required = false) AiDiagnosticsListener diagnostics
    ) {
        ResponseFormat jsonObject = ResponseFormat.builder().type(ResponseFormat.Type.JSON_OBJECT).build();

        var openaiApi = OpenAiApi.builder()
                .baseUrl(openaiBaseUrl)
                .apiKey(openaiApiKey)
                .build();
        var openaiChatModel = OpenAiChatModel.builder()
                .openAiApi(openaiApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(openaiModel)
                        .maxTokens(8192)
                        .responseFormat(jsonObject)
                        .build())
                .build();

        var deepseekApi = OpenAiApi.builder()
                .baseUrl(deepseekBaseUrl)
                .apiKey(deepseekApiKey)
                .build();
        var deepseekChatModel = OpenAiChatModel.builder()
                .openAiApi(deepseekApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(deepseekModel)
                        .maxTokens(8192)
                        .responseFormat(jsonObject)
                        .build())
                .build();

        return new FallbackAiClient(List.of(
                new OpenAiAdapter(openaiChatModel),
                new DeepSeekAdapter(deepseekChatModel)
        ), diagnostics != null ? diagnostics : AiDiagnosticsListener.NO_OP);
    }

    @Bean("deepseekAiClient")
    public AiClient deepseekAiClient(
            @Value("${app.ai.deepseek.api-key}") String deepseekApiKey,
            @Value("${app.ai.deepseek.base-url:https://api.deepseek.com}") String deepseekBaseUrl,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel
    ) {
        var api = OpenAiApi.builder()
                .baseUrl(deepseekBaseUrl)
                .apiKey(deepseekApiKey)
                .build();
        var model = OpenAiChatModel.builder()
                .openAiApi(api)
                .defaultOptions(OpenAiChatOptions.builder().model(deepseekModel).maxTokens(8192).build())
                .build();
        return new DeepSeekAdapter(model);
    }
}