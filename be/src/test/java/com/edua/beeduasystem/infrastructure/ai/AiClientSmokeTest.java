package com.edua.beeduasystem.infrastructure.ai;

import com.edua.beeduasystem.infrastructure.ai.config.AiClientConfig;
import com.edua.beeduasystem.repository.AiClient;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

@SpringJUnitConfig(classes = AiClientConfig.class)
@TestPropertySource(locations = "classpath:application.properties")
class AiClientSmokeTest {

    @Autowired
    private AiClient aiClient;

    @Test
    void greetInVietnamese() {
        assumeTrue(hasAnyAiKey(), "Set at least one AI provider env var to run the smoke test.");

        String response = aiClient.generate("Chao toi bang tieng Viet trong mot cau ngan.");
        System.out.println("AI response: " + response);
        assertThat(response).isNotBlank();
    }

    private boolean hasAnyAiKey() {
        return hasText(System.getenv("APP_AI_OPENAI_API_KEY"))
                || hasText(System.getenv("APP_AI_DEEPSEEK_API_KEY"));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
