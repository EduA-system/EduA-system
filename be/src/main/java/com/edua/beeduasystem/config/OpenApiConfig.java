package com.edua.beeduasystem.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI eduaOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("EDUA Backend API")
                        .version("v1")
                        .description("OpenAPI documentation for the EDUA backend service."))
                // Nút "Authorize" trên Swagger để gắn access JWT (Authorization: Bearer ...).
                .components(new Components().addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Dán access token nhận từ POST /api/auth/google (không kèm 'Bearer ').")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
    }
}
