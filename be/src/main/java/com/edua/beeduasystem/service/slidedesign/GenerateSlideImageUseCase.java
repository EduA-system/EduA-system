package com.edua.beeduasystem.service.slidedesign;

import com.edua.beeduasystem.domain.exception.SlideImageGenerationException;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideImageGenerateRequest;
import com.edua.beeduasystem.presentation.dto.slidedesign.SlideImageGenerateResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Tạo lại một ảnh minh hoạ lẻ theo yêu cầu từ slide editor.
 *
 * <p>Bước 3 của pipeline không chặn slide khi Images API lỗi — slot hỏng chỉ giữ lại
 * placeholder kèm {@code imagePrompt}. Use case này là đường thử lại đúng ảnh đó mà không phải
 * chạy lại cả bước 3 (vốn tốn thêm một loạt call text cho toàn bộ slot của slide).
 *
 * <p>Khác {@link FillSlideContentUseCase}: ở đây lỗi được ném lên thành 502 để giáo viên biết
 * lần thử lại thất bại, thay vì nuốt lỗi và trả về ảnh rỗng.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GenerateSlideImageUseCase {

    /** Cùng trần với {@code cleanPrompt} của bước 3 để hai đường sinh ảnh nhận prompt như nhau. */
    private static final int MAX_PROMPT_CHARS = 600;

    private final SlideImageGenerator imageGenerator;

    public SlideImageGenerateResponse execute(SlideImageGenerateRequest req) {
        if (req == null || req.prompt() == null || req.prompt().isBlank()) {
            throw new IllegalArgumentException("Cần mô tả ảnh để tạo lại.");
        }
        String prompt = req.prompt().strip();
        if (prompt.length() > MAX_PROMPT_CHARS) prompt = prompt.substring(0, MAX_PROMPT_CHARS).strip();
        String size = SlideImageGenerator.resolveImageSize(req.width(), req.height());

        try {
            String imageUrl = imageGenerator.generateAndStore(prompt, size);
            log.info("slide-design.image-retry ok size={} promptChars={}", size, prompt.length());
            return new SlideImageGenerateResponse(imageUrl);
        } catch (Exception error) {
            String detail = SlideImageGenerator.sanitizeError(error.getMessage());
            log.warn("slide-design.image-retry failed size={} error={}", size, detail);
            throw new SlideImageGenerationException("Không tạo được ảnh minh hoạ: " + detail);
        }
    }
}
