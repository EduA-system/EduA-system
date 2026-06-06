package com.edua.beeduasystem.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI eduaOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("EDUA Backend API")
                        .version("v1")
                        .description("OpenAPI documentation for the EDUA backend service."));
    }
}
