package com.edua.beeduasystem.infrastructure.ai.adapter;

import com.edua.beeduasystem.repository.AiClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;

@Slf4j
@RequiredArgsConstructor
public class DeepSeekAdapter implements AiClient {

    private final ChatModel chatModel;

    @Override
    public String generate(String prompt) {
        var response = chatModel.call(new Prompt(prompt));
        return response.getResult().getOutput().getText();
    }

    @Override
    public String generate(String prompt, byte[] image, String mimeType) {
        throw new UnsupportedOperationException("DeepSeek does not support image input");
    }
}
