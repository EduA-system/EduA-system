package com.edua.beeduasystem.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Executor dùng cho các phiên sinh giáo án 5512. Mỗi request chạy trên virtual
 * thread riêng (Java 21) để các lời gọi AI / chờ không block platform thread.
 *
 * <p>Bean này phục vụ cả task sinh chính và 4 {@link java.util.concurrent.CompletableFuture}
 * chạy song song cho 4 hoạt động (xem use case sinh giáo án 5512).
 */
@Configuration
public class VirtualThreadExecutorConfig {

    @Bean(name = "slideSessionExecutor", destroyMethod = "shutdown")
    public ExecutorService slideSessionExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }
}
