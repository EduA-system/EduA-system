package com.edua.beeduasystem.service.upload;

import com.edua.beeduasystem.presentation.dto.upload.UploadResponse;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.UUID;

/**
 * Validate file tham chiếu (type + size) rồi đẩy lên R2, trả metadata.
 * Wrapper generic — không gắn nghiệp vụ lesson-plan (BR-09/10, SEC-05, MSG13).
 */
@Service
public class UploadService {

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("docx", "pdf", "pptx", "png", "jpg", "jpeg");
    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;
    private static final String MSG13 =
            "Unsupported file type or file exceeds the maximum size. "
                    + "Allowed: .docx, .pdf, .pptx, .png, .jpg, .jpeg (max 10 MB).";

    private final StorageClient storageClient;

    public UploadService(StorageClient storageClient) {
        this.storageClient = storageClient;
    }

    public UploadResponse upload(byte[] data, String fileName, String contentType) {
        if (data == null || data.length == 0) {
            throw new IllegalArgumentException(MSG13);
        }
        if (data.length > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException(MSG13);
        }
        String ext = extensionOf(fileName);
        if (!ALLOWED_EXTENSIONS.contains(ext)) {
            throw new IllegalArgumentException(MSG13);
        }

        String fileId = UUID.randomUUID().toString();
        String key = "uploads/" + fileId + "." + ext;
        String url = storageClient.store(key, data, contentType);

        return new UploadResponse(fileId, url, fileName, contentType, data.length);
    }

    private String extensionOf(String fileName) {
        if (fileName == null) {
            return "";
        }
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dot + 1).toLowerCase();
    }
}
