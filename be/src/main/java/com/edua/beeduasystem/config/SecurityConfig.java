package com.edua.beeduasystem.config;

import com.edua.beeduasystem.infrastructure.security.JwtAuthenticationFilter;
import com.edua.beeduasystem.infrastructure.security.RateLimitFilter;
import com.edua.beeduasystem.repository.gateways.TokenService;
import jakarta.servlet.DispatcherType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Bảo mật stateless (JWT). Public: login/refresh/logout, health, swagger, STOMP handshake
 * và luồng tạo Ma trận/Bản đặc tả đang chạy ở chế độ thử nghiệm không cần đăng nhập.
 * Xác thực cho phiên STOMP được kiểm tra tại frame CONNECT.
 * Còn lại cần access token hợp lệ; RBAC chi tiết qua {@code @PreAuthorize} (SEC-04).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    private static final String[] PUBLIC_PATHS = {
            "/api/auth/google",
            "/api/auth/refresh",
            "/api/auth/logout",
            "/api/health",
            "/ws/**",
            "/swagger-ui/**",
            "/swagger-ui.html",
            "/v3/api-docs/**",
            "/api/textbooks/**",
            "/api/slides/**",
            "/api/slide-design/**",
            "/api/molecules/**",
            "/api/exams/**",
            "/api/uploads/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            TokenService tokenService,
            @Value("${app.auth.rate-limit.standard-per-minute:60}") int standardPerMinute,
            @Value("${app.auth.rate-limit.ai-per-minute:10}") int aiPerMinute) throws Exception {
        JwtAuthenticationFilter jwtFilter = new JwtAuthenticationFilter(tokenService);
        RateLimitFilter rateLimitFilter = new RateLimitFilter(standardPerMinute, aiPerMinute);
        http
                .cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Cho phep exception handler xu ly loi goc; neu khong ERROR dispatch se bi che thanh 401.
                        .dispatcherTypeMatchers(DispatcherType.ERROR, DispatcherType.FORWARD).permitAll()
                        .requestMatchers(PUBLIC_PATHS).permitAll()
                        .anyRequest().authenticated())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, JwtAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, e) -> {
                            log.warn("security authentication required method={} uri={} dispatcher={} reason={}",
                                    request.getMethod(), request.getRequestURI(), request.getDispatcherType(), e.getMessage());
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"message\":\"Authentication required.\"}");
                        })
                        .accessDeniedHandler((request, response, e) -> {
                            log.warn("security access denied method={} uri={} dispatcher={} reason={}",
                                    request.getMethod(), request.getRequestURI(), request.getDispatcherType(), e.getMessage());
                            response.setStatus(HttpStatus.FORBIDDEN.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"message\":\"Access denied.\"}");
                        }));
        return http.build();
    }
}
