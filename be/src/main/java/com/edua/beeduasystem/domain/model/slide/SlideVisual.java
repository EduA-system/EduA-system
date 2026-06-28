package com.edua.beeduasystem.domain.model.slide;

/**
 * Đặc tả phần trực quan của một slide (ảnh/công thức/bảng) đã chốt ở outline,
 * để pha 3 dàn trang trung thành thay vì tự đoán.
 * {@code type}: image | formula | table | none. {@code spec}: mô tả nội dung.
 */
public record SlideVisual(String type, String spec) {
}
