package com.edua.beeduasystem.repository.gateways;

/**
 * Sinh ảnh minh hoạ thật từ mô tả tiếng Anh (data-image-prompt) cho pipeline slide.
 * Khác {@link AiClient}: chiều ngược lại — nhận text, trả ảnh, không phải nhận ảnh trả text.
 */
public interface ImageGenerationClient {

    /**
     * Sinh 1 ảnh PNG từ {@code prompt}, trả về bytes thô (chưa upload/lưu ở đâu).
     *
     * @param size kích thước ảnh theo schema của provider (OpenAI: {@code "1024x1024"},
     *             {@code "1024x1536"}, {@code "1536x1024"} hoặc {@code "auto"}).
     */
    byte[] generatePng(String prompt, String size);
}
