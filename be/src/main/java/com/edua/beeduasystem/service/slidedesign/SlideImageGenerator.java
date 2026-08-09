package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.repository.gateways.ImageGenerationClient;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Sinh ảnh minh hoạ cho slide rồi upload lên storage, trả về URL công khai.
 *
 * <p>Tách riêng khỏi {@link FillSlideContentUseCase} vì có hai đường gọi cần đúng cùng một
 * luật prompt và cách map kích thước: bước 3 của pipeline tạo slide, và nút "tạo lại ảnh"
 * trong slide editor ({@link GenerateSlideImageUseCase}) khi ảnh sinh hỏng.
 */
@Component
@RequiredArgsConstructor
public class SlideImageGenerator {

    /**
     * Ảnh minh hoạ không được chứa chữ: model sinh ảnh viết sai chính tả tiếng Việt gần như
     * chắc chắn, và slide đã có text thật ở các slot khác nên chữ trong ảnh chỉ gây nhiễu +
     * trùng lặp. Luật này nối vào prompt CHỈ khi gọi Images API — prompt trả về FE vẫn là
     * prompt gốc của AI (FE hiển thị/lưu lại prompt đó).
     */
    static final String NO_TEXT_IN_IMAGE_RULE = " Strictly no text in the image: no words, letters,"
            + " numbers, labels, captions, titles, annotations, legends, axis ticks, watermarks or"
            + " signatures anywhere. Convey everything through shapes, arrows, and color alone.";

    private final ImageGenerationClient imageGenerationClient;
    private final StorageClient storageClient;

    /** Sinh ảnh và lưu, trả URL. Ném ngoại lệ của provider/storage cho caller tự quyết cách xử lý. */
    public String generateAndStore(String prompt, String size) {
        byte[] png = imageGenerationClient.generatePng(prompt + NO_TEXT_IN_IMAGE_RULE, size);
        String key = "slide-images/" + UUID.randomUUID() + ".png";
        return storageClient.store(key, png, "image/png");
    }

    /**
     * Map bbox thật của slot (từ layout engine FE) sang 1 trong 3 size cố định mà OpenAI
     * Images API chấp nhận, chọn theo tỉ lệ khung gần nhất — tránh ép mọi ảnh về vuông rồi bị
     * crop/méo khi hiển thị trong khung chữ nhật. Ngưỡng 1.15 chừa biên cho khung gần-vuông.
     */
    public static String resolveImageSize(Integer width, Integer height) {
        if (width == null || height == null || width <= 0 || height <= 0) return "1024x1024";
        double ratio = (double) width / height;
        if (ratio >= 1.15) return "1536x1024";
        if (ratio <= 1 / 1.15) return "1024x1536";
        return "1024x1024";
    }

    /** Không để API key của provider lọt vào message trả về FE hay vào log. */
    static String sanitizeError(String message) {
        if (message == null || message.isBlank()) return "unknown error";
        return message.replaceAll("sk-[A-Za-z0-9_-]+", "sk-***");
    }
}
