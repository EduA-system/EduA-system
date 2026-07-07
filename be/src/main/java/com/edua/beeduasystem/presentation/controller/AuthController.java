package com.edua.beeduasystem.presentation.controller;

import com.edua.beeduasystem.domain.model.auth.AuthTokens;
import com.edua.beeduasystem.presentation.dto.auth.AuthResponse;
import com.edua.beeduasystem.presentation.dto.auth.GoogleLoginRequest;
import com.edua.beeduasystem.presentation.dto.auth.UserDto;
import com.edua.beeduasystem.service.auth.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Đăng nhập Google OAuth2 + JWT (SEC-01/03/04)")
public class AuthController {

    private static final String REFRESH_COOKIE = "refresh_token";
    private static final String COOKIE_PATH = "/api/auth";

    private final AuthService authService;
    private final boolean cookieSecure;
    private final Duration refreshTtl;

    public AuthController(AuthService authService,
                          @Value("${app.auth.cookie.secure:false}") boolean cookieSecure,
                          @Value("${app.auth.jwt.refresh-ttl:PT24H}") Duration refreshTtl) {
        this.authService = authService;
        this.cookieSecure = cookieSecure;
        this.refreshTtl = refreshTtl;
    }

    @PostMapping("/google")
    @Operation(summary = "Đăng nhập bằng Google id_token",
            description = "Verify id_token (Google JWKS, audience=client_id) + kiểm allowlist email. "
                    + "Trả access token (body) và đặt refresh token vào HttpOnly cookie. "
                    + "401 nếu id_token sai; 403 nếu email chưa được cấp quyền/khóa.")
    public ResponseEntity<AuthResponse> loginWithGoogle(@RequestBody GoogleLoginRequest request) {
        AuthService.LoginResult result = authService.loginWithGoogle(request.idToken());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(result.tokens().refreshToken()).toString())
                .body(new AuthResponse(result.tokens().accessToken(), UserDto.from(result.user(), result.roles())));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Làm mới access token (rotation)",
            description = "Đọc refresh token từ cookie, rotation (revoke cũ + phát mới, sliding 24h). "
                    + "401 nếu thiếu/revoked/hết hạn.")
    public ResponseEntity<AuthResponse> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        AuthTokens tokens = authService.refresh(refreshToken);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookie(tokens.refreshToken()).toString())
                .body(new AuthResponse(tokens.accessToken(), null));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất", description = "Revoke refresh token hiện tại và xóa cookie.")
    public ResponseEntity<Void> logout(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, clearedRefreshCookie().toString())
                .build();
    }

    @GetMapping("/me")
    @Operation(summary = "Thông tin user hiện tại", description = "Yêu cầu Authorization: Bearer <access>.")
    public UserDto me() {
        var info = authService.currentUser();
        return UserDto.from(info.user(), info.roles());
    }

    private ResponseCookie refreshCookie(String value) {
        return ResponseCookie.from(REFRESH_COOKIE, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path(COOKIE_PATH)
                .maxAge(refreshTtl)
                .build();
    }

    private ResponseCookie clearedRefreshCookie() {
        return ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite("Lax")
                .path(COOKIE_PATH)
                .maxAge(0)
                .build();
    }
}
