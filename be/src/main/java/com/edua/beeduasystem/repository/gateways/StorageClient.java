package com.edua.beeduasystem.repository.gateways;

/**
 * Cổng lưu trữ file dùng chung (Cloudflare R2). Mỗi feature đẩy file qua đây
 * và nhận lại public URL. Implementation nằm ở {@code infrastructure/storage}.
 */
public interface StorageClient {

    /** Lưu {@code data} dưới khóa {@code key}, trả public URL truy cập file. */
    String store(String key, byte[] data, String contentType);
}
