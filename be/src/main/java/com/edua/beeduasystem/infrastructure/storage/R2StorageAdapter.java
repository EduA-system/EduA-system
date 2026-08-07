package com.edua.beeduasystem.infrastructure.storage;

import com.edua.beeduasystem.repository.gateways.StorageClient;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Lưu file lên Cloudflare R2 (S3-compatible) qua AWS S3 SDK.
 */
public class R2StorageAdapter implements StorageClient {

    private final S3Client s3Client;
    private final String bucket;
    private final String publicUrl;

    public R2StorageAdapter(S3Client s3Client, String bucket, String publicUrl) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.publicUrl = publicUrl;
    }

    @Override
    public String store(String key, byte[] data, String contentType) {
        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .cacheControl("public, max-age=31536000, immutable")
                .build();
        s3Client.putObject(request, RequestBody.fromBytes(data));
        return publicUrl + "/" + key;
    }
}
