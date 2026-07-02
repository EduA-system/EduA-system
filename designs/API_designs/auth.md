# Auth — API Design

> Xác thực & phân quyền. Đăng nhập **chỉ qua Google**, BE tự phát JWT.
> Hạ tầng cross-cutting (JWT filter, RBAC, rate-limit, WebSocket auth) tách ở [`api-chung.md`](./api-chung.md).

## Quyết định riêng

- **Luồng nhẹ nhất, 1 bên thứ 3 (Google)**: FE dùng Google Identity Services lấy `id_token` → BE verify `id_token` (Google JWKS, audience = `client_id`) → **không** redirect server-side, **không** SDK vendor.
- **Không self-registration** (BR-01): tài khoản do Admin/Moderator cấp trước qua **allowlist email**. Login mà email chưa được cấp → 403.
- **Session = JWT**: access token TTL 60 phút (body, FE giữ memory) + refresh token 24h idle, **rotation**, lưu **hash** trong DB, trả qua **HttpOnly + Secure + SameSite cookie** (SEC-03).
- **RBAC 2 chiều**: `Role {TEACHER, MODERATOR, ADMINISTRATOR}` + `Subject {MATH, CHEMISTRY, PHYSICS}` cho Teacher (khớp ma trận Screen Authorization 1.4.2).
- Quản lý tài khoản (cấp email, tạo/khóa Teacher) — **để sau**; giai đoạn này admin đầu tiên seed bằng Flyway.

---

## Danh sách endpoint

| # | Method | Path | Mô tả | Auth |
|---|--------|------|-------|------|
| 1 | POST | `/api/auth/google` | verify Google `id_token` + allowlist → phát JWT | public |
| 2 | POST | `/api/auth/refresh` | rotation refresh token → access mới | refresh cookie |
| 3 | POST | `/api/auth/logout` | revoke refresh token + xóa cookie | refresh cookie |
| 4 | GET | `/api/auth/me` | thông tin user hiện tại | Bearer access |

Cookie refresh: `refresh_token` — `HttpOnly; Secure; SameSite=Lax; Path=/api/auth`.

---

## Chi tiết

### 1. `POST /api/auth/google` — Đăng nhập bằng Google
```
body: { idToken }                 // id_token lấy từ Google Identity Services ở FE
→ 200  { accessToken, user: { id, email, fullName, role, subject } }
       + Set-Cookie: refresh_token=... (HttpOnly)
→ 401  id_token sai / hết hạn / sai audience
→ 403  email chưa được cấp quyền hoặc tài khoản DISABLED
```
- Verify `id_token`: chữ ký (Google JWKS), `iss = accounts.google.com`, `aud = client_id`, `exp`, `email_verified`.
- Tra `app_users` theo email. Không có / status DISABLED → 403.
- Lần đầu (google_sub null): điền `google_sub`, `full_name`, chuyển status `ACTIVE`, set `last_login_at`.
- Phát access (60′) + tạo refresh (random opaque, lưu hash, `expires_at = now + 24h`).
- Map: SEC-01, BR-01/04/06.

### 2. `POST /api/auth/refresh` — Làm mới access token
```
(cookie refresh_token)
→ 200  { accessToken }   + Set-Cookie: refresh_token=... (token mới)
→ 401  thiếu cookie / refresh revoked / hết hạn
```
- Hash cookie → tra `refresh_tokens`. Không thấy / revoked / quá `expires_at` → 401.
- **Rotation**: revoke bản cũ, phát refresh mới (`expires_at = now + 24h` — sliding idle), access mới.
- Map: SEC-03.

### 3. `POST /api/auth/logout` — Đăng xuất
```
(cookie refresh_token)
→ 204   revoke refresh token hiện tại + xóa cookie (Max-Age=0)
```

### 4. `GET /api/auth/me` — User hiện tại
```
(Authorization: Bearer <access>)
→ 200  { id, email, fullName, role, subject }
→ 401  thiếu / hết hạn / sai chữ ký access token
```

---

## Cross-cutting riêng (xử lý ở filter/service)

- **RBAC** (SEC-04): `@EnableMethodSecurity` + `@PreAuthorize("hasRole('MODERATOR')")`… theo ma trận 1.4.2; màn đặc thù (Chemistry Virtual Lab, Physics Phenomena) check thêm `subject`.
- **Owner-only** (BR-16): so `ownerId` tài nguyên với user hiện tại trong service — áp cho lesson-plan/slide/test (follow-up).
- Chi tiết JWT filter, WebSocket CONNECT auth, rate-limit: xem `api-chung.md`.

## Phụ thuộc & thứ tự làm

1. Flyway `V2__create_auth.sql` (`app_users`, `refresh_tokens`, seed admin) + env config.
2. Verify Google id_token + phát/parse JWT (infra security).
3. `AuthService` + `AuthController` (4 endpoint) + `SecurityConfig`.
4. Cross-cutting: WebSocket auth, CORS siết, rate-limit.

## Điểm mở cần chốt sau
- "API gateway" (SRS) = filter trong monolith (hiện tại) hay tách service riêng.
- Quản lý allowlist/Teacher qua API cho Moderator/Admin (Teacher Management screen).
