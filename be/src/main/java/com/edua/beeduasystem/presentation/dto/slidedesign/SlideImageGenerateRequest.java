package com.edua.beeduasystem.presentation.dto.slidedesign;

/**
 * Tạo lại một ảnh minh hoạ lẻ cho slide đang mở trong editor.
 *
 * @param prompt mô tả ảnh (chính là {@code imagePrompt} mà bước 3 đã trả về cho slot đó)
 * @param width  chiều rộng khung ảnh trên canvas, px — để chọn tỉ lệ ảnh khớp khung
 * @param height chiều cao khung ảnh trên canvas, px
 */
public record SlideImageGenerateRequest(String prompt, Integer width, Integer height) {
}
