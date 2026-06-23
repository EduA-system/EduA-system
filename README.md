# EduA System

Monorepo gồm hai app phát triển độc lập:

| Thư mục | Stack | Mô tả |
|---------|-------|-------|
| `fe/` | Next.js 16 (App Router), React 19, Tailwind v4, TypeScript | Frontend |
| `be/` | Spring Boot (Maven) | Backend |

Mỗi app build/run từ thư mục riêng của nó. Để chạy nhanh toàn bộ stack một lượt, dùng script ở mục [Chạy nhanh toàn bộ stack](#chạy-nhanh-toàn-bộ-stack).

## Chạy nhanh toàn bộ stack

Script `scripts/start.ps1` (PowerShell) khởi động lần lượt **Backend (Spring Boot) → Frontend (Next.js)** và chờ từng service sẵn sàng trước khi chạy bước tiếp theo.

Về database, script tự chọn: nếu **cloud DB** trong `DB_URL` (`.env`) kết nối được thì dùng cloud; nếu không (mất mạng / firewall chặn port) thì **tự dựng PostgreSQL local qua Docker** và trỏ backend sang đó.

```powershell
pwsh scripts\start.ps1
```

Khi chạy xong, các service lắng nghe ở:

| Service | URL |
|---------|-----|
| PostgreSQL (chỉ khi fallback Docker) | `localhost:9118` |
| Backend | http://localhost:8080 |
| Frontend | http://localhost:3000 |
| Swagger UI (local) | http://localhost:8080/swagger-ui/index.html |

Nhấn **Ctrl+C** để dừng BE/FE. Container Postgres (nếu đã dựng) vẫn chạy nền — dừng bằng `docker compose down`.

**Yêu cầu trước khi chạy:** JDK 21, Node.js, và **Docker Desktop** (chỉ cần khi không kết nối được cloud DB, để dựng Postgres local). Nếu một port đang bị chiếm, script sẽ hỏi có muốn kill tiến trình đó không.

**Cấu hình:** copy `.env.example` → `.env` rồi điền secret (DB, AI providers, Cloudflare R2). Thiếu `.env` thì BE chạy bằng credential mặc định trong `application.properties`.

**Tham số (chạy một phần stack):**

```powershell
pwsh scripts\start.ps1 -SkipFe   # chỉ chạy Backend (vẫn resolve DB)
pwsh scripts\start.ps1 -SkipBe   # chỉ chạy Frontend (bỏ qua Backend + DB)
```

## Test API trên môi trường deploy (Swagger)

Backend đã được deploy tại:

```
http://q0k0k4c0ss00cc4004k4okss.103.72.56.152.sslip.io
```

Cách nhanh nhất để thử các API là mở **Swagger UI** trên server đó — liệt kê toàn bộ endpoint, cho phép gọi thử trực tiếp từ trình duyệt (nút **Try it out**):

| Mục đích | URL |
|----------|-----|
| Swagger UI | http://q0k0k4c0ss00cc4004k4okss.103.72.56.152.sslip.io/swagger-ui/index.html |
| OpenAPI spec (JSON) | http://q0k0k4c0ss00cc4004k4okss.103.72.56.152.sslip.io/v3/api-docs |
| Health check | http://q0k0k4c0ss00cc4004k4okss.103.72.56.152.sslip.io/api/health |

Kiểm tra nhanh bằng `curl`:

```bash
curl http://q0k0k4c0ss00cc4004k4okss.103.72.56.152.sslip.io/api/health
# {"status":"UP","service":"be-edua-system"}
```

## Frontend (`fe/`)

```bash
cd fe
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Backend (`be/`)

```bash
cd be
./mvnw spring-boot:run    # macOS/Linux
mvnw.cmd spring-boot:run  # Windows
```

## Git hooks (husky)

Repo dùng [husky](https://typicode.github.io/husky/) ở **root** để chặn commit lỗi từ local.

- Sau khi clone, chạy **một lần** ở root để kích hoạt hooks:

  ```bash
  npm install
  ```

  Script `prepare` sẽ tự set `core.hooksPath` về `.husky/`.

- **pre-commit** (`.husky/pre-commit`) chạy cho FE trước mỗi commit:
  1. `npm run lint` - kiểm tra syntax/eslint
  2. `npm run typecheck` - kiểm tra type
  3. `npm run build` - đảm bảo build thành công

  Nếu bước nào fail, commit bị chặn. Hook áp dụng cho mọi commit trong repo, kể cả thay đổi trong `be/`.

> Husky chỉ là lớp kiểm tra sớm ở local, không thay thế CI (`.github/workflows/ci.yml`).

## Commit convention

Giữ commit message ngắn, rõ, và chỉ mô tả một ý chính.

- Viết subject theo dạng `Verb + object`, ví dụ: `Add login form validation`
- Dùng động từ mệnh lệnh như `Add`, `Fix`, `Update`, `Remove`, `Refactor`
- Không dùng message quá chung chung như `update code`, `fix bug`, `done`
- Mỗi commit nên gói một thay đổi chính, không trộn nhiều việc không liên quan
- Nếu muốn rõ phạm vi hơn, có thể dùng prefix như `feat(fe):`, `fix(be):`, `chore:`

Ví dụ:

```text
Add CI workflow for frontend quality checks
Fix JWT authentication flow
feat(fe): add course detail page
fix(be): handle null user profile
chore: add husky pre-commit hook
```
