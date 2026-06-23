package com.edua.beeduasystem.infrastructure.storage.config;

import com.edua.beeduasystem.infrastructure.storage.R2StorageAdapter;
import com.edua.beeduasystem.repository.gateways.StorageClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;

import java.net.URI;

@Configuration
public class StorageConfig {

    @Bean
    public S3Client r2S3Client(
            @Value("${app.r2.endpoint}") String endpoint,
            @Value("${app.r2.access-key-id}") String accessKeyId,
            @Value("${app.r2.secret-access-key}") String secretAccessKey
    ) {
        return S3Client.builder()
                .endpointOverride(URI.create(endpoint))
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    @Bean
    public StorageClient storageClient(
            S3Client r2S3Client,
            @Value("${app.r2.bucket}") String bucket,
            @Value("${app.r2.public-url}") String publicUrl
    ) {
        return new R2StorageAdapter(r2S3Client, bucket, publicUrl);
    }
}
