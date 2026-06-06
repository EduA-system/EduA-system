# EduA System

Monorepo gồm hai app phát triển độc lập:

| Thư mục | Stack | Mô tả |
|---------|-------|-------|
| `fe/` | Next.js 16 (App Router), React 19, Tailwind v4, TypeScript | Frontend |
| `be/` | Spring Boot (Maven) | Backend |

Mỗi app build/run từ thư mục riêng của nó. Không có orchestration build/test ở cấp root.

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
