package com.edua.beeduasystem.infrastructure.ai.adapter;

import com.edua.beeduasystem.repository.gateways.ImageGenerationClient;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.image.ImagePrompt;
import org.springframework.ai.image.ImageResponse;
import org.springframework.ai.openai.OpenAiImageModel;
import org.springframework.ai.openai.OpenAiImageOptions;

import java.util.Base64;

/**
 * Sinh ảnh minh hoạ slide qua OpenAI Images API ({@code gpt-image-2} mặc định — OpenAI đã
 * khai tử toàn bộ dòng {@code dall-e-*} khỏi API này). Dòng {@code gpt-image-*} luôn trả
 * {@code b64_json} sẵn (không có lựa chọn URL tạm), nên bytes lấy thẳng từ response rồi
 * caller upload lên R2.
 *
 * <p>{@code quality} phải set tường minh: mặc định của API là {@code "auto"}, vốn rơi vào
 * tier {@code high} ($0.167-0.25/ảnh) thay vì {@code low} ($0.005-0.006/ảnh với gpt-image-2).
 * Ảnh ở đây chỉ là minh hoạ nền cho slide nên {@code low} là đủ.
 *
 * <p>KHÔNG set {@code response_format}: tham số này đã bị OpenAI gỡ khỏi API — request kèm
 * theo sẽ bị từ chối với lỗi {@code Unknown parameter: 'response_format'} bất kể model nào.
 */
@RequiredArgsConstructor
public class OpenAiImageAdapter implements ImageGenerationClient {

    private final OpenAiImageModel imageModel;
    private final String model;

    @Override
    public byte[] generatePng(String prompt, String size) {
        // OpenAiImageOptions.Builder has no size(...) — the request's actual "size" field
        // (the only one OpenAI's API reads; width/height only exist for the vendor-neutral
        // ImageOptions interface and are dropped by OpenAiImageModel's request merge) must be
        // set via the plain setter.
        OpenAiImageOptions options = OpenAiImageOptions.builder()
                .model(model)
                .N(1)
                .build();
        options.setSize(size == null || size.isBlank() ? "1024x1024" : size);
        options.setQuality("low");
        ImageResponse response = imageModel.call(new ImagePrompt(prompt, options));
        String b64Json = response.getResult().getOutput().getB64Json();
        if (b64Json == null || b64Json.isBlank()) {
            throw new IllegalStateException("OpenAI image response missing b64Json data.");
        }
        return Base64.getDecoder().decode(b64Json);
    }
}
