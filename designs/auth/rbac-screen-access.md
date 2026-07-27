# RBAC Screen-Level Access Control

## Authorization Matrix (từ SRS 1.4.2)

| Screen | Teacher | Mod | Principal | IT Staff | Public |
|--------|:-------:|:---:|:---------:|:--------:|:------:|
| Landing / Login / Help | ✓ | ✓ | ✓ | ✓ | ✓ |
| Lesson/Slide/Test (AI) | ✓ | ✓ | ✓ | ✗ | **✓** |
| Blog — Xem | ✓ | ✓ | ✓ | ✗ | ✗ |
| Blog — Duyệt / Quản lý | ✗ | ✓ | ✗ | ✗ | ✗ |
| Class Management / Class Hub | ✓ | ✗ | ✗ | ✗ | ✗ |
| Account Management (`/user-management`) | ✗ | ✓ (teachers) | ✓ (mods + IT Staff) | ✗ | ✗ |
| System Prompt Management | ✗ | ✗ | ✗ | ✓ | ✗ |
| Principal Dashboard | ✗ | ✗ | ✓ | ✗ | ✗ |
| Activity Log | ✗ | ✗ | ✗ | ✓ | ✗ |

> **Ghi chú:** Lesson & Slide (AI) được mở public để thuận tiện test. Các màn chưa có trong code (Principal Dashboard, Virtual Lab, Physics Hub, v.v.) sẽ bổ sung sau.

## Step 1 — Backend: Mở lesson/slide endpoints public

**File:** `be/.../config/SecurityConfig.java`

Thêm vào `PUBLIC_PATHS`:

```
/api/textbooks/**
/api/lesson-plans/**
/api/slides/**
/api/slide-design/**
/api/uploads/**
```

Các controller này hiện không có `@PreAuthorize` nhưng bị chặn bởi `.anyRequest().authenticated()`.

## Step 2 — Frontend: Permission utility

**File mới:** `fe/lib/auth/permissions.ts`

```typescript
export type Role = 'TEACHER' | 'MODERATOR' | 'PRINCIPAL' | 'IT_STAFF';

export interface RoutePermission {
  requireAuth: boolean;
  allowedRoles?: Role[];
}

export const routePermissions: Record<string, RoutePermission> = {
  '/':                { requireAuth: false },
  '/home':            { requireAuth: false },
  '/login':           { requireAuth: false },
  '/help':            { requireAuth: false },
  '/lesson-create':   { requireAuth: false },
  '/lesson-edit':     { requireAuth: false },
  '/slide-create':    { requireAuth: false },
  '/slide-maker':     { requireAuth: false },
  '/create-class':    { requireAuth: true, allowedRoles: ['TEACHER'] },
  '/blog':            { requireAuth: true },
  '/blog/moderation': { requireAuth: true, allowedRoles: ['MODERATOR'] },
  '/user-management': { requireAuth: true, allowedRoles: ['MODERATOR', 'PRINCIPAL'] },
  '/it-staff':        { requireAuth: true, allowedRoles: ['IT_STAFF'] },
};

export function canAccessRoute(pathname: string, user?: { role: string } | null): boolean { ... }
```

## Step 3 — Frontend: Route guard chung

**File mới:** `fe/lib/auth/route-guard.tsx`

- `RouteGuard` component kiểm tra `canAccessRoute()` và redirect về `/login` nếu chưa auth
- Thay thế inline checks ở `/blog`, `/blog/moderation`, `/user-management`

## Step 4 — Frontend: Lọc sidebar theo role

**File:** `fe/components/dashboard/data.ts` + `fe/components/layout/Sidebar.tsx`

- Bổ sung `requiredRole?: Role[]` vào nav items
- Sidebar gọi `useAuth()` → lọc item theo role
- Hiển thị tên user thật thay vì hardcoded "Nguyen Thi Hoa"

## Step 5 — Backend: Giữ @PreAuthorize hiện tại

- PrincipalController, ModeratorController, ItStaffController, BlogController (write/delete) → đã có, không đổi
- Các endpoint blog read → yêu cầu auth (không đổi)
