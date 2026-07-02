package com.edua.beeduasystem.infrastructure.ai.config;

import com.edua.beeduasystem.infrastructure.ai.FallbackAiClient;
import com.edua.beeduasystem.infrastructure.ai.adapter.DeepSeekAdapter;
// OpenAI tạm tắt — bật lại import này khi có API key.
// import com.edua.beeduasystem.infrastructure.ai.adapter.OpenAiAdapter;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.AiDiagnosticsListener;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.api.OpenAiApi;
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
            // OpenAI tạm tắt vì chưa có API key — giữ nguyên @Value để bật lại sau.
            // @Value("${app.ai.openai.api-key}") String openaiApiKey,
            // @Value("${app.ai.openai.base-url:https://api.openai.com}") String openaiBaseUrl,
            // @Value("${app.ai.openai.default-model:gpt-4o-mini}") String openaiModel,
            @Value("${app.ai.deepseek.api-key}") String deepseekApiKey,
            @Value("${app.ai.deepseek.base-url:https://api.deepseek.com}") String deepseekBaseUrl,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel,
            @Autowired(required = false) AiDiagnosticsListener diagnostics
    ) {
        // OpenAI (primary, vision-capable) — comment lại cho tới khi có API key.
        // var openaiApi = OpenAiApi.builder()
        //         .baseUrl(openaiBaseUrl)
        //         .apiKey(openaiApiKey)
        //         .build();
        // var openaiChatModel = OpenAiChatModel.builder()
        //         .openAiApi(openaiApi)
        //         .defaultOptions(OpenAiChatOptions.builder()
        //                 .model(openaiModel)
        //                 .build())
        //         .build();

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
                // new OpenAiAdapter(openaiChatModel),
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