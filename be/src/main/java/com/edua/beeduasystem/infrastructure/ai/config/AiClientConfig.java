package com.edua.beeduasystem.infrastructure.ai.config;

import com.edua.beeduasystem.infrastructure.ai.FallbackAiClient;
import com.edua.beeduasystem.infrastructure.ai.adapter.DeepSeekAdapter;
import com.edua.beeduasystem.infrastructure.ai.adapter.DeepSeekDisableThinkingInterceptor;
import com.edua.beeduasystem.infrastructure.ai.adapter.OpenAiAdapter;
import com.edua.beeduasystem.infrastructure.ai.adapter.OpenAiImageAdapter;
import com.edua.beeduasystem.repository.gateways.AiClient;
import com.edua.beeduasystem.repository.gateways.AiDiagnosticsListener;
import com.edua.beeduasystem.repository.gateways.ImageGenerationClient;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.ai.openai.OpenAiChatOptions;
import org.springframework.ai.openai.OpenAiImageModel;
import org.springframework.ai.openai.api.OpenAiApi;
import org.springframework.ai.openai.api.OpenAiImageApi;
import org.springframework.ai.openai.api.ResponseFormat;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.web.client.RestClient;

import java.util.List;

@Configuration
public class AiClientConfig {

    /**
     * DeepSeek always needs its thinking mode disabled (see {@link DeepSeekDisableThinkingInterceptor}),
     * so every DeepSeek {@link OpenAiApi} in this config is built through here rather than repeating
     * the interceptor wiring at each call site.
     */
    private static OpenAiApi buildDeepSeekApi(String apiKey, String baseUrl) {
        return OpenAiApi.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .restClientBuilder(RestClient.builder()
                        .requestInterceptor(new DeepSeekDisableThinkingInterceptor()))
                .build();
    }

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
        // DeepSeek (primary, text-only).
        var deepseekApi = buildDeepSeekApi(deepseekApiKey, deepseekBaseUrl);
        var deepseekChatModel = OpenAiChatModel.builder()
                .openAiApi(deepseekApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(deepseekModel)
                        .maxTokens(8192)
                        .build())
                .build();

        // OpenAI (fallback; also the only vision-capable provider, so image-input calls always land here
        // since DeepSeekAdapter throws UnsupportedOperationException for image input).
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

        return new FallbackAiClient(List.of(
                new DeepSeekAdapter(deepseekChatModel),
                new OpenAiAdapter(openaiChatModel)
        ), diagnostics != null ? diagnostics : AiDiagnosticsListener.NO_OP);
    }

    /**
     * Dedicated client for practice-exam batch generation only. Same DeepSeek-primary/OpenAI-fallback
     * shape as {@link #aiClient}, but with a much lower, independently tunable maxTokens: practice-exam
     * batches are capped at 1-5 questions each and normally need well under 1500 tokens, whereas a small
     * fraction of ESSAY/SHORT_ANSWER single-question batches balloon to 2600-2900 tokens/40+ seconds.
     * Capping maxTokens here bounds that worst-case latency without affecting slide-HTML, lesson-plan,
     * or molecule generation, which use the shared {@link #aiClient} and need far larger completions.
     */
    @Bean("practiceExamAiClient")
    public AiClient practiceExamAiClient(
            @Value("${app.ai.openai.api-key}") String openaiApiKey,
            @Value("${app.ai.openai.base-url:https://api.openai.com}") String openaiBaseUrl,
            @Value("${app.ai.openai.default-model:gpt-4o-mini}") String openaiModel,
            @Value("${app.ai.deepseek.api-key}") String deepseekApiKey,
            @Value("${app.ai.deepseek.base-url:https://api.deepseek.com}") String deepseekBaseUrl,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel,
            @Value("${app.ai.practice-exam.max-tokens:2600}") int practiceExamMaxTokens,
            @Autowired(required = false) AiDiagnosticsListener diagnostics
    ) {
        var deepseekApi = buildDeepSeekApi(deepseekApiKey, deepseekBaseUrl);
        var deepseekChatModel = OpenAiChatModel.builder()
                .openAiApi(deepseekApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(deepseekModel)
                        .maxTokens(practiceExamMaxTokens)
                        .build())
                .build();

        var openaiApi = OpenAiApi.builder()
                .baseUrl(openaiBaseUrl)
                .apiKey(openaiApiKey)
                .build();
        var openaiChatModel = OpenAiChatModel.builder()
                .openAiApi(openaiApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(openaiModel)
                        .maxTokens(practiceExamMaxTokens)
                        .build())
                .build();

        return new FallbackAiClient(List.of(
                new DeepSeekAdapter(deepseekChatModel),
                new OpenAiAdapter(openaiChatModel)
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

        var deepseekApi = buildDeepSeekApi(deepseekApiKey, deepseekBaseUrl);
        var deepseekChatModel = OpenAiChatModel.builder()
                .openAiApi(deepseekApi)
                .defaultOptions(OpenAiChatOptions.builder()
                        .model(deepseekModel)
                        .maxTokens(8192)
                        .responseFormat(jsonObject)
                        .build())
                .build();

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

        return new FallbackAiClient(List.of(
                new DeepSeekAdapter(deepseekChatModel),
                new OpenAiAdapter(openaiChatModel)
        ), diagnostics != null ? diagnostics : AiDiagnosticsListener.NO_OP);
    }

    /**
     * Sinh ảnh minh hoạ slide thật từ {@code data-image-prompt} (OpenAI Images API,
     * {@code gpt-image-1} mặc định — dòng {@code dall-e-*} đã bị OpenAI gỡ khỏi API này).
     * Không có fallback provider — DeepSeek không có image API; nếu OpenAI lỗi,
     * {@link com.edua.beeduasystem.service.slidedesign.FillSlideContentUseCase} tự rơi về
     * chỉ trả imagePrompt (placeholder xám ở FE), không chặn cả slide.
     */
    @Bean("imageGenerationClient")
    public ImageGenerationClient imageGenerationClient(
            @Value("${app.ai.openai.api-key}") String openaiApiKey,
            @Value("${app.ai.openai.base-url:https://api.openai.com}") String openaiBaseUrl,
            @Value("${app.ai.openai.image-model:gpt-image-1}") String imageModelName
    ) {
        var openaiImageApi = OpenAiImageApi.builder()
                .baseUrl(openaiBaseUrl)
                .apiKey(openaiApiKey)
                .build();
        var openaiImageModel = new OpenAiImageModel(openaiImageApi);
        return new OpenAiImageAdapter(openaiImageModel, imageModelName);
    }

    @Bean("deepseekAiClient")
    public AiClient deepseekAiClient(
            @Value("${app.ai.deepseek.api-key}") String deepseekApiKey,
            @Value("${app.ai.deepseek.base-url:https://api.deepseek.com}") String deepseekBaseUrl,
            @Value("${app.ai.deepseek.default-model:deepseek-chat}") String deepseekModel
    ) {
        var api = buildDeepSeekApi(deepseekApiKey, deepseekBaseUrl);
        var model = OpenAiChatModel.builder()
                .openAiApi(api)
                .defaultOptions(OpenAiChatOptions.builder().model(deepseekModel).maxTokens(8192).build())
                .build();
        return new DeepSeekAdapter(model);
    }
}