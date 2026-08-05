"use client";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  contactInfo: string | null;
  bio: string | null;
  phoneNumber: string | null;
  dateOfBirth?: string | null;
  role: string;
  roles: string[];
  subject: string | null;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser | null;
};

export class AuthApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, message: string, payload: unknown) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function readJson(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`/api/auth${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const payload = res.status === 204 ? null : await readJson(res);
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : res.statusText;
    throw new AuthApiError(res.status, message, payload);
  }
  return payload as T;
}

export function loginWithGoogle(idToken: string): Promise<AuthResponse> {
  return request<AuthResponse>("/google", {
    method: "POST",
    body: JSON.stringify({ idToken }),
  });
}

export function refreshAccessToken(): Promise<AuthResponse> {
  return request<AuthResponse>("/refresh", { method: "POST" });
}

export function logout(): Promise<void> {
  return request<void>("/logout", { method: "POST" });
}

export function getMe(token: string): Promise<AuthUser> {
  return request<AuthUser>("/me", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (error.status === 401) {
      return "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.";
    }
    if (error.status === 403) {
      return "Tài khoản Google này chưa được cấp quyền hoặc đã bị khóa.";
    }
    return error.message || "Không thể đăng nhập. Vui lòng thử lại.";
  }
  return "Không thể kết nối máy chủ. Vui lòng thử lại.";
}
