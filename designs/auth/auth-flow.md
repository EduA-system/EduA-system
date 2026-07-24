# Auth — Luồng & thiết kế triển khai (BE)

> Xác thực Google OAuth2 + JWT nội bộ + RBAC cho EDUA. Spec API: [`../API_designs/auth.md`](../API_designs/auth.md).
> Kiến trúc theo [`../layered-architecture.md`](../layered-architecture.md).

## 1. Nguyên tắc

- Đăng nhập **chỉ qua Google**, không lưu mật khẩu (SEC-01).
- **Không self-registration** (BR-01): email phải được cấp quyền trước (allowlist). Một dòng trong `app_users` = đã được cấp quyền.
- BE **không** làm redirect OAuth server-side. FE lấy `id_token` bằng Google Identity Services, BE chỉ **verify** token đó (1 bên thứ 3 duy nhất = Google).
- Session = **JWT tự phát**: access 60′ (SEC-03), refresh 24h idle + rotation, lưu hash trong DB, gửi qua HttpOnly cookie.
- **RBAC 2 chiều**: Role {TEACHER, MODERATOR, PRINCIPAL, IT_STAFF} + Subject {MATH, CHEMISTRY, PHYSICS} theo ma trận Screen Authorization 1.4.2.

## 2. Luồng đăng nhập (`POST /api/auth/google`)

```
FE: nút "Sign in with Google" (GIS) ──id_token──▶ POST /api/auth/google { idToken }
                                                     │
BE:  GoogleIdentityVerifier.verify(idToken)          │  chữ ký (JWKS) + iss + aud(client_id) + exp + email_verified
       │ sai → 401 (InvalidTokenException)
       ▼
     AppUserRepository.findByEmail(email)
       │ không có / DISABLED → 403 (EmailNotAllowedException)
       ▼
     lần đầu: set googleSub, fullName, status=ACTIVE, lastLoginAt
       ▼
     access = TokenService.issue(userId, role, subject, email)   // 60′
     refresh = random opaque; lưu hash; expiresAt = now + 24h
       ▼
     200 { accessToken, user }  + Set-Cookie refresh_token (HttpOnly; Secure; SameSite=Lax; Path=/api/auth)
```

## 3. Vòng đời token

- **Access (60′)**: JWT HS256, claims `sub=userId, role, subject, email, exp`. FE giữ **trong memory**, gửi header `Authorization: Bearer`.
- **Refresh (24h idle)**: chuỗi ngẫu nhiên, chỉ lưu **hash** (SHA-256) trong `refresh_tokens`. Mỗi lần `/refresh`: kiểm tra hợp lệ → **revoke bản cũ** → phát bản mới với `expiresAt = now + 24h` (sliding). Không hoạt động 24h → hết hạn.
- **Logout**: revoke refresh hiện tại + cookie `Max-Age=0`.
- **Reuse detection** (khuyến nghị): dùng lại refresh đã revoke → coi như lộ, revoke toàn bộ token của user.

## 4. Xác thực mỗi request

- `JwtAuthenticationFilter` (OncePerRequestFilter, đứng trước `UsernamePasswordAuthenticationFilter`): đọc `Authorization: Bearer`, verify chữ ký + `exp` → set `SecurityContext` với authorities `ROLE_<role>` + lưu `subject`/`userId`. Thiếu/sai/hết hạn → **401**.
- `SecurityConfig`: stateless, csrf off cho `/api/**`; `permitAll`: `/api/auth/google`, `/api/auth/refresh`, `/api/health`, `/swagger-ui/**`, `/v3/api-docs/**`; còn lại `authenticated()`. `@EnableMethodSecurity`.

## 5. RBAC (SEC-04)

- Enforce ở method: `@PreAuthorize("hasRole('MODERATOR')")`, `hasAnyRole(...)` theo ma trận 1.4.2.
- Màn đặc thù chuyên môn: check thêm `subject` (Chemistry Virtual Lab → CHEMISTRY; Physics Phenomena → PHYSICS).
- **Owner-only** (BR-16): service so `resource.ownerId` với `CurrentUserProvider.userId()` cho edit/delete lesson-plan/slide/test.

## 6. WebSocket auth

- STOMP `CONNECT` tới `/ws` mang `Authorization: Bearer <access>` (native header).
- `StompAuthChannelInterceptor` trên inbound channel: verify JWT, gán `Principal = userId`. Sai/thiếu → reject CONNECT.
- Ngăn user A subscribe topic của user B (`/topic/lesson-plan/{sessionId}`).

## 7. Model dữ liệu (Flyway `V2__create_auth.sql`)

- **`app_users`**: `id uuid pk`, `email unique not null`, `google_sub unique null`, `full_name`, `role not null`, `subject null`, `status not null default 'INVITED'` (INVITED | ACTIVE | DISABLED), `created_at`, `last_login_at`.
  - Tồn tại dòng = đã được cấp quyền (allowlist). Cấp quyền = insert dòng (management API để sau).
- **`refresh_tokens`**: `id uuid pk`, `user_id fk`, `token_hash unique`, `expires_at`, `revoked bool default false`, `created_at`.
- **Seed principal**: insert 1 dòng role `PRINCIPAL`, email = `app.auth.principal-seed-email`, status `INVITED` (ACTIVE sau lần login đầu).

## 8. Cấu hình & secret

`.env` (không commit) lấy từ Google OAuth client JSON:
```
APP_AUTH_GOOGLE_CLIENT_ID=...apps.googleusercontent.com
APP_AUTH_GOOGLE_CLIENT_SECRET=GOCSPX-...          # chưa dùng ở luồng verify id_token, giữ cho tương lai
APP_AUTH_JWT_SECRET=<openssl rand -base64 48>
APP_AUTH_COOKIE_SECURE=false                        # true ở prod (HTTPS)
APP_AUTH_PRINCIPAL_SEED_EMAIL=<email principal>
```

## 9. Thứ tự build

1. `pom.xml` deps (security, google-api-client, jjwt, bucket4j) + env config + Flyway V2.
2. Domain (Role/Subject/AppUser/GoogleIdentity) + ports + JPA entities/repos.
3. Infra security: `GoogleIdTokenVerifierAdapter`, `JwtTokenAdapter`, `JwtAuthenticationFilter`.
4. `SecurityConfig` + `AuthService` + `AuthController` + DTO + exception handler.
5. WebSocket CONNECT auth + CORS siết + rate-limit filter.
6. (Follow-up) owner-check vào lesson-plan/slide; management APIs (cấp email, khóa tài khoản).

## 10. Điểm mở
- "API gateway" (SRS) = filter trong monolith (hiện tại) hay tách service riêng.
- SRS Communication nói AI job dùng polling nhưng BE đang dùng STOMP — nếu giữ WS thì auth phải áp cho cả kênh WS (mục 6).
