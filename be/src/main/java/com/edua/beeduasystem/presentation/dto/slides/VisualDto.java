package com.edua.beeduasystem.presentation.dto.slides;

/**
 * Đặc tả phần trực quan một slide cần có (soạn ở pha 2 authoring).
 * {@code type}: image | formula | table | none. {@code spec}: mô tả nội dung phần đó.
 */
public record VisualDto(String type, String spec) {
}
