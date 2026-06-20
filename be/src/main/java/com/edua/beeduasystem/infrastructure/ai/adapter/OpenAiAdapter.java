package com.edua.beeduasystem.infrastructure.ai.adapter;

import com.edua.beeduasystem.repository.AiClient;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.content.Media;
import org.springframework.util.MimeType;
import org.springframework.util.MimeTypeUtils;

@RequiredArgsConstructor
public class OpenAiAdapter implements AiClient {

    private final ChatModel chatModel;

    @Override
    public String generate(String prompt) {
        var response = chatModel.call(new Prompt(prompt));
        return response.getResult().getOutput().getText();
    }

    @Override
    public String generate(String prompt, byte[] image, String mimeType) {
        MimeType mt = (mimeType == null || mimeType.isBlank())
                ? MimeTypeUtils.IMAGE_JPEG
                : MimeType.valueOf(mimeType);
        var media = Media.builder()
                .mimeType(mt)
                .data(image)
                .build();
        var message = UserMessage.builder()
                .text(prompt)
                .media(media)
                .build();
        var response = chatModel.call(new Prompt(message));
        return response.getResult().getOutput().getText();
    }
}
