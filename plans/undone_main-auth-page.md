# Ke hoach: Auth dung chung cho Login va Blog

> Trang thai: **CHUA XONG**. Chi doi ten sang `done_main-auth-page.md` sau khi verify dat.

## 1. Boi canh

Backend da co flow auth Google:
- `POST /api/auth/google`: nhan `{ idToken }`, tra `{ accessToken, user }`, dat refresh token vao cookie HttpOnly `refresh_token`.
- `POST /api/auth/refresh`: doc refresh cookie, rotate refresh token, tra access token moi.
- `POST /api/auth/logout`: revoke refresh token va xoa cookie.
- `GET /api/auth/me`: can `Authorization: Bearer <access>`.

Frontend truoc khi sua:
- `/login` co UI dep nhung nut Google chua noi API.
- `/auth` la trang test auth tho, goi thang `http://localhost:8080`.
- `/blog` va `/blog/moderation` copy-paste Google Sign-In, client id, helper API, va luu access token trong `localStorage["edua_access_token"]`.

## 2. Muc tieu

1. Tao auth layer dung chung cho `/login`, `/blog`, `/blog/moderation`.
2. Access token chi giu trong memory; khoi phuc phien bang refresh cookie HttpOnly.
3. Blog dung `authFetch` chung, tu refresh va retry 1 lan khi API tra 401.
4. Xoa `/auth` test page va het copy-paste Google Identity Services trong blog.

## 3. Quyet dinh ky thuat

- Goi backend qua same-origin `/api/*`; khong hardcode `http://localhost:8080` trong auth/blog.
- `AuthProvider` boc app trong `fe/app/layout.tsx`, theo pattern client provider cua Next.js App Router.
- Google Client ID doc tu `NEXT_PUBLIC_GOOGLE_CLIENT_ID`; co fallback public client id hien tai de khong lam hong moi truong dev cu.
- Khong them route guard cho lesson/slide/homepage trong lan nay. Pham vi theo yeu cau: auth cho blog.
- Khong mirror access token vao `localStorage`.
- `/login` dang nhap thanh cong redirect ve `/blog`.

## 4. Checklist thuc hien

- [x] Tao `fe/lib/auth/client.ts` cho `/api/auth/google`, `/refresh`, `/logout`, `/me`.
- [x] Tao `fe/lib/auth/AuthContext.tsx` voi `user`, `accessToken`, `status`, `signIn`, `signOut`, `refreshToken`, `authFetch`.
- [x] Tao `fe/lib/auth/useGoogleSignIn.ts` de nap Google script mot lan va render Google button.
- [x] Boc `<AuthProvider>` trong root layout.
- [x] Noi `/login` vao Google Sign-In + auth context, hien loi tieng Viet, redirect `/blog`.
- [x] Refactor `/blog` dung `useAuth`/`authFetch`, bo `localStorage` va Google Sign-In rieng.
- [x] Refactor `/blog/moderation` dung auth chung va giu role guard `MODERATOR`.
- [x] Cap nhat `.env.example` voi `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- [x] Xoa `fe/app/auth/page.tsx`.

## 5. Kiem thu

Frontend quality gates:
- [x] `cd fe && npm run lint`
- [x] `cd fe && npm run typecheck`
- [x] `cd fe && npm run build`

Manual test voi BE `:8080`, FE `:3000`:
- [ ] Vao `/login`, dang nhap Google bang tai khoan allowlist, duoc redirect ve `/blog`.
- [ ] Tai khoan ngoai allowlist thay loi 403 tieng Viet va khong vao blog.
- [ ] Reload `/blog`, phien duoc khoi phuc bang `/api/auth/refresh`.
- [ ] Access token het han, API blog refresh va retry 1 lan.
- [ ] Logout xoa phien, UI blog quay ve trang yeu cau dang nhap.
- [ ] `/blog` van load danh sach, tao bai, upload anh, xem chi tiet, binh luan, xoa duoc.
- [ ] `/blog/moderation` chi user `MODERATOR` vao duoc; role khac thay thong bao khong co quyen.
- [ ] `/lesson-create`, `/slide-create`, `/homepage` khong bi them route guard.

## 6. Ngoai pham vi

- Khong sua backend auth.
- Khong them username/password login.
- Khong them route guard cho lesson/slide.
- Khong refactor cac API lesson/slide sang Bearer token trong plan nay.

## 7. Hoan thanh

Khi tat ca quality gates va manual test dat, doi ten:

`plans/undone_main-auth-page.md` -> `plans/done_main-auth-page.md`
